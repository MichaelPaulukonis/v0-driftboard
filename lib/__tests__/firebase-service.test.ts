import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
  getDoc,
  writeBatch,
  runTransaction,
  limit,
  onSnapshot,
} from "firebase/firestore";
import {
  activityService,
  boardService,
  listService,
  cardService,
  commentService,
  userService,
  inviteService,
  getHistoryForDocument,
  fetchBoardDataForExport,
} from "../firebase-service";
import {
  createPermissionDeniedError,
  createUnavailableError,
} from "./test-utils";

// Mock the firebase module and all Firestore functions
vi.mock("../firebase");
vi.mock("firebase/firestore", async () => {
  let docIdCounter = 0;
  const generateId = () => `generated-id-${++docIdCounter}`;

  // Provide mock implementations for all Firestore functions used
  return {
    collection: vi.fn((_db: any, path: string) => ({ mock: true, path })),
    getDocs: vi.fn(),
    doc: vi.fn((db: any, collectionName: string, id?: string) => {
      const resolvedId = id || generateId();
      const base =
        typeof collectionName === "string"
          ? collectionName
          : collectionName?.path || "subcollection";
      return {
        id: resolvedId,
        path: `${base}/${resolvedId}`,
      };
    }),
    updateDoc: vi.fn(),
    setDoc: vi.fn(),
    Timestamp: {
      fromDate: (d: Date) => ({ toDate: () => d, mock: true }),
    },
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date(), mock: true })),
    addDoc: vi.fn(() => Promise.resolve({ id: "mock-doc-id" })),
    getDoc: vi.fn(),
    writeBatch: vi.fn(),
    limit: vi.fn(),
    runTransaction: vi.fn(),
    onSnapshot: vi.fn(),
  };
});

const defaultGetDoc = (ref: any) => {
  if (ref.path?.includes("profiles")) {
    return Promise.resolve({
      exists: () => true,
      data: () => ({ displayName: "Test User" }),
      id: "mock-user-id",
    });
  }
  return Promise.resolve({
    exists: () => true,
    data: () => ({ userId: "user1", ownerId: "user1", boardId: "board1" }),
    id: "mock-id",
  });
};

const defaultWriteBatch = () => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
});

