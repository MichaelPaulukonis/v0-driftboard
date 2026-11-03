import { describe, it, expect, vi } from "vitest";
import { createFirebaseWriter, type WriterServices } from "../firebase-writer";
import { WriteError } from "../writer";
import type { Board, Card, CommentWithUser, List } from "@/lib/types";

vi.mock("@/lib/firebase");

const now = new Date("2026-10-01T12:00:00Z");
const MCP = { source: "mcp" };

const board = (
  id: string,
  title: string,
  extra: Partial<Board> = {},
): Board => ({
  id,
  title,
  userId: "u1",
  ownerId: "u1",
  createdAt: now,
  updatedAt: now,
  status: "active",
  userRole: "owner",
  ...extra,
});

const list = (id: string, boardId: string): List => ({
  id,
  boardId,
  title: `List ${id}`,
  position: 0,
  createdAt: now,
  updatedAt: now,
  status: "active",
});

const card = (id: string, listId: string, extra: Partial<Card> = {}): Card => ({
  id,
  listId,
  title: `Card ${id}`,
  position: 0,
  createdAt: now,
  updatedAt: now,
  status: "active",
  ...extra,
});

// b1 "Work" owned (l1, l2); b2 "Shared" as viewer (l3); b3 "Home" owned (l4).
function makeServices(cards: Card[] = [card("c1", "l1"), card("c3", "l3")]) {
  const boards = [
    board("b1", "Work"),
    board("b2", "Shared", { userRole: "viewer", isShared: true }),
    board("b3", "Home"),
  ];
  const lists: Record<string, List[]> = {
    b1: [list("l1", "b1"), list("l2", "b1")],
    b2: [list("l3", "b2")],
    b3: [list("l4", "b3")],
  };
  const comments: CommentWithUser[] = [
    {
      id: "m1",
      cardId: "c1",
      userId: "u1",
      content: "Hi",
      createdAt: now,
      updatedAt: now,
      status: "active",
      editHistory: [],
      user: { displayName: "Michael", email: "m@example.test" },
    },
  ];
  const services = {
    boardService: { getUserBoards: vi.fn(async () => boards) },
    listService: {
      getBoardLists: vi.fn(async (boardId: string) => lists[boardId] ?? []),
    },
    cardService: {
      getCard: vi.fn(
        async (id: string) => cards.find((c) => c.id === id) ?? null,
      ),
      createCard: vi.fn(async () => {
        cards.push(card("new", "l1", { title: "New" }));
        return "new";
      }),
      updateCard: vi.fn(async (..._args: unknown[]) => {}),
      updateCardStatus: vi.fn(async () => {}),
      moveCard: vi.fn(async () => {}),
      deleteCard: vi.fn(async (id: string) => {
        const target = cards.find((c) => c.id === id);
        if (target) target.status = "deleted";
      }),
    },
    commentService: {
      createComment: vi.fn(async () => "m1"),
      getCardComments: vi.fn(async () => comments),
    },
  };
  return services satisfies WriterServices;
}

