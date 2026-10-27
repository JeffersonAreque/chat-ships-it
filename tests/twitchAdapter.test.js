const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const test = require('node:test');
const { createTwitchAdapter } = require('../chat/twitchAdapter');

class FakeWebSocket extends EventEmitter {
  static OPEN = 1;

  constructor(url) {
    super();
    this.url = url;
    this.readyState = FakeWebSocket.OPEN;
    this.sent = [];
    FakeWebSocket.latest = this;
  }

  send(message) { this.sent.push(message); }
  close() {
    this.readyState = 3;
    this.emit('close');
  }
}

test('reads a configured Twitch channel anonymously without credentials', () => {
  const statuses = [];
  const messages = [];
  const adapter = createTwitchAdapter({
    channel: 'Example_Channel',
    onStatus: (status) => statuses.push(status),
    WebSocketImpl: FakeWebSocket,
  });
  adapter.start((message) => messages.push(message));

  const socket = FakeWebSocket.latest;
  socket.emit('open');
  assert.equal(socket.url, 'wss://irc-ws.chat.twitch.tv:443');
  assert.ok(socket.sent.includes('PASS SCHMOOPIIE\r\n'));
  assert.match(socket.sent.find((line) => line.startsWith('NICK ')), /^NICK justinfan\d{5}\r\n$/);
  assert.ok(socket.sent.includes('JOIN #example_channel\r\n'));
  assert.ok(statuses.some((status) => /connecting anonymously/i.test(status)));

  socket.emit('message', Buffer.from('@display-name=Viewer :viewer!viewer@viewer.tmi.twitch.tv PRIVMSG #example_channel :!idea make rainbow trail\r\n'));
  assert.deepEqual(messages, [{ user: 'Viewer', text: '!idea make rainbow trail' }]);
  adapter.stop();
});
