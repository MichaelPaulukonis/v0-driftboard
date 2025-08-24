"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send } from "lucide-react"
import { commentService } from "@/lib/firebase-service"
import { useAuth } from "@/contexts/auth-context"

interface CommentFormProps {
  cardId: string
  onCommentAdded: () => void
}

export function CommentForm({ cardId, onCommentAdded }: CommentFormProps) {
  const { user } = useAuth()
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!content.trim() || !user) return

    setIsLoading(true)
    try {
      await commentService.createComment(cardId, user.uid, content.trim())
      setContent("")
      onCommentAdded()
    } catch (error) {
      console.error("Error creating comment:", error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[80px] resize-none"
        disabled={isLoading}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isLoading || !content.trim()}>
          <Send className="h-3 w-3 mr-1" />
          {isLoading ? "Adding..." : "Add Comment"}
        </Button>
      </div>
    </form>
  )
}
