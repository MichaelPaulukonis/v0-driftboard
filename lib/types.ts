export interface User {
  id: string
  email: string
  displayName?: string
  createdAt: Date
}

export interface Board {
  id: string
  title: string
  description?: string
  userId: string
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
}

export interface List {
  id: string
  title: string
  boardId: string
  position: number
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
}

export interface Card {
  id: string
  title: string
  description?: string
  listId: string
  position: number
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
}

export interface Comment {
  id: string
  cardId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'deleted' | 'done' | 'archived' | 'inactive'
  editHistory: CommentEdit[]
}

export interface CommentEdit {
  id: string
  content: string
  editedAt: Date
  userId: string
}

export interface CommentWithUser extends Comment {
  user: {
    displayName?: string
    email: string
  }
}

export interface BoardData {
  board: Board;
  lists: (List & { cards: (Card & { comments: CommentWithUser[] })[] })[];
}
