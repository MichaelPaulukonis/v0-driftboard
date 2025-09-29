'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { listService } from '@/lib/firebase-service'
import type { List } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from './loading-spinner'

interface ViewDeletedListsDialogProps {
  boardId: string
  trigger: React.ReactNode
  onListRestored: () => void
}

export function ViewDeletedListsDialog({ boardId, trigger, onListRestored }: ViewDeletedListsDialogProps) {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [lists, setLists] = useState<List[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchLists()
    }
  }, [isOpen, boardId])

  const fetchLists = async () => {
    setLoading(true)
    try {
      const fetchedLists = await listService.getListsByStatus(boardId, 'deleted')
      setLists(fetchedLists)
    } catch (error) {
      console.error(`Error fetching deleted lists:`, error)
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (listId: string) => {
    if (!user) return;
    try {
      await listService.restoreList(listId, user.uid);
      setLists(prev => prev.filter(l => l.id !== listId));
      onListRestored();
    } catch (error) {
      console.error("Failed to restore list:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Deleted Lists</DialogTitle>
        </DialogHeader>
        <div className="mt-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <LoadingSpinner />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-muted-foreground text-center">No deleted lists found.</p>
          ) : (
            <ul className="space-y-2">
              {lists.map((list) => (
                <li key={list.id} className="p-3 border rounded-md bg-card flex justify-between items-center">
                  <h4 className="font-semibold">{list.title}</h4>
                  <Button size="sm" onClick={() => handleRestore(list.id)}>
                    Restore
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
