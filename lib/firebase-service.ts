import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  type Timestamp,
  getDoc,
} from "firebase/firestore"
import { db } from "./firebase"
import type { Board, List, Card, Comment, CommentEdit, CommentWithUser } from "./types"

export interface FirebaseBoard extends Omit<Board, "createdAt" | "updatedAt"> {
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FirebaseList extends Omit<List, "createdAt" | "updatedAt"> {
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FirebaseCard extends Omit<Card, "createdAt" | "updatedAt"> {
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface FirebaseComment extends Omit<Comment, "createdAt" | "updatedAt" | "editHistory"> {
  createdAt: Timestamp
  updatedAt: Timestamp
  editHistory: FirebaseCommentEdit[]
}

export interface FirebaseCommentEdit extends Omit<CommentEdit, "editedAt"> {
  editedAt: Timestamp
}

// Board CRUD operations
export const boardService = {
  // Create a new board
  async createBoard(userId: string, title: string, description?: string): Promise<string> {
    console.log("[v0] Attempting to create board:", { userId, title, description })

    try {
      const boardData = {
        title,
        description: description || "",
        userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      console.log("[v0] Board data prepared:", boardData)
      const docRef = await addDoc(collection(db, "boards"), boardData)
      console.log("[v0] Board created successfully with ID:", docRef.id)
      return docRef.id
    } catch (error) {
      console.error("[v0] Error creating board:", error)
      console.error("[v0] Error code:", (error as any)?.code)
      console.error("[v0] Error message:", (error as any)?.message)
      throw error
    }
  },

  // Get all boards for a user
  async getUserBoards(userId: string): Promise<Board[]> {
    const q = query(collection(db, "boards"), where("userId", "==", userId))

    const querySnapshot = await getDocs(q)
    const boards = querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseBoard
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        userId: data.userId,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      }
    })

    return boards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
  },

  // Update a board
  async updateBoard(boardId: string, updates: Partial<Pick<Board, "title" | "description">>): Promise<void> {
    const boardRef = doc(db, "boards", boardId)
    await updateDoc(boardRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a board
  async deleteBoard(boardId: string): Promise<void> {
    const boardRef = doc(db, "boards", boardId)
    await deleteDoc(boardRef)
  },
}

// List CRUD operations
export const listService = {
  // Create a new list
  async createList(boardId: string, title: string, position: number): Promise<string> {
    const listData = {
      title,
      boardId,
      position,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "lists"), listData)
    return docRef.id
  },

  // Get all lists for a board
  async getBoardLists(boardId: string): Promise<List[]> {
    const q = query(collection(db, "lists"), where("boardId", "==", boardId), orderBy("position", "asc"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseList
      return {
        id: doc.id,
        title: data.title,
        boardId: data.boardId,
        position: data.position,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      }
    })
  },

  // Update a list
  async updateList(listId: string, updates: Partial<Pick<List, "title" | "position">>): Promise<void> {
    const listRef = doc(db, "lists", listId)
    await updateDoc(listRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a list
  async deleteList(listId: string): Promise<void> {
    const listRef = doc(db, "lists", listId)
    await deleteDoc(listRef)
  },

  // Reorder lists
  async reorderLists(listUpdates: { id: string; position: number }[]): Promise<void> {
    const batch = listUpdates.map(({ id, position }) => {
      const listRef = doc(db, "lists", id)
      return updateDoc(listRef, { position, updatedAt: serverTimestamp() })
    })

    await Promise.all(batch)
  },
}

// Card CRUD operations
export const cardService = {
  // Create a new card
  async createCard(listId: string, title: string, description?: string, position?: number): Promise<string> {
    const cardData = {
      title,
      description: description || "",
      listId,
      position: position ?? 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "cards"), cardData)
    return docRef.id
  },

  // Get all cards for a list
  async getListCards(listId: string): Promise<Card[]> {
    const q = query(collection(db, "cards"), where("listId", "==", listId), orderBy("position", "asc"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseCard
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        listId: data.listId,
        position: data.position,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      }
    })
  },

  // Get all cards for multiple lists (for a board)
  async getBoardCards(listIds: string[]): Promise<Card[]> {
    if (listIds.length === 0) return []

    const q = query(collection(db, "cards"), where("listId", "in", listIds), orderBy("position", "asc"))

    const querySnapshot = await getDocs(q)
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseCard
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        listId: data.listId,
        position: data.position,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      }
    })
  },

  // Update a card
  async updateCard(
    cardId: string,
    updates: Partial<Pick<Card, "title" | "description" | "listId" | "position">>,
  ): Promise<void> {
    const cardRef = doc(db, "cards", cardId)
    await updateDoc(cardRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    })
  },

  // Delete a card
  async deleteCard(cardId: string): Promise<void> {
    const cardRef = doc(db, "cards", cardId)
    await deleteDoc(cardRef)
  },

  // Move card to different list
  async moveCard(cardId: string, newListId: string, newPosition: number): Promise<void> {
    const cardRef = doc(db, "cards", cardId)
    await updateDoc(cardRef, {
      listId: newListId,
      position: newPosition,
      updatedAt: serverTimestamp(),
    })
  },

  // Reorder cards within a list or across lists
  async reorderCards(cardUpdates: { id: string; listId: string; position: number }[]): Promise<void> {
    const batch = cardUpdates.map(({ id, listId, position }) => {
      const cardRef = doc(db, "cards", id)
      return updateDoc(cardRef, { listId, position, updatedAt: serverTimestamp() })
    })

    await Promise.all(batch)
  },
}

