
import { vi } from 'vitest';

export const Timestamp = {
  now: () => ({ toDate: () => new Date() }),
};
export const getFirestore = vi.fn();
export const collection = vi.fn();
export const doc = vi.fn((db, collectionId, docId) => ({
  id: docId,
  path: `${collectionId}/${docId}`,
  firestore: db,
}));
export const addDoc = vi.fn();
export const getDoc = vi.fn();
export const getDocs = vi.fn();
export const updateDoc = vi.fn();
export const deleteDoc = vi.fn();
export const serverTimestamp = vi.fn(() => 'MOCKED_TIMESTAMP');
export const query = vi.fn();
export const where = vi.fn();
export const orderBy = vi.fn();
export const writeBatch = vi.fn(() => ({
  set: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  commit: vi.fn(() => Promise.resolve()),
}));
export const runTransaction = vi.fn((db, updateFunction) => {
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
});
