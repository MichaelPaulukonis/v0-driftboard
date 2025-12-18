"use client";

import { fetchBoardDataForExport } from "@/lib/firebase-service";
import { exportBoardToJson } from "@/lib/utils";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
  Fragment,
} from "react";
import { monitorForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import {
  extractClosestEdge,
  type Edge,
} from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { getReorderDestinationIndex } from "@atlaskit/pragmatic-drag-and-drop-hitbox/util/get-reorder-destination-index";
import { reorder } from "@atlaskit/pragmatic-drag-and-drop/reorder";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import invariant from "tiny-invariant";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { boardService, listService, cardService } from "@/lib/firebase-service";
import type {
  Board,
  List,
  Card,
  ColumnMap,
  BoardContextValue,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ViewStatusDialog } from "@/components/view-status-dialog";
import { ViewDeletedListsDialog } from "@/components/view-deleted-lists-dialog";
import { ArrowLeft, MoreVertical, Plus, Share2, Users } from "lucide-react";
import { CreateListDialog } from "@/components/create-list-dialog";
import { ShareBoardDialog } from "@/components/share-board-dialog";
import { ListColumn } from "@/components/list-column";
import { EmptyState } from "@/components/empty-state";
import { LoadingSpinner } from "@/components/loading-spinner";
import { BoardContext } from "@/contexts/board-context";
import { Badge } from "@/components/ui/badge";
import { canPerformAction, type PermissionAction } from "@/lib/permissions";

type Outcome =
  | {
      type: "list-reorder";
      listId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-reorder";
      listId: string;
      startIndex: number;
      finishIndex: number;
    }
  | {
      type: "card-move";
      finishListId: string;
      itemIndexInStartList: number;
      itemIndexInFinishList: number;
    };

type Operation = {
  outcome: Outcome;
};

type BoardState = {
  columnMap: ColumnMap;
  orderedColumnIds: string[];
  lastOperation: Operation | null;
};

export default function BoardPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const boardId = params.id as string;

  const [board, setBoard] = useState<Board | null>(null);
  const [boardState, setBoardState] = useState<BoardState>({
    columnMap: {},
    orderedColumnIds: [],
    lastOperation: null,
  });
  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stableBoardState = useRef(boardState);

  useEffect(() => {
    stableBoardState.current = boardState;
  }, [boardState]);

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

  const loadBoardData = useCallback(async () => {
    if (!user || !boardId) return;

    try {
      const [userBoards, boardLists] = await Promise.all([
        boardService.getUserBoards(user.uid),
        listService.getBoardLists(boardId),
      ]);

      const currentBoard = userBoards.find((b) => b.id === boardId);
      if (!currentBoard) {
        router.push("/");
        return;
      }

      const newColumnMap: ColumnMap = {};
      for (const list of boardLists) {
        const cards = await cardService.getListCards(list.id);
        newColumnMap[list.id] = { ...list, items: cards };
      }

      setBoard(currentBoard);
      setBoardState({
        columnMap: newColumnMap,
        orderedColumnIds: boardLists.map((l) => l.id),
        lastOperation: null,
      });
    } catch (error) {
      console.error("Error loading board data:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [user, boardId, router]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  const reorderList = useCallback(
    ({
      startIndex,
      finishIndex,
    }: {
      startIndex: number;
      finishIndex: number;
    }) => {
      setBoardState((prevState) => {
        const outcome: Outcome = {
          type: "list-reorder",
          listId: prevState.orderedColumnIds[startIndex],
          startIndex,
          finishIndex,
        };

        const newState = {
          ...prevState,
          orderedColumnIds: reorder({
            list: prevState.orderedColumnIds,
            startIndex,
            finishIndex,
          }),
          lastOperation: { outcome },
        };

        // Persist the new order
        if (user) {
          const updates = newState.orderedColumnIds.map((listId, index) => ({
            id: listId,
            position: index,
          }));
          listService.reorderLists(updates, user.uid).catch(() => {
            // Revert on error
            setBoardState(prevState);
          });
        }
        return newState;
      });
    },
    [user],
  );

  const reorderCard = useCallback(
    ({
      listId,
      startIndex,
      finishIndex,
    }: {
      listId: string;
      startIndex: number;
      finishIndex: number;
    }) => {
      setBoardState((prevState) => {
        const sourceList = prevState.columnMap[listId];
        const updatedItems = reorder({
          list: sourceList.items,
          startIndex,
          finishIndex,
        });

        const updatedSourceList: List & { items: Card[] } = {
          ...sourceList,
          items: updatedItems,
        };

        const updatedMap: ColumnMap = {
          ...prevState.columnMap,
          [listId]: updatedSourceList,
        };

        const outcome: Outcome = {
          type: "card-reorder",
          listId,
          startIndex,
          finishIndex,
        };

        const newState = {
          ...prevState,
          columnMap: updatedMap,
          lastOperation: { outcome },
        };

        if (user) {
          const updates = updatedItems.map((card, index) => ({
            id: card.id,
            listId: listId,
            position: index,
          }));
          cardService.reorderCards(updates, user.uid).catch(() => {
            setBoardState(prevState);
          });
        }

        return newState;
      });
    },
    [user],
  );

  const moveCard = useCallback(
    ({
      startListId,
      finishListId,
      itemIndexInStartList,
      itemIndexInFinishList,
    }: {
      startListId: string;
      finishListId: string;
      itemIndexInStartList: number;
      itemIndexInFinishList?: number;
    }) => {
      if (startListId === finishListId) return;

      setBoardState((prevState) => {
        const sourceList = prevState.columnMap[startListId];
        const destinationList = prevState.columnMap[finishListId];
        const item: Card = sourceList.items[itemIndexInStartList];

        const destinationItems = Array.from(destinationList.items);
        const newIndexInDestination = itemIndexInFinishList ?? 0;
        destinationItems.splice(newIndexInDestination, 0, item);

        const updatedMap: ColumnMap = {
          ...prevState.columnMap,
          [startListId]: {
            ...sourceList,
            items: sourceList.items.filter((i) => i.id !== item.id),
          },
          [finishListId]: {
            ...destinationList,
            items: destinationItems,
          },
        };

        const outcome: Outcome = {
          type: "card-move",
          finishListId,
          itemIndexInStartList,
          itemIndexInFinishList: newIndexInDestination,
        };
        const newState = {
          ...prevState,
          columnMap: updatedMap,
          lastOperation: { outcome },
        };

        if (user) {
          cardService
            .moveCard(item.id, user.uid, finishListId, newIndexInDestination)
            .then(() => {
              // After moving, we need to re-order the cards in both lists
              const startListUpdates = newState.columnMap[
                startListId
              ].items.map((card, index) => ({
                id: card.id,
                listId: startListId,
                position: index,
              }));
              const finishListUpdates = newState.columnMap[
                finishListId
              ].items.map((card, index) => ({
                id: card.id,
                listId: finishListId,
                position: index,
              }));

              Promise.all([
                cardService.reorderCards(startListUpdates, user.uid),
                cardService.reorderCards(finishListUpdates, user.uid),
              ]).catch(() => setBoardState(prevState));
            })
            .catch(() => setBoardState(prevState));
        }

        return newState;
      });
    },
    [user],
  );

  const [instanceId] = useState(() => Symbol("instance-id"));

  useEffect(() => {
    return combine(
      monitorForElements({
        canMonitor: ({ source }) => source.data.instanceId === instanceId,
        onDrop: (args) => {
          const { location, source } = args;
          if (!location.current.dropTargets.length) return;

          const { columnMap, orderedColumnIds } = stableBoardState.current;

          if (source.data.type === "list") {
            const startIndex = orderedColumnIds.findIndex(
              (id) => id === source.data.listId,
            );
            const target = location.current.dropTargets[0];
            const indexOfTarget = orderedColumnIds.findIndex(
              (id) => id === target.data.listId,
            );
            const closestEdgeOfTarget = extractClosestEdge(target.data);

            const finishIndex = getReorderDestinationIndex({
              startIndex,
              indexOfTarget,
              closestEdgeOfTarget,
              axis: "horizontal",
            });
            reorderList({ startIndex, finishIndex });
          }

          if (source.data.type === "card") {
            const cardId = source.data.cardId;
            invariant(typeof cardId === "string");

            const startListId = source.data.listId;
            invariant(typeof startListId === "string");

            const sourceList = columnMap[startListId];
            const itemIndex = sourceList.items.findIndex(
              (item) => item.id === cardId,
            );

            // Dropped on a column
            if (location.current.dropTargets.length === 1) {
              const [destinationListRecord] = location.current.dropTargets;
              const destinationListId = destinationListRecord.data
                .listId as string;
              const destinationList = columnMap[destinationListId];
              invariant(destinationList);

              if (sourceList === destinationList) {
                // Reordering in same list, dropped on the list itself
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget: sourceList.items.length - 1,
                  closestEdgeOfTarget: null,
                  axis: "vertical",
                });
                reorderCard({
                  listId: sourceList.id,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                });
              } else {
                // Moving to a new list, dropped on the list itself
                moveCard({
                  itemIndexInStartList: itemIndex,
                  startListId: sourceList.id,
                  finishListId: destinationList.id,
                });
              }
              return;
            }

            // Dropped on a card
            if (location.current.dropTargets.length === 2) {
              const [destinationCardRecord, destinationListRecord] =
                location.current.dropTargets;
              const destinationListId = destinationListRecord.data
                .listId as string;
              invariant(typeof destinationListId === "string");
              const destinationList = columnMap[destinationListId];

              const indexOfTarget = destinationList.items.findIndex(
                (item) => item.id === destinationCardRecord.data.cardId,
              );
              const closestEdgeOfTarget = extractClosestEdge(
                destinationCardRecord.data,
              );

              if (sourceList === destinationList) {
                // Reordering in same list, dropped on a card
                const destinationIndex = getReorderDestinationIndex({
                  startIndex: itemIndex,
                  indexOfTarget,
                  closestEdgeOfTarget,
                  axis: "vertical",
                });
                reorderCard({
                  listId: sourceList.id,
                  startIndex: itemIndex,
                  finishIndex: destinationIndex,
                });
              } else {
                // Moving to a new list, dropped on a card
                const destinationIndex =
                  closestEdgeOfTarget === "bottom"
                    ? indexOfTarget + 1
                    : indexOfTarget;
                moveCard({
                  itemIndexInStartList: itemIndex,
                  startListId: sourceList.id,
                  finishListId: destinationList.id,
                  itemIndexInFinishList: destinationIndex,
                });
              }
            }
          }
        },
      }),
    );
  }, [instanceId, reorderList, reorderCard, moveCard]);

  const contextValue: BoardContextValue = useMemo(() => {
    return {
      reorderCard,
      reorderList,
      moveCard,
      instanceId,
      userRole: board?.userRole,
      can: (action: PermissionAction) =>
        canPerformAction(board?.userRole, action),
    };
  }, [reorderCard, reorderList, moveCard, instanceId, board?.userRole]);

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
    <Fragment>
      <BoardContext.Provider value={contextValue}>
        <div className="h-screen bg-background flex flex-col">
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 shrink-0">
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
                  <div className="flex items-center gap-3">
                    <h1 className="text-lg md:text-2xl font-bold text-foreground font-sans truncate">
                      {board.title}
                    </h1>
                    {board.userRole && board.userRole !== "owner" && (
                      <Badge variant="secondary" className="gap-1 px-2 h-6">
                        <Users className="h-3.5 w-3.5" />
                        Shared
                      </Badge>
                    )}
                  </div>
                  {board.description && (
                    <p className="text-xs md:text-sm text-muted-foreground font-serif mt-1 truncate">
                      {board.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {contextValue.can("inviteUsers") && (
                    <ShareBoardDialog boardId={boardId} />
                  )}
                  <Button onClick={handleExport} disabled={exporting}>
                    {exporting ? "Exporting..." : "Export Board"}
                  </Button>
                  {contextValue.can("createList") && (
                    <CreateListDialog
                      boardId={boardId}
                      listsCount={boardState.orderedColumnIds.length}
                      onListCreated={loadBoardData}
                    />
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <ViewStatusDialog
                        boardId={boardId}
                        status="done"
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            View Done
                          </DropdownMenuItem>
                        }
                        onCardRestored={loadBoardData}
                      />
                      <ViewStatusDialog
                        boardId={boardId}
                        status="archived"
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            View Archived
                          </DropdownMenuItem>
                        }
                        onCardRestored={loadBoardData}
                      />
                      <ViewStatusDialog
                        boardId={boardId}
                        status="deleted"
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            View Deleted
                          </DropdownMenuItem>
                        }
                        onCardRestored={loadBoardData}
                      />
                      <DropdownMenuSeparator />
                      <ViewDeletedListsDialog
                        boardId={boardId}
                        trigger={
                          <DropdownMenuItem
                            onSelect={(e) => e.preventDefault()}
                          >
                            View Deleted Lists
                          </DropdownMenuItem>
                        }
                        onListRestored={loadBoardData}
                      />
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                {error && <div className="text-red-500 mb-2">{error}</div>}
              </div>
            </div>
          </header>

          <main className="flex-grow overflow-y-hidden">
            {boardState.orderedColumnIds.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <EmptyState
                  icon={<Plus className="h-12 w-12" />}
                  title="No lists yet"
                  description="Create your first list to start organizing tasks and cards"
                  action={
                    <CreateListDialog
                      boardId={boardId}
                      listsCount={0}
                      onListCreated={loadBoardData}
                    />
                  }
                />
              </div>
            ) : (
              <div className="h-full flex gap-4 md:gap-2 overflow-x-auto p-4 md:p-6">
                {boardState.orderedColumnIds.map((listId) => (
                  <ListColumn
                    key={listId}
                    list={boardState.columnMap[listId]}
                    onListUpdated={loadBoardData}
                    onListDeleted={loadBoardData}
                    onCardUpdated={loadBoardData}
                  />
                ))}
              </div>
            )}
          </main>
        </div>
      </BoardContext.Provider>
    </Fragment>
  );
}