export const commentService = {
  // Create a new comment
  async createComment(cardId: string, userId: string, content: string): Promise<string> {
    console.log("[v0] Creating comment for card:", cardId)

    const commentData = {
      cardId,
      userId,
      content,
      isDeleted: false,
      editHistory: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, "comments"), commentData)
    console.log("[v0] Comment created successfully with ID:", docRef.id)
    return docRef.id
  },

  // Get all comments for a card with user information
  async getCardComments(cardId: string): Promise<CommentWithUser[]> {
    console.log("[v0] Fetching comments for card:", cardId)

    const q = query(
      collection(db, "comments"),
      where("cardId", "==", cardId),
      where("isDeleted", "==", false),
      orderBy("createdAt", "asc"),
    )

    const querySnapshot = await getDocs(q)
    const comments: CommentWithUser[] = []

    for (const commentDoc of querySnapshot.docs) {
      const commentData = commentDoc.data() as FirebaseComment

      // Fetch user information
      const userDoc = await getDoc(doc(db, "users", commentData.userId))
      const userData = userDoc.data()

      comments.push({
        id: commentDoc.id,
        cardId: commentData.cardId,
        userId: commentData.userId,
        content: commentData.content,
        isDeleted: commentData.isDeleted,
        createdAt: commentData.createdAt.toDate(),
        updatedAt: commentData.updatedAt.toDate(),
        editHistory: commentData.editHistory.map((edit) => ({
          id: edit.id,
          content: edit.content,
          editedAt: edit.editedAt.toDate(),
          userId: edit.userId,
        })),
        user: {
          displayName: userData?.displayName,
          email: userData?.email || "Unknown User",
        },
      })
    }

    console.log("[v0] Fetched", comments.length, "comments for card")
    return comments
  },

  // Update a comment (with edit history)
  async updateComment(commentId: string, userId: string, newContent: string): Promise<void> {
    console.log("[v0] Updating comment:", commentId)

    const commentRef = doc(db, "comments", commentId)
    const commentDoc = await getDoc(commentRef)

    if (!commentDoc.exists()) {
      throw new Error("Comment not found")
    }

    const currentData = commentDoc.data() as FirebaseComment

    // Create edit history entry
    const editEntry: FirebaseCommentEdit = {
      id: `edit_${Date.now()}`,
      content: currentData.content,
      editedAt: currentData.updatedAt,
      userId: currentData.userId,
    }

    // Update comment with new content and add to edit history
    await updateDoc(commentRef, {
      content: newContent,
      editHistory: [...currentData.editHistory, editEntry],
      updatedAt: serverTimestamp(),
    })

    console.log("[v0] Comment updated successfully")
  },

  // Soft delete a comment
  async deleteComment(commentId: string): Promise<void> {
    console.log("[v0] Soft deleting comment:", commentId)

    const commentRef = doc(db, "comments", commentId)
    await updateDoc(commentRef, {
      isDeleted: true,
      updatedAt: serverTimestamp(),
    })

    console.log("[v0] Comment soft deleted successfully")
  },

  // Get edit history for a comment
  async getCommentEditHistory(commentId: string): Promise<CommentEdit[]> {
    const commentDoc = await getDoc(doc(db, "comments", commentId))

    if (!commentDoc.exists()) {
      throw new Error("Comment not found")
    }

    const commentData = commentDoc.data() as FirebaseComment
    return commentData.editHistory.map((edit) => ({
      id: edit.id,
      content: edit.content,
      editedAt: edit.editedAt.toDate(),
      userId: edit.userId,
    }))
  },
}
