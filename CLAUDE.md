# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Driftboard is a personal Kanban board app (Trello-alternative) built on Next.js 15 (App Router), React 19, TypeScript, and Firebase (Auth + Firestore). Package manager is **pnpm**, enforced by a `preinstall` script (`only-allow pnpm`) — never use npm/yarn.

## Commands

```bash
pnpm dev                    # dev server on http://localhost:3001
pnpm build                  # next build
pnpm start                  # production server
pnpm lint                   # next lint

pnpm test                   # vitest --run --coverage (all unit/component tests)
pnpm test:watch             # vitest --watch --coverage
pnpm test:debug             # vitest --run --inspect --no-file-parallelism
pnpm vitest path/to/file.test.ts   # run a single test file
npx playwright test         # visual/E2E tests (tests/visual), baseURL :3001, auto-starts pnpm dev

pnpm migrate:status         # compiles scripts/ then runs migration status check
pnpm migrate:hybrid         # run hybrid-model migration
pnpm cleanup:old-collections
```

Vitest excludes `tests/**` (Playwright's directory) to avoid `test.describe()` collisions between the two runners — don't add Playwright specs to the Vitest include path or vice versa.

Docker (`./docker.sh prod|dev`, or `docker-compose up`) is the recommended local run path; see `DOCKER_DEV.md` and `docs/reference/docker-setup.md`. `admin-dashboard/` is a separate Metabase-based service (its own docker-compose, own port 3002) for KPI viewing — not part of the main app's build/test pipeline.

## Architecture

### Hybrid Firestore data model

Every core entity (Board, List, Card, Comment) is split across two pieces per document, per `docs/reference/data-model.md`:

- **`{entity}s_current` collection** — live state, read/written by the app. Every doc carries `status` (`active | done | deleted | archived | inactive`), `createdAt/By`, `updatedAt/By`. All active-data queries filter `status: 'active'`.
- **`{entity}s_current/{id}/history` subcollection** — append-only audit trail. Each entry has `changeType` (`create|update|delete|done|restore`) and a full `snapshot` of the parent at that point in time. Firestore security rules deny update/delete on `history` — it's immutable by construction.

Writes that touch both pieces use batched writes/transactions so `_current` and `history` stay in sync atomically.

### Service layer is the only path to Firestore

**`lib/firebase-service.ts`** is the sole place allowed to talk to Firestore (`boardService`, `listService`, `cardService`, `commentService`). UI components must never call Firestore APIs directly — always go through these services. Services accept `userId` explicitly for authorization and convert Firebase types (with `Timestamp`) to plain app types (with `Date`) defined in `lib/types.ts` before returning.

### Shared boards & permissions

Boards can have multiple members via a `board_memberships` collection (`{boardId}_{userId}` composite key, storing `role: owner|editor|viewer`). `lib/permissions.ts` (`canPerformAction(role, action)`) is the single source of truth for what each role can do — check it before adding any board-mutating action rather than hand-rolling role checks. Gated behind `lib/feature-flags.ts` (`ENABLE_SHARED_BOARDS`). Design doc: `docs/design/shared-boards.md`; reference: `docs/reference/shared-boards.md`.

### Drag and drop

Built entirely on `@atlaskit/pragmatic-drag-and-drop` (+ hitbox/closest-edge + drop-indicator packages) — don't introduce another DnD library. `CardItem.tsx` is both a draggable source and a drop target (for card-on-card reordering via closest-edge detection); `ListColumn.tsx` is the drop target that decides in-list reorder vs cross-list move and calls `cardService.moveCard()` / `cardService.reorderCards()`. Full walkthrough: `docs/reference/drag-and-drop.md`.

### Component conventions

- Files: `kebab-case`. Components/Types: `PascalCase`. Variables/functions: `camelCase`.
- Component body order: imports → types/interfaces → component → hooks/state → effects → event handlers → early-return render logic → JSX return.
- All async Firebase-adjacent calls use `async/await` with `try/catch` and detailed error logging in the service layer.

## Planning process (required for non-trivial work)

Before any feature work, architectural change, or significant modification: check `docs/plans/` for an existing relevant plan file first. If one exists, ask whether to update it, create a new one, or proceed without one; if none exists, ask whether to create one or proceed without one — honor whichever the user picks. Not required for PRD creation, doc updates, or minor single-line fixes.

- Naming: `NN.semantic-name.md` under `docs/plans/`.
- Required sections: Problem Statement, Requirements, Technical Approach, Implementation Steps, Testing Strategy, Risks & Mitigation, Dependencies.
- Backlog items live in `docs/plans/0_backlog/` until picked up.
- When a plan's tasks are all done, `git mv` it into `docs/plans/completed/` (preserves history).
- Unless told otherwise, use the Taskmaster MCP server to turn a plan file into discrete tasks (append-only — never delete existing tasks) and `taskmaster generate` to emit individual task files.

PRDs (for larger new features) follow the same `NN.semantic-name.md` convention with sections: Problem Statement & Vision, Target Users & Use Cases, Core Features & Requirements, Success Metrics & Goals, Technical Considerations. Template: `docs/templates/feature-plan-prd.md`.

## Testing notes

- Vitest + jsdom + React Testing Library for unit/component tests; prefer semantic queries (`getByRole`, `getByLabelText`) over test IDs.
- `lib/firebase-service.ts` tests mock Firestore (`vi.importOriginal` pattern) rather than hitting a real backend — include `writeBatch`/`runTransaction` in mocks since the hybrid model depends on them.
- Component tests need `useAuth()` context mocked and any Board/Column context providers wrapped, or they fail with confusing missing-context errors.
- Playwright (`tests/visual/`) covers visual/cross-browser regressions (chromium, Mobile Chrome, Mobile Safari) against a running dev server.
- `docs/reference/testing.md` tracks known suite health/gaps — check it if tests are unexpectedly failing before assuming your change broke them.

## Git workflow specifics for this repo

- Conventional Commits format (`feat(scope): ...`, `fix(scope): ...`, etc.).
- Before committing, evaluate the change against `.github/changelog-management.md` and ask the user whether to add a `CHANGELOG.md` entry (keepachangelog.com format) when the change is user-facing (features, UI, bug fixes, breaking/security changes). Skip asking for internal refactors, tests, build/config, or doc-only changes.

## Key files

- `lib/firebase-service.ts` — all Firestore CRUD, by entity.
- `lib/types.ts` — all TypeScript data models.
- `lib/permissions.ts` — role → allowed-actions map for shared boards.
- `lib/feature-flags.ts` — feature gating.
- `contexts/auth-context.tsx` — `useAuth()` global auth state.
- `firestore.rules` / `firestore.indexes.json` — security rules and composite indexes as code.

<!-- BEGIN BEADS INTEGRATION v:1 profile:minimal hash:970c3bf2 -->

## Beads Issue Tracker

This project uses **bd (beads)** for issue tracking. Run `bd prime` to see full workflow context and commands.

### Quick Reference

```bash
bd ready              # Find available work
bd show <id>          # View issue details
bd update <id> --claim  # Claim work
bd close <id>         # Complete work
```

### Rules

- Use `bd` for ALL task tracking — do NOT use TodoWrite, TaskCreate, or markdown TODO lists
- Run `bd prime` for detailed command reference and session close protocol
- Use `bd remember` for persistent knowledge — do NOT use MEMORY.md files

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md for details and anti-patterns.

## Agent Context Profiles

The managed Beads block is task-tracking guidance, not permission to override repository, user, or orchestrator instructions.

- **Conservative (default)**: Use `bd` for task tracking. Do not run git commits, git pushes, or Dolt remote sync unless explicitly asked. At handoff, report changed files, validation, and suggested next commands.
- **Minimal**: Keep tool instruction files as pointers to `bd prime`; use the same conservative git policy unless active instructions say otherwise.
- **Team-maintainer**: Only when the repository explicitly opts in, agents may close beads, run quality gates, commit, and push as part of session close. A current "do not commit" or "do not push" instruction still wins.

## Session Completion

This protocol applies when ending a Beads implementation workflow. It is subordinate to explicit user, repository, and orchestrator instructions.

1. **File issues for remaining work** - Create beads for anything that needs follow-up
2. **Run quality gates** (if code changed) - Tests, linters, builds
3. **Update issue status** - Close finished work, update in-progress items
4. **Handle git/sync by active profile**:

   ```bash
   # Conservative/minimal/default: report status and proposed commands; wait for approval.
   git status

   # Team-maintainer opt-in only, unless current instructions forbid it:
   git pull --rebase
   bd dolt push
   git push
   git status
   ```

5. **Hand off** - Summarize changes, validation, issue status, and any blocked sync/commit/push step

**Critical rules:**

- Explicit user or orchestrator instructions override this Beads block.
- Do not commit or push without clear authority from the active profile or the current user request.
- If a required sync or push is blocked, stop and report the exact command and error.
<!-- END BEADS INTEGRATION -->
