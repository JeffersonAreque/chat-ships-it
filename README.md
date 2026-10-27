# Chat Ships It

A small browser game for the Codex x TwitchCon Hackathon. The long-term idea is to let Twitch chat suggest game changes and let the streamer approve what gets built.

## Get it running

1. Install [Node.js](https://nodejs.org/) if you do not already have it.
2. In this project folder, copy `.env.example` to `.env`. Change the Twitch channel name when you are ready to connect chat. The example file contains no secrets.
3. Install the project packages:

   ```sh
   npm install
   ```

4. Start the server:

   ```sh
   npm start
   ```

5. Open <http://localhost:3000/game> in a browser. The root page at <http://localhost:3000> also takes you to the game.

## Play

Move your ship with the arrow keys or **W A S D**. Dodge asteroids to keep your score climbing. After a crash, press **Space** to restart.

## Project map

- `server.js` starts Express and a WebSocket server. The WebSocket connection is only a starting point; chat features come later.
- `game/index.html` is the page and canvas shown at `/game`.
- `game/game.js` contains the game logic. It is the only file future AI game edits should change.
- `.env` is for local settings and secrets. It is ignored by Git; share only `.env.example` with placeholder settings.

Keep game changes in Git commits so you can review them and return to a working version if needed.
