import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import type { DriftboardReader } from "./reader";
import { WriteError, type DriftboardWriter } from "./writer";

const readOnly = { readOnlyHint: true, openWorldHint: false } as const;

function json(value: unknown): CallToolResult {
  // Dates serialize to ISO strings via JSON.stringify.
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

const write = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
} as const;
const destructive = { ...write, destructiveHint: true } as const;

function errorText(text: string): CallToolResult {
  return { isError: true, content: [{ type: "text", text }] };
}

function notFound(what: string, id: string): CallToolResult {
  return errorText(`${what} ${id} not found, or you don't have access.`);
}

// WriteError messages are written for the agent; anything else stays in the log.
async function runWrite(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return json(await fn());
  } catch (error) {
    if (error instanceof WriteError) return errorText(error.message);
    console.error("[driftboard-mcp]", error);
    return errorText("Driftboard write failed; see the MCP server log.");
  }
}

/**
 * Registers the Driftboard tools on `server`: read tools backed by `reader`,
 * plus write tools when a `writer` is given.
 */
export function registerTools(
  server: McpServer,
  reader: DriftboardReader,
  writer?: DriftboardWriter,
) {
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
  if (writer) registerWriteTools(server, writer);
}

const cardIdArg = z
  .string()
  .min(1)
  .describe("Card id from get_board or search_cards");
const listIdArg = z.string().min(1).describe("List id from get_board");

function registerWriteTools(server: McpServer, writer: DriftboardWriter) {
  server.registerTool(
    "create_card",
    {
      title: "Create card",
      description:
        "Create a card at the bottom of a list. Returns the new card.",
      inputSchema: {
        listId: listIdArg,
        title: z.string().min(1).describe("Card title"),
        description: z.string().optional().describe("Card description"),
      },
      annotations: write,
    },
    async ({ listId, title, description }) =>
      runWrite(() => writer.createCard({ listId, title, description })),
  );

  server.registerTool(
    "update_card",
    {
      title: "Update card",
      description:
        "Change a card's title and/or description. Give at least one. Returns the updated card.",
      inputSchema: {
        cardId: cardIdArg,
        title: z.string().min(1).optional().describe("New title"),
        description: z
          .string()
          .optional()
          .describe("New description (empty string clears it)"),
      },
      annotations: write,
    },
    async ({ cardId, title, description }) =>
      title === undefined && description === undefined
        ? errorText("update_card needs a title or description.")
        : runWrite(() => writer.updateCard(cardId, { title, description })),
  );

  server.registerTool(
    "move_card",
    {
      title: "Move card",
      description:
        "Move an active card to a position in a list on the same board (same list reorders). Position is 0-based; omit it for the bottom. Done/archived cards can't be moved - restore them with set_card_status first. Returns the moved card.",
      inputSchema: {
        cardId: cardIdArg,
        listId: listIdArg,
        position: z
          .number()
          .int()
          .min(0)
          .optional()
          .describe("0-based position; omit for bottom"),
      },
      annotations: write,
    },
    async ({ cardId, listId, position }) =>
      runWrite(() => writer.moveCard(cardId, listId, position)),
  );

  server.registerTool(
    "set_card_status",
    {
      title: "Set card status",
      description:
        "Mark a card done, archive it, or restore it to active (restored cards go to the bottom of their list). Returns the card.",
      inputSchema: {
        cardId: cardIdArg,
        status: z.enum(["active", "done", "archived"]).describe("New status"),
      },
      annotations: write,
    },
    async ({ cardId, status }) =>
      runWrite(() => writer.setCardStatus(cardId, status)),
  );

  server.registerTool(
    "delete_card",
    {
      title: "Delete card",
      description:
        "Soft-delete a card. It disappears from the board and from these tools; the user can restore it from the board's Deleted view.",
      inputSchema: { cardId: cardIdArg },
      annotations: destructive,
    },
    async ({ cardId }) => runWrite(() => writer.deleteCard(cardId)),
  );

  server.registerTool(
    "add_comment",
    {
      title: "Add comment",
      description: "Add a comment to a card. Returns the comment.",
      inputSchema: {
        cardId: cardIdArg,
        content: z.string().min(1).describe("Comment text"),
      },
      annotations: write,
    },
    async ({ cardId, content }) =>
      runWrite(() => writer.addComment(cardId, content)),
  );
}
