"use client"

import { useState, useEffect } from "react"
import { CommentItem } from "./comment-item"
import { CommentForm } from "./comment-form"
import { CommentSkeleton } from "./comment-skeleton"
import { commentService } from "@/lib/firebase-service"
import type { CommentWithUser } from "@/lib/types"
import { MessageSquare } from "lucide-react"

interface CommentsSectionProps {
  cardId: string
}

export function CommentsSection({ cardId }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentWithUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadComments = async () => {
    try {
      const cardComments = await commentService.getCardComments(cardId)
      setComments(cardComments)
    } catch (error) {
      console.error("Error loading comments:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadComments()
  }, [cardId])

  const handleCommentsUpdated = () => {
    loadComments()
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquare className="h-4 w-4" />
          Comments
        </div>
        <div>
          <CommentSkeleton />
          <CommentSkeleton />
          <CommentSkeleton />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4" />
        Comments ({comments.length})
      </div>

      <CommentForm cardId={cardId} onCommentAdded={handleCommentsUpdated} />

      {comments.length > 0 ? (
        <div className="space-y-0">
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} onCommentUpdated={handleCommentsUpdated} />
          ))}
        </div>
      ) : (
        <div className="text-sm text-muted-foreground text-center py-4">No comments yet. Be the first to add one!</div>
      )}
    </div>
  )
}
