require('dotenv').config();

const path = require('node:path');
const { timingSafeEqual } = require('node:crypto');
const express = require('express');
const { createServer } = require('node:http');
const { WebSocket, WebSocketServer } = require('ws');
const { createIdeaStore } = require('./ideas/ideaStore');
const { createBuildQueue } = require('./ideas/buildQueue');
const { createDevAdapter } = require('./chat/devAdapter');

const app = express();
const server = createServer(app);
const websocketServer = new WebSocketServer({ server });
const port = Number(process.env.PORT) || 3000;
const gameDirectory = path.join(__dirname, 'game');
const chatDirectory = path.join(__dirname, 'chat');
const overlayDirectory = path.join(__dirname, 'overlay');
const adminDirectory = path.join(__dirname, 'admin');
const chatMode = String(process.env.CHAT_MODE || 'dev').trim().toLowerCase();
const bannedWords = String(process.env.BANNED_WORDS || '').split(',').map((word) => word.trim()).filter(Boolean);
const ideaStore = createIdeaStore({ additionalBannedWords: bannedWords });
const buildQueue = createBuildQueue();
const adminPassword = String(process.env.ADMIN_PASSWORD || '');

if (!['dev', 'twitch'].includes(chatMode)) {
  throw new Error('CHAT_MODE must be either "dev" or "twitch".');
}

const chatAdapter = chatMode === 'dev'
  ? createDevAdapter()
  : require('./chat/twitchAdapter').createTwitchAdapter({
    channel: process.env.TWITCH_CHANNEL,
    token: process.env.TWITCH_CHAT_TOKEN,
    username: process.env.TWITCH_CHAT_NICK,
    onStatus: (status) => console.log(`[Twitch chat] ${status}`),
  });

function sendJson(socket, message) {
  if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

function broadcastState() {
  const message = { type: 'state', state: getAppState() };
  for (const socket of websocketServer.clients) sendJson(socket, message);
}

function getAppState() {
  return { ...ideaStore.getSnapshot(), buildQueue: buildQueue.getItems() };
}

function requireAdmin(request, response, next) {
  if (!adminPassword) {
    response.status(503).send('Admin is disabled. Set ADMIN_PASSWORD in .env first.');
    return;
  }

  const authorization = request.get('authorization') || '';
  const match = authorization.match(/^Basic\s+(.+)$/i);
  let credentials = '';
  if (match) {
    try {
      credentials = Buffer.from(match[1], 'base64').toString('utf8');
    } catch {
      credentials = '';
    }
  }

  const separator = credentials.indexOf(':');
  const username = separator >= 0 ? credentials.slice(0, separator) : '';
  const password = separator >= 0 ? credentials.slice(separator + 1) : '';
  const expectedPassword = Buffer.from(adminPassword, 'utf8');
  const suppliedPassword = Buffer.from(password, 'utf8');
  const validPassword = suppliedPassword.length === expectedPassword.length
    && timingSafeEqual(suppliedPassword, expectedPassword);

  if (username !== 'admin' || !validPassword) {
    response.set('WWW-Authenticate', 'Basic realm="Chat Ships It Admin"');
    response.status(401).send('Admin username or password is incorrect.');
    return;
  }

  next();
}

function handleChatMessage(message) {
  const result = ideaStore.handleMessage(message);
  if (result?.accepted) broadcastState();
  return result;
}

chatAdapter.start(handleChatMessage);

app.use(express.json({ limit: '16kb' }));
app.use('/admin', requireAdmin);

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
app.get('/admin', (request, response) => {
  response.sendFile(path.join(adminDirectory, 'index.html'));
});
app.get('/admin/api/state', (request, response) => {
  response.set('Cache-Control', 'no-store');
  response.json({ state: getAppState() });
});
app.post('/admin/api/approve', (request, response) => {
  const result = ideaStore.approveIdea(request.body?.ideaId);
  if (!result.accepted) {
    response.status(400).json({ error: result.reason });
    return;
  }

  const item = buildQueue.enqueue(result.idea, result.round);
  broadcastState();
  response.json({ item, state: getAppState() });
});
app.post('/admin/api/reject', (request, response) => {
  const result = ideaStore.rejectIdea(request.body?.ideaId);
  if (!result.accepted) {
    response.status(400).json({ error: result.reason });
    return;
  }

  broadcastState();
  response.json({ idea: result.idea, state: getAppState() });
});
app.post('/admin/api/next-round', (request, response) => {
  const state = ideaStore.nextRound();
  broadcastState();
  response.json({ state: { ...state, buildQueue: buildQueue.getItems() } });
});
app.use('/admin', express.static(adminDirectory));

websocketServer.on('connection', (socket) => {
  sendJson(socket, { type: 'state', state: getAppState() });

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
