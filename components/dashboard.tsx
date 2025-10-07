"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/auth-context"
import { boardService } from "@/lib/firebase-service"
import type { Board } from "@/lib/types"
import { CreateBoardDialog } from "./create-board-dialog"
import { BoardCard } from "./board-card"
import { EmptyState } from "./empty-state"
import { LoadingSpinner } from "./loading-spinner"
import { Folder } from "lucide-react"

export function Dashboard() {
  const { user } = useAuth()
  const router = useRouter()
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)

  const loadBoards = async () => {
    if (!user) return

    try {
      const userBoards = await boardService.getUserBoards(user.uid)
      setBoards(userBoards)
    } catch (error) {
      console.error("Error loading boards:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBoards()
  }, [user])

  const handleBoardClick = (boardId: string) => {
    router.push(`/board/${boardId}`)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <div className="text-muted-foreground font-serif">Loading your boards...</div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4 md:mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground font-sans mb-2">Your Boards</h2>
          <p className="text-sm md:text-base text-muted-foreground font-serif">
            {boards.length === 0
              ? "Create your first board to get started"
              : `Organize your ${boards.length} project${boards.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <CreateBoardDialog onBoardCreated={loadBoards} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 md:gap-4">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            onBoardUpdated={loadBoards}
            onBoardDeleted={loadBoards}
            onClick={() => handleBoardClick(board.id)}
          />
        ))}

        {boards.length === 0 && (
          <div className="col-span-full">
            <EmptyState
              icon={<Folder className="h-12 w-12" />}
              title="No boards yet"
              description="Create your first kanban board to start organizing your projects and tasks"
              action={<CreateBoardDialog onBoardCreated={loadBoards} />}
            />
          </div>
        )}
      </div>
    </div>
  )
}
