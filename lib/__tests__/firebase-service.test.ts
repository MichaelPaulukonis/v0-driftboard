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
  writeBatch,
  runTransaction,
  limit,
} from 'firebase/firestore';
import { boardService, listService, cardService, commentService } from '../firebase-service';

// Mock the firebase module and all Firestore functions
vi.mock('../firebase');
vi.mock('firebase/firestore', async () => {
  let docIdCounter = 0;
  const generateId = () => `generated-id-${++docIdCounter}`;
  
  // Provide mock implementations for all Firestore functions used
  return {
    collection: vi.fn(() => ({ mock: true })),
    getDocs: vi.fn(),
    doc: vi.fn((db: any, collectionName: string, id?: string) => ({
      id: id || generateId(), // Generate ID if not provided, like Firebase does
      path: `${collectionName}/${id || generateId()}`,
    })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    serverTimestamp: vi.fn(() => ({ toDate: () => new Date(), mock: true })),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    })),
    limit: vi.fn(),
    runTransaction: vi.fn((db, updateFunction) => {
      const transaction = {
        get: vi.fn(() => Promise.resolve({
          exists: () => true,
          data: () => ({}),
          id: 'mock-id',
        })),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      return Promise.resolve(updateFunction(transaction));
    }),
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
      const boardId = await boardService.createBoard('user1', 'New Board', 'New Description');
      expect(writeBatch).toHaveBeenCalled();
      expect(boardId).toBe('generated-id-1'); // First generated ID
    });

    it('should update a board', async () => {
      await boardService.updateBoard('1', 'user1', { title: 'Updated Board' });
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should soft delete a board by setting status to deleted', async () => {
      await boardService.deleteBoard('1', 'user1');
      expect(runTransaction).toHaveBeenCalled();
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
      const listId = await listService.createList('board1', 'user1', 'New List', 1);
      expect(writeBatch).toHaveBeenCalled();
      expect(listId).toMatch(/^generated-id-\d+$/); // Should be a generated ID
    });

    it('should update a list', async () => {
      await listService.updateList('1', 'user1', { title: 'Updated List' });
      expect(runTransaction).toHaveBeenCalled();
    });

    it('should soft delete a list by setting status to deleted', async () => {
      await listService.deleteList('1', 'user1');
      expect(runTransaction).toHaveBeenCalled();
    });

    describe('Cascading Soft-Delete', () => {
      it('should soft-delete a list and only its active cards', async () => {
        // Arrange
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ title: 'List 1' }) }),
          set: vi.fn(),
          update: vi.fn(),
        };
        (runTransaction as any).mockImplementation(async (db, updateFunction) => {
          await updateFunction(mockTransaction);
        });

        // This mock should only return what the actual query would: the active cards.
        const mockCardsSnapshot = {
          docs: [
            { id: 'card-active-1', ref: 'ref-active-1', data: () => ({ listId: 'list1', status: 'active' }) },
          ],
        };
        (getDocs as any).mockResolvedValue(mockCardsSnapshot);

        // Act
        await listService.deleteList('list1', 'user1');

        // Assert
        // 1. The list itself is marked as deleted
        expect(mockTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'lists_current/list1' }), expect.objectContaining({ status: 'deleted' }));
        
        // 2. The active card is marked as deleted
        expect(mockTransaction.update).toHaveBeenCalledWith('ref-active-1', expect.objectContaining({ status: 'deleted' }));

        // 3. The 'done' card is NOT updated (no 'ref-done-1' should be passed)
        expect(mockTransaction.update).not.toHaveBeenCalledWith('ref-done-1', expect.any(Object));

        // 4. History is recorded with the cascaded card ID
        expect(mockTransaction.set).toHaveBeenCalledWith(
          expect.any(Object), // historyRef
          expect.objectContaining({
            changeType: 'delete',
            cascadedCardIds: ['card-active-1'],
          })
        );
      });

      it('should restore a list and its cascaded-deleted cards', async () => {
        // Arrange
        const mockTransaction = {
          get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({ title: 'List 1' }) }),
          set: vi.fn(),
          update: vi.fn(),
        };
        (runTransaction as any).mockImplementation(async (db, updateFunction) => {
          await updateFunction(mockTransaction);
        });

        const mockHistorySnapshot = {
          docs: [
            { data: () => ({ cascadedCardIds: ['card-auto-deleted-1'] }) },
          ],
        };
        (getDocs as any).mockResolvedValue(mockHistorySnapshot);

        // Act
        await listService.restoreList('list1', 'user1');

        // Assert
        // 1. The list is restored
        expect(mockTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'lists_current/list1' }), expect.objectContaining({ status: 'active' }));

        // 2. The auto-deleted card is restored
        expect(mockTransaction.update).toHaveBeenCalledWith(expect.objectContaining({ path: 'cards_current/card-auto-deleted-1' }), expect.objectContaining({ status: 'active' }));
      });
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
      const cardId = await cardService.createCard('list1', 'user1', 'New Card', 'New Description', 1);
      expect(writeBatch).toHaveBeenCalled();
      expect(cardId).toMatch(/^generated-id-\d+$/); // Should be a generated ID
    });

    it('should soft delete a card by setting status to deleted', async () => {
      await cardService.deleteCard('1', 'user1');
      expect(runTransaction).toHaveBeenCalled();
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
      expect(comments[0].status).toBe('active'); // Check status field instead of isDeleted
    });

    it('should create a comment with active status', async () => {
      const commentId = await commentService.createComment('card1', 'user1', 'New Comment');
      expect(writeBatch).toHaveBeenCalled();
      expect(commentId).toMatch(/^generated-id-\d+$/); // Should be a generated ID
    });

    it('should soft delete a comment by setting status to deleted', async () => {
      await commentService.deleteComment('1', 'user1');
      expect(runTransaction).toHaveBeenCalled();
    });
  });
});
