import {
  boardService,
  listService,
  cardService,
  commentService,
} from "@/lib/firebase-service";
import { canPerformAction } from "@/lib/permissions";
import type { Card } from "@/lib/types";
import { toCardSummary } from "./firebase-reader";
import { findVisibleList, type ListLocation } from "./visibility";
import {
  WriteError,
  type CardUpdates,
  type DriftboardWriter,
  type WrittenCard,
} from "./writer";

export interface WriterServices {
  boardService: Pick<typeof boardService, "getUserBoards">;
  listService: Pick<typeof listService, "getBoardLists">;
  cardService: Pick<
    typeof cardService,
    | "getCard"
    | "createCard"
    | "updateCard"
    | "updateCardStatus"
    | "moveCard"
    | "deleteCard"
  >;
  commentService: Pick<
    typeof commentService,
    "createComment" | "getCardComments"
  >;
}

const defaultServices: WriterServices = {
  boardService,
  listService,
  cardService,
  commentService,
};

const MCP_SOURCE = { source: "mcp" } as const;
const WRITABLE_STATUSES: readonly Card["status"][] = [
  "active",
  "done",
  "archived",
];

// Permission action -> phrase for "can't ..." errors.
const VERBS = {
  createCard: "create cards",
  updateCard: "edit cards",
  moveCard: "move cards",
  deleteCard: "delete cards",
  addComment: "comment",
} as const;
type WriteAction = keyof typeof VERBS;

const notFound = (what: "Card" | "List", id: string) =>
  new WriteError(`${what} ${id} not found, or you don't have access.`);

function isPermissionDenied(error: unknown): boolean {
  return (error as { code?: string })?.code === "permission-denied";
}

function toWrittenCard(card: Card): WrittenCard {
  return {
    ...toCardSummary(card),
    listId: card.listId,
    createdAt: card.createdAt,
  };
}

// Firestore rejects undefined field values, so drop fields the caller left out.
function definedOnly(updates: CardUpdates): CardUpdates {
  return Object.fromEntries(
    Object.entries(updates).filter(([, value]) => value !== undefined),
  ) as CardUpdates;
}

/**
 * DriftboardWriter backed by the Firebase client SDK, acting as `userId`.
 * Checks the user's role first for clear errors; Firestore rules still enforce
 * access. Every write is stamped `source: "mcp"` in history and activity.
 */
export function createFirebaseWriter(
  userId: string,
  services: WriterServices = defaultServices,
): DriftboardWriter {
  const requireList = async (listId: string): Promise<ListLocation> => {
    const location = await findVisibleList(services, userId, listId);
    if (!location) throw notFound("List", listId);
    return location;
  };

  const requireCard = async (
    cardId: string,
  ): Promise<{ card: Card; location: ListLocation }> => {
    const card = await services.cardService.getCard(cardId);
    const location =
      card && WRITABLE_STATUSES.includes(card.status)
        ? await findVisibleList(services, userId, card.listId)
        : null;
    if (!card || !location) throw notFound("Card", cardId);
    return { card, location };
  };

  const requireRole = ({ board }: ListLocation, action: WriteAction) => {
    if (!canPerformAction(board.userRole, action))
      throw new WriteError(
        `Your role on "${board.title}" (${board.userRole ?? "none"}) can't ${VERBS[action]}.`,
      );
  };

  const readBack = async (cardId: string): Promise<WrittenCard> => {
    const card = await services.cardService.getCard(cardId);
    if (!card) throw notFound("Card", cardId);
    return toWrittenCard(card);
  };

  // Rules denying a write look the same as not-found, like the read tools.
  const guard = async <T>(
    what: "Card" | "List",
    id: string,
    write: () => Promise<T>,
  ): Promise<T> => {
    try {
      return await write();
    } catch (error) {
      if (isPermissionDenied(error)) throw notFound(what, id);
      throw error;
    }
  };

  return {
    createCard: ({ listId, title, description }) =>
      guard("List", listId, async () => {
        requireRole(await requireList(listId), "createCard");
        const cardId = await services.cardService.createCard(
          listId,
          userId,
          title,
          description,
          undefined,
          MCP_SOURCE,
        );
        return readBack(cardId);
      }),

    updateCard: (cardId, updates) =>
      guard("Card", cardId, async () => {
        requireRole((await requireCard(cardId)).location, "updateCard");
        const defined = definedOnly(updates);
        if (Object.keys(defined).length === 0)
          throw new WriteError("update_card needs a title or description.");
        await services.cardService.updateCard(
          cardId,
          userId,
          defined,
          MCP_SOURCE,
        );
        return readBack(cardId);
      }),

    moveCard: (cardId, listId, position) =>
      guard("Card", cardId, async () => {
        const { card, location: from } = await requireCard(cardId);
        requireRole(from, "moveCard");
        if (card.status !== "active")
          throw new WriteError(
            `move_card only moves active cards; card ${cardId} is ${card.status}.`,
          );
        const to = await requireList(listId);
        if (to.board.id !== from.board.id)
          throw new WriteError(
            `move_card can't move between boards (${from.board.title} → ${to.board.title}).`,
          );
        await services.cardService.moveCard(
          cardId,
          userId,
          listId,
          position,
          MCP_SOURCE,
        );
        return readBack(cardId);
      }),

    setCardStatus: (cardId, status) =>
      guard("Card", cardId, async () => {
        requireRole((await requireCard(cardId)).location, "updateCard");
        await services.cardService.updateCardStatus(
          cardId,
          userId,
          status,
          MCP_SOURCE,
        );
        return readBack(cardId);
      }),

    deleteCard: (cardId) =>
      guard("Card", cardId, async () => {
        requireRole((await requireCard(cardId)).location, "deleteCard");
        await services.cardService.deleteCard(cardId, userId, MCP_SOURCE);
        return readBack(cardId);
      }),

    addComment: (cardId, content) =>
      guard("Card", cardId, async () => {
        requireRole((await requireCard(cardId)).location, "addComment");
        const commentId = await services.commentService.createComment(
          cardId,
          userId,
          content,
          MCP_SOURCE,
        );
        const comments = await services.commentService.getCardComments(cardId);
        const comment = comments.find((c) => c.id === commentId);
        // The write succeeded; failing here would make the agent retry and duplicate it.
        if (!comment)
          return { id: commentId, content, author: "", createdAt: new Date() };
        return {
          id: comment.id,
          content: comment.content,
          author: comment.user.displayName || comment.user.email,
          createdAt: comment.createdAt,
        };
      }),
  };
}
