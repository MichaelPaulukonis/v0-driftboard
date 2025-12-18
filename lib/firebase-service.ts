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
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
import type {
  Board,
  List,
  Card,
  Comment,
  CommentEdit,
  CommentWithUser,
  BoardRole,
  BoardMembership,
  User,
  Activity,
} from "./types";

export interface FirebaseBoard extends Omit<Board, "createdAt" | "updatedAt"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseList extends Omit<List, "createdAt" | "updatedAt"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseCard extends Omit<Card, "createdAt" | "updatedAt"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface FirebaseComment
  extends Omit<Comment, "createdAt" | "updatedAt" | "editHistory"> {
  createdAt: Timestamp;
  updatedAt: Timestamp;
  editHistory: FirebaseCommentEdit[];
}

export interface FirebaseCommentEdit extends Omit<CommentEdit, "editedAt"> {
  editedAt: Timestamp;
}

// --- Activity Service ---
export const activityService = {
  async logActivity(
    activity: Omit<Activity, "id" | "createdAt">,
  ): Promise<string> {
    const activitiesCollection = collection(db, "activities");
    const activityData = {
      ...activity,
      createdAt: serverTimestamp(),
    };
    const docRef = await addDoc(activitiesCollection, activityData);
    return docRef.id;
  },

  async getBoardActivities(
    boardId: string,
    limitCount: number = 50,
  ): Promise<Activity[]> {
    const q = query(
      collection(db, "activities"),
      where("boardId", "==", boardId),
      orderBy("createdAt", "desc"),
      limit(limitCount),
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: (data.createdAt as Timestamp)?.toDate(),
      } as Activity;
    });
  },
};

// --- User Service ---
export const userService = {
  async getUserById(userId: string): Promise<User | null> {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return null;
    const data = userSnap.data();
    return {
      id: userSnap.id,
      email: data.email,
      displayName: data.displayName,
      createdAt: (data.createdAt as Timestamp)?.toDate(),
    } as User;
  },

  async findUserByEmail(email: string): Promise<User | null> {
    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      limit(1),
    );
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) return null;
    const userDoc = querySnapshot.docs[0];
    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data.email,
      displayName: data.displayName,
      createdAt: (data.createdAt as Timestamp)?.toDate(),
    } as User;
  },
};

