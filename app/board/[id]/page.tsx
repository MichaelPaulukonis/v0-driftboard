"use client";

import { fetchBoardDataForExport } from "@/lib/firebase-service";
import { exportBoardToJson } from "@/lib/utils";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { boardService, listService } from "@/lib/firebase-service";
import type { Board, List } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { CreateListDialog } from "@/components/create-list-dialog";
import { ListColumn } from "@/components/list-column";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    try {
      const data = await fetchBoardDataForExport(boardId as string);
      if (!data) {
        setError("Board not found or export failed.");
        setExporting(false);
        return;
      }
      exportBoardToJson(data, `driftboard-board-${boardId}.json`);
    } catch (err) {
      setError("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const loadBoardData = async () => {
    if (!user || !boardId) return;

    try {
      // Load board and lists in parallel
      const [userBoards, boardLists] = await Promise.all([
        boardService.getUserBoards(user.uid),
        listService.getBoardLists(boardId),
      ]);

      const currentBoard = userBoards.find((b) => b.id === boardId);
      if (!currentBoard) {
        router.push("/");
        return;
      }

      setBoard(currentBoard);
      setLists(boardLists);
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error loading board data:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBoardData();
  }, [user, boardId]);

  const handleCreateList = async () => {
    await loadBoardData();
  };

  const handleListUpdated = async () => {
    await loadBoardData();
  };

  const handleListDeleted = async () => {
    await loadBoardData();
  };

  const handleCardUpdated = async (updatedListId?: string) => {
    if (updatedListId) {
      console.log(`[v0] Cards in list ${updatedListId} were updated.`);
    } else {
      console.log("[v0] Board handleCardUpdated called - reloading all data");
      await loadBoardData();
      console.log("[v0] Board data reloaded successfully");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <LoadingSpinner size="lg" />
          <div className="text-lg text-muted-foreground font-serif">
            Loading board...
          </div>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-lg text-muted-foreground font-serif">
          Board not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2 md:gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/")}
              className="gap-2 shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Back to Boards</span>
              <span className="sm:hidden">Back</span>
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-foreground font-sans truncate">
                {board.title}
              </h1>
              {board.description && (
                <p className="text-xs md:text-sm text-muted-foreground font-serif mt-1 truncate">
                  {board.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleExport} disabled={exporting}>
                {exporting ? "Exporting..." : "Export Board"}
              </Button>
              <CreateListDialog
                boardId={boardId}
                listsCount={lists.length}
                onListCreated={handleCreateList}
              />
            </div>
            {error && <div className="text-red-500 mb-2">{error}</div>}
          </div>
        </div>
      </header>

      <main className="p-4 md:p-6">
        {lists.length === 0 ? (
          <div className="flex items-center justify-center min-h-[60vh]">
            <EmptyState
              icon={<Plus className="h-12 w-12" />}
              title="No lists yet"
              description="Create your first list to start organizing tasks and cards"
              action={
                <CreateListDialog
                  boardId={boardId}
                  listsCount={0}
                  onListCreated={handleCreateList}
                />
              }
            />
          </div>
        ) : (
          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4">
            {lists.map((list) => (
              <ListColumn
                key={`${list.id}-${refreshTrigger}`}
                list={list}
                onListUpdated={handleListUpdated}
                onListDeleted={handleListDeleted}
                onCardUpdated={handleCardUpdated}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
