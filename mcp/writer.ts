import type { CardDetail, CommentSummary } from "./reader";

// Write side of Driftboard for MCP tools, the counterpart of DriftboardReader.
// Tools depend on this interface so a hosted HTTP-backed implementation can
// replace the Firebase one without changing tool names, schemas, or outputs.

export type WrittenCard = CardDetail["card"];

export type WritableCardStatus = "active" | "done" | "archived";

export interface NewCard {
  listId: string;
  title: string;
  description?: string;
}

export interface CardUpdates {
  title?: string;
  description?: string;
}

/** A failure whose message is safe and useful to show the agent as-is. */
export class WriteError extends Error {
  name = "WriteError";
}

export interface DriftboardWriter {
  /** Appends the card at the bottom of the list. */
  createCard(card: NewCard): Promise<WrittenCard>;
  updateCard(cardId: string, updates: CardUpdates): Promise<WrittenCard>;
  /** Same board only. Omitted position = bottom of the list. */
  moveCard(
    cardId: string,
    listId: string,
    position?: number,
  ): Promise<WrittenCard>;
  /** Restoring to active appends the card at the bottom of its list. */
  setCardStatus(
    cardId: string,
    status: WritableCardStatus,
  ): Promise<WrittenCard>;
  /** Soft delete; returns the card with status "deleted". */
  deleteCard(cardId: string): Promise<WrittenCard>;
  addComment(cardId: string, content: string): Promise<CommentSummary>;
}
