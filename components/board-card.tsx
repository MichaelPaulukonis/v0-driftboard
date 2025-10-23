"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { boardService } from "@/lib/firebase-service";
import type { Board } from "@/lib/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "./ui/confirmation-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Download, Calendar } from "lucide-react";
import { EditBoardDialog } from "./edit-board-dialog";

interface BoardCardProps {
  board: Board;
  onBoardUpdated: () => void;
  onBoardDeleted: () => void;
  onClick: () => void;
}

export function BoardCard({
  board,
  onBoardUpdated,
  onBoardDeleted,
  onClick,
}: BoardCardProps) {
  const { user } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!user) {
      console.error("User not authenticated for delete operation");
      return;
    }
    setLoading(true);
    try {
      await boardService.deleteBoard(board.id, user.uid);
      onBoardDeleted();
    } catch (error) {
      console.error("Error deleting board:", error);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleExport = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setLoading(true);
    try {
      const json = await boardService.exportBoardData(board.id);
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${board.title}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error exporting board:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  return (
    <>
      <Card
        onClick={onClick}
        className="hover:shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02] active:scale-[0.98]"
      >
        <CardHeader className="pb-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="font-sans text-base md:text-lg mb-1 group-hover:text-primary transition-colors truncate">
                {board.title}
              </CardTitle>
              {board.description && (
                <CardDescription className="font-serif text-sm line-clamp-2">
                  {board.description}
                </CardDescription>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  data-testid="board-card-more-button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowEditDialog(true);
                  }}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDeleteDialog(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleExport(e);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export to JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center text-xs text-muted-foreground font-serif">
            <Calendar className="h-3 w-3 mr-1" />
            Updated {formatDate(board.updatedAt)}
          </div>
        </CardContent>
      </Card>

      <EditBoardDialog
        board={board}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onBoardUpdated={onBoardUpdated}
      />

      <ConfirmationDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={handleDelete}
        title="Delete Board"
        description={`Are you sure you want to delete "${board.title}"? This action cannot be undone and will delete all lists and cards in this board.`}
        confirmLabel={loading ? "Deleting..." : "Delete"}
      />
    </>
  );
}
