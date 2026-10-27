# Chat Ships It

A small browser game for the Codex x TwitchCon Hackathon. The long-term idea is to let Twitch chat suggest game changes and let the streamer approve what gets built.

## Get it running

1. Install [Node.js](https://nodejs.org/) if you do not already have it.
2. In this project folder, copy `.env.example` to `.env`. Keep `CHAT_MODE=dev` while testing locally, and change `ADMIN_PASSWORD` to a password you choose. Never commit `.env` or put real credentials in `.env.example`.
3. Install the project packages:

   ```sh
   npm install
   ```

4. Start the server:

   ```sh
   npm start
   ```

5. Open these pages in a browser:
   - <http://localhost:3000/game> is the game (also the OBS browser source).
   - <http://localhost:3000/overlay> shows the five most-voted ideas on a transparent background.
   - <http://localhost:3000/dev> lets you send fake chat messages while `CHAT_MODE=dev`.
   - <http://localhost:3000/admin> is the streamer panel. Sign in with username `admin` and the password from `.env`.

Keep `CODEX_MODE=mock` to test safely without using Codex. To use the real CLI, set `CODEX_MODE=real` and make sure `codex` is installed and signed in.

Set `CHAT_MODE=twitch` and `TWITCH_CHANNEL` in `.env` to try Twitch IRC. The adapter can try the requested anonymous `justinfan` login, or use `TWITCH_CHAT_NICK` plus `TWITCH_CHAT_TOKEN` if they are set. Twitch's current IRC docs require a `chat:read` access token, so anonymous login may be rejected.

## Play

Move your ship with the arrow keys or **W A S D**. Dodge asteroids to keep your score climbing. After a crash, press **Space** to restart.

## Project map

- `server.js` starts Express, the WebSocket connection, the selected chat adapter, and the idea board.
- `game/index.html` is the page and canvas shown at `/game`.
- `game/game.js` contains the game logic. It is the only file future AI game edits should change.
- `chat/devAdapter.js` turns messages from the local tester into chat events; `chat/dev.html` and `chat/dev.js` make the `/dev` page.
- `chat/twitchAdapter.js` reads Twitch IRC messages and handles server keepalives; both adapters send `{ user, text }` into the same idea board.
- `ideas/ideaStore.js` handles `!idea`, `!vote`, moderation, and round resets in memory. Idea text is limited to 120 characters, each user can submit once and vote once per round, and case/spacing duplicates merge into the first idea.
- `ideas/buildQueue.js` stores streamer-approved ideas with `waiting`, `building`, `done`, or `failed` statuses.
- `builder/codexRunner.js` claims waiting ideas one at a time. Mock mode changes the ship color; real mode runs `codex exec` in the ignored `runtime/workspace/` with no approvals, workspace-only writes, disabled network access, and a 3-minute timeout.
- `builder/gameValidator.js` syntax-checks each candidate and runs 350 frames with a fake canvas before it can replace the game. A failed build leaves the current game in place.
- `game/reloader.js` listens for a successful build and reloads the `/game` page automatically. Only `game/game.js` is copied back and committed.
- `overlay/index.html` and `overlay/overlay.js` show live ideas, approval credit, and build status for OBS. The background outside the board is transparent.
- `admin/index.html` and `admin/admin.js` make the password-protected `/admin` panel for approving, rejecting, queuing ideas, starting a fresh round, and undoing the last game change.
- `.env` is for local settings and secrets. It is ignored by Git; share only `.env.example` with placeholder settings.

Add extra blocked words as a comma-separated list in `BANNED_WORDS`. The game server has a small built-in starter list too.

The idea board and build queue are in memory, so restarting the server clears them. “Next round” clears current ideas and votes but leaves the build queue intact. Every successful game change and undo is a Git commit; use **Undo last change** in `/admin` to restore the previous game version.
