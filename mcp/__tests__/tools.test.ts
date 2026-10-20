import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerTools } from "../tools";
import type { DriftboardReader } from "../reader";

const now = new Date("2026-10-01T12:00:00Z");

function fakeReader(): DriftboardReader {
  return {
    listBoards: vi.fn(async () => [
      { id: "b1", title: "Work", role: "owner" as const, updatedAt: now },
    ]),
    getBoard: vi.fn(async (id: string) =>
      id === "b1"
        ? { board: { id: "b1", title: "Work", updatedAt: now }, lists: [] }
        : null,
    ),
    getCard: vi.fn(async () => null),
    searchCards: vi.fn(async () => []),
  };
}

let client: Client;
let reader: DriftboardReader;

beforeEach(async () => {
  reader = fakeReader();
  const server = new McpServer({ name: "driftboard-test", version: "0.0.0" });
  registerTools(server, reader);
  const [clientTransport, serverTransport] =
    InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test-client", version: "0.0.0" });
  await Promise.all([
    server.connect(serverTransport),
    client.connect(clientTransport),
  ]);
});

afterEach(async () => {
  await client.close();
});

const text = (result: Awaited<ReturnType<Client["callTool"]>>) =>
  (result.content as { type: string; text: string }[])[0].text;

describe("registerTools", () => {
  it("exposes four read-only tools", async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_board",
      "get_card",
      "list_boards",
      "search_cards",
    ]);
    expect(tools.every((t) => t.annotations?.readOnlyHint)).toBe(true);
  });

  it("list_boards returns JSON with ISO dates", async () => {
    const result = await client.callTool({
      name: "list_boards",
      arguments: {},
    });
    expect(JSON.parse(text(result))).toEqual([
      {
        id: "b1",
        title: "Work",
        role: "owner",
        updatedAt: "2026-10-01T12:00:00.000Z",
      },
    ]);
  });

  it("get_board reports not-found as a tool error", async () => {
    const result = await client.callTool({
      name: "get_board",
      arguments: { boardId: "nope" },
    });
    expect(result.isError).toBe(true);
    expect(text(result)).toMatch(/not found, or you don't have access/);
  });

  it("search_cards passes boardId and limit through", async () => {
    await client.callTool({
      name: "search_cards",
      arguments: { query: "ship", boardId: "b1", limit: 5 },
    });
    expect(reader.searchCards).toHaveBeenCalledWith("ship", {
      boardId: "b1",
      limit: 5,
    });
  });

  it("rejects invalid arguments", async () => {
    const result = await client.callTool({
      name: "get_card",
      arguments: { cardId: "" },
    });
    expect(result.isError).toBe(true);
    expect(reader.getCard).not.toHaveBeenCalled();
  });
});
