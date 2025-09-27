import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CommentItem } from '../comment-item';
import type { CommentWithUser } from '@/lib/types';
import { commentService } from '@/lib/firebase-service';

// Mock the firebase service
vi.mock('@/lib/firebase-service', () => ({
  commentService: {
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));

// Mock the auth context
const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com',
  displayName: 'Test User',
};

vi.mock('@/contexts/auth-context', () => ({
  useAuth: () => ({
    user: mockUser,
  }),
}));

// Mock drag and drop to prevent test issues
vi.mock('@atlaskit/pragmatic-drag-and-drop/element/adapter', () => ({
  draggable: vi.fn(() => () => {}),
  dropTargetForElements: vi.fn(() => () => {}),
  attachClosestEdge: vi.fn(() => () => {}),
}));

// Create a mock CommentWithUser object
const createMockComment = (content: string, userId = 'test-user-id'): CommentWithUser => ({
  id: 'test-comment-id',
  cardId: 'test-card-id',
  userId: userId,
  content: content,
  createdAt: new Date('2024-01-01T12:00:00Z'),
  updatedAt: new Date('2024-01-01T12:00:00Z'),
  isDeleted: false,
  editHistory: [],
  user: {
    email: 'test@example.com',
    displayName: 'Test User',
  },
});

const mockOnCommentUpdated = vi.fn();

describe('CommentItem URL Linking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset all mocked service functions
    (commentService.updateComment as Mock).mockResolvedValue(undefined);
    (commentService.deleteComment as Mock).mockResolvedValue(undefined);
  });

  it('renders URLs as clickable links in comment content', () => {
    const commentWithUrl = createMockComment('Check out https://example.com for more info');
    
    render(<CommentItem comment={commentWithUrl} onCommentUpdated={mockOnCommentUpdated} />);
    
    // Check if the URL is rendered as a clickable link
    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    
    // Check that non-URL text is still rendered normally
    expect(screen.getByText(/Check out/)).toBeInTheDocument();
    expect(screen.getByText(/for more info/)).toBeInTheDocument();
  });

  it('renders multiple URLs as separate clickable links', () => {
    const commentWithMultipleUrls = createMockComment(
      'Visit https://example.com and also http://test.com for resources'
    );
    
    render(<CommentItem comment={commentWithMultipleUrls} onCommentUpdated={mockOnCommentUpdated} />);
    
    // Check both URLs are rendered as links
    const link1 = screen.getByRole('link', { name: 'https://example.com' });
    const link2 = screen.getByRole('link', { name: 'http://test.com' });
    
    expect(link1).toBeInTheDocument();
    expect(link1).toHaveAttribute('href', 'https://example.com');
    
    expect(link2).toBeInTheDocument();
    expect(link2).toHaveAttribute('href', 'http://test.com');
  });

  it('handles comment content with no URLs normally', () => {
    const commentNoUrl = createMockComment('This is just plain text without any links');
    
    render(<CommentItem comment={commentNoUrl} onCommentUpdated={mockOnCommentUpdated} />);
    
    // Check that no links are rendered
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    
    // Check that the text content is rendered
    expect(screen.getByText('This is just plain text without any links')).toBeInTheDocument();
  });

  it('handles empty comment content', () => {
    const emptyComment = createMockComment('');
    
    render(<CommentItem comment={emptyComment} onCommentUpdated={mockOnCommentUpdated} />);
    
    // Should render without errors and show no links
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('preserves whitespace and line breaks while rendering URLs', () => {
    const commentWithWhitespace = createMockComment('Line 1\nhttps://example.com\n\nLine 3');
    
    render(<CommentItem comment={commentWithWhitespace} onCommentUpdated={mockOnCommentUpdated} />);
    
    // Check that URL is still rendered as a link
    const link = screen.getByRole('link', { name: 'https://example.com' });
    expect(link).toBeInTheDocument();
    
    // Check that text content includes the whitespace structure
    expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    expect(screen.getByText(/Line 3/)).toBeInTheDocument();
  });

  it('applies correct CSS classes to link elements', () => {
    const commentWithUrl = createMockComment('Visit https://example.com');
    
    render(<CommentItem comment={commentWithUrl} onCommentUpdated={mockOnCommentUpdated} />);
    
    const link = screen.getByRole('link');
    
    // Check that the link has the enhanced Tailwind CSS classes
    expect(link).toHaveClass('text-blue-600', 'hover:text-blue-800', 'hover:underline', 'transition-colors', 'duration-200', 'font-medium', 'cursor-pointer', 'decoration-1', 'underline-offset-2');
  });
});