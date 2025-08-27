
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as firestore from 'firebase/firestore';
import { boardService, listService, cardService, commentService } from '../firebase-service';

vi.mock('../firebase');
vi.mock('firebase/firestore', async () => {
    const actual = await vi.importActual('../__mocks__/firebase-firestore');
    return actual;
});

describe('Firebase Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('boardService', () => {
    it('should get boards', async () => {
        const docs = [{ id: '1', data: () => ({ title: 'Board 1', userId: 'user1', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) }];
        firestore.getDocs.mockResolvedValue({ docs });
        const boards = await boardService.getUserBoards('user1');
        expect(boards).toHaveLength(1);
        expect(boards[0].title).toBe('Board 1');
      });

    it('should create a board', async () => {
        firestore.addDoc.mockResolvedValue({ id: '1' });
        const boardId = await boardService.createBoard('user1', 'New Board', 'New Description');
        expect(firestore.addDoc).toHaveBeenCalled();
        expect(boardId).toBe('1');
      });

    it('should update a board', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        await boardService.updateBoard('1', { title: 'Updated Board' });
        expect(firestore.updateDoc).toHaveBeenCalled();
      });

    it('should delete a board', async () => {
        firestore.deleteDoc.mockResolvedValue(undefined);
        await boardService.deleteBoard('1');
        expect(firestore.deleteDoc).toHaveBeenCalled();
      });
  });

  describe('listService', () => {
    it('should get lists', async () => {
        const docs = [{ id: '1', data: () => ({ title: 'List 1', boardId: 'board1', position: 1, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) }];
        firestore.getDocs.mockResolvedValue({ docs });
        const lists = await listService.getBoardLists('board1');
        expect(lists).toHaveLength(1);
        expect(lists[0].title).toBe('List 1');
      });

    it('should create a list', async () => {
        firestore.addDoc.mockResolvedValue({ id: '1' });
        const listId = await listService.createList('board1', 'New List', 1);
        expect(firestore.addDoc).toHaveBeenCalled();
        expect(listId).toBe('1');
      });

    it('should update a list', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        await listService.updateList('1', { title: 'Updated List' });
        expect(firestore.updateDoc).toHaveBeenCalled();
      });

    it('should delete a list', async () => {
        firestore.deleteDoc.mockResolvedValue(undefined);
        await listService.deleteList('1');
        expect(firestore.deleteDoc).toHaveBeenCalled();
      });

    it('should reorder lists', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        const listUpdates = [
          { id: '1', position: 2 },
          { id: '2', position: 1 },
        ];
        await listService.reorderLists(listUpdates);
        expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
      });
  });

  describe('cardService', () => {
    it('should get cards', async () => {
        const docs = [{ id: '1', data: () => ({ title: 'Card 1', position: 1, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) }];
        firestore.getDocs.mockResolvedValue({ docs });
        const cards = await cardService.getListCards('list1');
        expect(cards).toHaveLength(1);
        expect(cards[0].title).toBe('Card 1');
      });

    it('should get cards for multiple lists', async () => {
        const docs = [
          { id: '1', data: () => ({ title: 'Card 1', listId: 'list1', position: 1, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
          { id: '2', data: () => ({ title: 'Card 2', listId: 'list2', position: 1, createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() } }) },
        ];
        firestore.getDocs.mockResolvedValue({ docs });
        const cards = await cardService.getBoardCards(['list1', 'list2']);
        expect(cards).toHaveLength(2);
        expect(cards[0].title).toBe('Card 1');
        expect(cards[1].title).toBe('Card 2');
      });

    it('should return empty array if no listIds are provided', async () => {
        const cards = await cardService.getBoardCards([]);
        expect(cards).toHaveLength(0);
      });

    it('should create a card', async () => {
        firestore.addDoc.mockResolvedValue({ id: '1' });
        const cardId = await cardService.createCard('list1', 'New Card', 'New Description', 1);
        expect(firestore.addDoc).toHaveBeenCalled();
        expect(cardId).toBe('1');
      });

    it('should update a card', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        await cardService.updateCard('1', { title: 'Updated Card' });
        expect(firestore.updateDoc).toHaveBeenCalled();
      });

    it('should delete a card', async () => {
        firestore.deleteDoc.mockResolvedValue(undefined);
        await cardService.deleteCard('1');
        expect(firestore.deleteDoc).toHaveBeenCalled();
      });

    it('should move a card', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        await cardService.moveCard('1', 'newList1', 1);
        expect(firestore.updateDoc).toHaveBeenCalled();
      });

    it('should reorder cards', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        const cardUpdates = [
          { id: '1', listId: 'list1', position: 2 },
          { id: '2', listId: 'list2', position: 1 },
        ];
        await cardService.reorderCards(cardUpdates);
        expect(firestore.updateDoc).toHaveBeenCalledTimes(2);
      });
  });

  describe('commentService', () => {
    it('should get comments', async () => {
        const docs = [{ id: '1', data: () => ({ content: 'Comment 1', userId: 'user1', createdAt: { toDate: () => new Date() }, updatedAt: { toDate: () => new Date() }, editHistory: [] }) }];
        firestore.getDocs.mockResolvedValue({ docs });
        firestore.getDoc.mockResolvedValue({ data: () => ({ displayName: 'Test User' }) });
        const comments = await commentService.getCardComments('card1');
        expect(comments).toHaveLength(1);
        expect(comments[0].content).toBe('Comment 1');
      });

    it('should create a comment', async () => {
        firestore.addDoc.mockResolvedValue({ id: '1' });
        const commentId = await commentService.createComment('card1', 'user1', 'New Comment');
        expect(firestore.addDoc).toHaveBeenCalled();
        expect(commentId).toBe('1');
      });

    it('should update a comment', async () => {
        firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ content: 'Old Comment', userId: 'user1', updatedAt: { toDate: () => new Date() }, editHistory: [] }) });
        firestore.updateDoc.mockResolvedValue(undefined);
        await commentService.updateComment('1', 'user1', 'Updated Comment');
        expect(firestore.updateDoc).toHaveBeenCalled();
      });

    it('should soft delete a comment', async () => {
        firestore.updateDoc.mockResolvedValue(undefined);
        await commentService.deleteComment('1');
        expect(firestore.updateDoc).toHaveBeenCalledWith(expect.anything(), { isDeleted: true, updatedAt: 'MOCKED_TIMESTAMP' });
      });

    it('should get comment edit history', async () => {
        const editHistory = [
          { id: 'edit_1', content: 'Edit 1', editedAt: { toDate: () => new Date() }, userId: 'user1' },
        ];
        firestore.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ editHistory }) });
        const history = await commentService.getCommentEditHistory('1');
        expect(history).toHaveLength(1);
        expect(history[0].content).toBe('Edit 1');
      });
  });
});
