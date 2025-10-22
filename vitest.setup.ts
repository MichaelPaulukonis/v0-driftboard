import '@testing-library/jest-dom';
import { vi } from 'vitest';

console.log('vitest.setup.ts loaded');

// Add polyfills for missing DOM methods
Object.defineProperty(Element.prototype, 'hasPointerCapture', {
  value: vi.fn().mockReturnValue(false),
  writable: true,
});

Object.defineProperty(Element.prototype, 'setPointerCapture', {
  value: vi.fn(),
  writable: true,
});

Object.defineProperty(Element.prototype, 'releasePointerCapture', {
  value: vi.fn(),
  writable: true,
});

// Mock user for authentication context
export const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Mock authentication context value
export const mockAuthContextValue = {
  user: mockUser,
  loading: false,
};

// Mock the useAuth hook directly
vi.mock('@/contexts/auth-context', () => ({
  useAuth: vi.fn(() => mockAuthContextValue),
  AuthProvider: vi.fn(({ children }) => children),
}));

vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(() => ({})),
}));

vi.mock('firebase/auth', () => {
  let mockUser: any = null;
  let onAuthStateChangedCallback: (user: any) => void;

  const mockOnAuthStateChanged = vi.fn((auth, callback) => {
    onAuthStateChangedCallback = callback;
    // Immediately trigger with current mock user
    if (typeof onAuthStateChangedCallback === 'function') {
      onAuthStateChangedCallback(mockUser);
    }
    // Return unsubscribe function
    return vi.fn();
  });

  // Helper for tests to set the user
  (mockOnAuthStateChanged as any).setMockUser = (user: any) => {
    mockUser = user;
    if (typeof onAuthStateChangedCallback === 'function') {
      onAuthStateChangedCallback(mockUser);
    }
  };

  return {
    getAuth: vi.fn(() => ({ currentUser: mockUser })),
    onAuthStateChanged: mockOnAuthStateChanged,
    signInWithEmailAndPassword: vi.fn(),
    signOut: vi.fn().mockImplementation(() => {
      mockUser = null;
      if (typeof onAuthStateChangedCallback === 'function') {
        onAuthStateChangedCallback(null);
      }
    }),
  };
});

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal() as any;
  const mockDocRef = { id: 'mock-doc-id' };
  const mockCollectionRef = { id: 'mock-collection-id' };

  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(() => mockCollectionRef),
    doc: vi.fn(() => mockDocRef),
    getDoc: vi.fn(() => Promise.resolve({ exists: () => true, data: () => ({}), id: 'mock-doc-id' })),
    getDocs: vi.fn(() => Promise.resolve({ docs: [] })),
    query: vi.fn(() => ({})),
    where: vi.fn(() => ({})),
    orderBy: vi.fn(() => ({})),
    serverTimestamp: vi.fn(() => new Date('2025-01-01T00:00:00Z')),
    addDoc: vi.fn(),
    updateDoc: vi.fn(() => Promise.resolve()),
    deleteDoc: vi.fn(() => Promise.resolve()),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    })),
    runTransaction: vi.fn(async (db, updateFunction) => {
      const transaction = {
        get: vi.fn().mockResolvedValue({ exists: () => true, data: () => ({}), id: 'mock-id' }),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      };
      await updateFunction(transaction);
    }),
  };
});
