'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { cardService, listService } from '@/lib/firebase-service'
import type { Card, List } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from './loading-spinner'
import { CardDetailDialog } from './card-detail-dialog'
import { ReparentCardDialog } from './reparent-card-dialog'

interface ViewStatusDialogProps {
  boardId: string
  status: 'done' | 'archived' | 'deleted'
  trigger: React.ReactNode
  onCardRestored: () => void
}

export function ViewStatusDialog({ boardId, status, trigger, onCardRestored }: ViewStatusDialogProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [cards, setCards] = useState<Card[]>([])
  const [activeLists, setActiveLists] = useState<List[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)
  const [cardToReparent, setCardToReparent] = useState<Card | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen, boardId, status])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [fetchedCards, fetchedLists] = await Promise.all([
        cardService.getCardsByStatus(boardId, status),
        listService.getBoardLists(boardId),
      ]);
      setCards(fetchedCards)
      setActiveLists(fetchedLists)
    } catch (error) {
      console.error(`Error fetching data for dialog:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (card: Card) => {
    if (!user) return;

    const parentListIsActive = activeLists.some(list => list.id === card.listId);

    if (parentListIsActive) {
      // Direct restore
      try {
        await cardService.updateCardStatus(card.id, user.uid, 'active');
        setCards(prev => prev.filter(c => c.id !== card.id));
        onCardRestored();
      } catch (error) {
        console.error("Failed to restore card:", error);
      }
    } else {
      // Orphaned card, prompt for reparenting
      setCardToReparent(card);
    }
  };

  const handleReparentConfirm = async (newListId: string) => {
    if (!user || !cardToReparent) return;
    try {
      // Update both listId and status
      await cardService.updateCard(cardToReparent.id, user.uid, { listId: newListId, status: 'active' });
      setCards(prev => prev.filter(c => c.id !== cardToReparent.id));
      onCardRestored();
    } catch (error) {
      console.error("Failed to reparent and restore card:", error);
    } finally {
      setCardToReparent(null);
    }
  };

  const capitalizedStatus = status.charAt(0).toUpperCase() + status.slice(1)

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>{trigger}</DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{capitalizedStatus} Cards</DialogTitle>
          </DialogHeader>
          <div className="mt-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <LoadingSpinner />
              </div>
            ) : cards.length === 0 ? (
              <p className="text-muted-foreground text-center">No {status} cards found.</p>
            ) : (
              <ul className="space-y-2">
                {cards.map((card) => (
                  <li key={card.id} className="p-3 border rounded-md bg-card flex justify-between items-center">
                    <div>
                      <h4 className="font-semibold">{card.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{card.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedCard(card)}>
                        View
                      </Button>
                      <Button size="sm" onClick={() => handleRestore(card)}>
                        Restore
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedCard && (
        <CardDetailDialog
          card={selectedCard}
          open={!!selectedCard}
          onOpenChange={() => setSelectedCard(null)}
        />
      )}

      {cardToReparent && (
        <ReparentCardDialog 
          isOpen={!!cardToReparent}
          activeLists={activeLists}
          onConfirm={handleReparentConfirm}
          onCancel={() => setCardToReparent(null)}
        />
      )}
    </>
  )
}