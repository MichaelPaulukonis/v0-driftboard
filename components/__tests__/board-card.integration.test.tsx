import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { BoardCard } from "../board-card";
import { boardService } from "@/lib/firebase-service";

// Mock the auth context to provide a user
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { uid: "test-user-id", email: "test@example.com" },
    loading: false,
  }),
}));

vi.mock("@/lib/firebase-service", async () => {
  const actual = await import("@/lib/firebase-service");
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

describe("BoardCard", () => {
  const board = {
    id: "1",
    title: "Test Board",
    description: "Test Description",
    userId: "user1",
    ownerId: "user1",
    userRole: "owner" as const,
    status: "active" as const,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("should render board details", () => {
    render(
      <BoardCard
        board={board}
        onBoardUpdated={() => {}}
        onBoardDeleted={() => {}}
        onClick={() => {}}
      />,
    );
    expect(screen.getByText("Test Board")).toBeInTheDocument();
    expect(screen.getByText("Test Description")).toBeInTheDocument();
  });

  it("should call onClick when card is clicked", async () => {
    const onClick = vi.fn();
    render(
      <BoardCard
        board={board}
        onBoardUpdated={() => {}}
        onBoardDeleted={() => {}}
        onClick={onClick}
      />,
    );
    await userEvent.click(screen.getByText("Test Board"));
    expect(onClick).toHaveBeenCalled();
  });

  it("should show edit dialog when edit is clicked", async () => {
    render(
      <BoardCard
        board={board}
        onBoardUpdated={() => {}}
        onBoardDeleted={() => {}}
        onClick={() => {}}
      />,
    );
    await userEvent.click(screen.getByTestId("board-card-more-button"));
    await userEvent.click(await screen.findByText("Edit"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("should show delete dialog when delete is clicked", async () => {
    const onBoardDeleted = vi.fn();
    vi.mocked(boardService.deleteBoard).mockResolvedValue(undefined);

    render(
      <BoardCard
        board={board}
        onBoardUpdated={() => {}}
        onBoardDeleted={onBoardDeleted}
        onClick={() => {}}
      />,
    );
    await userEvent.click(screen.getByTestId("board-card-more-button"));
    await userEvent.click(await screen.findByText("Delete"));

    expect(screen.getByText(/are you sure/i)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Delete" }));

    await vi.waitFor(() => {
      expect(boardService.deleteBoard).toHaveBeenCalledWith(
        "1",
        "test-user-id",
      );
    });

    await vi.waitFor(() => {
      expect(onBoardDeleted).toHaveBeenCalled();
    });
  });
});
