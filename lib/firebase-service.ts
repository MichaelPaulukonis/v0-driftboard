// Fetch all board data for export (board, lists, cards, comments)
export async function fetchBoardDataForExport(boardId: string): Promise<any | null> {
  try {
    // 1. Fetch board document
    const boardRef = doc(db, 'boards_current', boardId);
    const boardSnap = await getDoc(boardRef);
    if (!boardSnap.exists()) {
      console.error(`[Driftboard] Board not found for export: ${boardId}`);
      return null;
    }
    const boardData = boardSnap.data();

    // 2. Fetch lists for the board
    const listsQuery = query(collection(db, 'lists_current'), where('boardId', '==', boardId), where('status', '==', 'active'));
    const listsSnap = await getDocs(listsQuery);
    const lists = listsSnap.docs.map((listDoc) => ({
      id: listDoc.id,
      ...listDoc.data(),
    }));

    // 3. Fetch cards for all lists (batch)
    const listIds = lists.map((l) => l.id);
    let cards: any[] = [];
    if (listIds.length > 0) {
      // Firestore 'in' queries are limited to 10 items per batch
      const batchSize = 10;
      for (let i = 0; i < listIds.length; i += batchSize) {
        const batchIds = listIds.slice(i, i + batchSize);
        const cardsQuery = query(collection(db, 'cards_current'), where('listId', 'in', batchIds), where('status', '==', 'active'));
        const cardsSnap = await getDocs(cardsQuery);
        cards = cards.concat(
          cardsSnap.docs.map((cardDoc) => ({
            id: cardDoc.id,
            ...cardDoc.data(),
          }))
        );
      }
    }

    // 4. Fetch comments for all cards (batch)
    const cardIds = cards.map((c) => c.id);
    let comments: any[] = [];
    if (cardIds.length > 0) {
      const batchSize = 10;
      for (let i = 0; i < cardIds.length; i += batchSize) {
        const batchIds = cardIds.slice(i, i + batchSize);
        const commentsQuery = query(collection(db, 'comments_current'), where('cardId', 'in', batchIds), where('status', '==', 'active'));
        const commentsSnap = await getDocs(commentsQuery);
        comments = comments.concat(
          commentsSnap.docs.map((commentDoc) => ({
            id: commentDoc.id,
            ...commentDoc.data(),
          }))
        );
      }
    }

    // 5. Structure data: lists -> cards -> comments
    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: cards
        .filter((card) => card.listId === list.id)
        .map((card) => ({
          ...card,
          comments: comments.filter((comment) => comment.cardId === card.id),
        })),
    }));

    // 6. Return structured export data
    return {
      ...boardData,
      lists: listsWithCards,
      exportedAt: new Date().toISOString(),
      // Add additional metadata as needed
    };
  } catch (error) {
    console.error('[Driftboard] Error exporting board data:', error);
    throw error;
  }
}
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
  writeBatch,
  runTransaction,
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
    const boardsCollection = collection(db, "boards_current");
    const boardRef = doc(boardsCollection); // Create a new doc with a generated ID

    const boardData = {
      title,
      description: description || "",
      userId, // Note: Plan specifies createdBy, using userId for now.
      createdBy: userId,
      updatedBy: userId,
      status: 'active' as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const historyRef = doc(collection(boardRef, "history"));
    const historyData = {
      changeType: 'create',
      createdAt: serverTimestamp(),
      createdBy: userId,
      snapshot: boardData,
    };

    const batch = writeBatch(db);
    batch.set(boardRef, boardData);
    batch.set(historyRef, historyData);

    await batch.commit();
    return boardRef.id;
  },

  // Get all boards for a user
  async getUserBoards(userId: string): Promise<Board[]> {
    const q = query(collection(db, "boards_current"), where("userId", "==", userId), where("status", "==", "active"));

    const querySnapshot = await getDocs(q);
    const boards = querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseBoard;
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        userId: data.userId,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });

    return boards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  // Update a board
  async updateBoard(boardId: string, userId: string, updates: Partial<Pick<Board, "title" | "description">>): Promise<void> {
    const boardRef = doc(db, "boards_current", boardId);

    await runTransaction(db, async (transaction) => {
      const boardDoc = await transaction.get(boardRef);
      if (!boardDoc.exists()) {
        throw new Error("Board not found");
      }

      const oldData = boardDoc.data();
      const newData = { ...oldData, ...updates, updatedBy: userId, updatedAt: serverTimestamp() };

      const historyRef = doc(collection(boardRef, "history"));
      const historyData = {
        changeType: 'update',
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      };

      transaction.set(historyRef, historyData);
      transaction.update(boardRef, {
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  // Soft delete a board
  async deleteBoard(boardId: string, userId: string): Promise<void> {
    const boardRef = doc(db, "boards_current", boardId);

    await runTransaction(db, async (transaction) => {
      const boardDoc = await transaction.get(boardRef);
      if (!boardDoc.exists()) {
        throw new Error("Board not found");
      }

      const historyRef = doc(collection(boardRef, "history"));
      const historyData = {
        changeType: 'delete',
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: boardDoc.data(), // Snapshot before the delete
      };

      transaction.set(historyRef, historyData);
      transaction.update(boardRef, {
        status: 'deleted',
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  // Export all data for a board
  async exportBoardData(boardId: string): Promise<string> {
    const boardDoc = await getDoc(doc(db, "boards_current", boardId));
    if (!boardDoc.exists()) {
      throw new Error("Board not found");
    }

    const board = { id: boardDoc.id, ...boardDoc.data() } as Board;

    const lists = await listService.getBoardLists(boardId);
    const listIds = lists.map((l) => l.id);
    const cards = await cardService.getBoardCards(listIds);

    const cardsWithComments = await Promise.all(
      cards.map(async (card) => {
        const comments = await commentService.getCardComments(card.id);
        return { ...card, comments };
      })
    );

    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: cardsWithComments.filter((card) => card.listId === list.id),
    }));

    const boardData = {
      board,
      lists: listsWithCards,
    };

    return JSON.stringify(boardData, null, 2);
  },
}

// List CRUD operations
export const listService = {
  // Create a new list
  async createList(boardId: string, userId: string, title: string, position: number): Promise<string> {
    const listsCollection = collection(db, "lists_current");
    const listRef = doc(listsCollection);

    const listData = {
      title,
      boardId,
      position,
      status: 'active' as const,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const historyRef = doc(collection(listRef, "history"));
    const historyData = {
      changeType: 'create',
      createdAt: serverTimestamp(),
      createdBy: userId,
      snapshot: listData,
    };

    const batch = writeBatch(db);
    batch.set(listRef, listData);
    batch.set(historyRef, historyData);

    await batch.commit();
    return listRef.id;
  },

  // Get all lists for a board
  async getBoardLists(boardId: string): Promise<List[]> {
    const q = query(collection(db, "lists_current"), where("boardId", "==", boardId), where("status", "==", "active"), orderBy("position", "asc"));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseList;
      return {
        id: doc.id,
        title: data.title,
        boardId: data.boardId,
        position: data.position,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  },

  // Update a list
  async updateList(listId: string, userId: string, updates: Partial<Pick<List, "title" | "position">>): Promise<void> {
    const listRef = doc(db, "lists_current", listId);
    await runTransaction(db, async (transaction) => {
      const listDoc = await transaction.get(listRef);
      if (!listDoc.exists()) {
        throw new Error("List not found");
      }
      const oldData = listDoc.data();
      const newData = { ...oldData, ...updates, updatedBy: userId, updatedAt: serverTimestamp() };

      const historyRef = doc(collection(listRef, "history"));
      transaction.set(historyRef, { changeType: 'update', createdAt: serverTimestamp(), createdBy: userId, snapshot: newData });

      transaction.update(listRef, { ...updates, updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },

  // Soft delete a list
  async deleteList(listId: string, userId: string): Promise<void> {
    const listRef = doc(db, "lists_current", listId);
    await runTransaction(db, async (transaction) => {
      const listDoc = await transaction.get(listRef);
      if (!listDoc.exists()) {
        throw new Error("List not found");
      }

      const historyRef = doc(collection(listRef, "history"));
      transaction.set(historyRef, { changeType: 'delete', createdAt: serverTimestamp(), createdBy: userId, snapshot: listDoc.data() });

      transaction.update(listRef, { status: 'deleted', updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },

  // Reorder lists
  async reorderLists(listUpdates: { id: string; position: number }[], userId: string): Promise<void> {
    const batch = writeBatch(db);
    // Note: History tracking for reordering is complex as it involves multiple docs.
    // For now, we will just update the positions as a batch.
    // A more advanced implementation could create a single history event on the board.
    listUpdates.forEach(({ id, position }) => {
      const listRef = doc(db, "lists_current", id);
      batch.update(listRef, { position, updatedBy: userId, updatedAt: serverTimestamp() });
    });

    await batch.commit();
  },
}

// Card CRUD operations
export const cardService = {
  // Create a new card
  async createCard(listId: string, userId: string, title: string, description?: string, position?: number): Promise<string> {
    const cardsCollection = collection(db, "cards_current");
    const cardRef = doc(cardsCollection);

    const cardData = {
      title,
      description: description || "",
      listId,
      position: position ?? 0,
      status: 'active' as const,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const historyRef = doc(collection(cardRef, "history"));
    const historyData = { changeType: 'create', createdAt: serverTimestamp(), createdBy: userId, snapshot: cardData };

    const batch = writeBatch(db);
    batch.set(cardRef, cardData);
    batch.set(historyRef, historyData);

    await batch.commit();
    return cardRef.id;
  },

  // Get all cards for a list
  async getListCards(listId: string): Promise<Card[]> {
    const q = query(collection(db, "cards_current"), where("listId", "==", listId), where("status", "==", "active"), orderBy("position", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseCard;
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        listId: data.listId,
        position: data.position,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  },

  // Get all cards for multiple lists (for a board)
  async getBoardCards(listIds: string[]): Promise<Card[]> {
    if (listIds.length === 0) return [];
    const q = query(collection(db, "cards_current"), where("listId", "in", listIds), where("status", "==", "active"), orderBy("position", "asc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => {
      const data = doc.data() as FirebaseCard;
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        listId: data.listId,
        position: data.position,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      };
    });
  },

  // Update a card
  async updateCard(
    cardId: string,
    userId: string,
    updates: Partial<Pick<Card, "title" | "description" | "listId" | "position">>,
  ): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const cardDoc = await transaction.get(cardRef);
      if (!cardDoc.exists()) {
        throw new Error("Card not found");
      }
      const oldData = cardDoc.data();
      const newData = { ...oldData, ...updates, updatedBy: userId, updatedAt: serverTimestamp() };

      const historyRef = doc(collection(cardRef, "history"));
      transaction.set(historyRef, { changeType: 'update', createdAt: serverTimestamp(), createdBy: userId, snapshot: newData });

      transaction.update(cardRef, { ...updates, updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },

  // Soft delete a card
  async deleteCard(cardId: string, userId: string): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const cardDoc = await transaction.get(cardRef);
      if (!cardDoc.exists()) {
        throw new Error("Card not found");
      }

      const historyRef = doc(collection(cardRef, "history"));
      transaction.set(historyRef, { changeType: 'delete', createdAt: serverTimestamp(), createdBy: userId, snapshot: cardDoc.data() });

      transaction.update(cardRef, { status: 'deleted', updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },

  // Move card to different list
  async moveCard(cardId: string, userId: string, newListId: string, newPosition: number): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const cardDoc = await transaction.get(cardRef);
      if (!cardDoc.exists()) {
        throw new Error("Card not found");
      }
      const oldData = cardDoc.data();
      const newData = { ...oldData, listId: newListId, position: newPosition, updatedBy: userId, updatedAt: serverTimestamp() };

      const historyRef = doc(collection(cardRef, "history"));
      transaction.set(historyRef, { changeType: 'update', subType: 'move', createdAt: serverTimestamp(), createdBy: userId, snapshot: newData });

      transaction.update(cardRef, { listId: newListId, position: newPosition, updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },

  // Reorder cards within a list or across lists
  async reorderCards(cardUpdates: { id: string; listId: string; position: number }[], userId: string): Promise<void> {
    const batch = writeBatch(db);
    // Note: This is a bulk update. For detailed history, each card move could be a separate transaction.
    // For now, we are not creating individual history events for this bulk reorder to optimize performance.
    cardUpdates.forEach(({ id, listId, position }) => {
      const cardRef = doc(db, "cards_current", id);
      batch.update(cardRef, { listId, position, updatedBy: userId, updatedAt: serverTimestamp() });
    });

    await batch.commit();
  },
}

export const commentService = {
  // Create a new comment
  async createComment(cardId: string, userId: string, content: string): Promise<string> {
    const commentsCollection = collection(db, "comments_current");
    const commentRef = doc(commentsCollection);

    const commentData = {
      cardId,
      userId,
      content,
      status: 'active' as const,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const historyRef = doc(collection(commentRef, "history"));
    const historyData = { changeType: 'create', createdAt: serverTimestamp(), createdBy: userId, snapshot: commentData };

    const batch = writeBatch(db);
    batch.set(commentRef, commentData);
    batch.set(historyRef, historyData);

    await batch.commit();
    return commentRef.id;
  },

  // Get all comments for a card with user information
  async getCardComments(cardId: string): Promise<CommentWithUser[]> {
    const q = query(
      collection(db, "comments_current"),
      where("cardId", "==", cardId),
      where("status", "==", "active"),
      orderBy("createdAt", "asc"),
    );

    const querySnapshot = await getDocs(q);
    const comments: CommentWithUser[] = [];

    for (const commentDoc of querySnapshot.docs) {
      const commentData = commentDoc.data() as FirebaseComment;
      const userDoc = await getDoc(doc(db, "users", commentData.userId));
      const userData = userDoc.data();

      comments.push({
        id: commentDoc.id,
        cardId: commentData.cardId,
        userId: commentData.userId,
        content: commentData.content,
        isDeleted: commentData.isDeleted,
        createdAt: commentData.createdAt.toDate(),
        updatedAt: commentData.updatedAt.toDate(),
        editHistory: [], // Deprecated, return empty array for type compatibility
        user: {
          displayName: userData?.displayName,
          email: userData?.email || "Unknown User",
        },
      });
    }
    return comments;
  },

  // Update a comment
  async updateComment(commentId: string, userId: string, newContent: string): Promise<void> {
    const commentRef = doc(db, "comments_current", commentId);
    await runTransaction(db, async (transaction) => {
      const commentDoc = await transaction.get(commentRef);
      if (!commentDoc.exists()) {
        throw new Error("Comment not found");
      }

      const oldData = commentDoc.data();
      const newData = { ...oldData, content: newContent, updatedBy: userId, updatedAt: serverTimestamp() };

      const historyRef = doc(collection(commentRef, "history"));
      transaction.set(historyRef, { changeType: 'update', createdAt: serverTimestamp(), createdBy: userId, snapshot: newData });

      transaction.update(commentRef, { content: newContent, updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },

  // Soft delete a comment
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const commentRef = doc(db, "comments_current", commentId);
    await runTransaction(db, async (transaction) => {
      const commentDoc = await transaction.get(commentRef);
      if (!commentDoc.exists()) {
        throw new Error("Comment not found");
      }

      const historyRef = doc(collection(commentRef, "history"));
      transaction.set(historyRef, { changeType: 'delete', createdAt: serverTimestamp(), createdBy: userId, snapshot: commentDoc.data() });

      transaction.update(commentRef, { status: 'deleted', updatedBy: userId, updatedAt: serverTimestamp() });
    });
  },
}

// Generic function to fetch the history of any document
export async function getHistoryForDocument(collectionName: string, documentId: string): Promise<any[]> {
  try {
    const historyCollectionRef = collection(db, `${collectionName}/${documentId}/history`);
    const q = query(historyCollectionRef, orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`Error fetching history for ${collectionName}/${documentId}:`, error);
    return [];
  }
}