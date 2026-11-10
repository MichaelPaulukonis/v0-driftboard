"use client";

import type React from "react";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { listService } from "@/lib/firebase-service";
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
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";

interface CreateListDialogProps {
  boardId: string;
  listsCount: number;
  onListCreated: () => void;
}

export function CreateListDialog({
  boardId,
  listsCount,
  onListCreated,
}: CreateListDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !user) return;

    setLoading(true);
    setError(null);
    try {
      await listService.createList(boardId, user.uid, title.trim(), listsCount);
      setTitle("");
      setOpen(false);
      onListCreated();
    } catch (error) {
      console.error("Error creating list:", error);
      const code = (error as any)?.code;
      if (code === "permission-denied") {
        setError("You do not have permission to create lists on this board.");
      } else if (code === "unavailable") {
        setError("Network unavailable. Check your connection and try again.");
      } else {
        setError("Failed to create list. Please try again.");
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
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add List
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Create New List</DialogTitle>
          <DialogDescription className="font-serif">
            Add a new list to organize your tasks and cards.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
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
              <Label htmlFor="list-title" className="font-serif">
                List Title
              </Label>
              <Input
                id="list-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., To Do, In Progress, Done"
                required
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
              {loading ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
