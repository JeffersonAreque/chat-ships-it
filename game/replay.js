(() => {
  const message = document.querySelector('#message');
  const query = new URLSearchParams(window.location.search);
  const commit = query.get('commit');
  if (!commit) {
    message.textContent = 'Choose a replay step from the overlay timeline.';
    return;
  }

  fetch(`/overlay/api/replay/${encodeURIComponent(commit)}`, { cache: 'no-store' })
    .then(async (response) => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'This replay step is unavailable.');
      const script = document.createElement('script');
      script.textContent = result.source;
      document.body.append(script);
    })
    .catch((error) => { message.textContent = error.message; });

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.addEventListener('message', (event) => {
      let next;
      try { next = JSON.parse(event.data); } catch { return; }
      if (next.type === 'replay-step' && /^[a-f0-9]{7,40}$/i.test(next.step?.commit || '') && next.step.commit !== new URLSearchParams(window.location.search).get('commit')) {
        const obs = query.get('obs') === '1' ? '&obs=1' : '';
        window.location.href = `/game/replay.html?commit=${encodeURIComponent(next.step.commit)}${obs}&autopilot=1`;
      }
      if (next.type === 'replay-live') window.location.href = query.get('obs') === '1' ? '/game?obs=1' : '/game';
    });
    socket.addEventListener('close', () => window.setTimeout(connect, 1500));
  }
  connect();
})();
