require('dotenv').config();

const path = require('node:path');
const express = require('express');
const { createServer } = require('node:http');
const { WebSocket, WebSocketServer } = require('ws');
const { createIdeaStore } = require('./ideas/ideaStore');
const { createDevAdapter } = require('./chat/devAdapter');

const app = express();
const server = createServer(app);
const websocketServer = new WebSocketServer({ server });
const port = Number(process.env.PORT) || 3000;
const gameDirectory = path.join(__dirname, 'game');
const chatDirectory = path.join(__dirname, 'chat');
const overlayDirectory = path.join(__dirname, 'overlay');
const chatMode = String(process.env.CHAT_MODE || 'dev').trim().toLowerCase();
const bannedWords = String(process.env.BANNED_WORDS || '').split(',').map((word) => word.trim()).filter(Boolean);
const ideaStore = createIdeaStore({ additionalBannedWords: bannedWords });

if (!['dev', 'twitch'].includes(chatMode)) {
  throw new Error('CHAT_MODE must be either "dev" or "twitch".');
}

const chatAdapter = chatMode === 'dev'
  ? createDevAdapter()
  : require('./chat/twitchAdapter').createTwitchAdapter({
    channel: process.env.TWITCH_CHANNEL,
    onStatus: (status) => console.log(`[Twitch chat] ${status}`),
  });

function sendJson(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcastState() {
  const message = { type: 'state', state: ideaStore.getSnapshot() };
  for (const socket of websocketServer.clients) sendJson(socket, message);
}

function handleChatMessage(message) {
  const result = ideaStore.handleMessage(message);
  if (result?.accepted) broadcastState();
  return result;
}

chatAdapter.start(handleChatMessage);

app.get('/', (request, response) => {
  response.redirect('/game');
});

app.get('/game', (request, response) => {
  response.sendFile(path.join(gameDirectory, 'index.html'));
});

app.use('/game', express.static(gameDirectory));
app.get('/overlay', (request, response) => {
  response.sendFile(path.join(overlayDirectory, 'index.html'));
});
app.use('/overlay', express.static(overlayDirectory));
app.get('/dev', (request, response) => {
  if (chatMode !== 'dev') {
    response.status(404).send('The local chat tester is available when CHAT_MODE=dev.');
    return;
  }
  response.sendFile(path.join(chatDirectory, 'dev.html'));
});
app.use('/chat', express.static(chatDirectory));

websocketServer.on('connection', (socket) => {
  sendJson(socket, { type: 'state', state: ideaStore.getSnapshot() });

  socket.on('message', (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch {
      sendJson(socket, { type: 'error', message: 'Send a valid JSON message.' });
      return;
    }

    if (chatMode !== 'dev' || message.type !== 'chat') {
      sendJson(socket, { type: 'error', message: 'This WebSocket connection does not accept chat input.' });
      return;
    }

    const submission = chatAdapter.submitMessage({ user: message.user, text: message.text });
    sendJson(socket, {
      type: 'chat-result',
      user: String(message.user || '').trim().replace(/^@/, ''),
      text: String(message.text || '').trim(),
      result: submission.result || null,
      error: submission.accepted ? null : submission.reason,
    });
  });
});

server.on('close', () => chatAdapter.stop?.());

server.listen(port, () => {
  console.log(`Chat Ships It is ready at http://localhost:${port}/game`);
});
