"use client";

import React, { useEffect, useState } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/auth-context";
import { Board } from "@/lib/types";
import { boardService } from "@/lib/firebase-service";
import { BoardAccessDialog } from "./board-access-dialog";
import { canPerformAction } from "@/lib/permissions";
import { toast } from "@/components/ui/use-toast";

interface ShareIndicatorProps {
  boardId: string;
  board?: Board;
  onClick?: () => void;
  className?: string;
  showText?: boolean;
}

interface SharingData {
  isShared: boolean;
  members: Array<{
    userId: string;
    displayName: string;
    photoURL: string | null;
    role: string;
  }>;
}

export function ShareIndicator({
  boardId,
  board,
  onClick,
  className,
  showText = true,
}: ShareIndicatorProps) {
  const { user } = useAuth();
  const [data, setData] = useState<SharingData | null>(null);
  const [loading, setLoading] = useState(!board);
  const [error, setError] = useState<string | null>(null);
  const [showAccessList, setShowAccessList] = useState(false);

  // Use board data if available for immediate display
  const isShared =
    data?.isShared ??
    board?.isShared ??
    (board?.userRole && board.userRole !== "owner") ??
    false;

  // Debug log to trace why indicator might not be showing
  useEffect(() => {
    if (board && board.isShared) {
      // console.log("ShareIndicator: Board is shared", { boardId, isShared, memberCount });
    }
  }, [board, isShared]);

  const memberCount =
    data?.members.length ?? board?.memberCount ?? (isShared ? 2 : 1); // rough estimate if only know it is shared

  useEffect(() => {
    let mounted = true;

    // If we have board data and it says it's not shared, we can skip fetching
    // unless we want to be absolutely sure (e.g. background sync)
    // For now, let's assume if isShared is explicitly false, we don't need to fetch.
    if (board && board.isShared === false) {
      setLoading(false);
      return;
    }

    const fetchSharingStatus = async () => {
      if (!user) return;

      try {
        if (!data) setLoading(true);
        const sharingData = await boardService.getBoardSharingData(boardId);

        if (mounted) {
          setData(sharingData);
          setError(null);
        }
      } catch (err) {
        console.error("Failed to fetch sharing status:", err);
        if (mounted) setError("Failed to load");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchSharingStatus();

    return () => {
      mounted = false;
    };
  }, [boardId, user, board?.isShared]);

  if (loading && !board) {
    return null;
  }

  if (!isShared) {
    return null;
  }

  const tooltipText = data
    ? `This board is shared with ${data.members.length} member${data.members.length !== 1 ? "s" : ""}`
    : `This board is shared`;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick();
      return;
    }

    // Determine effective role
    let effectiveRole = board?.userRole;
    if (!effectiveRole && data && user) {
      const member = data.members.find((m) => m.userId === user.uid);
      if (member) {
        effectiveRole = member.role as any;
      }
    }

    // Check permissions
    if (effectiveRole && !canPerformAction(effectiveRole, "viewAccessList")) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to view the access list.",
        variant: "destructive",
      });
      return;
    }

    setShowAccessList(true);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={`gap-1 px-1.5 h-7 text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring ${className}`}
              onClick={handleClick}
              aria-label={`Shared board indicator: ${tooltipText}`}
            >
              <Badge
                variant="secondary"
                className="gap-1 px-2 h-6 pointer-events-none font-sans font-normal"
              >
                <Users className="h-3.5 w-3.5" />
                {showText && <span>Shared</span>}
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            align="center"
            className="max-w-[200px] text-center"
          >
            <p className="font-sans text-sm">{tooltipText}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Click to view access list
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <BoardAccessDialog
        boardId={boardId}
        isOpen={showAccessList}
        onClose={() => setShowAccessList(false)}
        initialMembers={data?.members}
      />
    </>
  );
}
