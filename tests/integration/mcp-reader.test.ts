import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createFirebaseReader } from "@/mcp/firebase-reader";
import {
  seedMultiUserScenario,
  signInAsSeedUser,
  signOutSeedUser,
  type SeedScenario,
} from "./seed";

// Run with `pnpm test:integration` (starts Firebase Auth + Firestore emulators).

let seeded: SeedScenario;

beforeAll(async () => {
  seeded = await seedMultiUserScenario();
});

afterAll(async () => {
  await signOutSeedUser();
});

describe("MCP Firebase reader integration (Auth + Firestore emulators)", () => {
  describe("listBoards", () => {
    it("returns owned and shared boards with role='owner' for owner, excluding deleted and outsider boards", async () => {
      const owner = await signInAsSeedUser("owner");
      const reader = createFirebaseReader(owner.uid);

      const boards = await reader.listBoards();
      const byId = new Map(boards.map((b) => [b.id, b]));

      expect(byId.get(seeded.ownedBoard.boardId)?.role).toBe("owner");
      expect(byId.get(seeded.sharedBoard.boardId)?.role).toBe("owner");
      expect(byId.has(seeded.deletedBoard.boardId)).toBe(false);
      expect(byId.has(seeded.outsiderBoard.boardId)).toBe(false);
    });

    it("returns only the shared board with role='editor' and isShared=true for editor", async () => {
      const editor = await signInAsSeedUser("editor");
      const reader = createFirebaseReader(editor.uid);

      const boards = await reader.listBoards();
      expect(boards).toHaveLength(1);
      expect(boards[0]).toMatchObject({
        id: seeded.sharedBoard.boardId,
        title: "Team Shared Board",
        role: "editor",
        isShared: true,
      });
    });

    it("returns only the shared board with role='viewer' and isShared=true for viewer", async () => {
      const viewer = await signInAsSeedUser("viewer");
      const reader = createFirebaseReader(viewer.uid);

      const boards = await reader.listBoards();
      expect(boards).toHaveLength(1);
      expect(boards[0]).toMatchObject({
        id: seeded.sharedBoard.boardId,
        title: "Team Shared Board",
        role: "viewer",
        isShared: true,
      });
    });

    it("returns only the outsider's own board for outsider", async () => {
      const outsider = await signInAsSeedUser("outsider");
      const reader = createFirebaseReader(outsider.uid);

      const boards = await reader.listBoards();
      expect(boards.map((b) => b.id)).toEqual([seeded.outsiderBoard.boardId]);
    });
  });

  describe("getBoard", () => {
    it("returns active lists and active cards in position order, excluding deleted lists and non-active cards", async () => {
      const viewer = await signInAsSeedUser("viewer");
      const reader = createFirebaseReader(viewer.uid);

      const detail = await reader.getBoard(seeded.sharedBoard.boardId);
      expect(detail).not.toBeNull();
      expect(detail!.board.role).toBe("viewer");

      // Deleted list excluded; active lists sorted by position
      expect(detail!.lists.map((l) => l.title)).toEqual([
        "Todo",
        "In Progress",
      ]);

      // Only active cards included, sorted by position (0 then 1)
      const todoCards = detail!.lists[0].cards;
      expect(todoCards.map((c) => c.id)).toEqual([
        seeded.sharedBoard.activeCard1Id,
        seeded.sharedBoard.activeCard2Id,
      ]);
    });

    it("returns null for a board the user has no access to, a deleted board, or a missing board", async () => {
      const viewer = await signInAsSeedUser("viewer");
      const reader = createFirebaseReader(viewer.uid);

      expect(await reader.getBoard(seeded.ownedBoard.boardId)).toBeNull();
      expect(await reader.getBoard(seeded.outsiderBoard.boardId)).toBeNull();
      expect(await reader.getBoard(seeded.deletedBoard.boardId)).toBeNull();
      expect(await reader.getBoard("nonexistent-board-id")).toBeNull();
    });
  });

  describe("getCard", () => {
    it("returns active, done, and archived cards with author-resolved comments for a shared-board member", async () => {
      const viewer = await signInAsSeedUser("viewer");
      const reader = createFirebaseReader(viewer.uid);

      const active = await reader.getCard(seeded.sharedBoard.activeCard1Id);
      expect(active).not.toBeNull();
      expect(active!.card.title).toBe("Ship MCP reader");
      expect(
        active!.comments.map((c) => ({
          content: c.content,
          author: c.author,
        })),
      ).toEqual([
        { content: "Initial spec ready", author: "Alice Owner" },
        { content: "LGTM from editor", author: "Bob Editor" },
      ]);

      const done = await reader.getCard(seeded.sharedBoard.doneCardId);
      expect(done?.card.status).toBe("done");

      const archived = await reader.getCard(seeded.sharedBoard.archivedCardId);
      expect(archived?.card.status).toBe("archived");
    });

    it("returns null for soft-deleted cards, cards on deleted lists/boards, and cards on no-access boards", async () => {
      const owner = await signInAsSeedUser("owner");
      const ownerReader = createFirebaseReader(owner.uid);

      expect(
        await ownerReader.getCard(seeded.sharedBoard.deletedCardId),
      ).toBeNull();
      expect(
        await ownerReader.getCard(seeded.sharedBoard.doneCardInDeletedListId),
      ).toBeNull();
      expect(await ownerReader.getCard(seeded.deletedBoard.cardId)).toBeNull();
      expect(await ownerReader.getCard(seeded.outsiderBoard.cardId)).toBeNull();

      const outsider = await signInAsSeedUser("outsider");
      const outsiderReader = createFirebaseReader(outsider.uid);
      expect(
        await outsiderReader.getCard(seeded.sharedBoard.activeCard1Id),
      ).toBeNull();
    });
  });

  describe("searchCards", () => {
    it("scopes results to boards visible to the signed-in user and excludes deleted cards", async () => {
      const editor = await signInAsSeedUser("editor");
      const editorReader = createFirebaseReader(editor.uid);

      // "Ship MCP reader" is in activeCard1, deletedCard, and outsiderCard - editor should only see activeCard1
      const hits = await editorReader.searchCards("Ship MCP reader");
      expect(hits.map((h) => h.card.id)).toEqual([
        seeded.sharedBoard.activeCard1Id,
      ]);
      expect(hits[0]).toMatchObject({
        boardId: seeded.sharedBoard.boardId,
        boardTitle: "Team Shared Board",
        listId: seeded.sharedBoard.todoListId,
        listTitle: "Todo",
      });

      // Owner private card is invisible to editor, visible to owner
      expect(await editorReader.searchCards("Renew domain")).toEqual([]);

      const owner = await signInAsSeedUser("owner");
      const ownerReader = createFirebaseReader(owner.uid);
      const ownerHits = await ownerReader.searchCards("Renew domain");
      expect(ownerHits.map((h) => h.card.id)).toEqual([
        seeded.ownedBoard.cardId,
      ]);
    });
  });
});
