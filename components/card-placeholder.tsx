'use client'

import { Card as UICard, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

/**
 * CardPlaceholder - A full-size ghost card component used as a placeholder
 * during drag-and-drop operations. Provides visual feedback showing where
 * a card will be dropped while maintaining list height stability.
 */
export function CardPlaceholder() {
  return (
    <UICard className="border-2 border-dashed border-primary/30 bg-primary/5 opacity-60">
      <CardContent className="p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0 space-y-1">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-full" />
          </div>
          <div className="flex flex-col items-end justify-between self-stretch">
            <Skeleton className="h-6 w-8" />
          </div>
        </div>
      </CardContent>
    </UICard>
  )
}