# Chat Ships It

A small browser game for the Codex x TwitchCon Hackathon. The long-term idea is to let Twitch chat suggest game changes and let the streamer approve what gets built.

## Get it running

1. Install [Node.js](https://nodejs.org/) if you do not already have it.
2. In this project folder, copy `.env.example` to `.env`. Keep `CHAT_MODE=dev` while testing locally. The example file contains no secrets.
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

## Play

Move your ship with the arrow keys or **W A S D**. Dodge asteroids to keep your score climbing. After a crash, press **Space** to restart.

## Project map

- `server.js` starts Express, the WebSocket connection, the selected chat adapter, and the idea board.
- `game/index.html` is the page and canvas shown at `/game`.
- `game/game.js` contains the game logic. It is the only file future AI game edits should change.
- `chat/devAdapter.js` turns messages from the local tester into chat events; `chat/dev.html` and `chat/dev.js` make the `/dev` page.
- `ideas/ideaStore.js` handles `!idea` and `!vote` in memory. Idea text is limited to 120 characters, each user can submit once and vote once per server run, and case/spacing duplicates merge into the first idea.
- `overlay/index.html` and `overlay/overlay.js` show live idea and vote updates for OBS. The background outside the board is transparent.
- `.env` is for local settings and secrets. It is ignored by Git; share only `.env.example` with placeholder settings.

Add extra blocked words as a comma-separated list in `BANNED_WORDS`. The game server has a small built-in starter list too.

The idea board is in memory, so restarting the server starts a fresh voting round. Keep game changes in Git commits so you can review them and return to a working version if needed.
