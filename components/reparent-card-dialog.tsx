'use client'

import { useState } from 'react'
import type { List } from '@/lib/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface ReparentCardDialogProps {
  isOpen: boolean
  activeLists: List[]
  onConfirm: (newListId: string) => void
  onCancel: () => void
}

export function ReparentCardDialog({ isOpen, activeLists, onConfirm, onCancel }: ReparentCardDialogProps) {
  const [selectedListId, setSelectedListId] = useState<string | null>(null)

  const handleConfirm = () => {
    if (selectedListId) {
      onConfirm(selectedListId)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onCancel}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Choose a New List</DialogTitle>
          <DialogDescription>
            This card's original list was deleted. Please select a new list to restore it to.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Select onValueChange={setSelectedListId}>
            <SelectTrigger>
              <SelectValue placeholder="Select a list..." />
            </SelectTrigger>
            <SelectContent>
              {activeLists.map((list) => (
                <SelectItem key={list.id} value={list.id}>
                  {list.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleConfirm} disabled={!selectedListId}>
            Restore Card
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
