'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { cardService } from '@/lib/firebase-service'
import type { Card } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from './loading-spinner'
import { CardDetailDialog } from './card-detail-dialog'

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
  const [loading, setLoading] = useState(false)
  const [selectedCard, setSelectedCard] = useState<Card | null>(null)

  useEffect(() => {
    if (isOpen) {
      fetchCards()
    }
  }, [isOpen, boardId, status])

  const fetchCards = async () => {
    setLoading(true)
    try {
      const fetchedCards = await cardService.getCardsByStatus(boardId, status)
      setCards(fetchedCards)
    } catch (error) {
      console.error(`Error fetching ${status} cards:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (cardId: string) => {
    if (!user) return
    try {
      await cardService.updateCardStatus(cardId, user.uid, 'active')
      setCards((prevCards) => prevCards.filter((card) => card.id !== cardId))
      onCardRestored()
    } catch (error) {
      console.error("Failed to restore card:", error)
    }
  }

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
                      <Button size="sm" onClick={() => handleRestore(card.id)}>
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
    </>
  )
}