const defaultRunTransaction = (_db: any, updateFunction: any) => {
  const transaction = {
    get: vi.fn((ref: any) => {
      if (ref.path?.includes("board_memberships")) {
        return Promise.resolve({ exists: () => false, data: () => ({}) });
      }
      return Promise.resolve({
        exists: () => true,
        data: () => ({ userId: "user1", ownerId: "user1" }),
        id: "mock-id",
      });
    }),
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
  return Promise.resolve(updateFunction(transaction));
};

// Runs the next transaction against `current` (the card doc's data) and
// returns the transaction so tests can inspect what was written.
const nextTransaction = (current: Record<string, unknown>) => {
  const tx = {
    get: vi.fn(async () => ({ exists: () => true, data: () => current })),
    set: vi.fn(),
    update: vi.fn(),
  };
  (runTransaction as any).mockImplementationOnce(
    async (_db: unknown, fn: (t: typeof tx) => unknown) => fn(tx),
  );
  return tx;
};

// Card id -> position from every transaction.update call.
const writtenPositions = (tx: { update: { mock: { calls: any[][] } } }) =>
  Object.fromEntries(
    tx.update.mock.calls.map(([ref, data]) => [ref.id, data.position]),
  );

// getDocs result for active cards, as returned by cardService.getListCards.
const activeCards = (
  ...cards: { id: string; listId: string; position: number }[]
) => ({
  docs: cards.map((c) => ({
    id: c.id,
    data: () => ({
      ...c,
      title: c.id,
      status: "active",
      createdAt: { toDate: () => new Date() },
      updatedAt: { toDate: () => new Date() },
    }),
  })),
});

describe("Firebase Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // clearAllMocks leaves queued ...Once values; reset and restore default
    // implementations so a failing test can't leak into the next one.
    vi.mocked(getDocs)
      .mockReset()
      .mockResolvedValue({ docs: [] } as any);
    vi.mocked(getDoc)
      .mockReset()
      .mockImplementation(defaultGetDoc as any);
    vi.mocked(addDoc)
      .mockReset()
      .mockResolvedValue({ id: "mock-doc-id" } as any);
    vi.mocked(writeBatch)
      .mockReset()
      .mockImplementation(defaultWriteBatch as any);
    vi.mocked(runTransaction)
      .mockReset()
      .mockImplementation(defaultRunTransaction as any);
  });

  describe("boardService", () => {
    it("should get active boards", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: "1",
            data: () => ({
              title: "Board 1",
              userId: "user1",
              description: "desc",
              status: "active",
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });
      const boards = await boardService.getUserBoards("user1");
      expect(where).toHaveBeenCalledWith("status", "==", "active");
      expect(boards).toHaveLength(1);
      expect(boards[0].title).toBe("Board 1");
    });

    it("should create a board with active status", async () => {
      const boardId = await boardService.createBoard(
        "user1",
        "New Board",
        "New Description",
      );
      expect(writeBatch).toHaveBeenCalled();
      expect(boardId).toBe("generated-id-1"); // First generated ID
    });

    it("should update a board", async () => {
      const tx = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ title: "Old", userId: "user1", ownerId: "user1" }),
          })
          .mockResolvedValueOnce({ exists: () => false, data: () => ({}) }),
        set: vi.fn(),
        update: vi.fn(),
      };
      (runTransaction as any).mockImplementationOnce(
        async (_db: unknown, fn: any) => fn(tx),
      );
      await boardService.updateBoard("1", "user1", { title: "Updated Board" });
      expect(tx.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "boards_current/1" }),
        expect.objectContaining({ title: "Updated Board", updatedBy: "user1" }),
      );
      expect(tx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ changeType: "update" }),
      );
    });

    it("should soft delete a board by setting status to deleted", async () => {
      const tx = {
        get: vi
          .fn()
          .mockResolvedValueOnce({
            exists: () => true,
            data: () => ({ title: "Old", userId: "user1", ownerId: "user1" }),
          })
          .mockResolvedValueOnce({ exists: () => false, data: () => ({}) }),
        set: vi.fn(),
        update: vi.fn(),
      };
      (runTransaction as any).mockImplementationOnce(
        async (_db: unknown, fn: any) => fn(tx),
      );
      await boardService.deleteBoard("1", "user1");
      expect(tx.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "boards_current/1" }),
        expect.objectContaining({ status: "deleted", updatedBy: "user1" }),
      );
      expect(tx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ changeType: "delete" }),
      );
    });
  });

  describe("listService", () => {
    describe("subscribeBoardLists", () => {
      it("subscribes to active docs ordered by position and maps them", () => {
        const mockUnsub = vi.fn();
        const now = new Date("2026-11-10T12:00:00Z");
        (onSnapshot as any).mockImplementation(
          (_q: unknown, onNext: Function) => {
            onNext({
              docs: [
                {
                  id: "board-1-1",
                  data: () => ({
                    title: "T",
                    boardId: "board-1",
                    position: 0,
                    status: "active",
                    createdAt: { toDate: () => now },
                    updatedAt: null,
                  }),
                },
              ],
            });
            return mockUnsub;
          },
        );
        const onNext = vi.fn();
        const unsub = listService.subscribeBoardLists("board-1", onNext);
        expect(where).toHaveBeenCalledWith("boardId", "==", "board-1");
        expect(where).toHaveBeenCalledWith("status", "==", "active");
        expect(orderBy).toHaveBeenCalledWith("position", "asc");
        expect(onNext).toHaveBeenCalledWith([
          expect.objectContaining({
            id: "board-1-1",
            title: "T",
            boardId: "board-1",
            position: 0,
            createdAt: now,
            updatedAt: expect.any(Date),
          }),
        ]);
        unsub();
        expect(mockUnsub).toHaveBeenCalledOnce();
      });

      it("forwards snapshot errors to onError when provided", () => {
        const err = new Error("permission-denied");
        (onSnapshot as any).mockImplementation(
          (_q: unknown, _onNext: Function, onError: Function) => {
            onError(err);
            return vi.fn();
          },
        );
        const onError = vi.fn();
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        listService.subscribeBoardLists("board-1", vi.fn(), onError);
        expect(onError).toHaveBeenCalledWith(err);
        spy.mockRestore();
      });
    });

    it("getBoardLists maps a null updatedAt to a Date", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: "1",
            data: () => ({
              title: "X",
              position: 0,
              status: "active",
              createdAt: { toDate: () => new Date() },
              updatedAt: null,
            }),
          },
        ],
      });
      const res = await listService.getBoardLists("board-1");
      expect(res[0].updatedAt).toBeInstanceOf(Date);
    });
    it("should get active lists for a board", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: "1",
            data: () => ({
              title: "List 1",
              boardId: "board1",
              position: 1,
              status: "active",
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });
      const lists = await listService.getBoardLists("board1");
      expect(where).toHaveBeenCalledWith("status", "==", "active");
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe("List 1");
    });

    it("should create a list with active status", async () => {
      const listId = await listService.createList(
        "board1",
        "user1",
        "New List",
        1,
      );
      expect(writeBatch).toHaveBeenCalled();
      expect(listId).toMatch(/^generated-id-\d+$/); // Should be a generated ID
    });

    it("should update a list", async () => {
      await listService.updateList("1", "user1", { title: "Updated List" });
      expect(runTransaction).toHaveBeenCalled();
    });

    it("should soft delete a list by setting status to deleted", async () => {
      await listService.deleteList("1", "user1");
      expect(runTransaction).toHaveBeenCalled();
    });

    describe("Cascading Soft-Delete", () => {
      it("should soft-delete a list and only its active cards", async () => {
        // Arrange
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ title: "List 1" }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        (runTransaction as any).mockImplementation(
          async (db: any, updateFunction: any) => {
            await updateFunction(mockTransaction);
          },
        );

        // This mock should only return what the actual query would: the active cards.
        const mockCardsSnapshot = {
          docs: [
            {
              id: "card-active-1",
              ref: "ref-active-1",
              data: () => ({ listId: "list1", status: "active" }),
            },
          ],
        };
        (getDocs as any).mockResolvedValue(mockCardsSnapshot);

        // Act
        await listService.deleteList("list1", "user1");

        // Assert
        // 1. The list itself is marked as deleted
        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.objectContaining({ path: "lists_current/list1" }),
          expect.objectContaining({ status: "deleted" }),
        );

        // 2. The active card is marked as deleted
        expect(mockTransaction.update).toHaveBeenCalledWith(
          "ref-active-1",
          expect.objectContaining({ status: "deleted" }),
        );

        // 3. The 'done' card is NOT updated (no 'ref-done-1' should be passed)
        expect(mockTransaction.update).not.toHaveBeenCalledWith(
          "ref-done-1",
          expect.any(Object),
        );

        // 4. History is recorded with the cascaded card ID
        expect(mockTransaction.set).toHaveBeenCalledWith(
          expect.any(Object), // historyRef
          expect.objectContaining({
            changeType: "delete",
            cascadedCardIds: ["card-active-1"],
          }),
        );
      });

      it("should restore a list and its cascaded-deleted cards", async () => {
        // Arrange
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ title: "List 1" }),
          }),
          set: vi.fn(),
          update: vi.fn(),
        };
        (runTransaction as any).mockImplementation(
          async (db: any, updateFunction: any) => {
            await updateFunction(mockTransaction);
          },
        );

        const mockHistorySnapshot = {
          docs: [
            { data: () => ({ cascadedCardIds: ["card-auto-deleted-1"] }) },
          ],
        };
        (getDocs as any).mockResolvedValue(mockHistorySnapshot);

        // Act
        await listService.restoreList("list1", "user1");

        // Assert
        // 1. The list is restored
        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.objectContaining({ path: "lists_current/list1" }),
          expect.objectContaining({ status: "active" }),
        );

        // 2. The auto-deleted card is restored
        expect(mockTransaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            path: "cards_current/card-auto-deleted-1",
          }),
          expect.objectContaining({ status: "active" }),
        );
      });
    });
  });

  describe("cardService", () => {
    describe("subscribeListCards", () => {
      it("subscribes to active docs ordered by position and maps them", () => {
        const mockUnsub = vi.fn();
        const now = new Date("2026-11-10T12:00:00Z");
        (onSnapshot as any).mockImplementation(
          (_q: unknown, onNext: Function) => {
            onNext({
              docs: [
                {
                  id: "list-1-1",
                  data: () => ({
                    title: "T",
                    listId: "list-1",
                    position: 0,
                    status: "active",
                    createdAt: null,
                    updatedAt: { toDate: () => now },
                  }),
                },
              ],
            });
            return mockUnsub;
          },
        );
        const onNext = vi.fn();
        const unsub = cardService.subscribeListCards("list-1", onNext);
        expect(where).toHaveBeenCalledWith("listId", "==", "list-1");
        expect(where).toHaveBeenCalledWith("status", "==", "active");
        expect(orderBy).toHaveBeenCalledWith("position", "asc");
        expect(onNext).toHaveBeenCalledWith([
          expect.objectContaining({
            id: "list-1-1",
            title: "T",
            listId: "list-1",
            position: 0,
            createdAt: expect.any(Date),
            updatedAt: now,
          }),
        ]);
        unsub();
        expect(mockUnsub).toHaveBeenCalledOnce();
      });

      it("forwards snapshot errors to onError when provided", () => {
        const err = new Error("permission-denied");
        (onSnapshot as any).mockImplementation(
          (_q: unknown, _onNext: Function, onError: Function) => {
            onError(err);
            return vi.fn();
          },
        );
        const onError = vi.fn();
        const spy = vi.spyOn(console, "error").mockImplementation(() => {});
        cardService.subscribeListCards("list-1", vi.fn(), onError);
        expect(onError).toHaveBeenCalledWith(err);
        spy.mockRestore();
      });
    });

    it("getListCards maps a null updatedAt to a Date", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: "1",
            data: () => ({
              title: "X",
              position: 0,
              status: "active",
              createdAt: { toDate: () => new Date() },
              updatedAt: null,
            }),
          },
        ],
      });
      const res = await cardService.getListCards("list-1");
      expect(res[0].updatedAt).toBeInstanceOf(Date);
    });
    it("should get active cards for a list", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: "1",
            data: () => ({
              title: "Card 1",
              description: "desc",
              listId: "list1",
              position: 1,
              status: "active",
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });
      const cards = await cardService.getListCards("list1");
      expect(where).toHaveBeenCalledWith("status", "==", "active");
      expect(cards).toHaveLength(1);
      expect(cards[0].title).toBe("Card 1");
    });

    it("should get a single card by id", async () => {
      const createdAt = new Date("2026-01-01");
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        id: "card1",
        data: () => ({
          title: "Card 1",
          listId: "list1",
          position: 0,
          status: "done",
          createdAt: { toDate: () => createdAt },
          updatedAt: { toDate: () => createdAt },
        }),
      });
      const card = await cardService.getCard("card1");
      expect(card).toMatchObject({
        id: "card1",
        title: "Card 1",
        status: "done",
        createdAt,
      });
    });

    it("should return null for a missing card", async () => {
      (getDoc as any).mockResolvedValueOnce({ exists: () => false });
      expect(await cardService.getCard("nope")).toBeNull();
    });

    it("should create a card with active status", async () => {
      const cardId = await cardService.createCard(
        "list1",
        "user1",
        "New Card",
        "New Description",
        1,
      );
      expect(writeBatch).toHaveBeenCalled();
      expect(cardId).toMatch(/^generated-id-\d+$/); // Should be a generated ID
    });

    it("appends a new card at the bottom when no position is given", async () => {
      (getDocs as any).mockResolvedValueOnce(
        activeCards(
          { id: "a", listId: "l1", position: 0 },
          { id: "b", listId: "l1", position: 1 },
        ),
      );
      await cardService.createCard("l1", "u1", "New");
      const batch = (writeBatch as any).mock.results[0].value;
      expect(batch.set.mock.calls[0][1]).toMatchObject({ position: 2 });
    });

    it("appends below the highest position when the list has gaps", async () => {
      (getDocs as any).mockResolvedValueOnce(
        activeCards(
          { id: "a", listId: "l1", position: 0 },
          { id: "b", listId: "l1", position: 2 },
        ),
      );
      await cardService.createCard("l1", "u1", "New");
      const batch = (writeBatch as any).mock.results[0].value;
      expect(batch.set.mock.calls[0][1]).toMatchObject({ position: 3 });
    });

    it("puts the first card in an empty list at 0", async () => {
      (getDocs as any).mockResolvedValueOnce(activeCards());
      await cardService.createCard("l1", "u1", "New");
      const batch = (writeBatch as any).mock.results[0].value;
      expect(batch.set.mock.calls[0][1]).toMatchObject({ position: 0 });
    });

    it("restores below the highest position when the list has gaps", async () => {
      const tx = nextTransaction({ listId: "l1", status: "done", title: "x" });
      (getDocs as any).mockResolvedValueOnce(
        activeCards(
          { id: "a", listId: "l1", position: 0 },
          { id: "b", listId: "l1", position: 2 },
        ),
      );
      await cardService.updateCardStatus("c1", "u1", "active");
      expect(tx.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "active", position: 3 }),
      );
    });

    it("appends a restored card at the bottom of its list", async () => {
      const tx = nextTransaction({ listId: "l1", status: "done", title: "x" });
      (getDocs as any).mockResolvedValueOnce(
        activeCards(
          { id: "a", listId: "l1", position: 0 },
          { id: "b", listId: "l1", position: 1 },
        ),
      );
      await cardService.updateCardStatus("c1", "u1", "active");
      expect(tx.update).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ status: "active", position: 2 }),
      );
    });

    it("leaves position alone for other status changes", async () => {
      const tx = nextTransaction({ listId: "l1", status: "done", title: "x" });
      await cardService.updateCardStatus("c1", "u1", "archived");
      expect(tx.update.mock.calls[0][1]).not.toHaveProperty("position");
      expect(getDocs).not.toHaveBeenCalled();
    });

    describe("moveCard", () => {
      it("reorders within a list and renumbers 0..n-1", async () => {
        const tx = nextTransaction({
          listId: "l1",
          status: "active",
          position: 0,
          title: "c1",
        });
        (getDocs as any).mockResolvedValueOnce(
          activeCards(
            { id: "c1", listId: "l1", position: 0 },
            { id: "c2", listId: "l1", position: 1 },
            { id: "c3", listId: "l1", position: 2 },
          ),
        );
        await cardService.moveCard("c1", "u1", "l1", 2);
        expect(writtenPositions(tx)).toEqual({ c1: 2, c2: 0, c3: 1 });
        expect(tx.set).toHaveBeenCalledTimes(1);
        expect(tx.set.mock.calls[0][1]).toMatchObject({ subType: "move" });
      });

      it("moves across lists and renumbers both", async () => {
        const tx = nextTransaction({
          listId: "l1",
          status: "active",
          position: 0,
          title: "c1",
        });
        (getDocs as any)
          .mockResolvedValueOnce(
            activeCards(
              { id: "d1", listId: "l2", position: 0 },
              { id: "d2", listId: "l2", position: 1 },
            ),
          )
          .mockResolvedValueOnce(
            activeCards(
              { id: "c1", listId: "l1", position: 0 },
              { id: "c2", listId: "l1", position: 1 },
            ),
          );
        await cardService.moveCard("c1", "u1", "l2", 1);
        expect(writtenPositions(tx)).toEqual({ c1: 1, d2: 2, c2: 0 });
        expect(tx.update.mock.calls[0][1]).toMatchObject({ listId: "l2" });
      });

      it("clamps an out-of-range position to the bottom", async () => {
        const tx = nextTransaction({
          listId: "l1",
          status: "active",
          position: 0,
          title: "c1",
        });
        (getDocs as any)
          .mockResolvedValueOnce(
            activeCards({ id: "d1", listId: "l2", position: 0 }),
          )
          .mockResolvedValueOnce(
            activeCards({ id: "c1", listId: "l1", position: 0 }),
          );
        await cardService.moveCard("c1", "u1", "l2", 99);
        expect(writtenPositions(tx)).toEqual({ c1: 1 });
      });

      it("defaults to the bottom when no position is given", async () => {
        const tx = nextTransaction({
          listId: "l1",
          status: "active",
          position: 0,
          title: "c1",
        });
        (getDocs as any)
          .mockResolvedValueOnce(
            activeCards({ id: "d1", listId: "l2", position: 0 }),
          )
          .mockResolvedValueOnce(
            activeCards({ id: "c1", listId: "l1", position: 0 }),
          );
        await cardService.moveCard("c1", "u1", "l2");
        expect(writtenPositions(tx)).toEqual({ c1: 1 });
      });

      it("rejects cards that are not active", async () => {
        const tx = nextTransaction({
          listId: "l1",
          status: "done",
          title: "c1",
        });
        await expect(cardService.moveCard("c1", "u1", "l2")).rejects.toThrow(
          "Only active cards can be moved",
        );
        expect(tx.update).not.toHaveBeenCalled();
      });

      it("rejects a missing card", async () => {
        const tx = nextTransaction({});
        tx.get.mockResolvedValueOnce({
          exists: () => false,
          data: () => ({}),
        } as any);
        await expect(cardService.moveCard("c1", "u1", "l2")).rejects.toThrow(
          "Card not found",
        );
      });

      it("swallows activity log failures", async () => {
        nextTransaction({
          listId: "l1",
          status: "active",
          position: 0,
          title: "c1",
        });
        (getDocs as any).mockResolvedValueOnce(
          activeCards({ id: "c1", listId: "l1", position: 0 }),
        );
        (getDoc as any).mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ boardId: "b1" }),
        });
        (addDoc as any).mockRejectedValueOnce(new Error("boom"));
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        await expect(
          cardService.moveCard("c1", "u1", "l1", 0),
        ).resolves.toBeUndefined();
        errSpy.mockRestore();
      });

      it("stamps source on history and activity", async () => {
        const tx = nextTransaction({
          listId: "l1",
          status: "active",
          position: 0,
          title: "c1",
        });
        (getDocs as any).mockResolvedValueOnce(
          activeCards({ id: "c1", listId: "l1", position: 0 }),
        );
        (getDoc as any).mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ boardId: "b1" }),
        });
        await cardService.moveCard("c1", "u1", "l1", 0, { source: "mcp" });
        expect(tx.set.mock.calls[0][1]).toMatchObject({ source: "mcp" });
        expect(addDoc).toHaveBeenCalledWith(
          expect.anything(),
          expect.objectContaining({
            action: "MOVE_CARD",
            details: expect.objectContaining({
              cardId: "c1",
              fromListId: "l1",
              toListId: "l1",
              source: "mcp",
            }),
          }),
        );
      });
    });

    it("should soft delete a card by setting status to deleted", async () => {
      await cardService.deleteCard("1", "user1");
      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe("write source marker", () => {
    it("stamps source on card update history when given", async () => {
      const tx = nextTransaction({
        listId: "l1",
        title: "Old",
        status: "active",
      });
      await cardService.updateCard(
        "c1",
        "u1",
        { title: "New" },
        { source: "mcp" },
      );
      expect(tx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ changeType: "update", source: "mcp" }),
      );
    });

    it("omits source when not given", async () => {
      const tx = nextTransaction({
        listId: "l1",
        title: "Old",
        status: "active",
      });
      await cardService.updateCard("c1", "u1", { title: "New" });
      expect(tx.set.mock.calls[0][1]).not.toHaveProperty("source");
    });

    it("stamps source on status change and delete history", async () => {
      const statusTx = nextTransaction({ listId: "l1", status: "active" });
      await cardService.updateCardStatus("c1", "u1", "done", { source: "mcp" });
      expect(statusTx.set.mock.calls[0][1]).toMatchObject({ source: "mcp" });

      const deleteTx = nextTransaction({ listId: "l1", status: "active" });
      await cardService.deleteCard("c1", "u1", { source: "mcp" });
      expect(deleteTx.set.mock.calls[0][1]).toMatchObject({
        changeType: "delete",
        source: "mcp",
      });
    });

    it("stamps source on card create history and activity", async () => {
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ boardId: "b1" }),
      });
      await cardService.createCard("l1", "u1", "T", "", 0, { source: "mcp" });
      const batch = (writeBatch as any).mock.results[0].value;
      expect(batch.set.mock.calls[1][1]).toMatchObject({
        changeType: "create",
        source: "mcp",
      });
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "CREATE_CARD",
          details: expect.objectContaining({ source: "mcp" }),
        }),
      );
    });

    it("stamps source on comment create history and activity", async () => {
      await commentService.createComment("c1", "u1", "Hi", { source: "mcp" });
      const batch = (writeBatch as any).mock.results[0].value;
      expect(batch.set.mock.calls[1][1]).toMatchObject({ source: "mcp" });
      expect(addDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: "COMMENT",
          details: expect.objectContaining({ source: "mcp" }),
        }),
      );
    });
  });

  describe("commentService", () => {
    it("should get active comments for a card", async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: "1",
            data: () => ({
              content: "Comment 1",
              userId: "user1",
              cardId: "card1",
              status: "active",
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              editHistory: [],
            }),
          },
        ],
      });
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({
          displayName: "Test User",
          email: "test@example.com",
        }),
      });
      const comments = await commentService.getCardComments("card1");
      expect(where).toHaveBeenCalledWith("status", "==", "active");
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe("Comment 1");
      expect(comments[0].status).toBe("active"); // Check status field instead of isDeleted
    });

    it("should create a comment with active status", async () => {
      const commentId = await commentService.createComment(
        "card1",
        "user1",
        "New Comment",
      );
      expect(writeBatch).toHaveBeenCalled();
      expect(commentId).toMatch(/^generated-id-\d+$/); // Should be a generated ID
    });

    it("should soft delete a comment by setting status to deleted", async () => {
      await commentService.deleteComment("1", "user1");
      expect(runTransaction).toHaveBeenCalled();
    });
  });
  describe("userService", () => {
    const denied = Object.assign(new Error("denied"), {
      code: "permission-denied",
    });

    it("getUserById reads the public profile (name only, no email)", async () => {
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        id: "u2",
        data: () => ({ displayName: "Teammate" }),
      });
      const user = await userService.getUserById("u2");
      expect(doc).toHaveBeenCalledWith(expect.anything(), "profiles", "u2");
      expect(user).toMatchObject({ id: "u2", displayName: "Teammate" });
      expect(user?.email).toBeUndefined();
    });

    it("getUserById returns null when the profile does not exist", async () => {
      (getDoc as any).mockResolvedValueOnce({ exists: () => false });
      await expect(userService.getUserById("ghost")).resolves.toBeNull();
    });
  });
  describe("inviteService", () => {
    const ts = (d: Date) => ({ toDate: () => d });
    const inviteDoc = (over: Record<string, unknown> = {}) => ({
      exists: () => true,
      id: "tok",
      data: () => ({
        boardId: "board1",
        role: "viewer",
        createdBy: "owner1",
        createdAt: ts(new Date()),
        expiresAt: ts(new Date(Date.now() + 86_400_000)),
        ...over,
      }),
    });
    const missing = { exists: () => false, data: () => undefined };

    it("createInvite writes a 32+ char URL-safe token doc that expires in ~7 days", async () => {
      const invite = await inviteService.createInvite(
        "board1",
        "owner1",
        "editor",
      );
      expect(invite.token).toMatch(/^[A-Za-z0-9_-]{32,}$/);
      expect(doc).toHaveBeenCalledWith(
        expect.anything(),
        "invites",
        invite.token,
      );
      const [, data] = (setDoc as any).mock.calls.at(-1);
      expect(data).toMatchObject({
        boardId: "board1",
        role: "editor",
        createdBy: "owner1",
      });
      const ms = data.expiresAt.toDate().getTime() - Date.now();
      expect(ms).toBeGreaterThan(6.9 * 86_400_000);
      expect(ms).toBeLessThanOrEqual(7 * 86_400_000);
    });

    it("redeemInvite rejects an unknown or used token", async () => {
      (getDoc as any).mockResolvedValueOnce(missing);
      await expect(inviteService.redeemInvite("tok", "u2")).rejects.toThrow(
        /invalid or has already been used/,
      );
    });

    it("redeemInvite rejects an expired invite", async () => {
      (getDoc as any).mockResolvedValueOnce(
        inviteDoc({ expiresAt: ts(new Date(Date.now() - 1000)) }),
      );
      await expect(inviteService.redeemInvite("tok", "u2")).rejects.toThrow(
        /expired/,
      );
    });

    it("hasAccess is true for the creator without any reads, and checks only the user's own membership doc otherwise", async () => {
      const invite = {
        token: "tok",
        boardId: "board1",
        role: "viewer",
        createdBy: "owner1",
        createdAt: new Date(),
        expiresAt: new Date(),
      } as any;
      await expect(inviteService.hasAccess(invite, "owner1")).resolves.toBe(
        true,
      );
      (getDoc as any).mockResolvedValueOnce(missing);
      await expect(inviteService.hasAccess(invite, "u2")).resolves.toBe(false);
      expect(doc).toHaveBeenLastCalledWith(
        expect.anything(),
        "board_memberships",
        "board1_u2",
      );
    });

    it("redeemInvite leaves the invite unused for the invite's creator (owner, possibly no membership doc)", async () => {
      (getDoc as any).mockResolvedValueOnce(inviteDoc());
      const before = (writeBatch as any).mock.calls.length;
      await expect(
        inviteService.redeemInvite("tok", "owner1"),
      ).resolves.toEqual({
        boardId: "board1",
        alreadyMember: true,
      });
      expect((writeBatch as any).mock.calls.length).toBe(before);
    });

    it("redeemInvite leaves the invite unused if the user is already a member", async () => {
      (getDoc as any).mockResolvedValueOnce(inviteDoc()).mockResolvedValueOnce({
        exists: () => true,
        id: "board1_u2",
        data: () => ({
          boardId: "board1",
          userId: "u2",
          role: "editor",
          addedAt: ts(new Date()),
          updatedAt: ts(new Date()),
        }),
      }); // membership doc exists
      const before = (writeBatch as any).mock.calls.length;
      await expect(inviteService.redeemInvite("tok", "u2")).resolves.toEqual({
        boardId: "board1",
        alreadyMember: true,
      });
      expect((writeBatch as any).mock.calls.length).toBe(before);
    });

    it("redeemInvite creates the membership with the invite's role and consumes the invite in one batch", async () => {
      (getDoc as any)
        .mockResolvedValueOnce(inviteDoc())
        .mockResolvedValueOnce(missing); // no membership doc
      await expect(inviteService.redeemInvite("tok", "u2")).resolves.toEqual({
        boardId: "board1",
        alreadyMember: false,
      });
      const batch = (writeBatch as any).mock.results.at(-1).value;
      expect(batch.set.mock.calls[0][1]).toMatchObject({
        id: "board1_u2",
        boardId: "board1",
        userId: "u2",
        role: "viewer",
        inviteToken: "tok",
      });
      expect(batch.delete).toHaveBeenCalledTimes(1);
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it("redeemInvite swallows activity log failures", async () => {
      (getDoc as any)
        .mockResolvedValueOnce(inviteDoc())
        .mockResolvedValueOnce(missing);
      (addDoc as any).mockRejectedValueOnce(new Error("log failed"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(inviteService.redeemInvite("tok", "u2")).resolves.toEqual({
        boardId: "board1",
        alreadyMember: false,
      });
      expect(errSpy).toHaveBeenCalledWith(
        "Activity log error:",
        expect.any(Error),
      );
      errSpy.mockRestore();
    });

    it("listInvites returns only unexpired invites sorted newest first", async () => {
      const t1 = new Date(Date.now() - 10_000);
      const t2 = new Date(Date.now() - 5_000);
      (getDocs as any).mockResolvedValueOnce({
        docs: [
          {
            id: "old",
            data: () => ({
              boardId: "board1",
              role: "viewer",
              createdBy: "owner1",
              createdAt: ts(t1),
              expiresAt: ts(new Date(Date.now() + 86_400_000)),
            }),
          },
          {
            id: "expired",
            data: () => ({
              boardId: "board1",
              role: "viewer",
              createdBy: "owner1",
              createdAt: ts(t2),
              expiresAt: ts(new Date(Date.now() - 1000)),
            }),
          },
          {
            id: "new",
            data: () => ({
              boardId: "board1",
              role: "editor",
              createdBy: "owner1",
              createdAt: null, // tests fallback to new Date()
              expiresAt: ts(new Date(Date.now() + 86_400_000)),
            }),
          },
        ],
      });
      const invites = await inviteService.listInvites("board1");
      expect(where).toHaveBeenCalledWith("boardId", "==", "board1");
      expect(invites.map((i) => i.token)).toEqual(["new", "old"]);
    });

    it("revokeInvite deletes the invite document", async () => {
      await inviteService.revokeInvite("tok-1");
      expect(deleteDoc).toHaveBeenCalledWith(
        expect.objectContaining({ path: "invites/tok-1" }),
      );
    });
  });

  describe("activityService", () => {
    it("getBoardActivities fetches and maps activities with default and custom limit", async () => {
      const now = new Date();
      (getDocs as any).mockResolvedValueOnce({
        docs: [
          {
            id: "act1",
            data: () => ({
              boardId: "b1",
              userId: "u1",
              action: "CREATE_BOARD",
              details: { title: "Board" },
              createdAt: { toDate: () => now },
            }),
          },
        ],
      });
      const activities = await activityService.getBoardActivities("b1");
      expect(where).toHaveBeenCalledWith("boardId", "==", "b1");
      expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
      expect(limit).toHaveBeenCalledWith(50);
      expect(activities).toEqual([
        {
          id: "act1",
          boardId: "b1",
          userId: "u1",
          action: "CREATE_BOARD",
          details: { title: "Board" },
          createdAt: now,
        },
      ]);

      await activityService.getBoardActivities("b1", 25);
      expect(limit).toHaveBeenCalledWith(25);
    });
  });

  describe("boardService additional coverage", () => {
    const ts = (d: Date) => ({ toDate: () => d });

    it("isBoardMember checks membership doc first, then falls back to board owner", async () => {
      (getDoc as any).mockResolvedValueOnce({ exists: () => true });
      await expect(boardService.isBoardMember("b1", "u1")).resolves.toBe(true);

      (getDoc as any)
        .mockResolvedValueOnce({ exists: () => false })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerId: "u1", userId: "other" }),
        });
      await expect(boardService.isBoardMember("b1", "u1")).resolves.toBe(true);

      (getDoc as any)
        .mockResolvedValueOnce({ exists: () => false })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerId: "other", userId: "other" }),
        });
      await expect(boardService.isBoardMember("b1", "u1")).resolves.toBe(false);
    });

    it("verifyBoardOwnership and getBoardRole resolve membership and legacy owner", async () => {
      // Has membership doc
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        id: "b1_u1",
        data: () => ({
          boardId: "b1",
          userId: "u1",
          role: "editor",
          addedAt: ts(new Date()),
          updatedAt: ts(new Date()),
        }),
      });
      await expect(boardService.verifyBoardOwnership("b1", "u1")).resolves.toBe(
        false,
      );

      // No membership doc, but legacy board owner
      (getDoc as any)
        .mockResolvedValueOnce({ exists: () => false })
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ userId: "u1" }),
        });
      await expect(boardService.verifyBoardOwnership("b1", "u1")).resolves.toBe(
        true,
      );

      // Neither
      (getDoc as any)
        .mockResolvedValueOnce({ exists: () => false })
        .mockResolvedValueOnce({ exists: () => false });
      await expect(boardService.getBoardRole("b1", "u1")).resolves.toBeNull();
    });

    it("getUserBoards deduplicates membership + legacy boards, chunks >10 board IDs, and marks shared boards", async () => {
      (getDocs as any)
        .mockResolvedValueOnce({ docs: [] })
        .mockResolvedValueOnce({ docs: [] });
      await expect(boardService.getUserBoards("u1")).resolves.toEqual([]);

      // 11 unique boards (b1..b10 in memberships, b1 also in legacy -> deduplicated, plus b11 in legacy)
      const membershipDocs = Array.from({ length: 10 }, (_, i) => ({
        data: () => ({
          boardId: `b${i + 1}`,
          role: i === 0 ? "owner" : "editor",
        }),
      }));
      const legacyDocs = [{ id: "b1" }, { id: "b11" }];

      const firstChunkDocs = Array.from({ length: 10 }, (_, i) => ({
        id: `b${i + 1}`,
        data: () => ({
          title: `Board ${i + 1}`,
          userId: i === 0 ? "u1" : "other",
          ownerId: i === 0 ? "u1" : "other",
          status: "active",
          createdAt: ts(new Date(1000 + i)),
          updatedAt: ts(new Date(1000 + i)),
        }),
      }));
      const secondChunkDocs = [
        {
          id: "b11",
          data: () => ({
            title: "Board 11 (Legacy Owned)",
            userId: "u1",
            status: "active",
            createdAt: ts(new Date(5000)),
            updatedAt: ts(new Date(5000)),
          }),
        },
      ];

      (getDocs as any)
        .mockResolvedValueOnce({ docs: membershipDocs })
        .mockResolvedValueOnce({ docs: legacyDocs })
        .mockResolvedValueOnce({ docs: firstChunkDocs })
        .mockResolvedValueOnce({ docs: secondChunkDocs });

      const boards = await boardService.getUserBoards("u1");
      expect(boards).toHaveLength(11);
      // Sorted newest updatedAt first: b11 (5000) is first
      expect(boards[0]).toMatchObject({
        id: "b11",
        userRole: "owner",
        isShared: undefined,
      });
      // Chunking: where("__name__", "in", ...) called for chunk of 10 and chunk of 1
      expect(where).toHaveBeenCalledWith(
        "__name__",
        "in",
        Array.from({ length: 10 }, (_, i) => `b${i + 1}`),
      );
      expect(where).toHaveBeenCalledWith("__name__", "in", ["b11"]);
      // Shared board has isShared: true
      const sharedBoard = boards.find((b) => b.id === "b2");
      expect(sharedBoard).toMatchObject({
        userRole: "editor",
        isShared: true,
      });
    });

    it("updateBoard and deleteBoard enforce existence and role checks", async () => {
      // Missing board on updateBoard
      (runTransaction as any).mockImplementationOnce(
        async (_db: unknown, fn: any) =>
          fn({
            get: vi
              .fn()
              .mockResolvedValueOnce({ exists: () => false })
              .mockResolvedValueOnce({ exists: () => false }),
          }),
      );
      await expect(
        boardService.updateBoard("b1", "u1", { title: "x" }),
      ).rejects.toThrow("Board not found");

      // Viewer unauthorized on updateBoard
      (runTransaction as any).mockImplementationOnce(
        async (_db: unknown, fn: any) =>
          fn({
            get: vi
              .fn()
              .mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ ownerId: "other" }),
              })
              .mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ role: "viewer" }),
              }),
          }),
      );
      await expect(
        boardService.updateBoard("b1", "u1", { title: "x" }),
      ).rejects.toThrow("Unauthorized to update board");

      // Missing board on deleteBoard
      (runTransaction as any).mockImplementationOnce(
        async (_db: unknown, fn: any) =>
          fn({
            get: vi
              .fn()
              .mockResolvedValueOnce({ exists: () => false })
              .mockResolvedValueOnce({ exists: () => false }),
          }),
      );
      await expect(boardService.deleteBoard("b1", "u1")).rejects.toThrow(
        "Board not found",
      );

      // Non-owner unauthorized on deleteBoard
      (runTransaction as any).mockImplementationOnce(
        async (_db: unknown, fn: any) =>
          fn({
            get: vi
              .fn()
              .mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ ownerId: "other" }),
              })
              .mockResolvedValueOnce({
                exists: () => true,
                data: () => ({ role: "editor" }),
              }),
          }),
      );
      await expect(boardService.deleteBoard("b1", "u1")).rejects.toThrow(
        "Only the owner can delete the board",
      );
    });

    it("exportBoardData serializes board, lists, cards, and comments", async () => {
      (getDoc as any).mockResolvedValueOnce({ exists: () => false });
      await expect(boardService.exportBoardData("missing")).rejects.toThrow(
        "Board not found",
      );

      const now = new Date("2026-01-01T00:00:00.000Z");
      (getDoc as any)
        .mockResolvedValueOnce({
          exists: () => true,
          id: "b1",
          data: () => ({ title: "Board 1" }),
        })
        .mockResolvedValueOnce({
          exists: () => true,
          id: "u1",
          data: () => ({ displayName: "Alice" }),
        });
      (getDocs as any)
        // getBoardLists
        .mockResolvedValueOnce({
          docs: [
            {
              id: "l1",
              data: () => ({
                title: "List 1",
                boardId: "b1",
                position: 0,
                status: "active",
                createdAt: ts(now),
                updatedAt: ts(now),
              }),
            },
          ],
        })
        // getBoardCards
        .mockResolvedValueOnce({
          docs: [
            {
              id: "c1",
              data: () => ({
                title: "Card 1",
                listId: "l1",
                position: 0,
                status: "active",
                createdAt: ts(now),
                updatedAt: ts(now),
              }),
            },
          ],
        })
        // getCardComments
        .mockResolvedValueOnce({
          docs: [
            {
              id: "cm1",
              data: () => ({
                cardId: "c1",
                userId: "u1",
                content: "Hello",
                status: "active",
                createdAt: ts(now),
                updatedAt: ts(now),
              }),
            },
          ],
        });

      const exported = JSON.parse(await boardService.exportBoardData("b1"));
      expect(exported.board.id).toBe("b1");
      expect(exported.lists).toHaveLength(1);
      expect(exported.lists[0].cards).toHaveLength(1);
      expect(exported.lists[0].cards[0].comments[0].content).toBe("Hello");
    });

    it("getBoardSharingData aggregates owner and unique members", async () => {
      (getDocs as any).mockResolvedValueOnce({
        docs: [
          { data: () => ({ userId: "owner1", role: "owner" }) },
          { data: () => ({ userId: "u2", role: "editor" }) },
        ],
      });
      (getDoc as any)
        // board doc
        .mockResolvedValueOnce({
          exists: () => true,
          data: () => ({ ownerId: "owner1" }),
        })
        // owner profile
        .mockResolvedValueOnce({
          exists: () => true,
          id: "owner1",
          data: () => ({ displayName: "Owner Name" }),
        })
        // u2 profile missing -> falls back to "Unknown"
        .mockResolvedValueOnce({
          exists: () => false,
        });

      const sharing = await boardService.getBoardSharingData("b1");
      expect(sharing.isShared).toBe(true);
      expect(sharing.members).toEqual([
        {
          userId: "owner1",
          displayName: "Owner Name",
          email: undefined,
          photoURL: null,
          role: "owner",
        },
        {
          userId: "u2",
          displayName: "Unknown",
          email: undefined,
          photoURL: null,
          role: "editor",
        },
      ]);
    });
  });

  describe("listService, cardService, commentService, and helpers additional coverage", () => {
    const ts = (d: Date) => ({ toDate: () => d });

    it("listService.getListsByStatus queries by boardId/status and reorderLists writes positions to batch", async () => {
      const now = new Date();
      (getDocs as any).mockResolvedValueOnce({
        docs: [
          {
            id: "l1",
            data: () => ({
              title: "Archived List",
              boardId: "b1",
              status: "archived",
              position: 0,
              createdAt: ts(now),
              updatedAt: ts(now),
            }),
          },
        ],
      });
      const lists = await listService.getListsByStatus("b1", "archived");
      expect(where).toHaveBeenCalledWith("boardId", "==", "b1");
      expect(where).toHaveBeenCalledWith("status", "==", "archived");
      expect(orderBy).toHaveBeenCalledWith("updatedAt", "desc");
      expect(lists).toHaveLength(1);
      expect(lists[0].id).toBe("l1");

      await listService.reorderLists(
        [
          { id: "l1", position: 1 },
          { id: "l2", position: 0 },
        ],
        "u1",
      );
      const batch = (writeBatch as any).mock.results.at(-1).value;
      expect(batch.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "lists_current/l1" }),
        expect.objectContaining({ position: 1, updatedBy: "u1" }),
      );
      expect(batch.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "lists_current/l2" }),
        expect.objectContaining({ position: 0, updatedBy: "u1" }),
      );
      expect(batch.commit).toHaveBeenCalledTimes(1);
    });

    it("cardService.getBoardCards handles empty listIds and cardService.getCardsByStatus chunks >10 lists", async () => {
      await expect(cardService.getBoardCards([])).resolves.toEqual([]);

      // Empty active lists -> returns []
      (getDocs as any).mockResolvedValueOnce({ docs: [] });
      await expect(cardService.getCardsByStatus("b1", "done")).resolves.toEqual(
        [],
      );

      // 11 active lists -> 2 chunks (10 + 1), sorted across chunks by updatedAt desc
      const d1 = new Date(1000);
      const d2 = new Date(2000);
      const elevenLists = Array.from({ length: 11 }, (_, i) => ({
        id: `l${i + 1}`,
      }));
      (getDocs as any)
        .mockResolvedValueOnce({ docs: elevenLists })
        .mockResolvedValueOnce({
          docs: [
            {
              id: "c1",
              data: () => ({
                title: "Older in chunk 1",
                listId: "l1",
                status: "done",
                position: 0,
                createdAt: ts(d1),
                updatedAt: ts(d1),
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: "c2",
              data: () => ({
                title: "Newer in chunk 2",
                listId: "l11",
                status: "done",
                position: 0,
                createdAt: ts(d2),
                updatedAt: ts(d2),
              }),
            },
          ],
        });
      const doneCards = await cardService.getCardsByStatus("b1", "done");
      expect(where).toHaveBeenCalledWith(
        "listId",
        "in",
        Array.from({ length: 10 }, (_, i) => `l${i + 1}`),
      );
      expect(where).toHaveBeenCalledWith("listId", "in", ["l11"]);
      expect(where).toHaveBeenCalledWith("status", "==", "done");
      expect(doneCards.map((c) => c.id)).toEqual(["c2", "c1"]);
    });

    it("commentService.updateComment updates content and records history", async () => {
      const tx = nextTransaction({
        cardId: "c1",
        userId: "u1",
        content: "Old",
        status: "active",
      });
      await commentService.updateComment("cm1", "u1", "Updated content");
      expect(tx.set).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          changeType: "update",
          snapshot: expect.objectContaining({ content: "Updated content" }),
        }),
      );
      expect(tx.update).toHaveBeenCalledWith(
        expect.objectContaining({ path: "comments_current/cm1" }),
        expect.objectContaining({
          content: "Updated content",
          updatedBy: "u1",
        }),
      );

      // Missing comment throws
      const missingTx = nextTransaction({});
      missingTx.get.mockResolvedValueOnce({
        exists: () => false,
        data: () => ({}),
      } as any);
      await expect(
        commentService.updateComment("cm1", "u1", "x"),
      ).rejects.toThrow("Comment not found");
    });

    it("getHistoryForDocument queries collectionName/documentId/history ordered by createdAt desc and handles errors", async () => {
      (getDocs as any).mockResolvedValueOnce({
        docs: [{ id: "h1", data: () => ({ changeType: "create" }) }],
      });
      await expect(
        getHistoryForDocument("cards_current", "c1"),
      ).resolves.toEqual([{ id: "h1", changeType: "create" }]);
      expect(collection).toHaveBeenCalledWith(
        expect.anything(),
        "cards_current/c1/history",
      );
      expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");

      (getDocs as any).mockRejectedValueOnce(new Error("boom"));
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      await expect(
        getHistoryForDocument("cards_current", "c1"),
      ).resolves.toEqual([]);
      expect(errSpy).toHaveBeenCalledWith("History error:", expect.any(Error));
      errSpy.mockRestore();
    });

    it("fetchBoardDataForExport returns null for missing board or full board data", async () => {
      (getDoc as any).mockResolvedValueOnce({ exists: () => false });
      await expect(fetchBoardDataForExport("missing")).resolves.toBeNull();

      const now = new Date();
      (getDoc as any).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ title: "Exported Board" }),
      });
      (getDocs as any)
        .mockResolvedValueOnce({
          docs: [
            {
              id: "l1",
              data: () => ({
                title: "List 1",
                boardId: "b1",
                position: 0,
                status: "active",
                createdAt: ts(now),
                updatedAt: ts(now),
              }),
            },
          ],
        })
        .mockResolvedValueOnce({
          docs: [
            {
              id: "c1",
              data: () => ({
                title: "Card 1",
                listId: "l1",
                position: 0,
                status: "active",
                createdAt: ts(now),
                updatedAt: ts(now),
              }),
            },
          ],
        });

      const data = await fetchBoardDataForExport("b1");
      expect(data.title).toBe("Exported Board");
      expect(data.lists).toHaveLength(1);
      expect(data.lists[0].cards).toHaveLength(1);
      expect(data.exportedAt).toBeDefined();
    });

    it("createCard and createComment swallow activity log failures from addDoc", async () => {
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      (addDoc as any).mockRejectedValueOnce(new Error("activity write failed"));
      await expect(
        cardService.createCard("l1", "u1", "Card", "", 0),
      ).resolves.toMatch(/^generated-id-\d+$/);
      expect(errSpy).toHaveBeenCalledWith(
        "Activity log error:",
        expect.any(Error),
      );

      (addDoc as any).mockRejectedValueOnce(new Error("activity write failed"));
      await expect(
        commentService.createComment("c1", "u1", "Comment"),
      ).resolves.toMatch(/^generated-id-\d+$/);
      expect(errSpy).toHaveBeenCalledTimes(2);

      errSpy.mockRestore();
    });
  });

  describe("error handling and edge cases (v0-driftboard-6o2)", () => {
    it("propagates writeBatch.commit() failures (permission-denied, unavailable) across batch-based writes", async () => {
      const failingBatch = (err: Error) => ({
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        commit: vi.fn(() => Promise.reject(err)),
      });

      (writeBatch as any).mockReturnValueOnce(
        failingBatch(createPermissionDeniedError()),
      );
      await expect(
        boardService.createBoard("u1", "Board"),
      ).rejects.toMatchObject({ code: "permission-denied" });

      (writeBatch as any).mockReturnValueOnce(
        failingBatch(createUnavailableError()),
      );
      await expect(
        listService.createList("b1", "u1", "List", 0),
      ).rejects.toMatchObject({ code: "unavailable" });

      (writeBatch as any).mockReturnValueOnce(
        failingBatch(createPermissionDeniedError()),
      );
      await expect(
        listService.reorderLists([{ id: "l1", position: 0 }], "u1"),
      ).rejects.toMatchObject({ code: "permission-denied" });

      (writeBatch as any).mockReturnValueOnce(
        failingBatch(createUnavailableError()),
      );
      await expect(
        cardService.createCard("l1", "u1", "Card", "", 0),
      ).rejects.toMatchObject({ code: "unavailable" });

      (writeBatch as any).mockReturnValueOnce(
        failingBatch(createPermissionDeniedError()),
      );
      await expect(
        commentService.createComment("c1", "u1", "Comment"),
      ).rejects.toMatchObject({ code: "permission-denied" });
    });

    it("propagates runTransaction rejections and missing-entity errors across transaction-based writes", async () => {
      const queueMissingEntityTx = () => {
        const tx = nextTransaction({});
        tx.get.mockResolvedValue({
          exists: () => false,
          data: () => undefined,
        } as any);
        return tx;
      };

      queueMissingEntityTx();
      await expect(
        boardService.updateBoard("b1", "u1", { title: "New" }),
      ).rejects.toThrow("Board not found");

      queueMissingEntityTx();
      await expect(boardService.deleteBoard("b1", "u1")).rejects.toThrow(
        "Board not found",
      );

      queueMissingEntityTx();
      await expect(
        listService.updateList("l1", "u1", { title: "New" }),
      ).rejects.toThrow("List not found");

      queueMissingEntityTx();
      await expect(listService.deleteList("l1", "u1")).rejects.toThrow(
        "List not found",
      );

      queueMissingEntityTx();
      await expect(listService.restoreList("l1", "u1")).rejects.toThrow(
        "List not found",
      );

      queueMissingEntityTx();
      await expect(
        cardService.updateCard("c1", "u1", { title: "New" }),
      ).rejects.toThrow("Card not found");

      queueMissingEntityTx();
      await expect(
        cardService.updateCardStatus("c1", "u1", "done"),
      ).rejects.toThrow("Card not found");

      queueMissingEntityTx();
      await expect(cardService.deleteCard("c1", "u1")).rejects.toThrow(
        "Card not found",
      );

      queueMissingEntityTx();
      await expect(cardService.moveCard("c1", "u1", "l2")).rejects.toThrow(
        "Card not found",
      );

      queueMissingEntityTx();
      await expect(
        commentService.updateComment("cm1", "u1", "New"),
      ).rejects.toThrow("Comment not found");

      queueMissingEntityTx();
      await expect(commentService.deleteComment("cm1", "u1")).rejects.toThrow(
        "Comment not found",
      );

      // Transaction network/permission failure directly from runTransaction
      (runTransaction as any).mockRejectedValueOnce(createUnavailableError());
      await expect(
        cardService.updateCard("c1", "u1", { title: "Offline edit" }),
      ).rejects.toMatchObject({ code: "unavailable" });
    });
  });
});
