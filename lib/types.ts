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
}

export interface List {
  id: string
  title: string
  boardId: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface Card {
  id: string
  title: string
  description?: string
  listId: string
  position: number
  createdAt: Date
  updatedAt: Date
}

export interface Comment {
  id: string
  cardId: string
  userId: string
  content: string
  createdAt: Date
  updatedAt: Date
  isDeleted: boolean
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
