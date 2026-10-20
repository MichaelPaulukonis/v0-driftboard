import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { DriftboardReader } from "./reader";

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

function json(value: unknown): CallToolResult {
  // Dates serialize to ISO strings via JSON.stringify.
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function notFound(what: string, id: string): CallToolResult {
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `${what} ${id} not found, or you don't have access.`,
      },
    ],
  };
}

/** Registers the read-only Driftboard tools on `server`, backed by `reader`. */
export function registerTools(server: McpServer, reader: DriftboardReader) {
  server.registerTool(
    "list_boards",
    {
      title: "List boards",
      description:
        "List the Driftboard boards you own or are a member of, with your role on each. Use the ids with get_board or search_cards.",
      annotations: readOnly,
    },
    async () => json(await reader.listBoards()),
  );

  server.registerTool(
    "get_board",
    {
      title: "Get board",
      description:
        "Get one board with its active lists and their active cards, in display order. Done/archived cards are not included.",
      inputSchema: {
        boardId: z.string().min(1).describe("Board id from list_boards"),
      },
      annotations: readOnly,
    },
    async ({ boardId }) => {
      const board = await reader.getBoard(boardId);
      return board ? json(board) : notFound("Board", boardId);
    },
  );

  server.registerTool(
    "get_card",
    {
      title: "Get card",
      description:
        "Get one card (active, done, or archived) with its comments. Deleted cards are not returned.",
      inputSchema: {
        cardId: z
          .string()
          .min(1)
          .describe("Card id from get_board or search_cards"),
      },
      annotations: readOnly,
    },
    async ({ cardId }) => {
      const card = await reader.getCard(cardId);
      return card ? json(card) : notFound("Card", cardId);
    },
  );

  server.registerTool(
    "search_cards",
    {
      title: "Search cards",
      description:
        "Find active cards whose title or description contains the text (case-insensitive), across all your boards or one board. Returns board and list context for each hit.",
      inputSchema: {
        query: z.string().min(1).describe("Text to look for"),
        boardId: z
          .string()
          .min(1)
          .optional()
          .describe("Limit the search to this board"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(200)
          .optional()
          .describe("Max results (default 50)"),
      },
      annotations: readOnly,
    },
    async ({ query, boardId, limit }) =>
      json(await reader.searchCards(query, { boardId, limit })),
  );
}
