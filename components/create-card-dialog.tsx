"use client";

import type React from "react";
import { useState, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";
import { cardService } from "@/lib/firebase-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CreateCardDialogProps {
  listId: string;
  onCardCreated: () => void;
  trigger?: React.ReactNode;
}

export function CreateCardDialog({
  listId,
  onCardCreated,
  trigger,
}: CreateCardDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    setError(null);
    try {
      await cardService.createCard(
        listId,
        user.uid,
        title.trim(),
        description.trim(),
      );
      setTitle("");
      setDescription("");
      setOpen(false);
      onCardCreated();
    } catch (error) {
      console.error("Error creating card:", error);
      const code = (error as any)?.code;
      if (code === "permission-denied") {
        setError("You do not have permission to create cards on this board.");
      } else if (code === "unavailable") {
        setError("Network unavailable. Check your connection and try again.");
      } else {
        setError("Failed to create card. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) setError(null);
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-4 w-4" />
            Add a card
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Create New Card</DialogTitle>
          <DialogDescription className="font-serif">
            Add a new card to organize your tasks.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} onSubmit={handleSubmit}>
          <div className="grid gap-2 py-2">
            {error && (
              <div
                role="alert"
                className="p-3 mb-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
              >
                {error}
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="card-title" className="font-serif">
                Card Title
              </Label>
              <Input
                id="card-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter card title..."
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="card-description" className="font-serif">
                Description (optional)
              </Label>
              <Textarea
                id="card-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    formRef.current?.requestSubmit();
                  }
                }}
                placeholder="Add more details..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setError(null);
                setOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()}>
              {loading ? "Creating..." : "Create Card"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
