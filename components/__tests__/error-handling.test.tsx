import { describe, it, expect, vi, beforeEach } from "vitest";
import { screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  render,
  createPermissionDeniedError,
  createUnavailableError,
} from "@/lib/__tests__/test-utils";
import { CreateBoardDialog } from "../create-board-dialog";
import { CreateListDialog } from "../create-list-dialog";
import { CreateCardDialog } from "../create-card-dialog";
import { EditBoardDialog } from "../edit-board-dialog";
import { EditCardDialog } from "../edit-card-dialog";
import { CommentForm } from "../comment-form";
import { CommentItem } from "../comment-item";
import { ListColumn } from "../list-column";
import { AuthForm } from "../auth-form";
import { ShareBoardDialog } from "../share-board-dialog";
import { BoardAccessDialog } from "../board-access-dialog";
import {
  boardService,
  listService,
  cardService,
  commentService,
  inviteService,
} from "@/lib/firebase-service";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import type { Board, Card, CommentWithUser, List } from "@/lib/types";

vi.mock("@/lib/firebase-service", () => ({
  boardService: {
    createBoard: vi.fn(),
    updateBoard: vi.fn(),
    getBoardSharingData: vi.fn(),
  },
  listService: {
    createList: vi.fn(),
    updateList: vi.fn(),
    deleteList: vi.fn(),
  },
  cardService: {
    createCard: vi.fn(),
    updateCard: vi.fn(),
  },
  commentService: {
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  },
  inviteService: {
    listInvites: vi.fn(),
    createInvite: vi.fn(),
    revokeInvite: vi.fn(),
  },
}));

