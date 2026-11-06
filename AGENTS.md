# AGENTS.md

Shared rulebook for every coding agent in this repo (Claude Code, Codex, Antigravity). Edit only this file. Keep it under 12,000 characters.

## Start of Session

1. Run `bd prime` before touching anything. Claude Code does this via hook; other agents must run it themselves.
2. `bd ready`, pick a bead, `bd update <id> --claim`.

## Before You Stop (Handoff)

Always, even mid-task, leave a note on the bead you worked:

```bash
bd update <id> --append-notes "DONE: ... / NOT DONE: ... / NEXT: ..."
```

Use `--append-notes`, never `--notes` (it silently replaces). Questions for the maintainer go in the same note, prefixed `QUESTION:`.

## Decisions

Settled choices are stored as `bd remember --key decision-<slug> "..."` and show up in `bd prime`. Never change or `bd forget` a `decision-*` memory. If you disagree, say so in your handoff note and keep following it.

## Concurrency

One agent per working tree at a time. `--claim` locks a task, not files. Parallel work needs a separate git worktree.

## Git Profile: Team-Maintainer

This repo opts into the `team-maintainer` profile (sole maintainer). Agents may close beads, commit, and push (`git push`, `bd dolt push`) at session close. A "don't commit" or "don't push" instruction in the current session still wins. Never force-push.

## Project Overview

Driftboard is a personal Kanban board app (Trello-alternative) built on Next.js 15 (App Router), React 19, TypeScript, and Firebase (Auth + Firestore). Package manager is **pnpm**, enforced by `preinstall` (`only-allow pnpm`) - never use npm/yarn.

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

Vitest excludes `tests/**` (Playwright's directory) to avoid `test.describe()` collisions between the two runners - don't add Playwright specs to the Vitest include path or vice versa.

Docker (`./docker.sh prod|dev`, or `docker-compose up`) is the recommended local run path; see `DOCKER_DEV.md` and `docs/reference/docker-setup.md`. `admin-dashboard/` is a separate Metabase service (own docker-compose, port 3002) for KPI viewing - not part of the main build/test pipeline.

## Architecture

### Hybrid Firestore data model

Every core entity (Board, List, Card, Comment) is split across two pieces per document (`docs/reference/data-model.md`):

- **`{entity}s_current` collection** - live state, read/written by the app. Every doc carries `status` (`active | done | deleted | archived | inactive`), `createdAt/By`, `updatedAt/By`. Active queries filter `status: 'active'`.
- **`{entity}s_current/{id}/history` subcollection** - append-only audit trail. Each entry has `changeType` (`create|update|delete|done|restore`) and a full `snapshot` of the parent. Firestore rules deny update/delete on `history`.

Writes touching both pieces use batched writes/transactions so `_current` and `history` stay in sync atomically.

### Service layer is the only path to Firestore

**`lib/firebase-service.ts`** is the sole place allowed to talk to Firestore (`boardService`, `listService`, `cardService`, `commentService`). UI components must never call Firestore APIs directly. Services accept `userId` explicitly for authorization and convert Firebase `Timestamp` types to app `Date` types (`lib/types.ts`).

### Shared boards & permissions

Boards support multiple members via `board_memberships` (`{boardId}_{userId}` composite key, `role: owner|editor|viewer`). `lib/permissions.ts` (`canPerformAction(role, action)`) is the single source of truth for role permissions - check it before adding board-mutating actions. Gated behind `lib/feature-flags.ts` (`ENABLE_SHARED_BOARDS`). Docs: `docs/design/shared-boards.md`, `docs/reference/shared-boards.md`.

### Drag and drop

Built on `@atlaskit/pragmatic-drag-and-drop` (+ hitbox/closest-edge + drop-indicator) - don't add another DnD library. `CardItem.tsx` is both draggable source and drop target (closest-edge card reordering); `ListColumn.tsx` handles in-list reorder vs cross-list move via `cardService.moveCard()` / `cardService.reorderCards()`. See `docs/reference/drag-and-drop.md`.

### Component conventions

- Files: `kebab-case`. Components/Types: `PascalCase`. Variables/functions: `camelCase`.
- Component body order: imports -> types/interfaces -> component -> hooks/state -> effects -> event handlers -> early-return render logic -> JSX return.
- Async Firebase-adjacent calls use `async/await` with `try/catch` and detailed error logging in the service layer.
- Semantic HTML and WCAG 2.1 AA accessibility compliance.
- Prettier (`prettier --write` with v3 defaults, no `.prettierrc`) runs on staged files via Husky + `lint-staged`.

## Planning process (required for non-trivial work)

Before feature work, architectural changes, or significant modifications: check `docs/plans/` for an existing plan first. Ask whether to update/create one or proceed without one - honor the user's choice. Not required for PRDs, doc updates, or minor fixes.

- Naming: `NN.semantic-name.md` under `docs/plans/`.
- Required sections: Problem Statement, Requirements, Technical Approach, Implementation Steps, Testing Strategy, Risks & Mitigation, Dependencies.
- Backlog items live in `docs/plans/0_backlog/` until picked up; completed plans move via `git mv` to `docs/plans/completed/`.
- Unless told otherwise, use the Taskmaster MCP server to turn a plan into tasks (append-only) and `taskmaster generate` to emit task files.

PRDs follow `NN.semantic-name.md` with sections: Problem Statement & Vision, Target Users & Use Cases, Core Features & Requirements, Success Metrics & Goals, Technical Considerations (`docs/templates/feature-plan-prd.md`).

## Testing notes

- Vitest + jsdom + React Testing Library for unit/component tests; prefer semantic queries (`getByRole`, `getByLabelText`) over test IDs.
- `lib/firebase-service.ts` tests mock Firestore (`vi.importOriginal`) - include `writeBatch`/`runTransaction` in mocks.
- Component tests need `useAuth()` mocked and Board/Column context providers wrapped.
- Playwright (`tests/visual/`) covers visual/cross-browser regressions against a running dev server.
- Check `docs/reference/testing.md` for known suite gaps before assuming your change broke a test.

## Git workflow specifics for this repo

- Conventional Commits (`feat(scope): ...`, `fix(scope): ...`, etc.).
- Before committing, check `.github/changelog-management.md` and ask whether to add a `CHANGELOG.md` entry for user-facing changes (skip for internal refactors, tests, build/config, or docs).
- Before merging to `main` or cutting a release, remind the user to run the Quick smoke in `docs/reference/manual-testing-checklist.md` (or full sections for auth, DnD, data model/rules, or shared boards). Remove checklist items made redundant by new automated tests.
- **Beads data is public.** Beads syncs to `refs/dolt/data` on GitHub, so issues and `bd remember` entries are public on `bd dolt push`. Never put emails, account names, credentials, or personal data in beads - describe patterns generically and keep specifics in local memory.

## Key files

- `lib/firebase-service.ts` - all Firestore CRUD, by entity.
- `lib/types.ts` - all TypeScript data models.
- `lib/permissions.ts` - role -> allowed-actions map for shared boards.
- `lib/feature-flags.ts` - feature gating.
- `contexts/auth-context.tsx` - `useAuth()` global auth state.
- `firestore.rules` / `firestore.indexes.json` - security rules and composite indexes as code.

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

**Architecture in one line:** issues live in a local Dolt DB; sync uses `refs/dolt/data` on your git remote; `.beads/issues.jsonl` is a passive export. See <https://github.com/gastownhall/beads/blob/main/docs/SYNC_CONCEPTS.md> for details and anti-patterns.

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
