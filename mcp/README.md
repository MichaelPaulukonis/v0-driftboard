# Driftboard MCP

A local [MCP](https://modelcontextprotocol.io) server that lets Claude (or any MCP client) read and (optionally) change your Driftboard boards, lists, cards, and comments. Status: read tools working; write tools opt-in - see [read plan](../docs/plans/10.mcp-read-access.md) and [write plan](../docs/plans/11.mcp-write-tools.md).

## How it works

- Runs locally over stdio and signs in as you with email/password. Firestore security rules decide what it can read, exactly as they do for the browser - no service account, no Admin SDK.
- Tools talk only to the `DriftboardReader` interface (`reader.ts`). The current implementation (`firebase-reader.ts`) wraps the existing service layer (`lib/firebase-service.ts`); a future HTTP-backed implementation can replace it without changing the tools.
- Read-only unless `DRIFTBOARD_MCP_WRITE=1`. Write tools go through `DriftboardWriter` (`writer.ts`), which checks your role on the board (`lib/permissions.ts`) and stamps `source: "mcp"` on the history and activity entries it writes.

## Setup (macOS)

1. Store your Driftboard password in the Keychain. `-w` with no value prompts for it, so it never lands in shell history; your login email (`-a`) is only the lookup key the server uses to find it:

   ```bash
   security add-generic-password -s driftboard-mcp -a you@example.com -w
   ```

2. Register the server with Claude Code (user scope, so it's available in every project). Run this as one command from anywhere - it `cd`s to the repo so `$PWD` expands to absolute paths. Firebase config comes from the repo's `.env.local`:

   ```bash
   cd ~/projects/v0-driftboard && claude mcp add driftboard --scope user -e DRIFTBOARD_EMAIL=you@example.com -- \
     "$PWD/node_modules/.bin/tsx" --tsconfig "$PWD/tsconfig.json" --env-file="$PWD/.env.local" "$PWD/mcp/server.ts"
   ```

   To enable write tools, add `-e DRIFTBOARD_MCP_WRITE=1` after the email `-e`:

   ```bash
   cd ~/projects/v0-driftboard && claude mcp add driftboard --scope user -e DRIFTBOARD_EMAIL=you@example.com -e DRIFTBOARD_MCP_WRITE=1 -- \
     "$PWD/node_modules/.bin/tsx" --tsconfig "$PWD/tsconfig.json" --env-file="$PWD/.env.local" "$PWD/mcp/server.ts"
   ```

   To switch modes, `claude mcp remove driftboard --scope user` and add it again. The server logs `(read + write)` or `(read-only)` to stderr on startup.

   Keep the space before `--`: everything after it is the server command, so `you@example.com--` makes `claude mcp add` choke on `--tsconfig`.

3. Check it with `claude mcp get driftboard` - the command and args should be absolute paths (a bare `/node_modules/.bin/tsx` means the paths expanded empty, which fails with `ENOENT`). `/mcp` inside a session reconnects.

`DRIFTBOARD_PASSWORD` in the environment overrides the Keychain (handy for the emulator and `dev` seed accounts).

### Dev project (`driftboard-dev`) and local emulator

To test MCP read/write tools against the `dev` Firebase project (`driftboard-backend`, seeded via `pnpm seed:dev`) without touching `prod`, register a second `driftboard-dev` server entry pointing `--env-file` at `.env.dev`:

```bash
security add-generic-password -s driftboard-mcp -a owner@example.test -w "pw-driftboard-seed-2026"
cd ~/projects/v0-driftboard && claude mcp add driftboard-dev --scope user -e DRIFTBOARD_EMAIL=owner@example.test -e DRIFTBOARD_MCP_WRITE=1 -- \
  "$PWD/node_modules/.bin/tsx" --tsconfig "$PWD/tsconfig.json" --env-file="$PWD/.env.dev" "$PWD/mcp/server.ts"
```

For local emulator testing, point `--env-file` at a file with `NEXT_PUBLIC_USE_EMULATOR=true` and `NEXT_PUBLIC_FIREBASE_PROJECT_ID=demo-driftboard` (or run `pnpm test:integration`).

## Tools

| Tool           | Returns                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `list_boards`  | Boards you own or are a member of, with your role                                                    |
| `get_board`    | Board with its active lists and cards, in position order                                             |
| `get_card`     | One active, done, or archived card with its comments, if its board and list are visible to you       |
| `search_cards` | Cards whose title or description contains the text, with board and list context (default 50 results) |

### Write tools

Registered only with `DRIFTBOARD_MCP_WRITE=1`. Viewers can't write; owners and editors can, including on shared boards.

| Tool              | Does                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `create_card`     | Add a card to a list (`listId`, `title`, optional `description`); appended at the bottom                     |
| `update_card`     | Change `title` and/or `description` (at least one); an empty description clears it                           |
| `move_card`       | Move an active card to another list on the same board (`listId`, optional `position`; default bottom)        |
| `set_card_status` | Set status to `active`, `done`, or `archived`; restoring to `active` puts the card at the bottom of its list |
| `delete_card`     | Soft delete; Claude Code asks every time (`destructiveHint`)                                                 |
| `add_comment`     | Add a comment to a card (`cardId`, `content`)                                                                |

## Known limits

- **Boards with more than 30 lists fail** in `get_board` and `search_cards` - Firestore caps `in` queries at 30 values (`v0-driftboard-kle`).
- **`get_board` shows active cards only.** Done/archived cards are reachable by id through `get_card`, but not listed.
- **`get_card` does one user lookup per comment** (N+1, `v0-driftboard-m7w`) - slow on busy cards.
- **`search_cards` is a brute-force scan:** it loads every list and card on each board, then matches in memory. Fine for personal-sized data; no index, no ranking.
- **Not-found and no-access look the same.** Deleted cards, missing cards, and cards on deleted lists or boards you can't see (including deleted boards) all return nothing, so the tools don't leak what exists.
- **Writes on shared boards show up for other members under your name.**
- **`delete_card` can't be undone through the tools** (deleted cards are invisible to them); restore from the board's Deleted view.
- **Each write looks up all your boards' lists** to resolve the card (fine for personal-sized data).
- **Local only.** No remote access; the server runs on the machine that holds your credentials.
- **No size limits or pagination** on any query yet (`v0-driftboard-a3v`).

## Roadmap

- [x] stdio server, Keychain sign-in, `claude mcp add` setup (`v0-driftboard-u36.1`)
- [ ] Claude skill for task workflows (`v0-driftboard-u36.2`)
- [ ] Portfolio write-up and demo GIF (`v0-driftboard-u36.3`)
- [ ] Remote MCP/HTTP API with personal access tokens (`v0-driftboard-8fi`, deferred; needs `v0-driftboard-ly3`)
- [ ] Resource limits and pagination (`v0-driftboard-a3v`)
- [x] Card and comment write tools, opt-in ([spec](../docs/superpowers/specs/2026-10-28-mcp-write-tools-design.md))
- [ ] List and board write tools
