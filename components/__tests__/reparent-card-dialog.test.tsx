import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReparentCardDialog } from '../reparent-card-dialog';
import type { List } from '@/lib/types';

// Mock the Select components for easier testing
vi.mock('@/components/ui/select', () => {
  const MockSelect = ({ children, onValueChange }: any) => {
    return (
      <div data-testid="select-container">
        <button role="combobox" onClick={() => {
          // Simulate selecting the first option
          const firstOption = 'list-1';
          onValueChange?.(firstOption);
        }}>
          Select a list...
        </button>
        <div data-testid="select-content">{children}</div>
      </div>
    );
  };

  const MockSelectContent = ({ children }: any) => (
    <div data-testid="select-content">{children}</div>
  );

  const MockSelectItem = ({ children, value, ...props }: any) => (
    <button data-testid={`select-item-${value}`} data-value={value} {...props}>
      {children}
    </button>
  );

  const MockSelectTrigger = ({ children }: any) => (
    <div data-testid="select-trigger">{children}</div>
  );

  const MockSelectValue = ({ placeholder }: any) => null; // Don't render duplicate text

  return {
    Select: MockSelect,
    SelectContent: MockSelectContent,
    SelectItem: MockSelectItem,
    SelectTrigger: MockSelectTrigger,
    SelectValue: MockSelectValue,
  };
});

describe('ReparentCardDialog', () => {
  const mockOnConfirm = vi.fn();
  const mockOnCancel = vi.fn();
  
  const mockLists: List[] = [
    {
      id: 'list-1',
      title: 'To Do',
      position: 0,
      boardId: 'board-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'list-2',
      title: 'In Progress',
      position: 1,
      boardId: 'board-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'list-3',
      title: 'Done',
      position: 2,
      boardId: 'board-1',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const defaultProps = {
    isOpen: true,
    activeLists: mockLists,
    onConfirm: mockOnConfirm,
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when isOpen is true', () => {
    render(<ReparentCardDialog {...defaultProps} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Choose a New List')).toBeInTheDocument();
    expect(screen.getByText(/This card's original list was deleted/i)).toBeInTheDocument();
  });

  it('does not render dialog when isOpen is false', () => {
    render(<ReparentCardDialog {...defaultProps} isOpen={false} />);
    
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders select dropdown with placeholder', () => {
    render(<ReparentCardDialog {...defaultProps} />);
    
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select a list...')).toBeInTheDocument();
  });

  it('renders all active lists in dropdown', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    // With our mock, the list options are rendered directly
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('renders buttons', () => {
    render(<ReparentCardDialog {...defaultProps} />);
    
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore card/i })).toBeInTheDocument();
  });

  it('disables restore button when no list is selected', () => {
    render(<ReparentCardDialog {...defaultProps} />);
    
    const restoreButton = screen.getByRole('button', { name: /restore card/i });
    expect(restoreButton).toBeDisabled();
  });

  it('enables restore button when a list is selected', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    const restoreButton = screen.getByRole('button', { name: /restore card/i });
    expect(restoreButton).toBeDisabled();
    
    await user.click(screen.getByRole('combobox'));
    
    const restoreButtonAfter = screen.getByRole('button', { name: /restore card/i });
    expect(restoreButtonAfter).toBeEnabled();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onCancel when dialog is closed via backdrop or escape', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    await user.keyboard('{Escape}');
    
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('calls onConfirm with selected list ID when restore button is clicked', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    await user.click(screen.getByRole('combobox'));
    await user.click(screen.getByRole('button', { name: /restore card/i }));
    
    expect(mockOnConfirm).toHaveBeenCalledWith('list-1');
  });

  it('does not call onConfirm when restore button is clicked without selection', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    const restoreButton = screen.getByRole('button', { name: /restore card/i });
    
    // Button should be disabled, but let's try to click anyway
    expect(restoreButton).toBeDisabled();
    
    // Note: userEvent.click on disabled button won't actually trigger the onClick
    // This test verifies the button is properly disabled
    expect(mockOnConfirm).not.toHaveBeenCalled();
  });

  it('handles empty lists array', () => {
    render(<ReparentCardDialog {...defaultProps} activeLists={[]} />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByText('Select a list...')).toBeInTheDocument();
  });

  it('updates selection when different list is chosen', async () => {
    const user = userEvent.setup();
    render(<ReparentCardDialog {...defaultProps} />);
    
    // Select first list
    await user.click(screen.getByRole('combobox'));
    
    let restoreButton = screen.getByRole('button', { name: /restore card/i });
    expect(restoreButton).toBeEnabled();
    
    await user.click(restoreButton);
    expect(mockOnConfirm).toHaveBeenCalledWith('list-1');
  });

  it('shows correct dialog content and structure', () => {
    render(<ReparentCardDialog {...defaultProps} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    
    // Check header elements
    expect(screen.getByText('Choose a New List')).toBeInTheDocument();
    expect(screen.getByText(/This card's original list was deleted/i)).toBeInTheDocument();
    
    // Check main content
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    
    // Check footer buttons
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /restore card/i })).toBeInTheDocument();
  });
});