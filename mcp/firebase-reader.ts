import {
  boardService,
  listService,
  cardService,
  commentService,
} from "@/lib/firebase-service";
import type { Board, Card } from "@/lib/types";
import type {
  BoardDetail,
  BoardSummary,
  CardDetail,
  CardHit,
  CardSummary,
  DriftboardReader,
  SearchOptions,
} from "./reader";

export interface ReaderServices {
  boardService: Pick<typeof boardService, "getUserBoards">;
  listService: Pick<typeof listService, "getBoardLists">;
  cardService: Pick<typeof cardService, "getBoardCards" | "getCard">;
  commentService: Pick<typeof commentService, "getCardComments">;
}

const defaultServices: ReaderServices = {
  boardService,
  listService,
  cardService,
  commentService,
};

const DEFAULT_SEARCH_LIMIT = 50;
const VISIBLE_CARD_STATUSES: readonly Card["status"][] = [
  "active",
  "done",
  "archived",
];

function toBoardSummary(board: Board): BoardSummary {
  return {
    id: board.id,
    title: board.title,
    description: board.description || undefined,
    role: board.userRole,
    isShared: board.isShared,
    updatedAt: board.updatedAt,
  };
}

function toCardSummary(card: Card): CardSummary {
  return {
    id: card.id,
    title: card.title,
    description: card.description || undefined,
    status: card.status,
    position: card.position,
    updatedAt: card.updatedAt,
  };
}

function isPermissionDenied(error: unknown): boolean {
  return (error as { code?: string })?.code === "permission-denied";
}

/**
 * DriftboardReader backed by the Firebase client SDK, acting as `userId`.
 * Access control is enforced by Firestore security rules; the caller must
 * already be signed in as that user.
 */
export function createFirebaseReader(
  userId: string,
  services: ReaderServices = defaultServices,
): DriftboardReader {
  const listBoards = async (): Promise<BoardSummary[]> => {
    const boards = await services.boardService.getUserBoards(userId);
    return boards.map(toBoardSummary);
  };

  const loadBoardDetail = async (board: Board): Promise<BoardDetail> => {
    const lists = await services.listService.getBoardLists(board.id);
    const cards = await services.cardService.getBoardCards(
      lists.map((l) => l.id),
    );

    return {
      board: toBoardSummary(board),
      lists: lists
        .sort((a, b) => a.position - b.position)
        .map((list) => ({
          id: list.id,
          title: list.title,
          position: list.position,
          cards: cards
            .filter((c) => c.listId === list.id)
            .sort((a, b) => a.position - b.position)
            .map(toCardSummary),
        })),
    };
  };

  const getBoard = async (boardId: string): Promise<BoardDetail | null> => {
    // Same approach as the board page: only boards the user can see are returned.
    const boards = await services.boardService.getUserBoards(userId);
    const board = boards.find((b) => b.id === boardId);
    return board ? loadBoardDetail(board) : null;
  };

  // Rules can allow reading a card by id even when its board was deleted or
  // the user was removed from it, so check the card's list is still visible.
  const isListVisible = async (listId: string): Promise<boolean> => {
    const boards = await services.boardService.getUserBoards(userId);
    const lists = await Promise.all(
      boards.map((b) => services.listService.getBoardLists(b.id)),
    );
    return lists.flat().some((l) => l.id === listId);
  };

  const getCard = async (cardId: string): Promise<CardDetail | null> => {
    try {
      const card = await services.cardService.getCard(cardId);
      if (!card || !VISIBLE_CARD_STATUSES.includes(card.status)) return null;
      if (!(await isListVisible(card.listId))) return null;

      const comments = await services.commentService.getCardComments(cardId);
      return {
        card: {
          ...toCardSummary(card),
          listId: card.listId,
          createdAt: card.createdAt,
        },
        comments: comments.map((c) => ({
          id: c.id,
          content: c.content,
          author: c.user.displayName || c.user.email,
          createdAt: c.createdAt,
        })),
      };
    } catch (error) {
      // Rules deny reads of cards on boards the user can't see; report as not found.
      if (isPermissionDenied(error)) return null;
      throw error;
    }
  };

  const searchCards = async (
    query: string,
    options: SearchOptions = {},
  ): Promise<CardHit[]> => {
    const needle = query.trim().toLowerCase();
    const max = options.limit ?? DEFAULT_SEARCH_LIMIT;
    if (!needle || max <= 0) return [];

    const boards = await services.boardService.getUserBoards(userId);
    const targets = options.boardId
      ? boards.filter((b) => b.id === options.boardId)
      : boards;

    const hits: CardHit[] = [];
    for (const board of targets) {
      const detail = await loadBoardDetail(board);
      for (const list of detail.lists) {
        for (const card of list.cards) {
          const haystack =
            `${card.title}\n${card.description ?? ""}`.toLowerCase();
          if (!haystack.includes(needle)) continue;
          hits.push({
            boardId: board.id,
            boardTitle: board.title,
            listId: list.id,
            listTitle: list.title,
            card,
          });
          if (hits.length >= max) return hits;
        }
      }
    }
    return hits;
  };

  return { listBoards, getBoard, getCard, searchCards };
}
