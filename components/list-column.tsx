"use client"

import type React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "@/contexts/auth-context"
import { listService, cardService } from "@/lib/firebase-service"
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
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter"
import { extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { attachClosestEdge, type Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge"
import { DropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/box"

interface ListColumnProps {
  list: List
  onListUpdated: () => void
  onListDeleted: () => void
  onCardUpdated: (listId?: string) => void
}

export function ListColumn({ list, onListUpdated, onListDeleted, onCardUpdated }: ListColumnProps) {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(list.title)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [cardsLoading, setCardsLoading] = useState(true)
  const [isDraggedOver, setIsDraggedOver] = useState(false)
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const loadCards = useCallback(async () => {
    try {
      setCardsLoading(true)
      const listCards = await cardService.getListCards(list.id)
      setCards(listCards)
    } catch (error) {
      console.error("Error loading cards:", error)
    } finally {
      setCardsLoading(false)
    }
  }, [list.id])

  useEffect(() => {
    loadCards()
  }, [loadCards])

  useEffect(() => {
    const element = listRef.current
    if (!element) return

    return dropTargetForElements({
      element,
      getData: ({ input, element }) => {
        return attachClosestEdge(
          { type: "list", listId: list.id },
          {
            input,
            element,
            allowedEdges: ["top", "bottom"],
          },
        )
      },
      canDrop: ({ source }) => {
        return source.data.card != null
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
      onDrop: async ({ source, self, location }) => {
        setIsDraggedOver(false)
        setClosestEdge(null)

        if (!user) {
          console.error("User not authenticated for drop operation");
          return;
        }

        const cardData = source.data.card as Card
        if (!cardData) return

        console.log("[v0] Pragmatic drop on list:", list.id, "for card:", cardData.id)

        if (cardData.listId !== list.id) {
          console.log("[v0] Moving card between lists")
          try {
            await cardService.moveCard(cardData.id, user.uid, list.id, cards.length)
            console.log("[v0] Card moved successfully")
            onCardUpdated()
          } catch (error) {
            console.error("[v0] Error moving card:", error)
          }
          return
        }

        console.log("[v0] Reordering within same list")
        const startIndex = cards.findIndex((card) => card.id === cardData.id)
        if (startIndex === -1) return

        let destinationIndex = startIndex

        const cardDropTarget = location.current.dropTargets.find((target) => target.data.type === "card")

        if (cardDropTarget) {
          const targetCardId = cardDropTarget.data.cardId as string
          const targetIndex = cards.findIndex((card) => card.id === targetCardId)

          if (targetIndex !== -1) {
            const edge = extractClosestEdge(cardDropTarget.data)

            if (edge === "top") {
              destinationIndex = targetIndex
            } else if (edge === "bottom") {
              destinationIndex = targetIndex + 1
            }

            if (destinationIndex > startIndex) {
              destinationIndex -= 1
            }
          }
        } else {
          const edge = extractClosestEdge(self.data)
          if (edge === "bottom") {
            destinationIndex = cards.length
          } else {
            destinationIndex = 0
          }
        }

        if (startIndex === destinationIndex) {
          console.log("[v0] Card dropped in same position")
          return
        }

        console.log("[v0] Reordering card from position", startIndex, "to position", destinationIndex)

        try {
          const reorderedCards = [...cards]
          const [movedCard] = reorderedCards.splice(startIndex, 1)
          reorderedCards.splice(destinationIndex, 0, movedCard)

          const cardUpdates = reorderedCards.map((card, index) => ({
            id: card.id,
            listId: list.id,
            position: index,
          }))

          await cardService.reorderCards(cardUpdates, user.uid)
          console.log("[v0] Cards reordered successfully")
          loadCards()
        } catch (error) {
          console.error("[v0] Error reordering cards:", error)
        }
      },
    })
  }, [list.id, cards, onCardUpdated, loadCards, user])

  const handleSaveEdit = async () => {
    if (!editTitle.trim() || editTitle === list.title || !user) {
      setIsEditing(false)
      setEditTitle(list.title)
      return
    }

    setLoading(true)
    try {
      await listService.updateList(list.id, user.uid, { title: editTitle.trim() })
      setIsEditing(false)
      onListUpdated()
    } catch (error) {
      console.error("Error updating list:", error)
      setEditTitle(list.title)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditTitle(list.title)
  }

  const handleDelete = async () => {
    if (!user) {
      console.error("User not authenticated for delete operation");
      return;
    }
    setLoading(true)
    try {
      await listService.deleteList(list.id, user.uid)
      onListDeleted()
    } catch (error) {
      console.error("Error deleting list:", error)
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveEdit()
    } else if (e.key === "Escape") {
      handleCancelEdit()
    }
  }

  const handleCardCreated = async () => {
    await loadCards()
    onCardUpdated(list.id)
  }

  const handleCardUpdated = async () => {
    onCardUpdated(list.id)
  }

  const handleCardDeleted = async () => {
    onCardUpdated(list.id)
  }

  return (
    <>
      <div className="flex-shrink-0 w-72 md:w-80">
        <UICard
          ref={listRef}
          className={`h-fit transition-all duration-200 ${isDraggedOver ? "ring-2 ring-primary ring-opacity-50 scale-[1.02]" : ""}`}
        >
          {isDraggedOver && closestEdge === "top" && <DropIndicator edge="top" gap="8px" />}

          <CardHeader className="pb-3">
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
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm font-sans">{list.title}</h3>
                    <span className="text-xs text-muted-foreground font-serif">
                      {cards.length} card{cards.length === 1 ? "" : "s"}
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
          <CardContent className="space-y-2 group min-h-[100px]">
            {cardsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner />
              </div>
            ) : (
              <>
                {cards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    onCardUpdated={handleCardUpdated}
                    onCardDeleted={handleCardDeleted}
                  />
                ))}

                {cards.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground font-serif text-sm">No cards yet</div>
                )}
              </>
            )}

            <CreateCardDialog listId={list.id} cardsCount={cards.length} onCardCreated={handleCardCreated} />
          </CardContent>

          {isDraggedOver && closestEdge === "bottom" && <DropIndicator edge="bottom" gap="8px" />}
        </UICard>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-sans">Delete List</AlertDialogTitle>
            <AlertDialogDescription className="font-serif">
              Are you sure you want to delete "{list.title}"? This action cannot be undone and will delete all cards in
              this list.
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