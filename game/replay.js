(() => {
  const message = document.querySelector('#message');
  const commit = new URLSearchParams(window.location.search).get('commit');
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
})();
