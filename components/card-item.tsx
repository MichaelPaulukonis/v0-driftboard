'use client'
import { useState, useEffect, useRef, Fragment } from "react"
import type React from "react"
import { useAuth } from "@/contexts/auth-context"
import { useToast } from "@/components/ui/use-toast"
import { cardService, commentService } from "@/lib/firebase-service"
import type { Card } from "@/lib/types"
import { linkifyText } from "@/lib/utils"
import { Card as UICard, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
import { MoreHorizontal, Edit, Trash2, GripVertical, MessageSquare, CheckCircle, Archive } from "lucide-react"
import { EditCardDialog } from "./edit-card-dialog"
import { CardDetailDialog } from "./card-detail-dialog"
import { LoadingSpinner } from "./loading-spinner"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box"
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine"
import invariant from "tiny-invariant"
import { useBoardContext } from "@/contexts/board-context"
import { useColumnContext } from "@/contexts/column-context"


interface CardItemProps {
  card: Card
  onCardUpdated: () => void
  onCardDeleted: () => void
}

type State = 
  | { type: 'idle' }
  | { type: 'dragging' };

const idleState: State = { type: 'idle' };
const draggingState: State = { type: 'dragging' };

export function CardItem({ card, onCardUpdated, onCardDeleted }: CardItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { instanceId } = useBoardContext();
  const { listId } = useColumnContext();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDetailDialog, setShowDetailDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [state, setState] = useState<State>(idleState);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const [commentCount, setCommentCount] = useState(0)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadCommentCount = async () => {
      try {
        const comments = await commentService.getCardComments(card.id)
        setCommentCount(comments.length)
      } catch (error) {
        console.error("Error loading comment count:", error)
      }
    }
    loadCommentCount()
  }, [card.id])

  useEffect(() => {
    const element = cardRef.current;
    invariant(element);

    return combine(
      draggable({
        element,
        getInitialData: () => ({ cardId: card.id, listId, type: 'card', instanceId }),
        onDragStart: () => setState(draggingState),
        onDrop: () => setState(idleState),
      }),
      dropTargetForElements({
        element,
        canDrop: ({ source }) => source.data.instanceId === instanceId && source.data.type === 'card',
        getIsSticky: () => true,
        getData: ({ input, element }) => {
          const data = { type: 'card', cardId: card.id };
          return attachClosestEdge(data, {
            input,
            element,
            allowedEdges: ['top', 'bottom'],
          });
        },
        onDragEnter: (args) => {
          if (args.source.data.cardId !== card.id) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDrag: (args) => {
          if (args.source.data.cardId !== card.id) {
            setClosestEdge(extractClosestEdge(args.self.data));
          }
        },
        onDragLeave: () => setClosestEdge(null),
        onDrop: () => setClosestEdge(null),
      })
    );
  }, [card.id, instanceId, listId]);

  const handleSetStatus = async (status: Card['status']) => {
    if (!user) return;
    setLoading(true);
    try {
      await cardService.updateCardStatus(card.id, user.uid, status);
      toast({ title: "Card Updated", description: `Card "${card.title}" moved to ${status}.` });
      onCardUpdated();
    } catch (error) {
      console.error(`Error setting card status to ${status}:`, error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update card status." });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setLoading(true)
    try {
      await cardService.deleteCard(card.id, user.uid)
      toast({ title: "Card Deleted", description: `Card "${card.title}" has been moved to the deleted view.` });
      onCardDeleted()
    } catch (error) {
      console.error("Error deleting card:", error)
      toast({ variant: "destructive", title: "Error", description: "Failed to delete card." });
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-dropdown-trigger]") || (e.target as HTMLElement).closest("button")) return;
    setShowDetailDialog(true)
  }

  const handleDetailDialogChange = (open: boolean) => {
    setShowDetailDialog(open)
    if (!open) {
      commentService.getCardComments(card.id).then(comments => setCommentCount(comments.length)).catch(console.error);
    }
  }

  const isDragging = state.type === 'dragging';

  return (
    <Fragment>
      <UICard
        ref={cardRef}
        className={`cursor-move hover:shadow-md transition-all duration-200 group relative ${
          isDragging ? "opacity-50 rotate-1 scale-105 shadow-lg" : "hover:scale-[1.02]"
        }`}
        data-card-id={card.id}
        onClick={handleCardClick}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm font-sans leading-tight mb-1 break-words">{card.title}</h4>
              {card.description && (
                <p className="text-xs text-muted-foreground font-serif line-clamp-3 break-words">{linkifyText(card.description)}</p>
              )}
              {commentCount > 0 && (
                <div className="flex items-center gap-1 mt-2">
                  <MessageSquare className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{commentCount}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild data-dropdown-trigger>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowEditDialog(true); }}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetStatus('done'); }}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Done
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSetStatus('archived'); }}>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
        {closestEdge && <DropIndicator edge={closestEdge} gap="1px" />}
      </UICard>

      <EditCardDialog card={card} open={showEditDialog} onOpenChange={setShowEditDialog} onCardUpdated={onCardUpdated} />
      <CardDetailDialog card={card} open={showDetailDialog} onOpenChange={handleDetailDialogChange} onCardUpdated={onCardUpdated} />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans">Delete Card</AlertDialogTitle>
            <AlertDialogDescription className="font-serif">
              Are you sure you want to delete "{card.title}"? This will move the card to the deleted items view, where it can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={loading} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {loading ? <div className="flex items-center gap-2"><LoadingSpinner size="sm" />Deleting...</div> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Fragment>
  )
}
