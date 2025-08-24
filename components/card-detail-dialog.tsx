"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CommentsSection } from "./comments-section"
import type { Card } from "@/lib/types"

interface CardDetailDialogProps {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CardDetailDialog({ card, open, onOpenChange }: CardDetailDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-sans text-lg">{card.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {card.description && (
            <div>
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <p className="text-sm text-muted-foreground font-serif whitespace-pre-wrap">{card.description}</p>
            </div>
          )}

          <div className="border-t pt-6">
            <CommentsSection cardId={card.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
