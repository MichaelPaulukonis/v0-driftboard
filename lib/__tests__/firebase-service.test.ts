import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  addDoc,
  getDoc,
} from 'firebase/firestore';
import { boardService, listService, cardService, commentService } from '../firebase-service';

// Mock the firebase module and all Firestore functions
vi.mock('../firebase');
vi.mock('firebase/firestore', async () => {
  // Provide mock implementations for all Firestore functions used
  return {
    collection: vi.fn(() => ({ mock: true })),
    getDocs: vi.fn(),
    doc: vi.fn((db, collectionName, id) => ({
      path: `${collectionName}/${id}`,
    })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(), // Keep mock for legacy checks if any, though we expect it not to be called for deletes
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date(), mock: true })),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
  };
});

describe('Firebase Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('boardService', () => {
    it('should get active boards', async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: '1',
            data: () => ({
              title: 'Board 1',
              userId: 'user1',
              description: 'desc',
              status: 'active',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ]
      });
      const boards = await boardService.getUserBoards('user1');
      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(boards).toHaveLength(1);
      expect(boards[0].title).toBe('Board 1');
    });

    it('should create a board with active status', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const boardId = await boardService.createBoard('user1', 'New Board', 'New Description');
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'active' }));
      expect(boardId).toBe('1');
    });

    it('should update a board', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await boardService.updateBoard('1', { title: 'Updated Board' });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should soft delete a board by setting status to deleted', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await boardService.deleteBoard('1');
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'deleted' }));
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('listService', () => {
    it('should get active lists for a board', async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: '1',
            data: () => ({
              title: 'List 1',
              boardId: 'board1',
              position: 1,
              status: 'active',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });
      const lists = await listService.getBoardLists('board1');
      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe('List 1');
    });

    it('should create a list with active status', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const listId = await listService.createList('board1', 'New List', 1);
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'active' }));
      expect(listId).toBe('1');
    });

    it('should update a list', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await listService.updateList('1', { title: 'Updated List' });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should soft delete a list by setting status to deleted', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await listService.deleteList('1');
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'deleted' }));
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('cardService', () => {
    it('should get active cards for a list', async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: '1',
            data: () => ({
              title: 'Card 1',
              description: 'desc',
              listId: 'list1',
              position: 1,
              status: 'active',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });
      const cards = await cardService.getListCards('list1');
      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(cards).toHaveLength(1);
      expect(cards[0].title).toBe('Card 1');
    });

    it('should create a card with active status', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const cardId = await cardService.createCard('list1', 'New Card', 'New Description', 1);
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'active' }));
      expect(cardId).toBe('1');
    });

    it('should soft delete a card by setting status to deleted', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await cardService.deleteCard('1');
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'deleted' }));
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });

  describe('commentService', () => {
    it('should get active comments for a card', async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: '1',
            data: () => ({
              content: 'Comment 1',
              userId: 'user1',
              cardId: 'card1',
              status: 'active',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
              editHistory: [],
            }),
          },
        ],
      });
      (getDoc as any).mockResolvedValue({
        data: () => ({
          displayName: 'Test User',
          email: 'test@example.com',
        }),
      });
      const comments = await commentService.getCardComments('card1');
      expect(where).toHaveBeenCalledWith('status', '==', 'active');
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('Comment 1');
      expect(comments[0]).not.toHaveProperty('isDeleted');
    });

    it('should create a comment with active status', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const commentId = await commentService.createComment('card1', 'user1', 'New Comment');
      expect(addDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ status: 'active' }));
      expect(commentId).toBe('1');
    });

    it('should soft delete a comment by setting status to deleted', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await commentService.deleteComment('1');
      const callArgs = (updateDoc as any).mock.calls[0][1];
      expect(callArgs.status).toBe('deleted');
      expect(callArgs).not.toHaveProperty('isDeleted');
      expect(deleteDoc).not.toHaveBeenCalled();
    });
  });
});