describe("createFirebaseWriter", () => {
  it("creates a card and returns it", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    const created = await writer.createCard({
      listId: "l1",
      title: "New",
      description: "d",
    });

    expect(services.cardService.createCard).toHaveBeenCalledWith(
      "l1",
      "u1",
      "New",
      "d",
      undefined,
      MCP,
    );
    expect(created).toMatchObject({
      id: "new",
      listId: "l1",
      title: "New",
      status: "active",
    });
  });

  it("refuses writes the user's role doesn't allow", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    await expect(
      writer.createCard({ listId: "l3", title: "x" }),
    ).rejects.toThrow(`Your role on "Shared" (viewer) can't create cards.`);
    await expect(writer.addComment("c3", "hi")).rejects.toThrow(
      `Your role on "Shared" (viewer) can't comment.`,
    );
    expect(services.cardService.createCard).not.toHaveBeenCalled();
    expect(services.commentService.createComment).not.toHaveBeenCalled();
  });

  it("reports unknown lists as not found", async () => {
    const writer = createFirebaseWriter("u1", makeServices());
    await expect(
      writer.createCard({ listId: "nope", title: "x" }),
    ).rejects.toThrow("List nope not found, or you don't have access.");
  });

  it("reports deleted cards and cards on invisible lists as not found", async () => {
    const writer = createFirebaseWriter(
      "u1",
      makeServices([
        card("gone", "l1", { status: "deleted" }),
        card("orphan", "l-gone"),
      ]),
    );
    await expect(writer.updateCard("gone", { title: "x" })).rejects.toThrow(
      "Card gone not found, or you don't have access.",
    );
    await expect(writer.updateCard("orphan", { title: "x" })).rejects.toThrow(
      "Card orphan not found, or you don't have access.",
    );
  });

  it("updates only the fields given", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    await writer.updateCard("c1", { title: "Renamed", description: undefined });

    expect(services.cardService.updateCard.mock.calls[0]).toEqual([
      "c1",
      "u1",
      { title: "Renamed" },
      MCP,
    ]);
    expect(services.cardService.updateCard.mock.calls[0][2]).not.toHaveProperty(
      "description",
    );
  });

  it("moves a card within its board", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    await writer.moveCard("c1", "l2", 0);

    expect(services.cardService.moveCard).toHaveBeenCalledWith(
      "c1",
      "u1",
      "l2",
      0,
      MCP,
    );
  });

  it("refuses to move non-active cards", async () => {
    const services = makeServices([card("cd", "l1", { status: "done" })]);
    const writer = createFirebaseWriter("u1", services);

    await expect(writer.moveCard("cd", "l2")).rejects.toThrow(
      "move_card only moves active cards; card cd is done.",
    );
    expect(services.cardService.moveCard).not.toHaveBeenCalled();
  });

  it("refuses moves between boards", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    await expect(writer.moveCard("c1", "l4")).rejects.toThrow(
      "move_card can't move between boards (Work → Home).",
    );
    expect(services.cardService.moveCard).not.toHaveBeenCalled();
  });

  it("sets card status", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    await writer.setCardStatus("c1", "done");

    expect(services.cardService.updateCardStatus).toHaveBeenCalledWith(
      "c1",
      "u1",
      "done",
      MCP,
    );
  });

  it("soft-deletes a card and returns it with deleted status", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    const deleted = await writer.deleteCard("c1");

    expect(services.cardService.deleteCard).toHaveBeenCalledWith(
      "c1",
      "u1",
      MCP,
    );
    expect(deleted.status).toBe("deleted");
  });

  it("adds a comment and returns it with the author name", async () => {
    const services = makeServices();
    const writer = createFirebaseWriter("u1", services);

    const comment = await writer.addComment("c1", "Hi");

    expect(services.commentService.createComment).toHaveBeenCalledWith(
      "c1",
      "u1",
      "Hi",
      MCP,
    );
    expect(comment).toEqual({
      id: "m1",
      content: "Hi",
      author: "Michael",
      createdAt: now,
    });
  });

  it("maps rules denials to not found", async () => {
    const services = makeServices();
    services.cardService.updateCard.mockRejectedValueOnce(
      Object.assign(new Error("Missing or insufficient permissions."), {
        code: "permission-denied",
      }),
    );
    const writer = createFirebaseWriter("u1", services);

    await expect(writer.updateCard("c1", { title: "x" })).rejects.toThrow(
      "Card c1 not found, or you don't have access.",
    );
  });

  it("uses WriteError for user-facing failures and rethrows others", async () => {
    const services = makeServices();
    services.cardService.updateCard.mockRejectedValueOnce(
      new Error("network down"),
    );
    const writer = createFirebaseWriter("u1", services);

    await expect(
      writer.createCard({ listId: "nope", title: "x" }),
    ).rejects.toBeInstanceOf(WriteError);
    const failure = writer.updateCard("c1", { title: "x" });
    await expect(failure).rejects.toThrow("network down");
    await expect(failure).rejects.not.toBeInstanceOf(WriteError);
  });
});
