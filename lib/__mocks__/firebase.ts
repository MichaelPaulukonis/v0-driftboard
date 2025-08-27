import { vi } from 'vitest';

const mockDb = {
  boards: [],
  lists: [],
  cards: [],
  comments: [],
};

export const db = mockDb;

export const auth = {
  onAuthStateChanged: vi.fn(),
};

export const googleProvider = {};

export const boardService = {
  getUserBoards: vi.fn(() => Promise.resolve(mockDb.boards)),
  getBoards: vi.fn(() => Promise.resolve(mockDb.boards)),
  createBoard: vi.fn((board) => {
    mockDb.boards.push(board);
    return Promise.resolve(board);
  }),
  updateBoard: vi.fn((board) => {
    const index = mockDb.boards.findIndex((b) => b.id === board.id);
    mockDb.boards[index] = board;
    return Promise.resolve(board);
  }),
  deleteBoard: vi.fn((id) => {
    mockDb.boards = mockDb.boards.filter((b) => b.id !== id);
    return Promise.resolve();
  }),
};

export const listService = {
  getLists: vi.fn((boardId) =>
    Promise.resolve(mockDb.lists.filter((l) => l.boardId === boardId))
  ),
  createList: vi.fn((list) => {
    mockDb.lists.push(list);
    return Promise.resolve(list);
  }),
  updateList: vi.fn((list) => {
    const index = mockDb.lists.findIndex((l) => l.id === list.id);
    mockDb.lists[index] = list;
    return Promise.resolve(list);
  }),
  deleteList: vi.fn((id) => {
    mockDb.lists = mockDb.lists.filter((l) => l.id !== id);
    return Promise.resolve();
  }),
};

export const cardService = {
  getCards: vi.fn((listId) =>
    Promise.resolve(mockDb.cards.filter((c) => c.listId === listId))
  ),
  createCard: vi.fn((card) => {
    mockDb.cards.push(card);
    return Promise.resolve(card);
  }),
  updateCard: vi.fn((card) => {
    const index = mockDb.cards.findIndex((c) => c.id === card.id);
    mockDb.cards[index] = card;
    return Promise.resolve(card);
  }),
  deleteCard: vi.fn((id) => {
    mockDb.cards = mockDb.cards.filter((c) => c.id !== id);
    return Promise.resolve();
  }),
};

export const commentService = {
  getComments: vi.fn((cardId) =>
    Promise.resolve(mockDb.comments.filter((c) => c.cardId === cardId))
  ),
  createComment: vi.fn((comment) => {
    mockDb.comments.push(comment);
    return Promise.resolve(comment);
  }),
};

export default {};