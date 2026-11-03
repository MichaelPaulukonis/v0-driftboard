import { describe, it, expect, vi, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../tools";
import type { DriftboardReader } from "../reader";
import { WriteError, type DriftboardWriter } from "../writer";

const now = new Date("2026-10-01T12:00:00Z");
const written = {
  id: "c1",
  title: "Card",
  status: "active" as const,
  position: 0,
  updatedAt: now,
  listId: "l1",
  createdAt: now,
};

const reader: DriftboardReader = {
  listBoards: vi.fn(async () => []),
  getBoard: vi.fn(async () => null),
  getCard: vi.fn(async () => null),
  searchCards: vi.fn(async () => []),
};

function fakeWriter(): DriftboardWriter {
  return {
    createCard: vi.fn(async () => written),
    updateCard: vi.fn(async () => written),
    moveCard: vi.fn(async () => written),
    setCardStatus: vi.fn(async () => written),
    deleteCard: vi.fn(async () => ({ ...written, status: "deleted" as const })),
    addComment: vi.fn(async () => ({
      id: "m1",
      content: "Hi",
      author: "Michael",
      createdAt: now,
    })),
  };
}

let client: Client;

async function connect(writer?: DriftboardWriter) {
  const server = new McpServer({ name: "driftboard-test", version: "0.0.0" });
  registerTools(server, reader, writer);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
  return client;
}

afterEach(async () => {
  await client?.close();
  vi.restoreAllMocks();
});

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[])[0].text;

describe("write tools", () => {
  it("are not registered without a writer", async () => {
    const { tools } = await (await connect()).listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_board",
      "get_card",
      "list_boards",
      "search_cards",
    ]);
  });

  it("update_card accepts an empty description (clears it)", async () => {
    const writer = fakeWriter();
    await (
      await connect(writer)
    ).callTool({
      name: "update_card",
      arguments: { cardId: "c1", description: "" },
    });
    expect(writer.updateCard).toHaveBeenCalledWith("c1", { description: "" });
  });

  it("are registered with a writer, and only delete_card is destructive", async () => {
    const { tools } = await (await connect(fakeWriter())).listTools();
    const writes = tools.filter((t) => !t.annotations?.readOnlyHint);
    expect(writes.map((t) => t.name).sort()).toEqual([
      "add_comment",
      "create_card",
      "delete_card",
      "move_card",
      "set_card_status",
      "update_card",
    ]);
    for (const tool of writes)
      expect(tool.annotations?.destructiveHint).toBe(
        tool.name === "delete_card",
      );
  });

  it("create_card returns the card as JSON", async () => {
    const writer = fakeWriter();
    const result = await (
      await connect(writer)
    ).callTool({
      name: "create_card",
      arguments: { listId: "l1", title: "New" },
    });
    expect(writer.createCard).toHaveBeenCalledWith({
      listId: "l1",
      title: "New",
    });
    expect(JSON.parse(text(result))).toMatchObject({
      id: "c1",
      listId: "l1",
      updatedAt: "2026-10-01T12:00:00.000Z",
    });
  });

  it("update_card needs a title or description", async () => {
    const writer = fakeWriter();
    const result = await (
      await connect(writer)
    ).callTool({
      name: "update_card",
      arguments: { cardId: "c1" },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/needs a title or description/);
    expect(writer.updateCard).not.toHaveBeenCalled();
  });

  it("move_card passes position through", async () => {
    const writer = fakeWriter();
    await (
      await connect(writer)
    ).callTool({
      name: "move_card",
      arguments: { cardId: "c1", listId: "l2", position: 0 },
    });
    expect(writer.moveCard).toHaveBeenCalledWith("c1", "l2", 0);
  });

  it("set_card_status rejects statuses other than active/done/archived", async () => {
    const writer = fakeWriter();
    const result = await (
      await connect(writer)
    ).callTool({
      name: "set_card_status",
      arguments: { cardId: "c1", status: "deleted" },
    });
    expect(result.isError).toBe(true);
    expect(writer.setCardStatus).not.toHaveBeenCalled();
  });

  it("shows WriteError messages as-is", async () => {
    const writer = fakeWriter();
    vi.mocked(writer.deleteCard).mockRejectedValueOnce(
      new WriteError(`Your role on "Shared" (viewer) can't delete cards.`),
    );
    const result = await (
      await connect(writer)
    ).callTool({
      name: "delete_card",
      arguments: { cardId: "c1" },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toBe(
      `Your role on "Shared" (viewer) can't delete cards.`,
    );
  });

  it("hides unexpected errors behind a generic message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const writer = fakeWriter();
    vi.mocked(writer.addComment).mockRejectedValueOnce(new Error("boom"));
    const result = await (
      await connect(writer)
    ).callTool({
      name: "add_comment",
      arguments: { cardId: "c1", content: "Hi" },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/write failed/);
    expect(text(result)).not.toMatch(/boom/);
  });
});
