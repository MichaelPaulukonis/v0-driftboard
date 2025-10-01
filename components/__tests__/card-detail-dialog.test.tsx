import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardDetailDialog } from '../card-detail-dialog';
import { AuthProvider } from '@/contexts/auth-context';
import { Toaster } from '@/components/ui/toaster';
import type { Card } from '@/lib/types';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

// Mock the firebase service
vi.mock('@/lib/firebase-service', () => ({
  cardService: {
    updateCard: vi.fn(),
    deleteCard: vi.fn(),
  },
  commentService: {
    getCardComments: vi.fn().mockResolvedValue([]),
  },
}));

const mockUser = { uid: '123', email: 'test@example.com' };
const mockCard: Card = {
  id: 'card1',
  title: 'Test Card',
  description: 'Test Description',
  position: 1,
  listId: 'list1',
  boardId: 'board1',
  status: 'active',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const renderComponent = (card: Card = mockCard) => {
  return render(
    <AuthProvider>
      <CardDetailDialog
        card={card}
        open={true}
        onOpenChange={vi.fn()}
        onCardUpdated={vi.fn()}
      />
      <Toaster />
    </AuthProvider>
  );
};

describe('CardDetailDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to logged-out state
    (onAuthStateChanged as any).setMockUser(null);
  });

  it('renders card title and description', () => {
    (onAuthStateChanged as any).setMockUser(mockUser);
    renderComponent();
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('does not show edit controls for logged-out users', () => {
    renderComponent(); // User is null by default
    expect(screen.queryByText('Archive')).not.toBeInTheDocument();
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    expect(screen.queryByText('Mark as Done')).not.toBeInTheDocument();
  });

  it('allows title editing on click', async () => {
    (onAuthStateChanged as any).setMockUser(mockUser);
    renderComponent();
    const titleElement = screen.getByText('Test Card');
    fireEvent.click(titleElement);

    const input = await screen.findByDisplayValue('Test Card');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Updated Title' } });
    fireEvent.blur(input);

    const { cardService } = await import('@/lib/firebase-service');
    expect(cardService.updateCard).toHaveBeenCalledWith('card1', '123', { title: 'Updated Title' });
  });

  it('allows description editing on click', async () => {
    (onAuthStateChanged as any).setMockUser(mockUser);
    renderComponent();
    const descriptionElement = screen.getByText('Test Description');
    fireEvent.click(descriptionElement);

    const textarea = await screen.findByDisplayValue('Test Description');
    expect(textarea).toBeInTheDocument();

    fireEvent.change(textarea, { target: { value: 'Updated Description' } });
    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    const { cardService } = await import('@/lib/firebase-service');
    expect(cardService.updateCard).toHaveBeenCalledWith('card1', '123', { description: 'Updated Description' });
  });

  it('preserves input on failed update', async () => {
    (onAuthStateChanged as any).setMockUser(mockUser);
    const { cardService } = await import('@/lib/firebase-service');
    (cardService.updateCard as any).mockRejectedValueOnce(new Error('Update failed'));

    renderComponent();
    const titleElement = screen.getByText('Test Card');
    fireEvent.click(titleElement);

    const input = await screen.findByDisplayValue('Test Card');
    fireEvent.change(input, { target: { value: 'Failed Title Update' } });
    fireEvent.blur(input);

    expect(await screen.findByDisplayValue('Failed Title Update')).toBeInTheDocument();
  });
});
