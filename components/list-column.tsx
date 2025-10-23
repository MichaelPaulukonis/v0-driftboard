'use client'

import type React from "react"
import { useState, useEffect, useRef, useMemo } from "react"
import { useAuth } from "@/contexts/auth-context"
import { listService } from "@/lib/firebase-service"
import type { List, Card } from "@/lib/types"
import { Card as UICard, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { MoreHorizontal, Edit2, Trash2, Check, X } from "lucide-react"
import { CreateCardDialog } from "./create-card-dialog"
import { CardItem } from "./card-item"
import { LoadingSpinner } from "./loading-spinner"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { attachClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import invariant from "tiny-invariant"
import { useBoardContext } from "@/contexts/board-context"

import { ColumnContext, type ColumnContextProps } from "@/contexts/column-context";

interface ListColumnProps {
  list: List & { items: Card[] };
  onListUpdated: () => void;
  onListDeleted: () => void;
  onCardUpdated: () => void;
}

type State = 
  | { type: 'idle' }
  | { type: 'is-card-over' }
  | { type: 'is-list-over'; closestEdge: Edge | null };

const idle: State = { type: 'idle' };
const isCardOver: State = { type: 'is-card-over' };

export function ListColumn({ list, onListUpdated, onListDeleted, onCardUpdated }: ListColumnProps) {
  const { user } = useAuth();
  const { instanceId } = useBoardContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(list.title);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [state, setState] = useState<State>(idle);
  const [isBeingDragged, setIsBeingDragged] = useState(false);
  
  const listRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listElement = listRef.current;
    const headerElement = headerRef.current;
    const cardContainerElement = cardContainerRef.current;
    invariant(listElement && headerElement && cardContainerElement);

    return combine(
      draggable({
        element: listElement,
        getInitialData: () => ({ listId: list.id, type: 'list', instanceId }),
        onDragStart: () => setIsBeingDragged(true),
        onDrop: () => setIsBeingDragged(false),
      }),
      dropTargetForElements({
        element: cardContainerElement,
        getData: () => ({ listId: list.id }),
        canDrop: ({ source }) => source.data.instanceId === instanceId && source.data.type === 'card',
        getIsSticky: () => true,
        onDragEnter: () => setState(isCardOver),
        onDragLeave: () => setState(idle),
        onDrop: () => setState(idle),
      }),
      dropTargetForElements({
        element: listElement,
        canDrop: ({ source }) => source.data.instanceId === instanceId && source.data.type === 'list',
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = { listId: list.id };
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ['left', 'right'],
          });
        },
        onDragEnter: (args) => setState({ type: 'is-list-over', closestEdge: extractClosestEdge(args.self.data) }),
        onDrag: (args) => setState({ type: 'is-list-over', closestEdge: extractClosestEdge(args.self.data) }),
        onDragLeave: () => setState(idle),
        onDrop: () => setState(idle),
      })
    );
  }, [list.id, instanceId]);

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle === list.title || !user) {
      setIsEditing(false);
      setEditTitle(list.title);
      return;
    }

    setLoading(true);
    try {
      await listService.updateList(list.id, user.uid, { title: editTitle.trim() });
      setIsEditing(false);
      onListUpdated();
    } catch (error) {
      console.error("Error updating list:", error);
      setEditTitle(list.title);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditTitle(list.title);
  };

  const handleDelete = async () => {
    if (!user) {
      console.error("User not authenticated for delete operation");
      return;
    }
    setLoading(true);
    try {
      await listService.deleteList(list.id, user.uid);
      onListDeleted();
    } catch (error) {
      console.error("Error deleting list:", error);
    } finally {
      setLoading(false);
      setShowDeleteDialog(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSaveEdit();
    else if (e.key === "Escape") handleCancelEdit();
  };

  const columnContextValue: ColumnContextProps = useMemo(() => ({
    listId: list.id,
  }), [list.id]);

  return (
    <>
      <div className={`flex-shrink-0 w-72 md:w-80 relative ${isBeingDragged ? "opacity-40" : ""}`}>
        <UICard
          ref={listRef}
          className={`max-h-full flex flex-col transition-all duration-200 cursor-grab ${state.type === 'is-card-over' ? "bg-primary/10" : ""}`}
        >
          <CardHeader className="pb-1 shrink-0" ref={headerRef}>
            <div className="flex items-center justify-between">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="h-8 text-sm font-semibold"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={handleSaveEdit} disabled={loading}>
                    {loading ? <LoadingSpinner size="sm" /> : <Check className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex-1" onDoubleClick={() => setIsEditing(true)}>
                    <h3 className="font-semibold text-sm font-sans">{list.title}</h3>
                    <span className="text-xs text-muted-foreground font-serif">
                      {list.items.length} card{list.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </div>
          </CardHeader>
          <ColumnContext.Provider value={columnContextValue}>
            <CardContent className="space-y-2 overflow-y-auto" ref={cardContainerRef}>
                {list.items.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onCardUpdated={onListUpdated} // Using onListUpdated for a general refresh
                    onCardDeleted={onListUpdated} // Using onListUpdated for a general refresh
                  />
                ))}
                {list.items.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-serif text-sm">No cards yet</div>
                )}
              <CreateCardDialog listId={list.id} cardsCount={list.items.length} onCardCreated={onListUpdated} />
            </CardContent>
          </ColumnContext.Provider>
        </UICard>
        {state.type === 'is-list-over' && state.closestEdge && (
          <DropIndicator edge={state.closestEdge} gap="8px" />
        )}
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans">Delete List</AlertDialogTitle>
            <AlertDialogDescription className="font-serif">
              Are you sure you want to delete "{list.title}"? This will move the list and its {list.items.length} active card(s) to the deleted view.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Deleting...
                </div>
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}