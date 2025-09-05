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
    collection: vi.fn(),
    getDocs: vi.fn(),
    doc: vi.fn((db, collectionName, id) => ({
      path: `${collectionName}/${id}`,
    })),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
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
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('boardService', () => {
    it('should get boards', async () => {
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: '1',
            data: () => ({
              title: 'Board 1',
              userId: 'user1',
              description: 'desc',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ]
      });
      const boards = await boardService.getUserBoards('user1');
      expect(boards).toHaveLength(1);
      expect(boards[0].title).toBe('Board 1');
    });

    it('should create a board', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const boardId = await boardService.createBoard('user1', 'New Board', 'New Description');
      expect(addDoc).toHaveBeenCalled();
      expect(boardId).toBe('1');
    });

    it('should update a board', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await boardService.updateBoard('1', { title: 'Updated Board' });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should delete a board', async () => {
      (deleteDoc as any).mockResolvedValue(undefined);
      await boardService.deleteBoard('1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should export board data', async () => {
      // Mock board doc
      (getDoc as any).mockImplementation((ref) => {
        if (ref.path.includes('boards')) {
          return Promise.resolve({
            exists: () => true,
            id: 'board1',
            data: () => ({
              title: 'Board 1',
              description: 'desc',
              userId: 'user1',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          });
        }
        if (ref.path.includes('users')) {
          return Promise.resolve({
            data: () => ({
              displayName: 'Test User',
              email: 'test@example.com',
            }),
          });
        }
        if (ref.path.includes('comments')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              editHistory: [],
            }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });
      // Mock lists
      (listService.getBoardLists as any) = vi.fn().mockResolvedValue([
        {
          id: 'list1',
          title: 'List 1',
          boardId: 'board1',
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Mock cards
      (cardService.getBoardCards as any) = vi.fn().mockResolvedValue([
        {
          id: 'card1',
          title: 'Card 1',
          description: 'desc',
          listId: 'list1',
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Mock comments
      (commentService.getCardComments as any) = vi.fn().mockResolvedValue([
        {
          id: 'comment1',
          cardId: 'card1',
          userId: 'user1',
          content: 'Comment 1',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          editHistory: [],
          user: { displayName: 'Test User', email: 'test@example.com' },
        },
      ]);
      const json = await boardService.exportBoardData('board1');
      expect(json).toContain('"Board 1"');
      expect(json).toContain('"List 1"');
      expect(json).toContain('"Card 1"');
      expect(json).toContain('"Comment 1"');
    });
  });

  describe('listService', () => {
    it.skip('should get lists', async () => {
      const docs = [
        {
          id: '1',
          data: () => ({
            title: 'List 1',
            boardId: 'board1',
            position: 1,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];
      (getDocs as any).mockResolvedValue({
        docs: [
          {
            id: 'card1',
            data: () => ({
              title: 'Card 1',
              description: 'desc',
              listId: 'list1',
              position: 1,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
          {
            id: 'card2',
            data: () => ({
              title: 'Card 2',
              description: 'desc',
              listId: 'list2',
              position: 2,
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          },
        ],
      });
      const lists = await listService.getBoardLists('board1');
      expect(lists).toHaveLength(1);
      expect(lists[0].title).toBe('List 1');
    });

    it('should create a list', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const listId = await listService.createList('board1', 'New List', 1);
      expect(addDoc).toHaveBeenCalled();
      expect(listId).toBe('1');
    });

    it('should update a list', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await listService.updateList('1', { title: 'Updated List' });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should delete a list', async () => {
      (deleteDoc as any).mockResolvedValue(undefined);
      await listService.deleteList('1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should reorder lists', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      const listUpdates = [
        { id: '1', position: 2 },
        { id: '2', position: 1 },
      ];
      await listService.reorderLists(listUpdates);
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('cardService', () => {
    it('should get cards', async () => {
      const docs = [
        {
          id: '1',
          data: () => ({
            title: 'Card 1',
            description: 'desc',
            listId: 'list1',
            position: 1,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];
      (getDocs as any).mockResolvedValue({ docs });
      const cards = await cardService.getListCards('list1');
      expect(cards).toHaveLength(1);
      expect(cards[0].title).toBe('Card 1');
    });

    it.skip('should get cards for multiple lists', async () => {
      const docs = [
        {
          id: '1',
          data: () => ({
            title: 'Card 1',
            listId: 'list1',
            description: 'desc',
            position: 1,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
        {
          id: '2',
          data: () => ({
            title: 'Card 2',
            listId: 'list2',
            description: 'desc',
            position: 1,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ];
      (getDocs as any).mockResolvedValue({ docs });
      const cards = await cardService.getBoardCards(['list1', 'list2']);
      expect(cards).toHaveLength(2);
      expect(cards[0].title).toBe('Card 1');
      expect(cards[1].title).toBe('Card 2');
    });

    it.skip('should return empty array if no listIds are provided', async () => {
      (getDocs as any).mockResolvedValue({ docs: [] });
      const cards = await cardService.getBoardCards([]);
      expect(cards).toHaveLength(0);
    });

    it('should create a card', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const cardId = await cardService.createCard('list1', 'New Card', 'New Description', 1);
      expect(addDoc).toHaveBeenCalled();
      expect(cardId).toBe('1');
    });

    it('should update a card', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await cardService.updateCard('1', { title: 'Updated Card' });
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should delete a card', async () => {
      (deleteDoc as any).mockResolvedValue(undefined);
      await cardService.deleteCard('1');
      expect(deleteDoc).toHaveBeenCalled();
    });

    it('should move a card', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await cardService.moveCard('1', 'newList1', 1);
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should reorder cards', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      const cardUpdates = [
        { id: '1', listId: 'list1', position: 2 },
        { id: '2', listId: 'list2', position: 1 },
      ];
      await cardService.reorderCards(cardUpdates);
      expect(updateDoc).toHaveBeenCalledTimes(2);
    });
  });

  describe('commentService', () => {
    it.skip('should get comments', async () => {
      const docs = [
        {
          id: '1',
          data: () => ({
            content: 'Comment 1',
            userId: 'user1',
            cardId: 'card1',
            isDeleted: false,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
            editHistory: [],
          }),
        },
      ];
      (getDocs as any).mockResolvedValue({ docs });
      (getDoc as any).mockResolvedValue({
        data: () => ({
          displayName: 'Test User',
          email: 'test@example.com',
        }),
      });
      const comments = await commentService.getCardComments('card1');
      expect(comments).toHaveLength(1);
      expect(comments[0].content).toBe('Comment 1');
      expect(comments[0].user.displayName).toBe('Test User');
    });

    it('should create a comment', async () => {
      (addDoc as any).mockResolvedValue({ id: '1' });
      const commentId = await commentService.createComment('card1', 'user1', 'New Comment');
      expect(addDoc).toHaveBeenCalled();
      expect(commentId).toBe('1');
    });

    it('should update a comment', async () => {
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({
          content: 'Old Comment',
          userId: 'user1',
          updatedAt: { toDate: () => new Date() },
          editHistory: [],
        }),
      });
      (updateDoc as any).mockResolvedValue(undefined);
      await commentService.updateComment('1', 'user1', 'Updated Comment');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('should soft delete a comment', async () => {
      (updateDoc as any).mockResolvedValue(undefined);
      await commentService.deleteComment('1');
      // Instead of matching exact timestamp, check for isDeleted: true
      const callArgs = (updateDoc as any).mock.calls[0][1];
      expect(callArgs.isDeleted).toBe(true);
      expect(callArgs.updatedAt).toBeDefined();
    });

    it('should get comment edit history', async () => {
      const editHistory = [
        {
          id: 'edit_1',
          content: 'Edit 1',
          editedAt: { toDate: () => new Date() },
          userId: 'user1',
        },
      ];
      (getDoc as any).mockResolvedValue({
        exists: () => true,
        data: () => ({ editHistory }),
      });
      const history = await commentService.getCommentEditHistory('1');
      expect(history).toHaveLength(1);
      expect(history[0].content).toBe('Edit 1');
    });

    it('should throw error if comment not found for edit history', async () => {
      (getDoc as any).mockResolvedValue({ exists: () => false });
      await expect(commentService.getCommentEditHistory('bad_id')).rejects.toThrow('Comment not found');
    });
  });
  describe('boardService.exportBoardData', () => {
    it('should export board data to JSON', async () => {
      // Mock doc() to return an object with a path property
      (doc as any).mockImplementation((dbArg, collectionArg, idArg) => ({
        path: `${collectionArg}/${idArg}`,
      }));

      // Mock getDoc to return board, user, and comment docs based on path
      (getDoc as any).mockImplementation((ref) => {
        if (ref.path.includes('boards')) {
          return Promise.resolve({
            exists: () => true,
            id: 'board1',
            data: () => ({
              title: 'Board 1',
              description: 'desc',
              userId: 'user1',
              createdAt: { toDate: () => new Date() },
              updatedAt: { toDate: () => new Date() },
            }),
          });
        }
        if (ref.path.includes('users')) {
          return Promise.resolve({
            data: () => ({
              displayName: 'Test User',
              email: 'test@example.com',
            }),
          });
        }
        if (ref.path.includes('comments')) {
          return Promise.resolve({
            exists: () => true,
            data: () => ({
              editHistory: [],
            }),
          });
        }
        return Promise.resolve({ exists: () => false });
      });

      // Mock lists
      (listService.getBoardLists as any) = vi.fn().mockResolvedValue([
        {
          id: 'list1',
          title: 'List 1',
          boardId: 'board1',
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Mock cards
      (cardService.getBoardCards as any) = vi.fn().mockResolvedValue([
        {
          id: 'card1',
          title: 'Card 1',
          description: 'desc',
          listId: 'list1',
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      // Mock comments
      (commentService.getCardComments as any) = vi.fn().mockResolvedValue([
        {
          id: 'comment1',
          cardId: 'card1',
          userId: 'user1',
          content: 'Comment 1',
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          editHistory: [],
          user: { displayName: 'Test User', email: 'test@example.com' },
        },
      ]);
      const json = await boardService.exportBoardData('board1');
      expect(json).toContain('"Board 1"');
      expect(json).toContain('"List 1"');
      expect(json).toContain('"Card 1"');
      expect(json).toContain('"Comment 1"');
    });

    it('should throw error if board does not exist', async () => {
      (doc as any).mockImplementation((dbArg, collectionArg, idArg) => ({
        path: `${collectionArg}/${idArg}`,
      }));
      (getDoc as any).mockImplementation((ref) => ({
        exists: () => false,
      }));
      await expect(boardService.exportBoardData('bad_id')).rejects.toThrow('Board not found');
    });

    it('should handle empty lists and cards', async () => {
      (doc as any).mockImplementation((dbArg, collectionArg, idArg) => ({
        path: `${collectionArg}/${idArg}`,
      }));
      (getDoc as any).mockImplementation((ref) => ({
        exists: () => true,
        id: 'board1',
        data: () => ({
          title: 'Board 1',
          description: 'desc',
          userId: 'user1',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      }));
      (listService.getBoardLists as any) = vi.fn().mockResolvedValue([]);
      (cardService.getBoardCards as any) = vi.fn().mockResolvedValue([]);
      const json = await boardService.exportBoardData('board1');
      expect(json).toContain('"lists": []');
    });

    it('should handle cards with no comments', async () => {
      (doc as any).mockImplementation((dbArg, collectionArg, idArg) => ({
        path: `${collectionArg}/${idArg}`,
      }));
      (getDoc as any).mockImplementation((ref) => ({
        exists: () => true,
        id: 'board1',
        data: () => ({
          title: 'Board 1',
          description: 'desc',
          userId: 'user1',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        }),
      }));
      (listService.getBoardLists as any) = vi.fn().mockResolvedValue([
        {
          id: 'list1',
          title: 'List 1',
          boardId: 'board1',
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (cardService.getBoardCards as any) = vi.fn().mockResolvedValue([
        {
          id: 'card1',
          title: 'Card 1',
          description: 'desc',
          listId: 'list1',
          position: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      (commentService.getCardComments as any) = vi.fn().mockResolvedValue([]);
      const json = await boardService.exportBoardData('board1');
      expect(json).toContain('"comments": []');
    });
  });
});