describe("Error-handling and edge-case tests (v0-driftboard-6o2)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Service errors surface in UI without losing user input and clear on retry/close", () => {
    it("CreateBoardDialog surfaces permission-denied/unavailable/generic errors, preserves input, clears error on cancel+reopen, and succeeds on retry", async () => {
      const user = userEvent.setup();
      const onCreated = vi.fn();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(boardService.createBoard).mockRejectedValueOnce(
        createUnavailableError(),
      );

      render(<CreateBoardDialog onBoardCreated={onCreated} />);
      await user.click(screen.getByRole("button", { name: /new board/i }));

      const titleInput = screen.getByLabelText(/board title/i);
      const descInput = screen.getByLabelText(/description/i);
      await user.type(titleInput, "Offline Board");
      await user.type(descInput, "Preserved description");
      await user.click(screen.getByRole("button", { name: /create board/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /database not configured/i,
      );
      expect(titleInput).toHaveValue("Offline Board");
      expect(descInput).toHaveValue("Preserved description");
      expect(onCreated).not.toHaveBeenCalled();

      // Cancel and reopen: stale error banner must be cleared
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /new board/i }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Fail with generic error, then succeed on retry
      vi.mocked(boardService.createBoard)
        .mockRejectedValueOnce(new Error("Generic error"))
        .mockResolvedValueOnce("board-1");
      await user.click(screen.getByRole("button", { name: /create board/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /failed to create board/i,
      );

      await user.click(screen.getByRole("button", { name: /create board/i }));
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      errSpy.mockRestore();
    });

    it("CreateListDialog surfaces permission-denied, unavailable, and generic errors, clears on cancel+reopen, and succeeds on retry", async () => {
      const user = userEvent.setup();
      const onCreated = vi.fn();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(listService.createList)
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockRejectedValueOnce(createUnavailableError())
        .mockResolvedValueOnce("list-1");

      render(
        <CreateListDialog
          boardId="b1"
          listsCount={0}
          onListCreated={onCreated}
        />,
      );
      await user.click(screen.getByRole("button", { name: /add list/i }));

      const input = screen.getByLabelText(/list title/i);
      await user.type(input, "My Unsaved List");
      await user.click(screen.getByRole("button", { name: /create list/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /do not have permission/i,
      );
      expect(input).toHaveValue("My Unsaved List");

      // Retry hits unavailable
      await user.click(screen.getByRole("button", { name: /create list/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /network unavailable/i,
      );

      // Cancel and reopen: error is gone, input still preserved
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /add list/i }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/list title/i)).toHaveValue(
        "My Unsaved List",
      );

      // Retry succeeds
      await user.click(screen.getByRole("button", { name: /create list/i }));
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledTimes(1);
      });
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      errSpy.mockRestore();
    });

    it("CreateCardDialog surfaces permission-denied, unavailable, and generic errors, clears on cancel+reopen, and succeeds on retry", async () => {
      const user = userEvent.setup();
      const onCreated = vi.fn();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(cardService.createCard)
        .mockRejectedValueOnce(createPermissionDeniedError())
        .mockRejectedValueOnce(createUnavailableError())
        .mockResolvedValueOnce("card-1");

      render(<CreateCardDialog listId="l1" onCardCreated={onCreated} />);
      await user.click(screen.getByRole("button", { name: /add a card/i }));

      const titleInput = screen.getByLabelText(/card title/i);
      const descInput = screen.getByLabelText(/description/i);
      await user.type(titleInput, "Draft Card");
      await user.type(descInput, "Important details");
      await user.click(screen.getByRole("button", { name: /create card/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /do not have permission/i,
      );
      expect(titleInput).toHaveValue("Draft Card");
      expect(descInput).toHaveValue("Important details");

      // Retry hits unavailable
      await user.click(screen.getByRole("button", { name: /create card/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /network unavailable/i,
      );

      // Cancel and reopen clears stale alert
      await user.click(screen.getByRole("button", { name: /cancel/i }));
      await user.click(screen.getByRole("button", { name: /add a card/i }));
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();

      // Retry succeeds
      await user.click(screen.getByRole("button", { name: /create card/i }));
      await waitFor(() => {
        expect(onCreated).toHaveBeenCalledTimes(1);
      });
      errSpy.mockRestore();
    });

    it("EditBoardDialog and EditCardDialog surface errors, keep edits during retry, and reset dirty fields + error on cancel+reopen", async () => {
      const user = userEvent.setup();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const board: Board = {
        id: "b1",
        title: "Original Board",
        description: "Orig",
        userId: "u1",
        ownerId: "u1",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const onUpdated = vi.fn();
      vi.mocked(boardService.updateBoard).mockRejectedValueOnce(
        createPermissionDeniedError(),
      );

      const { rerender, unmount } = render(
        <EditBoardDialog
          board={board}
          open={true}
          onOpenChange={vi.fn()}
          onBoardUpdated={onUpdated}
        />,
      );

      const boardTitle = screen.getByLabelText(/board title/i);
      await user.clear(boardTitle);
      await user.type(boardTitle, "Edited Board Title");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /do not have permission/i,
      );
      expect(boardTitle).toHaveValue("Edited Board Title");

      // Simulate closing and reopening with same board prop
      rerender(
        <EditBoardDialog
          board={board}
          open={false}
          onOpenChange={vi.fn()}
          onBoardUpdated={onUpdated}
        />,
      );
      rerender(
        <EditBoardDialog
          board={board}
          open={true}
          onOpenChange={vi.fn()}
          onBoardUpdated={onUpdated}
        />,
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/board title/i)).toHaveValue(
        "Original Board",
      );
      unmount();

      // EditCardDialog
      const card: Card = {
        id: "c1",
        title: "Original Card",
        description: "Orig desc",
        listId: "l1",
        position: 0,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.mocked(cardService.updateCard).mockRejectedValueOnce(
        createUnavailableError(),
      );

      const { rerender: rerenderCard } = render(
        <EditCardDialog
          card={card}
          open={true}
          onOpenChange={vi.fn()}
          onCardUpdated={onUpdated}
        />,
      );

      const cardTitle = screen.getByLabelText(/card title/i);
      await user.clear(cardTitle);
      await user.type(cardTitle, "Edited Card Title");
      await user.click(screen.getByRole("button", { name: /save changes/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /network unavailable/i,
      );
      expect(cardTitle).toHaveValue("Edited Card Title");

      // Close and reopen resets dirty title and clears error
      rerenderCard(
        <EditCardDialog
          card={card}
          open={false}
          onOpenChange={vi.fn()}
          onCardUpdated={onUpdated}
        />,
      );
      rerenderCard(
        <EditCardDialog
          card={card}
          open={true}
          onOpenChange={vi.fn()}
          onCardUpdated={onUpdated}
        />,
      );
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByLabelText(/card title/i)).toHaveValue("Original Card");
      errSpy.mockRestore();
    });

    it("CommentForm surfaces errors, preserves text, and clears both text and error on Escape", async () => {
      const user = userEvent.setup();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const onAdded = vi.fn();
      vi.mocked(commentService.createComment).mockRejectedValueOnce(
        createUnavailableError(),
      );

      render(<CommentForm cardId="c1" onCommentAdded={onAdded} />);
      const textarea = screen.getByPlaceholderText(/add a comment/i);
      await user.type(textarea, "My thoughtful comment");
      await user.click(screen.getByRole("button", { name: /add comment/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /network unavailable/i,
      );
      expect(textarea).toHaveValue("My thoughtful comment");
      expect(onAdded).not.toHaveBeenCalled();

      // Escape clears both content and error banner
      await user.type(textarea, "{Escape}");
      expect(textarea).toHaveValue("");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      errSpy.mockRestore();
    });

    it("ListColumn inline title edit and CommentItem inline edit/delete preserve input and surface alerts on failure", async () => {
      const user = userEvent.setup();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const list: List & { items: Card[] } = {
        id: "l1",
        title: "Original List",
        boardId: "b1",
        position: 0,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };
      vi.mocked(listService.updateList).mockRejectedValueOnce(
        new Error("Update failed"),
      );

      const { unmount } = render(
        <ListColumn
          list={list}
          onListUpdated={vi.fn()}
          onListDeleted={vi.fn()}
          onCardUpdated={vi.fn()}
        />,
      );

      // Double-click list header to enter inline edit mode
      await user.dblClick(screen.getByText("Original List"));
      const listInput = screen.getByDisplayValue("Original List");
      await user.clear(listInput);
      await user.type(listInput, "Renamed List{Enter}");

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /failed to update list/i,
      );
      // Stays in edit mode with user's typed title preserved!
      expect(screen.getByDisplayValue("Renamed List")).toBeInTheDocument();
      unmount();

      // CommentItem inline edit failure
      const comment: CommentWithUser = {
        id: "cm1",
        cardId: "c1",
        userId: "test-user-id",
        content: "Original comment",
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        editHistory: [],
        user: { displayName: "Test User", email: "test@example.com" },
      };
      vi.mocked(commentService.updateComment).mockRejectedValueOnce(
        new Error("Edit failed"),
      );

      render(<CommentItem comment={comment} onCommentUpdated={vi.fn()} />);
      await user.click(screen.getByRole("button"));
      await user.click(await screen.findByRole("menuitem", { name: /edit/i }));

      const commentBox = screen.getByDisplayValue("Original comment");
      await user.clear(commentBox);
      await user.type(commentBox, "Updated comment text");
      await user.click(screen.getByRole("button", { name: /save/i }));

      expect(await screen.findByRole("alert")).toHaveTextContent(
        /failed to update comment/i,
      );
      expect(
        screen.getByDisplayValue("Updated comment text"),
      ).toBeInTheDocument();
      errSpy.mockRestore();
    });

    it("ShareBoardDialog and BoardAccessDialog surface service errors via role='alert'", async () => {
      const user = userEvent.setup();
      const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      vi.mocked(inviteService.listInvites).mockRejectedValueOnce(
        new Error("Permission denied loading invites"),
      );
      const { unmount } = render(<ShareBoardDialog boardId="b1" />);
      await user.click(screen.getByRole("button", { name: /share/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Permission denied loading invites",
      );
      unmount();

      vi.mocked(boardService.getBoardSharingData).mockRejectedValueOnce(
        new Error("Network offline"),
      );
      render(
        <BoardAccessDialog boardId="b1" isOpen={true} onClose={vi.fn()} />,
      );
      expect(await screen.findByRole("alert")).toHaveTextContent(
        /failed to load members/i,
      );
      errSpy.mockRestore();
    });
  });

  describe("Invalid data, whitespace, long titles, and special characters", () => {
    it("blocks whitespace-only submissions across all create/edit dialogs and comment form", async () => {
      const user = userEvent.setup();

      const { unmount: u1 } = render(
        <CreateBoardDialog onBoardCreated={vi.fn()} />,
      );
      await user.click(screen.getByRole("button", { name: /new board/i }));
      await user.type(screen.getByLabelText(/board title/i), "   ");
      expect(
        screen.getByRole("button", { name: /create board/i }),
      ).toBeDisabled();
      u1();

      const { unmount: u2 } = render(
        <CreateListDialog
          boardId="b1"
          listsCount={0}
          onListCreated={vi.fn()}
        />,
      );
      await user.click(screen.getByRole("button", { name: /add list/i }));
      await user.type(screen.getByLabelText(/list title/i), "   ");
      expect(
        screen.getByRole("button", { name: /create list/i }),
      ).toBeDisabled();
      u2();

      const { unmount: u3 } = render(
        <CreateCardDialog listId="l1" onCardCreated={vi.fn()} />,
      );
      await user.click(screen.getByRole("button", { name: /add a card/i }));
      await user.type(screen.getByLabelText(/card title/i), "    ");
      expect(
        screen.getByRole("button", { name: /create card/i }),
      ).toBeDisabled();
      u3();

      render(<CommentForm cardId="c1" onCommentAdded={vi.fn()} />);
      await user.type(screen.getByPlaceholderText(/add a comment/i), "   \n  ");
      expect(
        screen.getByRole("button", { name: /add comment/i }),
      ).toBeDisabled();
    });

    it("renders and trims very long titles and special characters safely in ListColumn and CreateCardDialog", async () => {
      const onCreated = vi.fn();
      vi.mocked(cardService.createCard).mockResolvedValueOnce("card-new");

      const longTitle = `${"LongTitle_".repeat(50)} <script>alert(1)</script> & "quotes" 🚀`;
      const specialDesc = "Line 1\nLine 2 & < > \" ' ` $()";

      const { unmount } = render(
        <CreateCardDialog listId="l1" onCardCreated={onCreated} />,
      );
      fireEvent.click(screen.getByRole("button", { name: /add a card/i }));

      fireEvent.change(screen.getByLabelText(/card title/i), {
        target: { value: `  ${longTitle}  ` },
      });
      fireEvent.change(screen.getByLabelText(/description/i), {
        target: { value: `  ${specialDesc}  ` },
      });
      fireEvent.click(screen.getByRole("button", { name: /create card/i }));

      await waitFor(() => {
        expect(cardService.createCard).toHaveBeenCalledWith(
          "l1",
          "test-user-id",
          longTitle,
          specialDesc,
        );
      });
      unmount();

      // Verify rendering of extreme/special-character card titles in ListColumn (React escapes HTML tags safely)
      const listWithSpecialCard: List & { items: Card[] } = {
        id: "l1",
        title: longTitle,
        boardId: "b1",
        position: 0,
        status: "active",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            id: "c-special",
            title: longTitle,
            description: specialDesc,
            listId: "l1",
            position: 0,
            status: "active",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      render(
        <ListColumn
          list={listWithSpecialCard}
          onListUpdated={vi.fn()}
          onListDeleted={vi.fn()}
          onCardUpdated={vi.fn()}
        />,
      );
      expect(screen.getAllByText(longTitle)).toHaveLength(2);
    });
  });

  describe("AuthForm error codes and validation edge cases", () => {
    it("maps Firebase auth error codes and validates short passwords / missing reset email", async () => {
      const user = userEvent.setup();
      render(<AuthForm />);

      // Password reset without email
      await user.click(
        screen.getByRole("button", { name: /forgot your password/i }),
      );
      expect(
        screen.getByText(/please enter your email address first/i),
      ).toBeInTheDocument();

      // Sign in with wrong-password
      vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
        code: "auth/wrong-password",
      });
      await user.type(screen.getByPlaceholderText("Email"), "a@b.com");
      await user.type(screen.getByPlaceholderText("Password"), "secret123");
      await user.click(screen.getByRole("button", { name: /^sign in$/i }));
      expect(await screen.findByText("Incorrect password")).toBeInTheDocument();

      // Switch to Sign Up tab and test < 6 char password validation
      await user.click(screen.getByRole("tab", { name: /sign up/i }));
      const pwInput = screen.getByPlaceholderText(/min\. 6 characters/i);
      await user.clear(pwInput);
      await user.type(pwInput, "123");
      await user.click(screen.getByRole("button", { name: /create account/i }));
      expect(
        await screen.findByText(/password must be at least 6 characters long/i),
      ).toBeInTheDocument();
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });
});
