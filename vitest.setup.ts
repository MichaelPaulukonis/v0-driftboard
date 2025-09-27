import '@testing-library/jest-dom';
import { vi } from 'vitest';

console.log('vitest.setup.ts loaded');

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getFirestore: vi.fn(() => ({
      collection: vi.fn(() => ({})),
      doc: vi.fn(() => ({})),
      get: vi.fn(() => Promise.resolve({
        exists: () => true,
        data: () => ({}),
      })),
      addDoc: vi.fn(),
      updateDoc: vi.fn(),
      deleteDoc: vi.fn(),
      query: vi.fn(() => ({})),
      where: vi.fn(() => ({})),
      orderBy: vi.fn(() => ({})),
      getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    })),
    collection: vi.fn(() => ({})),
    doc: vi.fn(() => ({})),
    getDoc: vi.fn(() => Promise.resolve({
      exists: () => true,
      data: () => ({}),
    })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => ({
      toDate: () => new Date('2025-01-01T00:00:00Z'),
    })),
    addDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    })),
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
