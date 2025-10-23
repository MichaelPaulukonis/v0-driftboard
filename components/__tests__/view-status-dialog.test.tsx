import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ViewStatusDialog } from '../view-status-dialog';
import { mockAuthHelpers } from '@/lib/__tests__/test-utils';
import type { Card, List } from '@/lib/types';

// Mock the firebase service
vi.mock('@/lib/firebase-service', () => ({
  cardService: {
    getCardsByStatus: vi.fn(),
    updateCardStatus: vi.fn(),
    updateCard: vi.fn(),
  },
  listService: {
    getBoardLists: vi.fn(),
  },
}));

// Mock child components
vi.mock('../card-detail-dialog', () => ({
  CardDetailDialog: ({ open, onOpenChange }: { open: boolean; onOpenChange: () => void }) => 
    open ? <div data-testid="card-detail-dialog" onClick={onOpenChange}>Card Detail Dialog</div> : null,
}));

vi.mock('../reparent-card-dialog', () => ({
  ReparentCardDialog: ({ isOpen, onConfirm, onCancel }: { isOpen: boolean; onConfirm: (id: string) => void; onCancel: () => void }) => 
    isOpen ? (
      <div data-testid="reparent-dialog">
        <button type="button" onClick={() => onConfirm('new-list-id')}>Confirm Reparent</button>
        <button type="button" onClick={onCancel}>Cancel Reparent</button>
      </div>
    ) : null,
}));

describe('ViewStatusDialog', () => {
  const mockOnCardRestored = vi.fn();
  
  const mockCards: Card[] = [
    {
      id: 'card-1',
      title: 'Test Card 1',
      description: 'Description 1',
      position: 0,
      listId: 'list-1',
      status: 'done',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'card-2',
      title: 'Test Card 2',
      description: 'Description 2',
      position: 1,
      listId: 'list-2',
      status: 'done',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockLists: List[] = [
    {
      id: 'list-1',
      title: 'Active List 1',
      position: 0,
      boardId: 'board-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'list-3',
      title: 'Active List 2',
      position: 1,
      boardId: 'board-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    boardId: 'board-1',
    status: 'done' as const,
    trigger: <button>View Done Cards</button>,
    onCardRestored: mockOnCardRestored,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<ViewStatusDialog {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /view done cards/i })).toBeInTheDocument();
  });

  it('opens dialog when trigger is clicked', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Done Cards')).toBeInTheDocument();
    });
  });

  it('fetches and displays cards when dialog opens', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(cardService.getCardsByStatus).toHaveBeenCalledWith('board-1', 'done');
      expect(listService.getBoardLists).toHaveBeenCalledWith('board-1');
    });

    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
      expect(screen.getByText('Description 1')).toBeInTheDocument();
      expect(screen.getByText('Description 2')).toBeInTheDocument();
    });
  });

  it('shows loading skeletons while fetching data', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    
    let resolveCards: (cards: Card[]) => void;
    let resolveLists: (lists: List[]) => void;
    const cardsPromise = new Promise<Card[]>((resolve) => { resolveCards = resolve; });
    const listsPromise = new Promise<List[]>((resolve) => { resolveLists = resolve; });
    
    (cardService.getCardsByStatus as any).mockReturnValue(cardsPromise);
    (listService.getBoardLists as any).mockReturnValue(listsPromise);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    // Should show loading skeletons
    expect(screen.getAllByTestId('card-skeleton')).toHaveLength(3);
    
    resolveCards!(mockCards);
    resolveLists!(mockLists);
    
    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });
  });

  it('shows empty state when no cards found', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue([]);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('No done cards found.')).toBeInTheDocument();
    });
  });

  it('renders view and restore buttons for each card', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /view/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /restore/i })).toHaveLength(2);
    });
  });

  it('opens card detail dialog when view button is clicked', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    const viewButtons = screen.getAllByRole('button', { name: /view/i });
    await user.click(viewButtons[0]);
    
    expect(screen.getByTestId('card-detail-dialog')).toBeInTheDocument();
  });

  it('restores card directly when parent list is active', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);
    (cardService.updateCardStatus as any).mockResolvedValue(undefined);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]);
    
    await waitFor(() => {
      expect(cardService.updateCardStatus).toHaveBeenCalledWith('card-1', 'test-user-id', 'active');
      expect(mockOnCardRestored).toHaveBeenCalled();
    });
  });

  it('opens reparent dialog when parent list is inactive', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    });

    // Card 2 has listId 'list-2' which is not in mockLists (orphaned)
    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[1]);
    
    expect(screen.getByTestId('reparent-dialog')).toBeInTheDocument();
  });

  it('handles reparent confirmation', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);
    (cardService.updateCard as any).mockResolvedValue(undefined);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Test Card 2')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[1]);
    
    expect(screen.getByTestId('reparent-dialog')).toBeInTheDocument();
    
    fireEvent.click(screen.getByText('Confirm Reparent'));
    
    await waitFor(() => {
      expect(cardService.updateCard).toHaveBeenCalledWith(
        'card-2',
        'test-user-id',
        { listId: 'new-list-id', status: 'active' }
      );
      expect(mockOnCardRestored).toHaveBeenCalled();
    });
  });

  it('handles different status types correctly', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    (cardService.getCardsByStatus as any).mockResolvedValue([]);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    const archivedProps = { ...defaultProps, status: 'archived' as const };
    render(<ViewStatusDialog {...archivedProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Archived Cards')).toBeInTheDocument();
      expect(cardService.getCardsByStatus).toHaveBeenCalledWith('board-1', 'archived');
    });
  });

  it('handles fetch error gracefully', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    (cardService.getCardsByStatus as any).mockRejectedValue(new Error('Fetch failed'));
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error fetching data for dialog:', expect.any(Error));
    });
    
    consoleSpy.mockRestore();
  });

  it('restores card when user is authenticated', async () => {
    const user = userEvent.setup();
    const { cardService, listService } = await import('@/lib/firebase-service');
    
    (cardService.getCardsByStatus as any).mockResolvedValue(mockCards);
    (listService.getBoardLists as any).mockResolvedValue(mockLists);

    render(<ViewStatusDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /view done cards/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Test Card 1')).toBeInTheDocument();
    });

    const restoreButtons = screen.getAllByRole('button', { name: /restore/i });
    await user.click(restoreButtons[0]);
    
    // With authenticated user, card should be restored
    expect(cardService.updateCardStatus).toHaveBeenCalledWith('card-1', 'test-user-id', 'active');
    expect(mockOnCardRestored).toHaveBeenCalled();
  });
});