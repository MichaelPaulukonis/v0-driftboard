
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
