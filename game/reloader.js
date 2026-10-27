(() => {
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'game-reload') window.location.reload();
    });

    socket.addEventListener('close', () => window.setTimeout(connect, 1500));
  }

  connect();
})();