// --- Board Service ---
export const boardService = {
  async createBoard(
    userId: string,
    title: string,
    description?: string,
  ): Promise<string> {
    const boardsCollection = collection(db, "boards_current");
    const boardRef = doc(boardsCollection);

    const boardData = {
      title,
      description: description || "",
      userId,
      ownerId: userId,
      createdBy: userId,
      updatedBy: userId,
      status: "active" as const,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const historyRef = doc(collection(boardRef, "history"));
    const historyData = {
      changeType: "create",
      createdAt: serverTimestamp(),
      createdBy: userId,
      snapshot: boardData,
    };

    const membershipId = `${boardRef.id}_${userId}`;
    const membershipRef = doc(db, "board_memberships", membershipId);
    const membershipData = {
      id: membershipId,
      boardId: boardRef.id,
      userId: userId,
      role: "owner" as const,
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const batch = writeBatch(db);
    batch.set(boardRef, boardData);
    batch.set(historyRef, historyData);
    batch.set(membershipRef, membershipData);

    await batch.commit();

    await activityService.logActivity({
      boardId: boardRef.id,
      userId: userId,
      action: "CREATE_BOARD",
      details: { title },
    });

    return boardRef.id;
  },

  async getBoardMembership(
    boardId: string,
    userId: string,
  ): Promise<BoardMembership | null> {
    const membershipId = `${boardId}_${userId}`;
    const membershipRef = doc(db, "board_memberships", membershipId);
    const membershipSnap = await getDoc(membershipRef);
    if (!membershipSnap.exists()) return null;
    const data = membershipSnap.data();
    return {
      id: membershipSnap.id,
      boardId: data.boardId,
      userId: data.userId,
      role: data.role,
      addedAt: (data.addedAt as Timestamp).toDate(),
      updatedAt: (data.updatedAt as Timestamp).toDate(),
    } as BoardMembership;
  },

  async isBoardMember(boardId: string, userId: string): Promise<boolean> {
    const membershipId = `${boardId}_${userId}`;
    const membershipRef = doc(db, "board_memberships", membershipId);
    const membershipSnap = await getDoc(membershipRef);
    if (membershipSnap.exists()) return true;
    const boardDoc = await getDoc(doc(db, "boards_current", boardId));
    return (
      boardDoc.exists() &&
      (boardDoc.data().userId === userId || boardDoc.data().ownerId === userId)
    );
  },

  async verifyBoardOwnership(
    boardId: string,
    userId: string,
  ): Promise<boolean> {
    const role = await this.getBoardRole(boardId, userId);
    return role === "owner";
  },

  async getBoardRole(
    boardId: string,
    userId: string,
  ): Promise<BoardRole | null> {
    const membership = await this.getBoardMembership(boardId, userId);
    if (membership) return membership.role;
    const boardDoc = await getDoc(doc(db, "boards_current", boardId));
    if (
      boardDoc.exists() &&
      (boardDoc.data().ownerId === userId || boardDoc.data().userId === userId)
    ) {
      return "owner";
    }
    return null;
  },

  async getUserBoards(userId: string): Promise<Board[]> {
    const membershipsQuery = query(
      collection(db, "board_memberships"),
      where("userId", "==", userId),
    );
    const membershipsSnap = await getDocs(membershipsQuery);
    const membershipMap: Record<string, BoardRole> = {};
    membershipsSnap.docs.forEach((doc) => {
      membershipMap[doc.data().boardId] = doc.data().role;
    });

    const legacyQuery = query(
      collection(db, "boards_current"),
      where("userId", "==", userId),
      where("status", "==", "active"),
    );
    const legacySnap = await getDocs(legacyQuery);

    const allBoardIds = Array.from(
      new Set([
        ...Object.keys(membershipMap),
        ...legacySnap.docs.map((doc) => doc.id),
      ]),
    );
    if (allBoardIds.length === 0) return [];

    const boards: Board[] = [];
    const batchSize = 10;
    for (let i = 0; i < allBoardIds.length; i += batchSize) {
      const chunk = allBoardIds.slice(i, i + batchSize);
      const boardsQuery = query(
        collection(db, "boards_current"),
        where("__name__", "in", chunk),
        where("status", "==", "active"),
      );
      const boardsSnap = await getDocs(boardsQuery);
      boards.push(
        ...boardsSnap.docs.map((doc) => {
          const data = doc.data() as FirebaseBoard;
          const boardId = doc.id;
          let userRole = membershipMap[boardId];
          if (!userRole && (data.ownerId === userId || data.userId === userId))
            userRole = "owner";
          return {
            ...data,
            id: boardId,
            ownerId: data.ownerId || data.userId,
            createdAt: data.createdAt.toDate(),
            updatedAt: data.updatedAt.toDate(),
            userRole,
          } as Board;
        }),
      );
    }
    return boards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async updateBoard(
    boardId: string,
    userId: string,
    updates: Partial<Pick<Board, "title" | "description">>,
  ): Promise<void> {
    const boardRef = doc(db, "boards_current", boardId);
    const membershipRef = doc(db, "board_memberships", `${boardId}_${userId}`);
    await runTransaction(db, async (transaction) => {
      const [boardDoc, membershipDoc] = await Promise.all([
        transaction.get(boardRef),
        transaction.get(membershipRef),
      ]);
      if (!boardDoc.exists()) throw new Error("Board not found");
      const boardData = boardDoc.data() as FirebaseBoard;
      const role = membershipDoc.exists()
        ? membershipDoc.data().role
        : boardData.ownerId === userId || boardData.userId === userId
          ? "owner"
          : null;
      if (role !== "owner" && role !== "editor")
        throw new Error("Unauthorized to update board");
      const newData = {
        ...boardDoc.data(),
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };
      transaction.set(doc(collection(boardRef, "history")), {
        changeType: "update",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      });
      transaction.update(boardRef, {
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async deleteBoard(boardId: string, userId: string): Promise<void> {
    const boardRef = doc(db, "boards_current", boardId);
    const membershipRef = doc(db, "board_memberships", `${boardId}_${userId}`);
    await runTransaction(db, async (transaction) => {
      const [boardDoc, membershipDoc] = await Promise.all([
        transaction.get(boardRef),
        transaction.get(membershipRef),
      ]);
      if (!boardDoc.exists()) throw new Error("Board not found");
      const boardData = boardDoc.data() as FirebaseBoard;
      const role = membershipDoc.exists()
        ? membershipDoc.data().role
        : boardData.ownerId === userId || boardData.userId === userId
          ? "owner"
          : null;
      if (role !== "owner")
        throw new Error("Only the owner can delete the board");
      transaction.set(doc(collection(boardRef, "history")), {
        changeType: "delete",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: boardDoc.data(),
      });
      transaction.update(boardRef, {
        status: "deleted",
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async inviteUser(
    boardId: string,
    currentUserId: string,
    inviteeEmail: string,
  ): Promise<void> {
    const isOwner = await this.verifyBoardOwnership(boardId, currentUserId);
    if (!isOwner) throw new Error("Only board owners can invite users");
    const invitee = await userService.findUserByEmail(inviteeEmail);
    if (!invitee) throw new Error("User not found");
    if (invitee.id === currentUserId)
      throw new Error("You cannot invite yourself");
    const isMember = await this.isBoardMember(boardId, invitee.id);
    if (isMember) throw new Error("User is already a member of this board");
    const membershipId = `${boardId}_${invitee.id}`;
    const membershipRef = doc(db, "board_memberships", membershipId);
    await addDoc(collection(db, "board_memberships"), {
      id: membershipId,
      boardId,
      userId: invitee.id,
      role: "editor",
      addedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    // Manually setting document ID to boardId_userId for consistency with security rules
    await writeBatch(db)
      .set(doc(db, "board_memberships", membershipId), {
        id: membershipId,
        boardId,
        userId: invitee.id,
        role: "editor",
        addedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      .commit();

    await activityService.logActivity({
      boardId,
      userId: currentUserId,
      targetUserId: invitee.id,
      action: "INVITE_USER",
      details: {
        inviteeEmail,
        inviteeName: invitee.displayName || inviteeEmail,
      },
    });
  },

  async exportBoardData(boardId: string): Promise<string> {
    const boardDoc = await getDoc(doc(db, "boards_current", boardId));
    if (!boardDoc.exists()) throw new Error("Board not found");
    const board = { id: boardDoc.id, ...boardDoc.data() } as Board;
    const lists = await listService.getBoardLists(boardId);
    const listIds = lists.map((l) => l.id);
    const cards = await cardService.getBoardCards(listIds);
    const cardsWithComments = await Promise.all(
      cards.map(async (card) => ({
        ...card,
        comments: await commentService.getCardComments(card.id),
      })),
    );
    const listsWithCards = lists.map((list) => ({
      ...list,
      cards: cardsWithComments.filter((card) => card.listId === list.id),
    }));
    return JSON.stringify({ board, lists: listsWithCards }, null, 2);
  },
};

// --- List Service ---
export const listService = {
  async createList(
    boardId: string,
    userId: string,
    title: string,
    position: number,
  ): Promise<string> {
    const listRef = doc(collection(db, "lists_current"));
    const listData = {
      title,
      boardId,
      position,
      status: "active" as const,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);
    batch.set(listRef, listData);
    batch.set(doc(collection(listRef, "history")), {
      changeType: "create",
      createdAt: serverTimestamp(),
      createdBy: userId,
      snapshot: listData,
    });
    await batch.commit();
    await activityService.logActivity({
      boardId,
      userId,
      action: "CREATE_LIST",
      details: { title, listId: listRef.id },
    });
    return listRef.id;
  },

  async getBoardLists(boardId: string): Promise<List[]> {
    const q = query(
      collection(db, "lists_current"),
      where("boardId", "==", boardId),
      where("status", "==", "active"),
      orderBy("position", "asc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
        }) as List,
    );
  },

  async getListsByStatus(
    boardId: string,
    status: List["status"],
  ): Promise<List[]> {
    const q = query(
      collection(db, "lists_current"),
      where("boardId", "==", boardId),
      where("status", "==", status),
      orderBy("updatedAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
        }) as List,
    );
  },

  async updateList(
    listId: string,
    userId: string,
    updates: Partial<Pick<List, "title" | "position">>,
  ): Promise<void> {
    const listRef = doc(db, "lists_current", listId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(listRef);
      if (!docSnap.exists()) throw new Error("List not found");
      const newData = {
        ...docSnap.data(),
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };
      transaction.set(doc(collection(listRef, "history")), {
        changeType: "update",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      });
      transaction.update(listRef, {
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async deleteList(listId: string, userId: string): Promise<void> {
    const listRef = doc(db, "lists_current", listId);
    const cardsQuery = query(
      collection(db, "cards_current"),
      where("listId", "==", listId),
      where("status", "==", "active"),
    );
    const cardsSnapshot = await getDocs(cardsQuery);
    await runTransaction(db, async (transaction) => {
      const listDoc = await transaction.get(listRef);
      if (!listDoc.exists()) throw new Error("List not found");
      cardsSnapshot.docs.forEach((cardDoc) =>
        transaction.update(cardDoc.ref, {
          status: "deleted",
          updatedBy: userId,
          updatedAt: serverTimestamp(),
        }),
      );
      transaction.set(doc(collection(listRef, "history")), {
        changeType: "delete",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: listDoc.data(),
        cascadedCardIds: cardsSnapshot.docs.map((d) => d.id),
      });
      transaction.update(listRef, {
        status: "deleted",
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async reorderLists(
    listUpdates: { id: string; position: number }[],
    userId: string,
  ): Promise<void> {
    const batch = writeBatch(db);
    listUpdates.forEach(({ id, position }) =>
      batch.update(doc(db, "lists_current", id), {
        position,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      }),
    );
    await batch.commit();
  },

  async restoreList(listId: string, userId: string): Promise<void> {
    const listRef = doc(db, "lists_current", listId);
    await runTransaction(db, async (transaction) => {
      const listDoc = await transaction.get(listRef);
      if (!listDoc.exists()) throw new Error("List not found");
      const historyQuery = query(
        collection(listRef, "history"),
        where("changeType", "==", "delete"),
        orderBy("createdAt", "desc"),
        limit(1),
      );
      const historySnapshot = await getDocs(historyQuery);
      const cascadedCardIds =
        historySnapshot.docs[0]?.data()?.cascadedCardIds || [];
      cascadedCardIds.forEach((cardId: string) =>
        transaction.update(doc(db, "cards_current", cardId), {
          status: "active",
          updatedBy: userId,
          updatedAt: serverTimestamp(),
        }),
      );
      transaction.set(doc(collection(listRef, "history")), {
        changeType: "update",
        subType: "restore",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: { ...listDoc.data(), status: "active" },
      });
      transaction.update(listRef, {
        status: "active",
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },
};

// --- Card Service ---
export const cardService = {
  async createCard(
    listId: string,
    userId: string,
    title: string,
    description?: string,
    position?: number,
  ): Promise<string> {
    const cardRef = doc(collection(db, "cards_current"));
    const cardData = {
      title,
      description: description || "",
      listId,
      position: position ?? 0,
      status: "active" as const,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);
    batch.set(cardRef, cardData);
    batch.set(doc(collection(cardRef, "history")), {
      changeType: "create",
      createdAt: serverTimestamp(),
      createdBy: userId,
      snapshot: cardData,
    });
    await batch.commit();
    try {
      const listSnap = await getDoc(doc(db, "lists_current", listId));
      const boardId = listSnap.data()?.boardId;
      if (boardId)
        await activityService.logActivity({
          boardId,
          userId,
          action: "CREATE_CARD",
          details: { title, cardId: cardRef.id, listId },
        });
    } catch (e) {
      console.error("Activity log error:", e);
    }
    return cardRef.id;
  },

  async getListCards(listId: string): Promise<Card[]> {
    const q = query(
      collection(db, "cards_current"),
      where("listId", "==", listId),
      where("status", "==", "active"),
      orderBy("position", "asc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
        }) as Card,
    );
  },

  async getBoardCards(listIds: string[]): Promise<Card[]> {
    if (listIds.length === 0) return [];
    const q = query(
      collection(db, "cards_current"),
      where("listId", "in", listIds),
      where("status", "==", "active"),
      orderBy("position", "asc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map(
      (doc) =>
        ({
          id: doc.id,
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp).toDate(),
          updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
        }) as Card,
    );
  },

  async getCardsByStatus(
    boardId: string,
    status: Card["status"],
  ): Promise<Card[]> {
    const listsQuery = query(
      collection(db, "lists_current"),
      where("boardId", "==", boardId),
      where("status", "==", "active"),
    );
    const listsSnap = await getDocs(listsQuery);
    const listIds = listsSnap.docs.map((doc) => doc.id);
    if (listIds.length === 0) return [];
    const cards: Card[] = [];
    const batchSize = 10;
    for (let i = 0; i < listIds.length; i += batchSize) {
      const chunk = listIds.slice(i, i + batchSize);
      const q = query(
        collection(db, "cards_current"),
        where("listId", "in", chunk),
        where("status", "==", status),
        orderBy("updatedAt", "desc"),
      );
      const snap = await getDocs(q);
      cards.push(
        ...snap.docs.map(
          (doc) =>
            ({
              id: doc.id,
              ...doc.data(),
              createdAt: (doc.data().createdAt as Timestamp).toDate(),
              updatedAt: (doc.data().updatedAt as Timestamp).toDate(),
            }) as Card,
        ),
      );
    }
    return cards.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  },

  async updateCard(
    cardId: string,
    userId: string,
    updates: Partial<
      Pick<Card, "title" | "description" | "listId" | "position" | "status">
    >,
  ): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(cardRef);
      if (!docSnap.exists()) throw new Error("Card not found");
      const newData = {
        ...docSnap.data(),
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };
      transaction.set(doc(collection(cardRef, "history")), {
        changeType: "update",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      });
      transaction.update(cardRef, {
        ...updates,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async updateCardStatus(
    cardId: string,
    userId: string,
    status: Card["status"],
  ): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(cardRef);
      if (!docSnap.exists()) throw new Error("Card not found");
      const newData = {
        ...docSnap.data(),
        status,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };
      transaction.set(doc(collection(cardRef, "history")), {
        changeType: "update",
        subType: "status_change",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      });
      transaction.update(cardRef, {
        status,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async deleteCard(cardId: string, userId: string): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(cardRef);
      if (!docSnap.exists()) throw new Error("Card not found");
      transaction.set(doc(collection(cardRef, "history")), {
        changeType: "delete",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: docSnap.data(),
      });
      transaction.update(cardRef, {
        status: "deleted",
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async moveCard(
    cardId: string,
    userId: string,
    newListId: string,
    newPosition: number,
  ): Promise<void> {
    const cardRef = doc(db, "cards_current", cardId);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(cardRef);
      if (!docSnap.exists()) throw new Error("Card not found");
      const newData = {
        ...docSnap.data(),
        listId: newListId,
        position: newPosition,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };
      transaction.set(doc(collection(cardRef, "history")), {
        changeType: "update",
        subType: "move",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      });
      transaction.update(cardRef, {
        listId: newListId,
        position: newPosition,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
    try {
      const listSnap = await getDoc(doc(db, "lists_current", newListId));
      const cardSnap = await getDoc(doc(db, "cards_current", cardId));
      if (listSnap.exists())
        await activityService.logActivity({
          boardId: listSnap.data().boardId,
          userId,
          action: "MOVE_CARD",
          details: {
            cardId,
            cardTitle: cardSnap.data()?.title,
            toListId: newListId,
          },
        });
    } catch (e) {
      console.error("Activity log error:", e);
    }
  },

  async reorderCards(
    cardUpdates: { id: string; listId: string; position: number }[],
    userId: string,
  ): Promise<void> {
    const batch = writeBatch(db);
    cardUpdates.forEach(({ id, listId, position }) =>
      batch.update(doc(db, "cards_current", id), {
        listId,
        position,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      }),
    );
    await batch.commit();
  },
};

// --- Comment Service ---
export const commentService = {
  async createComment(
    cardId: string,
    userId: string,
    content: string,
  ): Promise<string> {
    const commentRef = doc(collection(db, "comments_current"));
    const commentData = {
      cardId,
      userId,
      content,
      status: "active" as const,
      createdBy: userId,
      updatedBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const batch = writeBatch(db);
    batch.set(commentRef, commentData);
    batch.set(doc(collection(commentRef, "history")), {
      changeType: "create",
      createdAt: serverTimestamp(),
      createdBy: userId,
      snapshot: commentData,
    });
    await batch.commit();
    try {
      const cardSnap = await getDoc(doc(db, "cards_current", cardId));
      if (cardSnap.exists()) {
        const listSnap = await getDoc(
          doc(db, "lists_current", cardSnap.data().listId),
        );
        if (listSnap.exists())
          await activityService.logActivity({
            boardId: listSnap.data().boardId,
            userId,
            action: "COMMENT",
            details: {
              cardId,
              commentId: commentRef.id,
              content: content.substring(0, 50),
            },
          });
      }
    } catch (e) {
      console.error("Activity log error:", e);
    }
    return commentRef.id;
  },

  async getCardComments(cardId: string): Promise<CommentWithUser[]> {
    const q = query(
      collection(db, "comments_current"),
      where("cardId", "==", cardId),
      where("status", "==", "active"),
      orderBy("createdAt", "asc"),
    );
    const snap = await getDocs(q);
    return Promise.all(
      snap.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const user = await userService.getUserById(data.userId);
        return {
          id: docSnap.id,
          ...data,
          createdAt: (data.createdAt as Timestamp).toDate(),
          updatedAt: (data.updatedAt as Timestamp).toDate(),
          editHistory: [],
          user: {
            displayName: user?.displayName,
            email: user?.email || "Unknown",
          },
        } as unknown as CommentWithUser;
      }),
    );
  },

  async updateComment(
    commentId: string,
    userId: string,
    newContent: string,
  ): Promise<void> {
    const ref = doc(db, "comments_current", commentId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Comment not found");
      const newData = {
        ...snap.data(),
        content: newContent,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      };
      transaction.set(doc(collection(ref, "history")), {
        changeType: "update",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: newData,
      });
      transaction.update(ref, {
        content: newContent,
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },

  async deleteComment(commentId: string, userId: string): Promise<void> {
    const ref = doc(db, "comments_current", commentId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) throw new Error("Comment not found");
      transaction.set(doc(collection(ref, "history")), {
        changeType: "delete",
        createdAt: serverTimestamp(),
        createdBy: userId,
        snapshot: snap.data(),
      });
      transaction.update(ref, {
        status: "deleted",
        updatedBy: userId,
        updatedAt: serverTimestamp(),
      });
    });
  },
};

// --- General History Helper ---
export async function getHistoryForDocument(
  collectionName: string,
  documentId: string,
): Promise<any[]> {
  try {
    const q = query(
      collection(db, `${collectionName}/${documentId}/history`),
      orderBy("createdAt", "desc"),
    );
    const snap = await getDocs(q);
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`History error:`, error);
    return [];
  }
}
export async function fetchBoardDataForExport(
  boardId: string,
): Promise<any | null> {
  const board = await getDoc(doc(db, "boards_current", boardId));
  if (!board.exists()) return null;
  const lists = await listService.getBoardLists(boardId);
  const data = {
    ...board.data(),
    lists: await Promise.all(
      lists.map(async (l) => ({
        ...l,
        cards: await cardService.getListCards(l.id),
      })),
    ),
    exportedAt: new Date().toISOString(),
  };
  return data;
}
