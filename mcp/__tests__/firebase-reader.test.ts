import { describe, it, expect, vi } from "vitest";
import { createFirebaseReader, type ReaderServices } from "../firebase-reader";
import type { Board, Card, CommentWithUser, List } from "@/lib/types";

vi.mock("@/lib/firebase");

const now = new Date("2026-10-01T12:00:00Z");

const board = (
  id: string,
  title: string,
  extra: Partial<Board> = {},
): Board => ({
  id,
  title,
  userId: "owner",
  ownerId: "owner",
  createdAt: now,
  updatedAt: now,
  status: "active",
  userRole: "owner",
  ...extra,
});

const list = (id: string, boardId: string, position: number): List => ({
  id,
  boardId,
  title: `List ${id}`,
  position,
  createdAt: now,
  updatedAt: now,
  status: "active",
});

const card = (
  id: string,
  listId: string,
  position: number,
  extra: Partial<Card> = {},
): Card => ({
  id,
  listId,
  title: `Card ${id}`,
  position,
  createdAt: now,
  updatedAt: now,
  status: "active",
  ...extra,
});

function makeServices(
  overrides: Partial<{
    boards: Board[];
    lists: Record<string, List[]>;
    cards: Card[];
    getCard: ReaderServices["cardService"]["getCard"];
    comments: CommentWithUser[];
  }> = {},
) {
  const boards = overrides.boards ?? [board("b1", "Work")];
  const lists = overrides.lists ?? {
    b1: [list("l2", "b1", 1), list("l1", "b1", 0)],
  };
  const cards = overrides.cards ?? [
    card("c2", "l1", 1, {
      title: "Write tests",
      description: "for the MCP reader",
    }),
    card("c1", "l1", 0, { title: "Spike" }),
    card("c3", "l2", 0, { title: "Ship it" }),
  ];
  const services = {
    boardService: { getUserBoards: vi.fn(async () => boards) },
    listService: {
      getBoardLists: vi.fn(async (boardId: string) => lists[boardId] ?? []),
    },
    cardService: {
      getBoardCards: vi.fn(async (listIds: string[]) =>
        cards.filter((c) => listIds.includes(c.listId)),
      ),
      getCard:
        overrides.getCard ??
        vi.fn(async (id: string) => cards.find((c) => c.id === id) ?? null),
    },
    commentService: {
      getCardComments: vi.fn(async () => overrides.comments ?? []),
    },
  };
  return services satisfies ReaderServices;
}

