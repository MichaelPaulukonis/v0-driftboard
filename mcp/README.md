# Driftboard MCP (read-only)

A local [MCP](https://modelcontextprotocol.io) server that lets Claude (or any MCP client) read your Driftboard boards, lists, cards, and comments. Status: in progress - see [plan](../docs/plans/10.mcp-read-access.md).

## How it works

- Runs locally over stdio and signs in as you with email/password. Firestore security rules decide what it can read, exactly as they do for the browser - no service account, no Admin SDK.
- Tools talk only to the `DriftboardReader` interface (`reader.ts`). The current implementation (`firebase-reader.ts`) wraps the existing service layer (`lib/firebase-service.ts`); a future HTTP-backed implementation can replace it without changing the tools.
- Read-only by construction: the reader exposes no write methods.

## Setup (macOS)

1. Store your Driftboard password in the Keychain (prompts for it, so it never lands in shell history):

   ```bash
   security add-generic-password -s driftboard-mcp -a you@example.com -w
   ```

2. Register the server with Claude Code (user scope, so it's available in every project). Firebase config comes from the repo's `.env.local`:

   ```bash
   R=~/projects/v0-driftboard
   claude mcp add driftboard --scope user -e DRIFTBOARD_EMAIL=you@example.com -- \
     $R/node_modules/.bin/tsx --tsconfig $R/tsconfig.json --env-file=$R/.env.local $R/mcp/server.ts
   ```

3. Check it with `claude mcp list`, or `/mcp` inside a session.

`DRIFTBOARD_PASSWORD` in the environment overrides the Keychain (handy for the emulator). For local emulator testing, point `--env-file` at a file with `NEXT_PUBLIC_USE_EMULATOR=true` and the demo project id.

## Tools

| Tool           | Returns                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `list_boards`  | Boards you own or are a member of, with your role                                                    |
| `get_board`    | Board with its active lists and cards, in position order                                             |
| `get_card`     | One card (any status except deleted) with its comments                                               |
| `search_cards` | Cards whose title or description contains the text, with board and list context (default 50 results) |

## Known limits

- **Boards with more than 30 lists fail** in `get_board` and `search_cards` - Firestore caps `in` queries at 30 values (`v0-driftboard-kle`).
- **`get_board` shows active cards only.** Done/archived cards are reachable by id through `get_card`, but not listed.
- **`get_card` does one user lookup per comment** (N+1, `v0-driftboard-m7w`) - slow on busy cards.
- **`search_cards` is a brute-force scan:** it loads every list and card on each board, then matches in memory. Fine for personal-sized data; no index, no ranking.
- **Not-found and no-access look the same.** Deleted cards, missing cards, and cards on boards you can't see all return nothing, so the tools don't leak what exists.
- **Read-only is enforced by the tool surface, not by rules.** The signed-in session could write as you; the server just never does.
- **Local only.** No remote access; the server runs on the machine that holds your credentials.
- **No size limits or pagination** on any query yet (`v0-driftboard-a3v`).

## Roadmap

- [ ] stdio server, Keychain sign-in, `claude mcp add` setup (`v0-driftboard-u36.1`)
- [ ] Claude skill for task workflows (`v0-driftboard-u36.2`)
- [ ] Portfolio write-up and demo GIF (`v0-driftboard-u36.3`)
- [ ] Remote MCP/HTTP API with personal access tokens (`v0-driftboard-8fi`, deferred; needs `v0-driftboard-ly3`)
- [ ] Resource limits and pagination (`v0-driftboard-a3v`)
- [ ] Write tools - not planned yet
