import type { boardService, listService } from "@/lib/firebase-service";
import type { Board, List } from "@/lib/types";

export interface VisibilityServices {
  boardService: Pick<typeof boardService, "getUserBoards">;
  listService: Pick<typeof listService, "getBoardLists">;
}

export interface ListLocation {
  board: Board;
  list: List;
}

/**
 * Finds `listId` among the active lists of the user's active boards.
 * Rules can allow reading a card or list by id after its board is deleted or
 * the user is removed from it, so tools check this before trusting an id.
 */
export async function findVisibleList(
  services: VisibilityServices,
  userId: string,
  listId: string,
): Promise<ListLocation | null> {
  const boards = await services.boardService.getUserBoards(userId);
  for (const board of boards) {
    const lists = await services.listService.getBoardLists(board.id);
    const list = lists.find((l) => l.id === listId);
    if (list) return { board, list };
  }
  return null;
}
