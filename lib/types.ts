import type { PermissionAction } from "./permissions";

export interface User {
  id: string;
  email: string;
  displayName?: string;
  createdAt: Date;
}

export type BoardRole = "owner" | "editor" | "viewer";
export type Status = "active" | "deleted" | "done" | "archived" | "inactive";

export interface BoardMembership {
  id: string;
  boardId: string;
  userId: string;
  role: BoardRole;
  addedAt: Date;
  updatedAt: Date;
}

export interface Board {
  id: string;
  title: string;
  description?: string;
  userId: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
  userRole?: BoardRole;
  isShared?: boolean;
  memberCount?: number;
}

export interface List {
  id: string;
  title: string;
  boardId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
}

export interface Card {
  id: string;
  title: string;
  description?: string;
  listId: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
}

export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: Status;
  editHistory: CommentEdit[];
}

export interface CommentEdit {
  id: string;
  content: string;
  editedAt: Date;
  userId: string;
}

export interface CommentWithUser extends Comment {
  user: {
    displayName?: string;
    email: string;
  };
}

export interface BoardData {
  board: Board;
  lists: (List & { cards: (Card & { comments: CommentWithUser[] })[] })[];
}

export type ColumnMap = { [listId: string]: List & { items: Card[] } };

export type BoardContextValue = {
  reorderList: (args: { startIndex: number; finishIndex: number }) => void;
  reorderCard: (args: {
    listId: string;
    startIndex: number;
    finishIndex: number;
  }) => void;
  moveCard: (args: {
    startListId: string;
    finishListId: string;
    itemIndexInStartList: number;
    itemIndexInFinishList?: number;
  }) => void;
  instanceId: symbol;
  userRole?: BoardRole;
  can: (action: PermissionAction) => boolean;
};

export type ActivityAction =
  | "CREATE_BOARD"
  | "UPDATE_BOARD"
  | "DELETE_BOARD"
  | "CREATE_LIST"
  | "UPDATE_LIST"
  | "DELETE_LIST"
  | "CREATE_CARD"
  | "UPDATE_CARD"
  | "MOVE_CARD"
  | "DELETE_CARD"
  | "COMMENT"
  | "INVITE_USER"
  | "REMOVE_USER";

export interface Activity {
  id: string;
  boardId: string;
  userId: string;
  targetUserId?: string;
  action: ActivityAction;
  details: any;
  createdAt: Date;
}
