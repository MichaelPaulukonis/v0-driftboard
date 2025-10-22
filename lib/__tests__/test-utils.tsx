import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { BoardContext } from '@/contexts/board-context';
import { ColumnContext } from '@/contexts/column-context';
import type { BoardContextValue } from '@/lib/types';

// Mock user for authentication context
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

// Mock authentication context value
const mockAuthContextValue = {
  user: mockUser,
  loading: false,
};

// Mock authentication provider for tests
export function MockAuthProvider({ children }: { children: React.ReactNode }) {
  // Create a mock context using React.createContext
  const AuthContext = React.createContext(mockAuthContextValue);
  
  return (
    <AuthContext.Provider value={mockAuthContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Default mock board context value
export const mockBoardContextValue: BoardContextValue = {
  reorderList: vi.fn(),
  reorderCard: vi.fn(),
  moveCard: vi.fn(),
  instanceId: Symbol('test-board'),
};

// Default mock column context value
export const mockColumnContextValue = {
  listId: 'test-list-id',
};

// Board context provider for tests
export function MockBoardProvider({ 
  children, 
  value = mockBoardContextValue 
}: { 
  children: React.ReactNode;
  value?: BoardContextValue;
}) {
  return (
    <BoardContext.Provider value={value}>
      {children}
    </BoardContext.Provider>
  );
}

// Column context provider for tests
export function MockColumnProvider({ 
  children, 
  value = mockColumnContextValue 
}: { 
  children: React.ReactNode;
  value?: { listId: string };
}) {
  return (
    <ColumnContext.Provider value={value}>
      {children}
    </ColumnContext.Provider>
  );
}

// Complete wrapper with all necessary providers
export function TestWrapper({ 
  children,
  boardContextValue = mockBoardContextValue,
  columnContextValue = mockColumnContextValue,
}: { 
  children: React.ReactNode;
  boardContextValue?: BoardContextValue;
  columnContextValue?: { listId: string };
}) {
  return (
    <MockAuthProvider>
      <MockBoardProvider value={boardContextValue}>
        <MockColumnProvider value={columnContextValue}>
          {children}
        </MockColumnProvider>
      </MockBoardProvider>
    </MockAuthProvider>
  );
}

// Custom render function with all providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'> & {
    boardContextValue?: BoardContextValue;
    columnContextValue?: { listId: string };
  }
) {
  const {
    boardContextValue = mockBoardContextValue,
    columnContextValue = mockColumnContextValue,
    ...renderOptions
  } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <TestWrapper 
        boardContextValue={boardContextValue}
        columnContextValue={columnContextValue}
      >
        {children}
      </TestWrapper>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Export everything from testing library
export * from '@testing-library/react';
export { renderWithProviders as render };