"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/auth-context";
import { AuthForm } from "@/components/auth-form";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/loading-spinner";
import { toast } from "@/components/ui/use-toast";
import { inviteService, type Invite } from "@/lib/firebase-service";

type State =
  | { kind: "loading" }
  | { kind: "ready"; invite: Invite }
  | { kind: "invalid"; message: string };

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<State>({ kind: "loading" });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      try {
        const invite = await inviteService.getInvite(token);
        if (cancelled) return;
        if (!invite) {
          setState({
            kind: "invalid",
            message: "This invite link is invalid or has already been used.",
          });
        } else if (invite.expiresAt.getTime() <= Date.now()) {
          setState({
            kind: "invalid",
            message: "This invite link has expired.",
          });
        } else {
          setState({ kind: "ready", invite });
        }
      } catch {
        if (!cancelled)
          setState({
            kind: "invalid",
            message: "This invite link could not be opened.",
          });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, user]);

  const handleJoin = async () => {
    if (!user) return;
    setJoining(true);
    setError(null);
    try {
      const { boardId, alreadyMember } = await inviteService.redeemInvite(
        token,
        user.uid,
      );
      if (alreadyMember) {
        // Toaster lives in the root layout, so this survives the redirect.
        toast({
          title: "You already have access to this board",
          description: "This invite link was not used and is still valid.",
        });
      }
      router.push(`/board/${boardId}`);
    } catch (err: any) {
      setError(err.message || "Could not join this board");
      setJoining(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-foreground font-sans mb-2">
                You&apos;ve been invited to a board
              </h1>
              <p className="text-muted-foreground font-serif">
                Sign in or create an account to accept the invitation.
              </p>
            </div>
            <AuthForm />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full rounded-lg border bg-card p-6 text-center grid gap-4">
        {state.kind === "loading" && <LoadingSpinner size="lg" />}
        {state.kind === "invalid" && (
          <>
            <h1 className="text-xl font-bold font-sans">Invite unavailable</h1>
            <p className="text-muted-foreground font-serif">{state.message}</p>
            <Button onClick={() => router.push("/")}>Go to my boards</Button>
          </>
        )}
        {state.kind === "ready" && (
          <>
            <h1 className="text-xl font-bold font-sans">
              Join this board as{" "}
              {state.invite.role === "editor" ? "an Editor" : "a Viewer"}?
            </h1>
            <p className="text-muted-foreground font-serif">
              Signed in as {user.email}. This link works once and expires on{" "}
              {state.invite.expiresAt.toLocaleDateString()}.
            </p>
            {error && (
              <div
                role="alert"
                className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md"
              >
                {error}
              </div>
            )}
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => router.push("/")}>
                Not now
              </Button>
              <Button onClick={handleJoin} disabled={joining}>
                {joining ? "Joining..." : "Join board"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
