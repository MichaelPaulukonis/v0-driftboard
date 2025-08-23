"use client"
import { useState, useEffect, useRef } from "react"
import { cardService } from "@/lib/firebase-service"
import type { Card } from "@/lib/types"
import { Card as UICard, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
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
import { MoreHorizontal, Edit, Trash2, GripVertical } from "lucide-react"
import { EditCardDialog } from "./edit-card-dialog"
import { LoadingSpinner } from "./loading-spinner"
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { attachClosestEdge, extractClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box"

interface CardItemProps {
  card: Card
  onCardUpdated: () => void
  onCardDeleted: () => void
}

export function CardItem({ card, onCardUpdated, onCardDeleted }: CardItemProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = cardRef.current
    if (!element) return

    const cleanupDraggable = draggable({
      element,
      getInitialData: () => ({ card }),
      onDragStart: () => {
        console.log("[v0] Pragmatic drag started for card:", card.id)
        setIsDragging(true)
      },
      onDrop: () => {
        console.log("[v0] Pragmatic drag ended for card:", card.id)
        setIsDragging(false)
      },
    })

    const cleanupDropTarget = dropTargetForElements({
      element,
      getData: ({ input, element }) => {
        return attachClosestEdge(
          { type: "card", cardId: card.id },
          {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          },
        )
      },
      canDrop: ({ source }) => {
        const sourceCard = source.data.card as Card
        return sourceCard && sourceCard.id !== card.id
      },
      onDragEnter: ({ self }) => {
        setIsDraggedOver(true)
        const edge = extractClosestEdge(self.data)
        setClosestEdge(edge)
      },
      onDrag: ({ self }) => {
        const edge = extractClosestEdge(self.data)
        setClosestEdge(edge)
      },
      onDragLeave: () => {
        setIsDraggedOver(false)
        setClosestEdge(null)
      },
      onDrop: () => {
        setIsDraggedOver(false)
        setClosestEdge(null)
      },
    })

    return () => {
      cleanupDraggable()
      cleanupDropTarget()
    }
  }, [card])

  const handleDelete = async () => {
    setLoading(true)
    try {
      await cardService.deleteCard(card.id)
      onCardDeleted()
    } catch (error) {
      console.error("Error deleting card:", error)
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  return (
    <>
      {isDraggedOver && closestEdge === "top" && <DropIndicator edge="top" gap="4px" />}

      <UICard
        ref={cardRef}
        className={`cursor-move hover:shadow-md transition-all duration-200 group ${
          isDragging ? "opacity-50 rotate-1 scale-105 shadow-lg" : "hover:scale-[1.02]"
        } ${isDraggedOver ? "ring-2 ring-primary/50" : ""}`}
        data-card-id={card.id}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm font-sans leading-tight mb-1 break-words">{card.title}</h4>
              {card.description && (
                <p className="text-xs text-muted-foreground font-serif line-clamp-3 break-words">{card.description}</p>
              )}
            </div>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <GripVertical className="h-3 w-3 text-muted-foreground" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </UICard>

      {isDraggedOver && closestEdge === "bottom" && <DropIndicator edge="bottom" gap="4px" />}

      <EditCardDialog
        card={card}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onCardUpdated={onCardUpdated}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans">Delete Card</AlertDialogTitle>
            <AlertDialogDescription className="font-serif">
              Are you sure you want to delete "{card.title}"? This action cannot be undone.
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
