"use client";

import { useEffect, useState } from "react";
import { activityService, userService } from "@/lib/firebase-service";
import type { Activity } from "@/lib/types";
import { LoadingSpinner } from "./loading-spinner";
import { formatDistanceToNow } from "date-fns";
import {
  MessageSquare,
  Plus,
  Move,
  Trash2,
  UserPlus,
  Info,
  List as ListIcon,
  Layout,
} from "lucide-react";

interface ActivityLogProps {
  boardId: string;
  cardId?: string; // Optional: filter by card
}

const userCache: Record<string, { displayName?: string; email: string }> = {};

export function ActivityLog({ boardId, cardId }: ActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [resolvedUsers, setResolvedUsers] = useState<
    Record<string, { displayName?: string; email: string }>
  >({});
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const boardActivities = await activityService.getBoardActivities(boardId);

      // Filter by cardId if provided
      const filteredActivities = cardId
        ? boardActivities.filter(
            (a) =>
              a.details?.cardId === cardId ||
              (a.action === "COMMENT" && a.details?.cardId === cardId),
          )
        : boardActivities;

      setActivities(filteredActivities);

      // Resolve user information
      const uniqueUserIds = Array.from(
        new Set(filteredActivities.map((a) => a.userId)),
      );
      const newUsers: Record<string, any> = { ...resolvedUsers };
      let updated = false;

      for (const uid of uniqueUserIds) {
        if (!userCache[uid]) {
          const user = await userService.getUserById(uid);
          if (user) {
            userCache[uid] = {
              displayName: user.displayName,
              email: user.email,
            };
            newUsers[uid] = userCache[uid];
            updated = true;
          } else {
            // Fallback for unknown user
            userCache[uid] = { email: "Unknown User" };
            newUsers[uid] = userCache[uid];
            updated = true;
          }
        } else if (!newUsers[uid]) {
          newUsers[uid] = userCache[uid];
          updated = true;
        }
      }

      if (updated) {
        setResolvedUsers(newUsers);
      }
    } catch (error) {
      console.error("Error loading activities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [boardId, cardId]);

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "CREATE_BOARD":
        return <Layout className="h-3 w-3" />;
      case "CREATE_LIST":
        return <ListIcon className="h-3 w-3" />;
      case "CREATE_CARD":
        return <Plus className="h-3 w-3" />;
      case "MOVE_CARD":
        return <Move className="h-3 w-3" />;
      case "COMMENT":
        return <MessageSquare className="h-3 w-3" />;
      case "INVITE_USER":
        return <UserPlus className="h-3 w-3" />;
      case "DELETE_CARD":
        return <Trash2 className="h-3 w-3" />;
      default:
        return <Info className="h-3 w-3" />;
    }
  };

  const formatActivityText = (activity: Activity) => {
    switch (activity.action) {
      case "CREATE_BOARD":
        return `created the board`;
      case "CREATE_LIST":
        return `created list "${activity.details?.title}"`;
      case "CREATE_CARD":
        return `created card "${activity.details?.title}"`;
      case "MOVE_CARD":
        return `moved card "${activity.details?.cardTitle || "this card"}"`;
      case "COMMENT":
        return `commented on a card`;
      case "INVITE_USER":
        return `invited ${activity.details?.inviteeName || "a new user"}`;
      case "DELETE_CARD":
        return `deleted a card`;
      default:
        return `performed an action`;
    }
  };

  if (loading && activities.length === 0) return <LoadingSpinner size="sm" />;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <Info className="h-4 w-4 text-primary" />
        Activity
      </h3>
      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground font-serif italic">
          No activity yet.
        </p>
      ) : (
        <ul className="space-y-4">
          {activities.map((activity) => {
            const user = resolvedUsers[activity.userId];
            const userName =
              user?.displayName || user?.email || activity.userId;

            return (
              <li key={activity.id} className="flex gap-3">
                <div className="mt-0.5 h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1 min-w-0 text-sm">
                  <p className="text-foreground leading-snug">
                    <span className="font-semibold">{userName}</span>{" "}
                    <span className="text-muted-foreground font-serif">
                      {formatActivityText(activity)}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground font-serif mt-0.5 uppercase tracking-wider">
                    {activity.createdAt
                      ? formatDistanceToNow(activity.createdAt, {
                          addSuffix: true,
                        })
                      : "just now"}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
