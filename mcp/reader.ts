import type { BoardRole, Status } from "@/lib/types";

// Read-only view of Driftboard for MCP tools. Tools depend on this interface,
// not on the Firebase service layer, so a future HTTP-backed implementation
// can replace it without changing tool names, schemas, or outputs.

export interface BoardSummary {
  id: string;
  title: string;
  description?: string;
  role?: BoardRole;
  isShared?: boolean;
  updatedAt: Date;
}

export interface CardSummary {
  id: string;
  title: string;
  description?: string;
  status: Status;
  position: number;
  updatedAt: Date;
}

export interface ListDetail {
  id: string;
  title: string;
  position: number;
  cards: CardSummary[];
}

export interface BoardDetail {
  board: BoardSummary;
  lists: ListDetail[];
}

export interface CommentSummary {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

export interface CardDetail {
  card: CardSummary & { listId: string; createdAt: Date };
  comments: CommentSummary[];
}

export interface CardHit {
  boardId: string;
  boardTitle: string;
  listId: string;
  listTitle: string;
  card: CardSummary;
}

export interface SearchOptions {
  boardId?: string;
  limit?: number;
}

export interface DriftboardReader {
  listBoards(): Promise<BoardSummary[]>;
  /** Null when the board does not exist or the user has no access. */
  getBoard(boardId: string): Promise<BoardDetail | null>;
  /** Null when the card does not exist, is deleted, or the user has no access. */
  getCard(cardId: string): Promise<CardDetail | null>;
  searchCards(query: string, options?: SearchOptions): Promise<CardHit[]>;
}
