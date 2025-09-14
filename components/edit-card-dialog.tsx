"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/auth-context"
import { cardService } from "@/lib/firebase-service"
import type { Card } from "@/lib/types"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface EditCardDialogProps {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
  onCardUpdated: () => void
}

export function EditCardDialog({ card, open, onOpenChange, onCardUpdated }: EditCardDialogProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description || "")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTitle(card.title)
    setDescription(card.description || "")
  }, [card])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !user) return

    setLoading(true)
    try {
      await cardService.updateCard(card.id, user.uid, {
        title: title.trim(),
        description: description.trim(),
      })
      onOpenChange(false)
      onCardUpdated()
    } catch (error) {
      console.error("Error updating card:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Edit Card</DialogTitle>
          <DialogDescription className="font-serif">Update your card details.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-card-title" className="font-serif">
                Card Title
              </Label>
              <Input
                id="edit-card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Card title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-card-description" className="font-serif">
                Description (optional)
              </Label>
              <Textarea
                id="edit-card-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
