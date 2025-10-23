import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import { BoardContext } from '@/contexts/board-context';
import { ColumnContext } from '@/contexts/column-context';
import type { BoardContextValue } from '@/lib/types';

// Import mock values from vitest.setup.ts
import { mockUser, mockAuthContextValue } from '../../vitest.setup';

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
    <MockBoardProvider value={boardContextValue}>
      <MockColumnProvider value={columnContextValue}>
        {children}
      </MockColumnProvider>
    </MockBoardProvider>
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

// Export mock values for use in tests
export { mockUser, mockAuthContextValue };