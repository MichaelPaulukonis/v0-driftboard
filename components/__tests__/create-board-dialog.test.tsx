import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CreateBoardDialog } from '../create-board-dialog';

// Mock the firebase service
vi.mock('@/lib/firebase-service', () => ({
  boardService: {
    createBoard: vi.fn(),
  },
}));

describe('CreateBoardDialog', () => {
  const mockOnBoardCreated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders trigger button', () => {
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    const triggerButton = screen.getByRole('button', { name: /new board/i });
    expect(triggerButton).toBeInTheDocument();
    expect(triggerButton).toHaveTextContent('New Board');
  });

  it('opens dialog when trigger button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    const triggerButton = screen.getByRole('button', { name: /new board/i });
    await user.click(triggerButton);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Board')).toBeInTheDocument();
    expect(screen.getByText(/Create a new kanban board/i)).toBeInTheDocument();
  });

  it('renders form fields when dialog is open', async () => {
    const user = userEvent.setup();
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    
    expect(screen.getByLabelText(/board title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create board/i })).toBeInTheDocument();
  });

  it('disables create button when title is empty', async () => {
    const user = userEvent.setup();
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    
    const createButton = screen.getByRole('button', { name: /create board/i });
    expect(createButton).toBeDisabled();
  });

  it('enables create button when title is provided', async () => {
    const user = userEvent.setup();
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    
    const titleInput = screen.getByLabelText(/board title/i);
    await user.type(titleInput, 'Test Board');
    
    const createButton = screen.getByRole('button', { name: /create board/i });
    expect(createButton).toBeEnabled();
  });

  it('closes dialog when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('creates board successfully when form is submitted', async () => {
    const user = userEvent.setup();
    const { boardService } = await import('@/lib/firebase-service');
    (boardService.createBoard as any).mockResolvedValue(undefined);
    
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    
    const titleInput = screen.getByLabelText(/board title/i);
    const descriptionInput = screen.getByLabelText(/description/i);
    
    await user.type(titleInput, 'Test Board');
    await user.type(descriptionInput, 'Test Description');
    
    const createButton = screen.getByRole('button', { name: /create board/i });
    await user.click(createButton);
    
    await waitFor(() => {
      expect(boardService.createBoard).toHaveBeenCalledWith(
        'test-user-id',
        'Test Board',
        'Test Description'
      );
    });
    
    expect(mockOnBoardCreated).toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows loading state while creating board', async () => {
    const user = userEvent.setup();
    const { boardService } = await import('@/lib/firebase-service');
    
    let resolveCreate: () => void;
    const createPromise = new Promise<void>((resolve) => {
      resolveCreate = resolve;
    });
    (boardService.createBoard as any).mockReturnValue(createPromise);
    
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    await user.type(screen.getByLabelText(/board title/i), 'Test Board');
    await user.click(screen.getByRole('button', { name: /create board/i }));
    
    expect(screen.getByRole('button', { name: /creating/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    
    resolveCreate!();
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('handles permission-denied error', async () => {
    const user = userEvent.setup();
    const { boardService } = await import('@/lib/firebase-service');
    const error = { code: 'permission-denied' };
    (boardService.createBoard as any).mockRejectedValue(error);
    
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    await user.type(screen.getByLabelText(/board title/i), 'Test Board');
    await user.click(screen.getByRole('button', { name: /create board/i }));
    
    // The error state is set but not displayed in the UI
    // The component should still work normally after error
    expect(boardService.createBoard).toHaveBeenCalledWith('test-user-id', 'Test Board', '');
    expect(mockOnBoardCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('handles generic error', async () => {
    const user = userEvent.setup();
    const { boardService } = await import('@/lib/firebase-service');
    const error = new Error('Something went wrong');
    (boardService.createBoard as any).mockRejectedValue(error);
    
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    await user.type(screen.getByLabelText(/board title/i), 'Test Board');
    await user.click(screen.getByRole('button', { name: /create board/i }));
    
    // The error state is set but not displayed in the UI
    // The component should still work normally after error
    expect(boardService.createBoard).toHaveBeenCalledWith('test-user-id', 'Test Board', '');
    expect(mockOnBoardCreated).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('works with authenticated user', async () => {
    const user = userEvent.setup();
    const { boardService } = await import('@/lib/firebase-service');
    
    // Ensure the mock resolves successfully
    (boardService.createBoard as any).mockResolvedValue({});
    
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    await user.type(screen.getByLabelText(/board title/i), 'Test Board');
    await user.click(screen.getByRole('button', { name: /create board/i }));
    
    // With authenticated user, board creation should be attempted
    expect(boardService.createBoard).toHaveBeenCalledWith('test-user-id', 'Test Board', '');
    
    // Wait for the async operation to complete
    await waitFor(() => {
      expect(mockOnBoardCreated).toHaveBeenCalled();
    });
  });

  it('supports keyboard shortcut for form submission', async () => {
    const user = userEvent.setup();
    const { boardService } = await import('@/lib/firebase-service');
    (boardService.createBoard as any).mockResolvedValue(undefined);
    
    render(<CreateBoardDialog onBoardCreated={mockOnBoardCreated} />);
    
    await user.click(screen.getByRole('button', { name: /new board/i }));
    await user.type(screen.getByLabelText(/board title/i), 'Test Board');
    
    const descriptionInput = screen.getByLabelText(/description/i);
    await user.type(descriptionInput, 'Test Description');
    
    // Simulate Cmd+Enter or Ctrl+Enter
    await user.keyboard('{Meta>}{Enter}{/Meta}');
    
    await waitFor(() => {
      expect(boardService.createBoard).toHaveBeenCalledWith(
        'test-user-id',
        'Test Board',
        'Test Description'
      );
    });
  });
});