import type { BoardRole } from "./types";

export type PermissionAction =
  | "deleteBoard"
  | "inviteUsers"
  | "updateBoardSettings"
  | "createList"
  | "updateList"
  | "deleteList"
  | "reorderLists"
  | "createCard"
  | "updateCard"
  | "moveCard"
  | "deleteCard"
  | "reorderCards"
  | "addComment"
  | "deleteComment";

const permissions: Record<BoardRole, PermissionAction[]> = {
  owner: [
    "deleteBoard",
    "inviteUsers",
    "updateBoardSettings",
    "createList",
    "updateList",
    "deleteList",
    "reorderLists",
    "createCard",
    "updateCard",
    "moveCard",
    "deleteCard",
    "reorderCards",
    "addComment",
    "deleteComment",
  ],
  editor: [
    "createList",
    "updateList",
    "deleteList",
    "reorderLists",
    "createCard",
    "updateCard",
    "moveCard",
    "deleteCard",
    "reorderCards",
    "addComment",
  ],
  viewer: [
    // Viewers can't do any modification actions
  ],
};

export const canPerformAction = (
  role: BoardRole | undefined,
  action: PermissionAction,
): boolean => {
  if (!role) return false;
  return permissions[role].includes(action);
};
