# Manual Testing Checklist - DriftBoard Smoke Test

Manual checks for what automated tests don't cover yet: real Firebase, drag-and-drop, auth, and multi-user behavior. See [testing.md](./testing.md) for what automation covers.

## When to run

- **Quick smoke (~5 min):** before merging a branch or PR to `main`, and before moving `[Unreleased]` to a version in `CHANGELOG.md`.
- **Full checklist:** before a release, and after changes to auth, drag-and-drop, the data model / Firestore rules, or shared boards. Run only the sections your change touches if a full pass isn't warranted.

**Shrinking this list:** when an automated test covers an item, delete the item and name the test in the "Covered by automation" line for that section. The goal is for this file to get shorter over time.

Log problems as beads (`bd create --type=bug ...`), not in this file.

## Quick smoke

Run with `pnpm dev` in a fresh incognito window, against a dev Firebase project.

- [ ] Sign in; land on the dashboard with your boards listed
- [ ] Create a board, open it, create two lists
- [ ] Create a card; edit its title and description in the detail dialog
- [ ] Add a comment containing a URL; the link is clickable
- [ ] Drag a card within a list, then to the other list; refresh and confirm both moves persisted
- [ ] Mark a card done; find it in the Done view and restore it
- [ ] Delete the test board; sign out and confirm `/board/<id>` no longer loads it
- [ ] Browser console shows no errors throughout

## Full checklist

### Authentication

- [ ] Sign up with a new email/password (min 6 chars) and land on the dashboard
- [ ] Sign out, then sign in with valid credentials
- [ ] Wrong password shows an error, not a blank screen
- [ ] "Forgot your password?" sends a reset email; the link in it resets the password and the new one signs in
- [ ] Signed-out direct access to `/board/<id>` is blocked
- [ ] Session survives browser restart; sign-out clears it

### Dashboard and boards

- [ ] New user sees the empty state
- [ ] Create, edit (title/description), and delete a board
- [ ] Board card click opens the board; browser back returns to the dashboard
- [ ] Export a board and check the file contains its lists, cards, and comments

Covered by automation: `board-card.integration.test.tsx`, `dashboard.integration.test.tsx`, and `create-board-dialog.test.tsx` cover rendering and dialog open/submit against mocked services.

### Lists and cards

- [ ] Create lists; edit a list title inline; delete a list
- [ ] Create cards in several lists; edit and delete cards
- [ ] Card detail dialog: edit title/description, close via X and outside click
- [ ] Empty title is rejected for boards, lists, and cards
- [ ] Very long titles/descriptions and special characters render without breaking layout

### Comments and URL linking

- [ ] Add, edit, and delete comments; the author and timestamp are shown
- [ ] Links open in a new tab; `www.` URLs normalize to `https://`, `localhost` URLs to `http://`

Covered by automation: `card-item-url-linking.test.tsx` and `comment-item-url-linking.test.tsx` cover URL detection and rendering.

### Drag and drop

- [ ] Reorder within a list: to the top, to the bottom, and to the middle
- [ ] Move a card across lists, including into an empty list; try every source/target list pair (first, middle, last)
- [ ] Drag the only card in a list
- [ ] Cancel a drag (drop at origin): nothing changes
- [ ] Fast consecutive drags don't lose or duplicate cards
- [ ] Refresh: all positions persist
- [ ] Touch drag works on a phone

### Done / archived / deleted

- [ ] Mark cards done, archived, and deleted; each disappears from the board
- [ ] Each appears in its view (Done, Archived, Deleted) and restores to its original list
- [ ] Restoring a card whose list was deleted prompts for a new list (reparent)
- [ ] Deleted lists view shows the deleted lists and can restore them

Covered by automation: `view-status-dialog.test.tsx` and `reparent-card-dialog.test.tsx` cover the dialogs against mocked services, but not real persistence.

### History

- [ ] Edit a card several times; the history viewer shows each change with its timestamp and user

### Shared boards (`ENABLE_SHARED_BOARDS` on; needs two accounts)

- [ ] Owner shares a board as editor, and as viewer, with the second account
- [ ] Editor can create, edit, and move cards; viewer can't (no controls, and writes fail)
- [ ] Share indicator shows on shared boards
- [ ] Changes in one session appear in the other without a refresh
- [ ] A non-member can't open the board by URL

### Security

- [ ] User A can't see or open user B's boards (edit the URL / IDs)
- [ ] After sign-out, back-button and cached pages don't expose board data

### Cross-browser, responsive, a11y

- [ ] Chrome, Firefox, Safari (macOS), mobile Safari/Chrome
- [ ] Phone, tablet, and desktop widths: no horizontal scroll, dialogs fit
- [ ] Keyboard-only navigation works; focus indicators are visible
- [ ] Basic screen-reader pass (VoiceOver): dashboard, board, card dialog are announced sensibly
- [ ] Color contrast is sufficient in light and dark themes (DevTools contrast check)
- [ ] Board with 50+ cards loads and drags without noticeable lag
- [ ] Note initial load time for dashboard and board view (DevTools Network/Performance)
- [ ] Extended use (~15 min of edits/drags): JS heap in DevTools Memory doesn't keep climbing

Covered by automation: `tests/visual/card-responsiveness.spec.ts` (Playwright, run manually) covers card layout at desktop and phone widths.

### Error handling

- [ ] Go offline (DevTools) and attempt edits: you see a clear error, and nothing is silently lost
- [ ] Back online: operations work again

### Cleanup

- [ ] Delete test boards and the second test account's data
