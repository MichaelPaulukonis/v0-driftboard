import { boardService } from '../firebase-service';
import { getDoc, getDocs } from 'firebase/firestore';
import { vi } from 'vitest';

vi.mock('firebase/firestore', () => ({
  getDoc: vi.fn(),
  getDocs: vi.fn(),
  doc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
}));

describe('Firebase Services > boardService > exportBoardData', () => {
  it('should export board data to JSON', async () => {
    const boardId = 'board1';
    const board = { id: boardId, title: 'Test Board', data: () => ({ title: 'Test Board' }) };
    const lists = {
      docs: [
        {
          id: 'list1',
          data: () => ({
            title: 'List 1',
            boardId: 'board1',
            position: 1,
            createdAt: { toDate: () => new Date() },
            updatedAt: { toDate: () => new Date() },
          }),
        },
      ]
    };
    const cards = {
      docs: [{
        id: 'card1',
        data: () => ({
          title: 'Test Card',
          listId: 'list1',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
        })
      }]
    };

    const comments = {
      docs: [{
        id: 'comment1',
        data: () => ({
          content: 'Test Comment',
          createdAt: { toDate: () => new Date() },
          updatedAt: { toDate: () => new Date() },
          editHistory: []
        })
      }]
    };

    (getDoc as any).mockResolvedValue({
      exists: () => true,
      id: boardId,
      data: () => ({
        title: 'Test Board',
        description: 'desc',
        userId: 'user1',
        createdAt: { toDate: () => new Date() },
        updatedAt: { toDate: () => new Date() },
      }),
    });

    (getDocs as any).mockResolvedValueOnce(lists).mockResolvedValueOnce(cards).mockResolvedValueOnce(comments);

    const json = await boardService.exportBoardData(boardId);
    const data = JSON.parse(json);

    expect(data.board.id).toBe(boardId);
    expect(data.lists).toHaveLength(1);
    expect(data.lists[0].cards).toHaveLength(1);
    expect(data.lists[0].cards[0].comments).toHaveLength(1);
  });
});