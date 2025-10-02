"use client"

import type React from "react"
import { useState, useRef } from "react"
import { useAuth } from "@/contexts/auth-context"
import { boardService } from "@/lib/firebase-service"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Plus } from "lucide-react"

interface CreateBoardDialogProps {
  onBoardCreated: () => void
}

export function CreateBoardDialog({ onBoardCreated }: CreateBoardDialogProps) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !title.trim()) return

    setLoading(true)
    setError(null)

    try {
      console.log("[v0] Starting board creation process")
      await boardService.createBoard(user.uid, title.trim(), description.trim())
      setTitle("")
      setDescription("")
      setOpen(false)
      onBoardCreated()
    } catch (error) {
      console.error("[v0] Error in handleSubmit:", error)
      const errorCode = (error as any)?.code
      if (errorCode === "permission-denied" || errorCode === "unavailable") {
        setError("Database not configured. Please enable Firestore in Firebase Console.")
      } else {
        setError("Failed to create board. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Board
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Create New Board</DialogTitle>
          <DialogDescription className="font-serif">
            Create a new kanban board to organize your projects and tasks.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">{error}</div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="title" className="font-serif">
                Board Title
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Web Development Projects"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description" className="font-serif">
                Description (optional)
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                    formRef.current?.requestSubmit();
                  }
                }}
                placeholder="Brief description of what this board is for..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create Board"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
