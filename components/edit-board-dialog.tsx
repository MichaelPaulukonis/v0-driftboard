"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { boardService } from "@/lib/firebase-service"
import type { Board } from "@/lib/types"
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

interface EditBoardDialogProps {
  board: Board
  open: boolean
  onOpenChange: (open: boolean) => void
  onBoardUpdated: () => void
}

export function EditBoardDialog({ board, open, onOpenChange, onBoardUpdated }: EditBoardDialogProps) {
  const [title, setTitle] = useState(board.title)
  const [description, setDescription] = useState(board.description || "")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setTitle(board.title)
    setDescription(board.description || "")
  }, [board])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    setLoading(true)
    try {
      await boardService.updateBoard(board.id, {
        title: title.trim(),
        description: description.trim(),
      })
      onOpenChange(false)
      onBoardUpdated()
    } catch (error) {
      console.error("Error updating board:", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Edit Board</DialogTitle>
          <DialogDescription className="font-serif">Update your board title and description.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title" className="font-serif">
                Board Title
              </Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Board title"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description" className="font-serif">
                Description (optional)
              </Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of what this board is for..."
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
