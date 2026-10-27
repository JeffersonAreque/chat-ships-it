require('dotenv').config();

const path = require('node:path');
const express = require('express');
const { createServer } = require('node:http');
const { WebSocketServer } = require('ws');

const app = express();
const server = createServer(app);
const websocketServer = new WebSocketServer({ server });
const port = Number(process.env.PORT) || 3000;
const gameDirectory = path.join(__dirname, 'game');

app.get('/', (request, response) => {
  response.redirect('/game');
});

app.get('/game', (request, response) => {
  response.sendFile(path.join(gameDirectory, 'index.html'));
});

app.use('/game', express.static(gameDirectory));

websocketServer.on('connection', (socket) => {
  socket.send(JSON.stringify({ type: 'connected' }));
});

server.listen(port, () => {
  console.log(`Chat Ships It is ready at http://localhost:${port}/game`);
});
