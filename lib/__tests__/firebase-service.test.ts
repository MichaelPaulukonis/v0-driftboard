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
} from "firebase/firestore";
import {
  boardService,
  listService,
  cardService,
  commentService,
  userService,
  inviteService,
} from "../firebase-service";

// Mock the firebase module and all Firestore functions
vi.mock("../firebase");
vi.mock("firebase/firestore", async () => {
  let docIdCounter = 0;
  const generateId = () => `generated-id-${++docIdCounter}`;

  // Provide mock implementations for all Firestore functions used
  return {
    collection: vi.fn(() => ({ mock: true })),
    getDocs: vi.fn(),
    doc: vi.fn((db: any, collectionName: string, id?: string) => ({
      id: id || generateId(), // Generate ID if not provided, like Firebase does
      path: `${collectionName}/${id || generateId()}`,
    })),
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
    getDoc: vi.fn((ref: any) => {
      if (ref.path.includes("users")) {
        return Promise.resolve({
          exists: () => true,
          data: () => ({ displayName: "Test User", email: "test@example.com" }),
          id: "mock-user-id",
        });
      }
      return Promise.resolve({
        exists: () => true,
        data: () => ({ userId: "user1", ownerId: "user1" }),
        id: "mock-id",
      });
    }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    })),
    limit: vi.fn(),
    runTransaction: vi.fn((db: any, updateFunction: any) => {
      const transaction = {
        get: vi.fn((ref: any) => {
          if (ref.path.includes("board_memberships")) {
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
    }),
  };
});

describe("Firebase Services", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      await boardService.updateBoard("1", "user1", { title: "Updated Board" });
      expect(runTransaction).toHaveBeenCalled();
    });

    it("should soft delete a board by setting status to deleted", async () => {
      await boardService.deleteBoard("1", "user1");
      expect(runTransaction).toHaveBeenCalled();
    });
  });

  describe("listService", () => {
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

    it("should soft delete a card by setting status to deleted", async () => {
      await cardService.deleteCard("1", "user1");
      expect(runTransaction).toHaveBeenCalled();
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
  });
});
