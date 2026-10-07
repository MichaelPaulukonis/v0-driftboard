// Public profile: the only user data other signed-in users can read (profiles/{uid}).
// Email is deliberately excluded - it stays in the owner-only users/{uid} doc.
export const MAX_PROFILE_NAME_LENGTH = 100;

/** Display name, else the part of the email before the "@", else "User". */
export function getProfileName(
  displayName?: string | null,
  email?: string | null,
): string {
  const name = displayName?.trim() || email?.split("@")[0]?.trim() || "User";
  return name.slice(0, MAX_PROFILE_NAME_LENGTH);
}
