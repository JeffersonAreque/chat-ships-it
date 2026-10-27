(() => {
  const status = document.querySelector('#status');
  const form = document.querySelector('#message-form');
  const userField = document.querySelector('#user');
  const textField = document.querySelector('#text');
  const sendButton = document.querySelector('#send');
  const messageList = document.querySelector('#messages');
  let socket;

  function addMessage(text, isSystem = false) {
    const item = document.createElement('li');
    item.textContent = text;
    if (isSystem) item.className = 'system';
    messageList.prepend(item);
    while (messageList.children.length > 30) messageList.lastElementChild.remove();
  }

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.addEventListener('open', () => {
      status.textContent = 'Connected. Fake messages go to the in-memory idea board.';
      sendButton.disabled = false;
    });

    socket.addEventListener('close', () => {
      status.textContent = 'Disconnected. Reconnecting…';
      sendButton.disabled = true;
      window.setTimeout(connect, 1500);
    });

    socket.addEventListener('error', () => {
      status.textContent = 'Could not connect to the server.';
    });

    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'error') {
        addMessage(message.message, true);
        return;
      }
      if (message.type !== 'chat-result') return;

      if (message.error) {
        addMessage(message.error, true);
        return;
      }

      const sent = `@${message.user}: ${message.text}`;
      const result = message.result;
      if (result && result.command && result.accepted) {
        const note = result.merged ? ' (merged with an existing idea)' : '';
        addMessage(`${sent} — accepted${note}`);
      } else if (result && result.command) {
        addMessage(`${sent} — ${result.reason}`);
      } else {
        addMessage(`${sent} — message received; try !idea or !vote`);
      }
    });
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!socket || socket.readyState !== WebSocket.OPEN) return;

    socket.send(JSON.stringify({
      type: 'chat',
      user: userField.value,
      text: textField.value,
    }));
    textField.value = '';
    textField.focus();
  });

  connect();
})();
