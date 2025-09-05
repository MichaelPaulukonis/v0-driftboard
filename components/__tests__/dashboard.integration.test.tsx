
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Dashboard } from '../dashboard';
import { useAuth } from '@/contexts/auth-context';
import { boardService } from '@/lib/firebase-service';

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));
vi.mock('@/lib/firebase');
vi.mock('@/contexts/auth-context');
vi.mock("@/lib/firebase-service", async () => {
  const actual = await import('@/lib/firebase-service');
  return {
    ...actual,
    boardService: {
      getUserBoards: vi.fn().mockResolvedValue([]),
      createBoard: vi.fn(),
      updateBoard: vi.fn(),
      deleteBoard: vi.fn(),
      exportBoardData: vi.fn(),
    },
  };
});

describe('Dashboard', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({ user: { uid: 'test-user' } });
  });

  it('should render loading state initially', async () => {
    render(<Dashboard />);
    expect(screen.getByText(/loading your boards/i)).toBeInTheDocument();
    await screen.findByText(/loading your boards/i); // Wait for the loading state to settle
  });

  it('should render empty state when no boards are found', async () => {
    boardService.getUserBoards.mockResolvedValue([]);
    render(<Dashboard />);
    expect(await screen.findByText(/no boards yet/i)).toBeInTheDocument();
  });

  it('should render boards when boards are found', async () => {
    const boards = [
      { id: '1', title: 'Board 1', description: 'Description 1', createdAt: new Date(), updatedAt: new Date() },
      { id: '2', title: 'Board 2', description: 'Description 2', createdAt: new Date(), updatedAt: new Date() },
    ];
    boardService.getUserBoards.mockResolvedValue(boards);
    render(<Dashboard />);
    expect(await screen.findByText('Board 1')).toBeInTheDocument();
    expect(await screen.findByText('Board 2')).toBeInTheDocument();
  });

  it('should open create board dialog when create board button is clicked', async () => {
    boardService.getUserBoards.mockResolvedValue([]);
    render(<Dashboard />);
    await userEvent.click((await screen.findAllByText(/new board/i))[0]);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
  });
});
