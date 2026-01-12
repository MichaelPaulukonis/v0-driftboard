"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/loading-spinner";
import { boardService } from "@/lib/firebase-service";
import { Users, User, Shield, ShieldAlert } from "lucide-react";

interface BoardAccessDialogProps {
  boardId: string;
  isOpen: boolean;
  onClose: () => void;
  initialMembers?: Array<{
    userId: string;
    displayName: string;
    photoURL: string | null;
    role: string;
  }>;
}

interface Member {
  userId: string;
  displayName: string;
  email?: string;
  photoURL: string | null;
  role: string;
}

export function BoardAccessDialog({
  boardId,
  isOpen,
  onClose,
  initialMembers,
}: BoardAccessDialogProps) {
  const [members, setMembers] = useState<Member[]>(initialMembers || []);
  const [loading, setLoading] = useState(!initialMembers);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchMembers = async () => {
      try {
        if (!initialMembers) setLoading(true);
        const data = await boardService.getBoardSharingData(boardId);
        setMembers(data.members);
        setError(null);
      } catch (err) {
        console.error("Failed to load access list:", err);
        setError("Failed to load members");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [boardId, isOpen, initialMembers]);

  const getInitials = (name: string, email?: string) => {
    if (name && name !== "Unknown" && !name.includes("@")) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    const target = email || name;
    return target.slice(0, 2).toUpperCase();
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "owner":
        return (
          <Badge className="bg-primary/20 text-primary hover:bg-primary/30 border-primary/20">
            Owner
          </Badge>
        );
      case "editor":
        return <Badge variant="secondary">Editor</Badge>;
      case "viewer":
        return <Badge variant="outline">Viewer</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner":
        return <ShieldAlert className="h-4 w-4 text-primary" />;
      case "editor":
        return <Shield className="h-4 w-4 text-secondary-foreground" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-sans">
            <Users className="h-5 w-5" />
            Board Access
          </DialogTitle>
          <DialogDescription className="font-serif">
            Members with access to this board.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="p-4 text-center text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground font-serif">
              No members found.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {members.map((member) => (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <Avatar className="h-9 w-9 border">
                      <AvatarImage
                        src={member.photoURL || undefined}
                        alt={member.displayName}
                      />
                      <AvatarFallback>
                        {getInitials(member.displayName, member.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid gap-0.5">
                      <p className="text-sm font-medium leading-none truncate">
                        {member.displayName === "Unknown"
                          ? member.email || "Unknown"
                          : member.displayName}
                      </p>
                      <div className="flex flex-col">
                        {member.email &&
                          member.displayName !== member.email &&
                          member.displayName !== "Unknown" && (
                            <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                              {member.email}
                            </p>
                          )}
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {getRoleIcon(member.role)}
                          <span className="capitalize">{member.role}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 ml-2">
                    {getRoleBadge(member.role)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
