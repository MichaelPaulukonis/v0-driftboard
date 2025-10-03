import { createContext, useContext } from 'react';
import invariant from 'tiny-invariant';
import type { BoardContextValue } from '@/lib/types';

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoardContext(): BoardContextValue {
  const value = useContext(BoardContext);
  invariant(value, 'cannot find BoardContext provider');
  return value;
}
