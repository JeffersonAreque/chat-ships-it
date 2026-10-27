(() => {
  const list = document.querySelector('#ideas');
  const empty = document.querySelector('#empty');
  const approved = document.querySelector('#approved');

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);

    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type !== 'state') return;

      const ideas = Array.isArray(message.state?.topIdeas) ? message.state.topIdeas : [];
      const approval = message.state?.latestApproval;
      approved.hidden = !approval;
      approved.textContent = approval ? `Approved: ${approval.text} by @${approval.author}` : '';
      window.ChatShipsBuildNotice?.render(message.state);
      list.replaceChildren();
      empty.hidden = ideas.length > 0;

      for (const idea of ideas) {
        const item = document.createElement('li');
        const number = document.createElement('span');
        const copy = document.createElement('span');
        const text = document.createElement('span');
        const author = document.createElement('span');
        const votes = document.createElement('span');

        number.className = 'number';
        number.textContent = String(idea.id);
        copy.className = 'idea-copy';
        text.className = 'idea-text';
        text.textContent = idea.text;
        author.className = 'author';
        author.textContent = `by @${idea.author}`;
        votes.className = 'votes';
        votes.textContent = `${idea.votes} ${idea.votes === 1 ? 'vote' : 'votes'}`;

        copy.append(text, author);
        item.append(number, copy, votes);
        list.append(item);
      }
    });

    socket.addEventListener('close', () => window.setTimeout(connect, 1500));
  }

  connect();
})();
