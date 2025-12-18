import { screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { CardItem } from "../card-item";
import type { Card } from "@/lib/types";
import { renderWithProviders } from "@/lib/__tests__/test-utils";

// Mock the auth context
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "test-user", email: "test@example.com" },
  }),
}));

// Mock the firebase service
vi.mock("@/lib/firebase-service", () => ({
  commentService: {
    getCardComments: vi.fn().mockResolvedValue([]),
  },
}));

// Mock the pragmatic drag and drop
vi.mock("@atlaskit/pragmatic-drag-and-drop/element/adapter", () => ({
  draggable: vi.fn(() => vi.fn()), // Return a cleanup function
  dropTargetForElements: vi.fn(() => vi.fn()), // Return a cleanup function
}));

vi.mock("@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge", () => ({
  attachClosestEdge: vi.fn(),
  extractClosestEdge: vi.fn(),
}));

// Mock CardDetailDialog to avoid nested prop issues
vi.mock("../card-detail-dialog", () => ({
  CardDetailDialog: () => <div data-testid="mock-card-detail">Card Detail</div>,
}));

describe("CardItem URL Linking", () => {
  const mockCard: Card = {
    id: "1",
    title: "Test Card",
    description:
      "Check out this site: https://github.com/example/repo and also http://localhost:3000",
    listId: "list1",
    position: 1,
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockProps = {
    card: mockCard,
    boardId: "board1",
    onCardUpdated: vi.fn(),
    onCardDeleted: vi.fn(),
  };

  it("should render URLs as clickable links in card description", () => {
    renderWithProviders(<CardItem {...mockProps} />);

    // Check that the URLs are rendered as links
    const githubLink = screen.getByRole("link", {
      name: /https:\/\/github\.com\/example\/repo/,
    });
    const localhostLink = screen.getByRole("link", {
      name: /http:\/\/localhost:3000/,
    });

    expect(githubLink).toBeInTheDocument();
    expect(localhostLink).toBeInTheDocument();

    // Check that links have correct attributes
    expect(githubLink).toHaveAttribute(
      "href",
      "https://github.com/example/repo",
    );
    expect(githubLink).toHaveAttribute("target", "_blank");
    expect(githubLink).toHaveAttribute("rel", "noopener noreferrer");

    expect(localhostLink).toHaveAttribute("href", "http://localhost:3000");
    expect(localhostLink).toHaveAttribute("target", "_blank");
    expect(localhostLink).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should render non-URL text normally", () => {
    const cardWithoutUrls: Card = {
      ...mockCard,
      description: "This is just plain text without any URLs",
    };

    renderWithProviders(
      <CardItem {...{ ...mockProps, card: cardWithoutUrls }} />,
    );

    // Check that the description is rendered as text
    expect(
      screen.getByText("This is just plain text without any URLs"),
    ).toBeInTheDocument();

    // Ensure no links are created
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("should handle cards without descriptions", () => {
    const cardWithoutDescription: Card = {
      ...mockCard,
      description: "",
    };

    renderWithProviders(
      <CardItem {...{ ...mockProps, card: cardWithoutDescription }} />,
    );

    // Should render the card title but no description
    expect(screen.getByText("Test Card")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("applies correct CSS classes to link elements", () => {
    renderWithProviders(<CardItem {...mockProps} />);

    const link = screen.getByRole("link", {
      name: /https:\/\/github\.com\/example\/repo/,
    });

    // Check that the link has the enhanced Tailwind CSS classes
    expect(link).toHaveClass(
      "text-blue-600",
      "hover:text-blue-800",
      "hover:underline",
      "transition-colors",
      "duration-200",
      "font-medium",
      "cursor-pointer",
      "decoration-1",
      "underline-offset-2",
    );
  });
});
