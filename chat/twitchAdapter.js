const { WebSocket } = require('ws');

const TWITCH_IRC_URL = 'wss://irc-ws.chat.twitch.tv:443';

function decodeTag(value) {
  return value.replace(/\\([snr:\\])/g, (match, escaped) => {
    if (escaped === 's') return ' ';
    if (escaped === 'n') return '\n';
    if (escaped === 'r') return '\r';
    return escaped;
  });
}

function parseTags(rawTags = '') {
  return Object.fromEntries(rawTags.split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator === -1) return [part, ''];
    return [part.slice(0, separator), decodeTag(part.slice(separator + 1))];
  }));
}

function createTwitchAdapter({ channel, token = '', username = '', onStatus = () => {}, WebSocketImpl = WebSocket } = {}) {
  const cleanChannel = String(channel || '').trim().replace(/^#/, '').toLowerCase();
  const cleanToken = String(token || '').trim().replace(/^oauth:/i, '');
  const cleanUsername = String(username || '').trim().replace(/^@/, '').toLowerCase();
  let onMessage = null;
  let socket = null;
  let reconnectTimer = null;
  let messageStatsTimer = null;
  let receivedMessageCount = 0;
  let stopped = true;
  let reconnectDelay = 1000;

  function status(text) {
    onStatus(text);
  }

  function connect() {
    if (stopped) return;
    if (!/^[a-z0-9_]{1,25}$/.test(cleanChannel)) {
      status('Set a valid TWITCH_CHANNEL in .env before connecting.');
      return;
    }
    if (cleanToken && !/^[a-z0-9_]{1,25}$/.test(cleanUsername)) {
      status('Set TWITCH_CHAT_NICK to the login name for TWITCH_CHAT_TOKEN.');
      return;
    }

    const login = cleanToken ? cleanUsername : `justinfan${Math.floor(10000 + Math.random() * 90000)}`;
    socket = new WebSocketImpl(TWITCH_IRC_URL);

    socket.on('open', () => {
      socket.send(`PASS ${cleanToken ? `oauth:${cleanToken}` : 'SCHMOOPIIE'}\r\n`);
      socket.send(`NICK ${login}\r\n`);
      socket.send('CAP REQ :twitch.tv/tags twitch.tv/commands\r\n');
      socket.send(`JOIN #${cleanChannel}\r\n`);
      status(cleanToken
        ? `Connected to Twitch IRC; joining #${cleanChannel}.`
        : `Connecting anonymously to Twitch IRC on #${cleanChannel}.`);
    });

    socket.on('message', (data) => {
      const lines = data.toString().split(/\r?\n/).filter(Boolean);
      for (const line of lines) {
        if (line.startsWith('PING ')) {
          const pingPayload = line.slice(5);
          if (socket.readyState === WebSocket.OPEN) socket.send(`PONG ${pingPayload}\r\n`);
          continue;
        }

        if (line.startsWith('RECONNECT')) {
          status('Twitch asked to reconnect.');
          socket.close();
          continue;
        }

        if (line.includes(' 001 ')) {
          reconnectDelay = 1000;
          status(`Joined Twitch IRC as ${login}; listening to #${cleanChannel}.`);
          continue;
        }

        if (line.includes(' NOTICE * :')) {
          const notice = line.split(' NOTICE * :').pop();
          status(`Twitch notice: ${notice}`);
          if (/authentication failed|login authentication/i.test(notice)) {
            stopped = true;
            socket.close();
          }
          continue;
        }

        const message = line.match(/^(?:@([^ ]+) )?:([^! ]+)!([^ ]+) PRIVMSG #([^ ]+) :(.*)$/);
        if (!message || !onMessage || message[4].toLowerCase() !== cleanChannel) continue;

        const tags = parseTags(message[1]);
        receivedMessageCount += 1;
        onMessage({ user: tags['display-name'] || message[2], text: message[5] });
      }
    });

    socket.on('error', (error) => {
      status(`Twitch chat connection error: ${error.message}`);
    });

    socket.on('close', () => {
      socket = null;
      if (stopped) return;
      status(`Disconnected from Twitch chat; reconnecting in ${Math.ceil(reconnectDelay / 1000)}s.`);
      reconnectTimer = setTimeout(connect, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 2, 30000);
    });
  }

  return {
    start(messageHandler) {
      if (stopped) {
        stopped = false;
        onMessage = messageHandler;
        messageStatsTimer = setInterval(() => {
          status(`received ${receivedMessageCount} messages in the last 30s`);
          receivedMessageCount = 0;
        }, 30000);
        messageStatsTimer.unref?.();
        connect();
      }
    },

    stop() {
      stopped = true;
      onMessage = null;
      clearTimeout(reconnectTimer);
      clearInterval(messageStatsTimer);
      reconnectTimer = null;
      messageStatsTimer = null;
      if (socket) {
        const currentSocket = socket;
        socket = null;
        currentSocket.close();
      }
    },
  };
}

module.exports = { createTwitchAdapter, parseTags };