describe("createFirebaseReader", () => {
  describe("listBoards", () => {
    it("returns summaries with the user's role", async () => {
      const services = makeServices({
        boards: [
          board("b1", "Work"),
          board("b2", "Shared", { userRole: "viewer", isShared: true }),
        ],
      });
      const reader = createFirebaseReader("u1", services);

      const boards = await reader.listBoards();

      expect(services.boardService.getUserBoards).toHaveBeenCalledWith("u1");
      expect(boards).toEqual([
        expect.objectContaining({ id: "b1", title: "Work", role: "owner" }),
        expect.objectContaining({ id: "b2", role: "viewer", isShared: true }),
      ]);
      expect(boards[0]).not.toHaveProperty("ownerId");
    });
  });

  describe("getBoard", () => {
    it("returns lists and cards in position order", async () => {
      const reader = createFirebaseReader("u1", makeServices());

      const detail = await reader.getBoard("b1");

      expect(detail?.board.title).toBe("Work");
      expect(detail?.lists.map((l) => l.id)).toEqual(["l1", "l2"]);
      expect(detail?.lists[0].cards.map((c) => c.id)).toEqual(["c1", "c2"]);
      expect(detail?.lists[1].cards.map((c) => c.id)).toEqual(["c3"]);
    });

    it("returns null for a board the user cannot see", async () => {
      const services = makeServices();
      const reader = createFirebaseReader("u1", services);

      expect(await reader.getBoard("someone-elses")).toBeNull();
      expect(services.listService.getBoardLists).not.toHaveBeenCalled();
    });
  });

  describe("getCard", () => {
    it("returns the card with comments and author names", async () => {
      const reader = createFirebaseReader(
        "u1",
        makeServices({
          comments: [
            {
              id: "m1",
              cardId: "c1",
              userId: "u2",
              content: "Looks good",
              createdAt: now,
              updatedAt: now,
              status: "active",
              editHistory: [],
              user: { email: "bea@example.test" },
            },
          ],
        }),
      );

      const detail = await reader.getCard("c1");

      expect(detail?.card).toMatchObject({
        id: "c1",
        listId: "l1",
        title: "Spike",
      });
      expect(detail?.comments).toEqual([
        {
          id: "m1",
          content: "Looks good",
          author: "bea@example.test",
          createdAt: now,
        },
      ]);
    });

    it("returns done cards", async () => {
      const reader = createFirebaseReader(
        "u1",
        makeServices({ cards: [card("c9", "l1", 0, { status: "done" })] }),
      );
      expect((await reader.getCard("c9"))?.card.status).toBe("done");
    });

    it("returns null for missing or deleted cards", async () => {
      const reader = createFirebaseReader(
        "u1",
        makeServices({ cards: [card("gone", "l1", 0, { status: "deleted" })] }),
      );
      expect(await reader.getCard("gone")).toBeNull();
      expect(await reader.getCard("never-existed")).toBeNull();
    });

    it("returns null when security rules deny the read", async () => {
      const denied = Object.assign(
        new Error("Missing or insufficient permissions."),
        {
          code: "permission-denied",
        },
      );
      const reader = createFirebaseReader(
        "u1",
        makeServices({ getCard: vi.fn(async () => Promise.reject(denied)) }),
      );
      expect(await reader.getCard("c1")).toBeNull();
    });

    it("rethrows other errors", async () => {
      const reader = createFirebaseReader(
        "u1",
        makeServices({
          getCard: vi.fn(async () => Promise.reject(new Error("offline"))),
        }),
      );
      await expect(reader.getCard("c1")).rejects.toThrow("offline");
    });
  });

  describe("searchCards", () => {
    it("matches title or description case-insensitively, with board and list context", async () => {
      const reader = createFirebaseReader("u1", makeServices());

      const hits = await reader.searchCards("MCP");

      expect(hits).toEqual([
        expect.objectContaining({
          boardId: "b1",
          boardTitle: "Work",
          listId: "l1",
          listTitle: "List l1",
          card: expect.objectContaining({ id: "c2" }),
        }),
      ]);
    });

    it("restricts to one board when boardId is given", async () => {
      const services = makeServices({
        boards: [board("b1", "Work"), board("b2", "Home")],
        lists: { b1: [list("l1", "b1", 0)], b2: [list("l9", "b2", 0)] },
        cards: [
          card("c1", "l1", 0, { title: "ship" }),
          card("c9", "l9", 0, { title: "ship" }),
        ],
      });
      const reader = createFirebaseReader("u1", services);

      const hits = await reader.searchCards("ship", { boardId: "b2" });

      expect(hits.map((h) => h.card.id)).toEqual(["c9"]);
      expect(services.listService.getBoardLists).toHaveBeenCalledTimes(1);
    });

    it("stops at the limit", async () => {
      const reader = createFirebaseReader("u1", makeServices());
      expect(await reader.searchCards("s", { limit: 0 })).toHaveLength(0);
      expect(await reader.searchCards("s", { limit: 2 })).toHaveLength(2);
    });

    it("returns nothing for a blank query", async () => {
      const services = makeServices();
      const reader = createFirebaseReader("u1", services);
      expect(await reader.searchCards("   ")).toEqual([]);
      expect(services.boardService.getUserBoards).not.toHaveBeenCalled();
    });
  });
});
