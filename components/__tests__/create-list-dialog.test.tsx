import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateListDialog } from '../create-list-dialog';

// Mock the firebase service
vi.mock('@/lib/firebase-service', () => ({
  listService: {
    createList: vi.fn(),
  },
}));

describe('CreateListDialog', () => {
  const mockOnListCreated = vi.fn();
  const defaultProps = {
    boardId: 'board-1',
    listsCount: 2,
    onListCreated: mockOnListCreated,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<CreateListDialog {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /add list/i });
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveTextContent('Add List');
  });

  it('opens dialog when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateListDialog {...defaultProps} />);
    
    const triggerButton = screen.getByRole('button', { name: /add list/i });
    await user.click(triggerButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New List')).toBeInTheDocument();
    expect(screen.getByText(/Add a new list to organize/i)).toBeInTheDocument();
  });

  it('renders form fields when dialog is open', async () => {
    const user = userEvent.setup();
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    
    expect(screen.getByLabelText(/list title/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create list/i })).toBeInTheDocument();
  });

  it('disables create button when title is empty', async () => {
    const user = userEvent.setup();
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    
    const createButton = screen.getByRole('button', { name: /create list/i });
    expect(createButton).toBeDisabled();
  });

  it('enables create button when title is provided', async () => {
    const user = userEvent.setup();
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    
    const titleInput = screen.getByLabelText(/list title/i);
    await user.type(titleInput, 'To Do');
    
    const createButton = screen.getByRole('button', { name: /create list/i });
    expect(createButton).toBeEnabled();
  });

  it('closes dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates list successfully when form is submitted', async () => {
    const user = userEvent.setup();
    const { listService } = await import('@/lib/firebase-service');
    (listService.createList as any).mockResolvedValue(undefined);
    
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    
    const titleInput = screen.getByLabelText(/list title/i);
    await user.type(titleInput, 'In Progress');
    
    const createButton = screen.getByRole('button', { name: /create list/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(listService.createList).toHaveBeenCalledWith(
        'board-1',
        'test-user-id',
        'In Progress',
        2
      );
    });
    
    expect(mockOnListCreated).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading state while creating list', async () => {
    const user = userEvent.setup();
    const { listService } = await import('@/lib/firebase-service');
    
    let resolveCreate: () => void;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    (listService.createList as any).mockReturnValue(createPromise);
    
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    await user.type(screen.getByLabelText(/list title/i), 'To Do');
    await user.click(screen.getByRole('button', { name: /create list/i }));
    
    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    
    resolveCreate!();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles error when creating list fails', async () => {
    const user = userEvent.setup();
    const { listService } = await import('@/lib/firebase-service');
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    (listService.createList as any).mockRejectedValue(new Error('Network error'));
    
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    await user.type(screen.getByLabelText(/list title/i), 'To Do');
    await user.click(screen.getByRole('button', { name: /create list/i }));
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error creating list:', expect.any(Error));
    });
    
    expect(mockOnListCreated).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('works with authenticated user', async () => {
    const user = userEvent.setup();
    const { listService } = await import('@/lib/firebase-service');
    
    // Ensure the mock resolves successfully
    (listService.createList as any).mockResolvedValue({});
    
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    await user.type(screen.getByLabelText(/list title/i), 'To Do');
    await user.click(screen.getByRole('button', { name: /create list/i }));
    
    // With authenticated user, list creation should be attempted
    expect(listService.createList).toHaveBeenCalled();
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockOnListCreated).toHaveBeenCalled();
    });
  });

  it('trims whitespace from title', async () => {
    const user = userEvent.setup();
    const { listService } = await import('@/lib/firebase-service');
    (listService.createList as any).mockResolvedValue(undefined);
    
    render(<CreateListDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    await user.type(screen.getByLabelText(/list title/i), '  To Do  ');
    await user.click(screen.getByRole('button', { name: /create list/i }));
    
    await waitFor(() => {
      expect(listService.createList).toHaveBeenCalledWith(
        'board-1',
        'test-user-id',
        'To Do',
        2
      );
    });
  });

  it('uses correct lists count for positioning', async () => {
    const user = userEvent.setup();
    const { listService } = await import('@/lib/firebase-service');
    (listService.createList as any).mockResolvedValue(undefined);
    
    const propsWithDifferentCount = { ...defaultProps, listsCount: 5 };
    render(<CreateListDialog {...propsWithDifferentCount} />);
    
    await user.click(screen.getByRole('button', { name: /add list/i }));
    await user.type(screen.getByLabelText(/list title/i), 'New List');
    await user.click(screen.getByRole('button', { name: /create list/i }));
    
    await waitFor(() => {
      expect(listService.createList).toHaveBeenCalledWith(
        'board-1',
        'test-user-id',
        'New List',
        5
      );
    });
  });
});