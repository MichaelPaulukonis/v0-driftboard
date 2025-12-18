import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Dashboard } from "../dashboard";
import { useAuth } from "@/contexts/auth-context";
import { boardService } from "@/lib/firebase-service";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));
vi.mock("@/lib/firebase");
vi.mock("@/contexts/auth-context");
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

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "test-user" } as any,
      loading: false,
    });
  });

  it("should render loading state initially", async () => {
    // Force loading state
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: "test-user" } as any,
      loading: true,
    });
    render(<Dashboard />);
    expect(screen.getByText(/loading your boards/i)).toBeInTheDocument();
  });

  it("should render empty state when no boards are found", async () => {
    (boardService.getUserBoards as any).mockResolvedValue([]);
    render(<Dashboard />);
    expect(await screen.findByText(/no boards yet/i)).toBeInTheDocument();
  });

  it("should render boards when boards are found", async () => {
    const boards = [
      {
        id: "1",
        title: "Board 1",
        description: "Description 1",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "test-user",
        ownerId: "test-user",
        status: "active" as const,
      },
      {
        id: "2",
        title: "Board 2",
        description: "Description 2",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "test-user",
        ownerId: "test-user",
        status: "active" as const,
      },
    ];
    (boardService.getUserBoards as any).mockResolvedValue(boards);
    render(<Dashboard />);
    expect(await screen.findByText("Board 1")).toBeInTheDocument();
    expect(await screen.findByText("Board 2")).toBeInTheDocument();
  });

  it("should open create board dialog when create board button is clicked", async () => {
    (boardService.getUserBoards as any).mockResolvedValue([]);
    render(<Dashboard />);
    await userEvent.click((await screen.findAllByText(/new board/i))[0]);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
