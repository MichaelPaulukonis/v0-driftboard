"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  inviteService,
  type Invite,
  type InviteRole,
} from "@/lib/firebase-service";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Share2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

interface ShareBoardDialogProps {
  boardId: string;
}

const inviteUrl = (token: string) =>
  `${window.location.origin}/invite/${token}`;

export function ShareBoardDialog({ boardId }: ShareBoardDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<InviteRole>("editor");
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadInvites = useCallback(async () => {
    try {
      setInvites(await inviteService.listInvites(boardId));
    } catch (err: any) {
      setError(err.message || "Failed to load invite links");
    }
  }, [boardId]);

  useEffect(() => {
    if (open) {
      setError(null);
      loadInvites();
    }
  }, [open, loadInvites]);

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteUrl(token));
      toast({ title: "Link copied" });
    } catch {
      setError("Could not copy automatically - select and copy the link.");
    }
  };

  const handleCreate = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const invite = await inviteService.createInvite(boardId, user.uid, role);
      setInvites((prev) => [invite, ...prev]);
      await copy(invite.token);
    } catch (err: any) {
      setError(err.message || "Failed to create invite link");
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (token: string) => {
    setError(null);
    try {
      await inviteService.revokeInvite(token);
      setInvites((prev) => prev.filter((i) => i.token !== token));
    } catch (err: any) {
      setError(err.message || "Failed to revoke invite link");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Share2 className="h-4 w-4" />
          Share
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-sans">Share Board</DialogTitle>
          <DialogDescription className="font-serif">
            Create a single-use invite link, valid for 7 days. Anyone you send
            it to joins this board with the role you pick once they sign in.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          {error && (
            <div
              role="alert"
              className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
            >
              {error}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div
              role="radiogroup"
              aria-label="Role for invited person"
              className="flex gap-1"
            >
              {(["editor", "viewer"] as const).map((r) => (
                <Button
                  key={r}
                  type="button"
                  role="radio"
                  aria-checked={role === r}
                  size="sm"
                  variant={role === r ? "default" : "outline"}
                  onClick={() => setRole(r)}
                >
                  {r === "editor" ? "Editor" : "Viewer"}
                </Button>
              ))}
            </div>
            <Button type="button" onClick={handleCreate} disabled={loading}>
              {loading ? "Creating..." : "Create invite link"}
            </Button>
          </div>

          <div className="grid gap-2">
            <h3 className="text-sm font-semibold font-sans">
              Pending invite links
            </h3>
            {invites.length === 0 ? (
              <p className="text-sm text-muted-foreground font-serif">
                No pending links.
              </p>
            ) : (
              <ul className="grid gap-2">
                {invites.map((invite) => (
                  <li
                    key={invite.token}
                    className="flex items-center justify-between gap-2 rounded-md border p-2 text-sm"
                  >
                    <span className="font-serif">
                      <span className="font-semibold capitalize">
                        {invite.role}
                      </span>{" "}
                      <span className="text-muted-foreground">
                        - expires {invite.expiresAt.toLocaleDateString()}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => copy(invite.token)}
                      >
                        <Copy className="h-3 w-3" />
                        Copy link
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleRevoke(invite.token)}
                      >
                        Revoke
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
