# Testing

How Driftboard is tested today, where the shared test plumbing lives, and what's known to be missing. Open testing work is tracked in beads (`bd list --label testing`), not in this file.

## Current status

As of 2026-09-22 (`pnpm test`):

- **Vitest:** 12 files, 101 tests, all passing, ~14s wall time.
- **Coverage:** ~41.5% lines overall. `lib/firebase-service.ts` is the best-covered module; most components are untested (see [Known gaps](#known-gaps)).
- **Playwright:** 1 visual spec (`tests/visual/card-responsiveness.spec.ts`), run manually, not in CI.

If tests fail unexpectedly, re-run on a clean `main` before assuming your change broke them, and update this section if the baseline has moved.

## Commands

```bash
pnpm test                             # vitest --run --coverage (all unit/component tests)
pnpm test:watch                       # watch mode
pnpm test:debug                       # --inspect, no file parallelism
pnpm vitest path/to/file.test.ts      # single file
npx playwright test                   # visual tests; auto-starts pnpm dev on :3001
npx playwright test --update-snapshots  # re-baseline after an intended visual change
```

## Layout

| Where                                   | Runner       | What                                                  |
| --------------------------------------- | ------------ | ----------------------------------------------------- |
| `lib/__tests__/*.test.ts`               | Vitest       | Service layer (`firebase-service`), `utils`, `export` |
| `components/__tests__/*.test.tsx`       | Vitest + RTL | Component and integration tests                       |
| `tests/visual/*.spec.ts`                | Playwright   | Visual regression (chromium, Pixel 5, iPhone 12)      |
| `app/test-visuals/card-layout/page.tsx` | -            | Static fixture page the visual spec screenshots       |

Vitest excludes `tests/**` so the two runners never pick up each other's files. Keep Playwright specs under `tests/` and Vitest tests in `__tests__/` directories.

Existing component tests: `board-card` and `dashboard` (integration), `card-detail-dialog`, `create-board-dialog`, `create-list-dialog`, `reparent-card-dialog`, `view-status-dialog`, plus URL-linking tests for `card-item` and `comment-item`.

## Shared setup

### `vitest.setup.ts` (runs before every test file)

- Loads `@testing-library/jest-dom` matchers.
- Polyfills `hasPointerCapture` / `setPointerCapture` / `releasePointerCapture`, which Radix UI needs and jsdom lacks.
- Globally mocks `@/contexts/auth-context` so `useAuth()` returns a signed-in `mockUser` (`uid: "test-user-id"`). Override per test with `vi.mocked(useAuth).mockReturnValue(...)`, e.g. `{ user: null, loading: false }` for signed-out cases.
- Globally mocks `firebase/app`, `firebase/auth`, and `firebase/firestore`. The Firestore mock uses the `importOriginal` pattern and includes `writeBatch` and `runTransaction`, since the hybrid `_current` + `history` model depends on them.

### `lib/__tests__/test-utils.tsx`

- `renderWithProviders(ui, { boardContextValue?, columnContextValue? })` - `render` wrapped in mock Board and Column context providers. Use it for anything under a board (cards, lists, dialogs opened from them); without it, you'll get confusing missing-context errors.
- `MockBoardProvider`, `MockColumnProvider`, `TestWrapper` - the pieces, if you need a custom wrapper.
- Re-exports all of `@testing-library/react`, with `render` aliased to `renderWithProviders`.

## Patterns

- **Components:** mock the service calls the component makes (`vi.mock("@/lib/firebase-service")`), not Firestore. Use semantic queries (`getByRole`, `getByLabelText`) over test IDs, and `userEvent` for interactions.
- **Service layer:** `firebase-service.test.ts` replaces the global Firestore mock with its own full mock (auto-generating doc IDs like Firestore does) and sets return values per test. Service methods take an explicit `userId`, so tests must pass one.
- **Visual:** the Playwright spec targets the static fixture page, not a live board, so it doesn't need auth or Firebase. Add new visual cases to that page, or add another fixture page under `app/test-visuals/`.

## Automation

- **CI** (`.github/workflows/ci.yml`): runs `pnpm test` on push and PR to `main`, then uploads coverage to Codecov (non-blocking). Lint, build, and Playwright are **not** in CI.
- **Pre-commit** (`.husky/pre-commit`): runs `lint-staged`, which only runs Prettier. It does **not** run tests.
- **Manual:** before a release or after changes to auth, drag-and-drop, or the data model, run the [manual smoke-test checklist](./manual-testing-checklist.md).

## Known gaps

- **Untested components:** `list-column`, `card-item` (beyond URL linking), `auth-form`, `create-card-dialog`, `edit-board-dialog`, `edit-card-dialog`, `comment-form`, `comments-section`, `activity-log`, `document-history-viewer`, `view-deleted-lists-dialog`, and the shared-boards UI (`share-board-dialog`, `share-indicator`, `board-access-dialog`).
- **No Firestore security-rules tests** and no emulator-backed tests. Rules correctness is currently unverified by automation.
- **No end-to-end user flows.** Drag-and-drop, auth, and multi-user behavior are covered only by the manual checklist.
- **No coverage thresholds** are enforced.

## Lessons learned

- **Mock `writeBatch` and `runTransaction`.** The hybrid model writes `_current` and `history` atomically, so any Firestore mock without them fails in misleading ways.
- **Mocked `doc()` must auto-generate IDs** when called without one, or code that creates a doc and then references its ID breaks.
- **Don't `require('vitest')` in mocks.** It caused CommonJS/ESM conflicts, and it was the main cause of the October 2025 suite breakage. Use ESM imports and `vi.mock(..., async (importOriginal) => ...)`.
- **Context providers are the usual cause** of failures in otherwise-correct component tests. Reach for `renderWithProviders` first.
- **Keep fixtures in sync with `lib/types.ts`.** The `isDeleted` to `status` migration broke many fixtures silently; typed mocks (`vi.mocked`) catch this.
- **Tests degrade when nothing enforces them.** The suite rotted before CI ran it. Keep CI green and treat a red `main` as a bug.
