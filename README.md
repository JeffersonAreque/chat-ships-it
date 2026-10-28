# Chat Ships It

A Twitch stream mini-game where viewers suggest changes and the streamer chooses which idea Codex builds.

**Preview:** Add a screenshot or short GIF of the game and stream overlay here.

## How it works

1. Viewers send `!idea <change>` in Twitch chat, or use `/dev` to test with fake chat.
2. Viewers vote with `!vote <number>`. The overlay shows the active ideas and live vote counts.
3. The streamer reviews the board in `/admin` and approves or rejects ideas. Nothing is built without approval.
4. An approved idea enters the queue. In real mode, Codex works in an isolated, temporary workspace containing only `game.js`.
5. The server validates the candidate JavaScript and runs it for 350 frames with a fake canvas before applying it.
6. A validation failure gets one retry with the validator message. If the retry fails, the existing game stays in place.
7. A passing `game/game.js` is committed to Git. The game hot-reloads and shows a shipped toast and viewer credit.
8. The streamer can use **Undo last change** to restore the previous game version or **Reset demo** to restore the starter game and clear the board and credits.

## Pages

- `/game` — playable canvas game and OBS browser source. Use `/game?autopilot=1` when OBS should show the ship dodging and restarting without keyboard input.
- `/overlay` — transparent chat idea board, vote totals, and build updates for OBS.
- `/admin` — password-protected streamer controls, build queue, errors, undo, and demo reset.
- `/dev` — local fake-chat tester, available when `CHAT_MODE=dev`.

## Requirements

- Node.js 20 or newer.
- Git, for build commits and undo.
- Codex CLI installed and signed in only if you choose `CODEX_MODE=real`.

## Setup

1. Copy `.env.example` to `.env` and set `ADMIN_PASSWORD` to a private password. `.env` is ignored by Git; keep real credentials there and never commit it.
2. Install dependencies with `npm install`.
3. Start the server with `npm start`.
4. Open <http://localhost:3000/game>. The streamer panel is at <http://localhost:3000/admin>; sign in as `admin` with the password from `.env`.
5. Keep `CHAT_MODE=dev` and `CODEX_MODE=mock` for a local demo. Open `/dev`, send an idea, vote, then approve it in `/admin`.
6. To read Twitch chat, set `CHAT_MODE=twitch` and `TWITCH_CHANNEL` to the channel login (without `#`). The reader uses Twitch IRC over WebSocket with a generated anonymous `justinfanXXXXX` nickname; no Twitch credentials are needed. Anonymous join and message reception have been tested. The adapter only reads and does not send chat messages. Optional `TWITCH_CHAT_NICK` and `TWITCH_CHAT_TOKEN` settings are available if you later choose authenticated IRC access.
7. To use Codex for approved builds, set `CODEX_MODE=real`. Install and sign in to the Codex CLI first. `CODEX_MODE=mock` is the default and uses a harmless scripted change instead.

Run the test suite with `npm test`.

## Configuration

All settings are listed in `.env.example`:

- `PORT` selects the local web server port.
- `CHAT_MODE=dev|twitch` selects the fake-chat or Twitch IRC adapter.
- `TWITCH_CHANNEL` is the channel login. `TWITCH_CHAT_NICK` and `TWITCH_CHAT_TOKEN` are optional and should be empty for anonymous read-only mode.
- `CODEX_MODE=mock|real` selects the mock change or Codex CLI build.
- `CODEX_CLI` optionally names a Codex executable; leave it empty to use `codex` from `PATH`.
- `ADMIN_PASSWORD` protects the streamer routes.
- `BANNED_WORDS` adds comma-separated blocked words to the built-in filter.

## Safety model

- Chat suggestions are untrusted text. The idea board enforces a 120-character limit, a built-in and configurable banned-words filter, one active idea per user, and one vote per user per round. Duplicate ideas are merged. These are per-round limits, not a timed cooldown.
- Only the streamer can approve an idea. Approving adds it to the build queue; it does not execute the viewer's text as a command.
- Real Codex builds start from a clean ignored `runtime/workspace/` containing only a copy of `game.js`. The CLI gets workspace-only write access, network access is disabled, approvals are disabled inside that sandbox, MCP servers are disabled, and each invocation times out after three minutes.
- The Codex prompt says to edit only `game.js` and treats the viewer idea as a feature request, not instructions. The server rejects extra workspace files and validates the candidate before applying it.
- `game/game.js` is the only project source file the runtime builder applies or commits. A failure keeps the previous game. Every successful change is a Git commit; admin undo creates a Git commit restoring the prior version.
- `.env`, temporary workspace files, and runtime credits are ignored. Keep secrets out of source files and screenshots. If hosting the app beyond your own machine, serve it over HTTPS and protect `/admin` with a strong password.

## Project map

- `server.js` starts Express, WebSockets, the chat adapter, and the game builder.
- `chat/` contains the shared chat adapter implementations and local tester.
- `ideas/` handles submissions, votes, moderation, and the in-memory build queue.
- `builder/` runs Codex in the sandbox and validates game changes.
- `game/game.js` is the canvas game code; it is the only file the runtime AI builder may edit.
- `credits/` stores viewer credits outside the game code; runtime data is kept under ignored `runtime/`.
- `overlay/` and `admin/` contain the OBS overlay and streamer panel.

## License

This project is available under the MIT License. See [LICENSE](LICENSE).
