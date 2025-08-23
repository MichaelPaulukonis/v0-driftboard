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
