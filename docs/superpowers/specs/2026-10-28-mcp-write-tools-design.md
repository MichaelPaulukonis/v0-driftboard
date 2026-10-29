# MCP write tools - design

Date: 2026-10-28. Status: approved in brainstorming, pending spec review. Epic: `v0-driftboard-u36`.

## Goal

Let Claude create and triage Driftboard cards from inside a session, against the canonical (prod) Firebase project, as the signed-in user. Local stdio server only; the hosted API with API keys (`v0-driftboard-8fi`) comes later and must reuse the tool layer unchanged.

## Scope

v1 (cards and comments): `create_card`, `update_card`, `move_card`, `set_card_status`, `delete_card`, `add_comment`.

Out of scope: list tools (day 2), board tools (day 3), cross-board moves, hard delete, UI for the `source` marker (`v0-driftboard-41m`), rules hardening for history/activity creates (`v0-driftboard-tg2`).

## Decisions

- **Opt-in:** write tools are registered only when `DRIFTBOARD_MCP_WRITE=1`. Without it the server is read-only, as today.
- **Boards:** writes allowed on any board where the user's role permits the action (owner/editor), including shared boards. Changes on shared boards are visible to other members under the user's name.
- **Delete included:** `delete_card` is a soft delete, restorable from the board's deleted-items view. Marked `destructiveHint` so Claude Code prompts every time. Trade-off accepted: the agent can't see or undo its own deletes (read tools exclude deleted cards); the user restores from the UI.
- **Attribution:** writes stamp `source: "mcp"` on history and activity entries. Not on `_current` docs. No UI change now.

## Architecture

There is no backend: `lib/firebase-service.ts` runs inside whichever client imports it (browser or the MCP process). The MCP never writes history or touches Firestore itself - it calls service functions, which keep `_current` and `history` in sync as they do for the UI.

```
tools.ts  ->  DriftboardWriter (mcp/writer.ts)
                 └─ firebase-writer.ts: resolve board, check permission, call service with source, read back
                       └─ lib/firebase-service.ts (cardService, commentService)
```

- `mcp/writer.ts` - `DriftboardWriter` interface, one method per tool. Mirrors `DriftboardReader`; the reader stays write-free.
- `mcp/firebase-writer.ts` - Firebase-backed implementation. The hosted API swaps in an HTTP-backed writer later.
- `mcp/tools.ts` - registers write tools when a writer is supplied; `server.ts` supplies one only under the flag.

## Service-layer changes

Position logic currently lives in the board page (`app/board/[id]/page.tsx` calls `reorderCards`, which renumbers but writes no history or activity), and `createCard` defaults to position `0`. Move that logic into the service so UI and MCP share it:

- `cardService.moveCard(cardId, userId, listId, position?, options?)` - renumbers active cards in the source and destination lists in one transaction (contiguous `0..n-1`), clamps `position` to the end, omitted `position` = bottom. Writes one history entry (moved card, `subType: "move"`) and one `MOVE_CARD` activity entry. Same-list moves supported.
- `cardService.createCard` - omitted `position` appends at the bottom (count of active cards in the list) instead of `0`.
- `cardService.updateCardStatus` - restoring to `active` appends the card at the bottom of its list.
- Write methods used by the MCP (`createCard`, `updateCard`, `updateCardStatus`, `deleteCard`, `moveCard`, `commentService.createComment`) take an optional `{ source?: "mcp" }`, stored on the history entry and on activity `details`. The UI doesn't pass it.
- Board page drag-and-drop switches from `reorderCards` to `moveCard` for card moves.

## Tools

| Tool              | Args                                           | Behavior                                                             |
| ----------------- | ---------------------------------------------- | -------------------------------------------------------------------- |
| `create_card`     | `listId`, `title`, `description?`              | Appends at the bottom. Returns the new card.                         |
| `update_card`     | `cardId`, `title?`, `description?`             | At least one field required.                                         |
| `move_card`       | `cardId`, `listId`, `position?`                | Same or different list on the same board. Omitted position = bottom. |
| `set_card_status` | `cardId`, `status`: `active`/`done`/`archived` | Restore to `active` appends at the bottom.                           |
| `delete_card`     | `cardId`                                       | Soft delete. `destructiveHint: true`.                                |
| `add_comment`     | `cardId`, `content`                            | Returns the comment.                                                 |

All write tools return the resulting card (or comment) as JSON with ISO dates, like the read tools. Read tools get `readOnlyHint: true`; write tools other than `delete_card` get `destructiveHint: false`.

## Write flow

1. Resolve the board: card -> list -> board (for `move_card`, also the target list's board; refuse if different).
2. `boardService.getBoardRole(boardId, uid)`, then `canPerformAction(role, action)`. Actions: `createCard`, `updateCard` (also `set_card_status`), `moveCard`, `deleteCard`, `addComment`.
3. Call the service method with `{ source: "mcp" }`.
4. Read back and return the result.

The permission check gives clear errors; Firestore rules remain the enforcement layer locally. Under the hosted API (`firebase-admin` bypasses rules), this check becomes the enforcement.

## Errors

| Case                                            | Message                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Card/list/board missing, deleted, or unreadable | `Card <id> not found, or you don't have access.` (same as read tools; no existence leak) |
| Readable but role disallows                     | `Your role on "<board>" (<role>) can't <action>.`                                        |
| Cross-board move                                | `move_card can't move between boards (<a> → <b>).`                                       |
| Rules deny the write (`permission-denied`)      | Same as not-found.                                                                       |
| Anything else                                   | Logged to stderr, returned as a generic tool error.                                      |

## Testing

Unit (Vitest, mocked):

- `cardService.moveCard`: same-list and cross-list renumbering, position clamp, omitted position, single history entry, `source` passthrough. `createCard` default append. `updateCardStatus` restore append.
- `firebase-writer`: board resolution, permission by role (owner/editor allowed, viewer refused), cross-board refusal, not-found and permission-denied map to the same message, `source: "mcp"` stamped.
- `tools.ts`: write tools registered only with a writer, argument validation, tool hints.
- Board page drag-and-drop tests updated for `moveCard`.

Emulator integration: add write cases to `v0-driftboard-u36.4` (viewer write refused, editor write on a shared board allowed, renumbering against real Firestore, `source` on history). Can land after this feature.

Manual: each tool against "Test Board" on prod, then verify in the UI (history, activity log, restore of deleted/archived). Run the drag-and-drop section of `docs/reference/manual-testing-checklist.md`.

## Rollout

- README: write tools, the `DRIFTBOARD_MCP_WRITE` flag, shared-board note.
- Re-register the server with `-e DRIFTBOARD_MCP_WRITE=1`.
- CHANGELOG entry for the drag-and-drop service change (user-facing behavior: moves now write history and activity).

## Risks

- **Drag-and-drop regression** from switching the board page to `moveCard` - covered by updated tests plus the manual checklist.
- **Agent writes to prod by mistake** - opt-in flag, Claude Code permission prompts, soft delete, history with `source` marker.
- **Client-written audit trail** - history is only as trustworthy as the clients (`v0-driftboard-tg2`); a real backend owns it once the hosted API exists.
- **`getBoardCards` 30-list cap** (`v0-driftboard-kle`) - unaffected; write tools operate on single lists.
