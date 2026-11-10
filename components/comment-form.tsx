"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";
import { commentService } from "@/lib/firebase-service";
import { useAuth } from "@/contexts/auth-context";

interface CommentFormProps {
  cardId: string;
  onCommentAdded: () => void;
}

export function CommentForm({ cardId, onCommentAdded }: CommentFormProps) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submitComment = async () => {
    if (!content.trim() || !user) return;

    setIsLoading(true);
    setError(null);
    try {
      await commentService.createComment(cardId, user.uid, content.trim());
      setContent("");
      onCommentAdded();
    } catch (error) {
      console.error("Error creating comment:", error);
      const code = (error as any)?.code;
      if (code === "permission-denied") {
        setError("You do not have permission to comment on this card.");
      } else if (code === "unavailable") {
        setError("Network unavailable. Check your connection and try again.");
      } else {
        setError("Failed to add comment. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitComment();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submitComment();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      setContent("");
      setError(null);
    }
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-2">
      {error && (
        <div
          role="alert"
          className="p-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-md"
        >
          {error}
        </div>
      )}
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a comment..."
        className="min-h-[80px] resize-none"
        disabled={isLoading}
        onKeyDown={handleKeyDown}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isLoading || !content.trim()}>
          <Send className="h-3 w-3 mr-1" />
          {isLoading ? "Adding..." : "Add Comment"}
        </Button>
      </div>
    </form>
  );
}
