(() => {
  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      const query = new URLSearchParams(window.location.search);
      const obs = query.get('obs') === '1';
      if (message.type === 'game-reload') window.location.reload();
      if (message.type === 'replay-select' && /^[a-f0-9]{7,40}$/i.test(message.commit || '')) {
        window.location.href = `/game/replay.html?commit=${encodeURIComponent(message.commit)}${obs ? '&obs=1' : ''}&autopilot=1`;
      }
      if (message.type === 'replay-live') window.location.href = obs ? '/game?obs=1' : '/game';
    });

    socket.addEventListener('close', () => window.setTimeout(connect, 1500));
  }

  connect();
})();
