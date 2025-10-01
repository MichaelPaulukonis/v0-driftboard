"use client"

import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { CommentsSection } from "./comments-section"
import type { Card } from "@/lib/types"
import { Button } from "./ui/button";
import { DocumentHistoryViewer } from "./document-history-viewer";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { useAuth } from "@/contexts/auth-context";
import { cardService } from "@/lib/firebase-service";
import { useToast } from "./ui/use-toast";

interface CardDetailDialogProps {
  card: Card
  open: boolean
  onOpenChange: (open: boolean) => void
  onCardUpdated: () => void;
}

export function CardDetailDialog({ card, open, onOpenChange, onCardUpdated }: CardDetailDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const canEdit = !!user;

  useEffect(() => {
    if (open) {
      setTitle(card.title);
      setDescription(card.description || "");
      setIsEditingTitle(false);
      setIsEditingDescription(false);
    }
  }, [open, card]);

  const handleUpdate = useCallback(async (field: 'title' | 'description', value: string) => {
    if (!canEdit) {
      toast({ title: "Authentication Error", description: "You must be logged in to edit.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const updatedFields = { [field]: value };
      await cardService.updateCard(card.id, user.uid, updatedFields);
      const updatedCard = { ...card, ...updatedFields };
      onCardUpdated(updatedCard);
      toast({ title: `Card ${field} updated successfully` });

      if (field === 'title') setIsEditingTitle(false);
      if (field === 'description') setIsEditingDescription(false);

    } catch (error) {
      console.error(`Error updating card ${field}:`, error);
      toast({ title: `Error updating ${field}`, description: "Could not save changes. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [canEdit, card, onCardUpdated, toast, user]);

  const handleToggleDone = useCallback(async () => {
    if (!canEdit) return;
    const newStatus = card.status === 'done' ? 'active' : 'done';
    try {
      await cardService.updateCard(card.id, user.uid, { status: newStatus });
      onCardUpdated({ ...card, status: newStatus });
      toast({ title: `Card marked as ${newStatus}` });
    } catch (error) {
      console.error(`Error updating card status:`, error);
    }
  }, [canEdit, card, onCardUpdated, toast, user]);

  const handleArchive = useCallback(async () => {
    if (!canEdit) return;
    try {
      await cardService.updateCard(card.id, user.uid, { status: 'archived' });
      onCardUpdated({ ...card, status: 'archived' });
      onOpenChange(false);
      toast({ title: "Card archived" });
    } catch (error) {
      console.error("Error archiving card:", error);
    }
  }, [canEdit, card, onCardUpdated, onOpenChange, toast, user]);

  const handleDelete = useCallback(async () => {
    if (!canEdit) return;
    if (window.confirm("Are you sure you want to permanently delete this card?")) {
      try {
        await cardService.deleteCard(card.id);
        onCardUpdated({ ...card, status: 'deleted' }); 
        onOpenChange(false);
        toast({ title: "Card deleted" });
      } catch (error) {
        console.error("Error deleting card:", error);
      }
    }
  }, [canEdit, card, onCardUpdated, onOpenChange, toast, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
            {isEditingTitle && canEdit ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => handleUpdate('title', title)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleUpdate('title', title);
                  if (e.key === 'Escape') {
                    setIsEditingTitle(false);
                    setTitle(card.title);
                  }
                }}
                autoFocus
                className="font-sans text-lg"
              />
            ) : (
              <DialogTitle
                className={`font-sans text-lg ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && setIsEditingTitle(true)}
              >
                {card.title}
              </DialogTitle>
            )}
          </DialogHeader>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-2">Description</h3>
            {isEditingDescription && canEdit ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  autoFocus
                  rows={4}
                  className="text-sm text-muted-foreground font-serif"
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => handleUpdate('description', description)} disabled={loading}>
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setIsEditingDescription(false);
                    setDescription(card.description || '');
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p
                className={`text-sm text-muted-foreground font-serif whitespace-pre-wrap min-h-[4rem] ${canEdit ? 'cursor-pointer' : ''}`}
                onClick={() => canEdit && setIsEditingDescription(true)}
              >
                {card.description || (canEdit ? "Add a more detailed description..." : "No description.")}
              </p>
            )}
          </div>

          <div className="border-t pt-6">
            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => setShowHistory(!showHistory)}>
                {showHistory ? "Hide History" : "Show History"}
              </Button>
            </div>
            {showHistory && (
              <DocumentHistoryViewer collectionName="cards_current" documentId={card.id} />
            )}
          </div>

          <div className="border-t pt-6">
            <CommentsSection cardId={card.id} />
          </div>
        </div>
        {canEdit && (
          <DialogFooter className="pt-6">
            <div className="flex justify-between w-full">
              <div>
                <Button variant="outline" size="sm" onClick={handleArchive}>
                  Archive
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} className="ml-2">
                  Delete
                </Button>
              </div>
              <Button variant="secondary" size="sm" onClick={handleToggleDone}>
                {card.status === 'done' ? 'Mark as Active' : 'Mark as Done'}
              </Button>
            </div>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
