(() => {
  const connection = document.querySelector('#connection');
  const actionStatus = document.querySelector('#action-status');
  const ideasList = document.querySelector('#ideas');
  const ideasEmpty = document.querySelector('#ideas-empty');
  const queueList = document.querySelector('#queue');
  const queueEmpty = document.querySelector('#queue-empty');
  const roundNumber = document.querySelector('#round-number');
  const nextRoundButton = document.querySelector('#next-round');
  const undoButton = document.querySelector('#undo-change');
  const resetDemoButton = document.querySelector('#reset-demo');
  const confirmResetButton = document.querySelector('#confirm-reset');
  const buildStatus = document.querySelector('#build-status');
  const buildError = document.querySelector('#build-error');
  let socket;
  let resetConfirmationTimer;

  function clearResetConfirmation() {
    if (resetConfirmationTimer) window.clearTimeout(resetConfirmationTimer);
    resetConfirmationTimer = null;
    confirmResetButton.hidden = true;
    resetDemoButton.textContent = 'Reset demo';
  }

  function armResetConfirmation() {
    clearResetConfirmation();
    confirmResetButton.hidden = false;
    resetDemoButton.textContent = 'Reset armed';
    actionStatus.textContent = 'This clears the demo ideas, credits, queue, and game. Confirm within 3 seconds.';
    resetConfirmationTimer = window.setTimeout(clearResetConfirmation, 3000);
  }

  function addIdea(idea) {
    const item = document.createElement('li');
    const copy = document.createElement('div');
    const text = document.createElement('span');
    const meta = document.createElement('span');
    const actions = document.createElement('div');

    copy.className = 'idea-copy';
    text.className = 'idea-text';
    text.textContent = `#${idea.id} ${idea.text}`;
    meta.className = 'meta';
    meta.textContent = `by @${idea.author} · ${idea.votes} ${idea.votes === 1 ? 'vote' : 'votes'} · ${idea.status}`;
    copy.append(text, meta);
    item.append(copy);

    if (idea.status === 'active') {
      actions.className = 'actions';
      for (const [action, label, className] of [
        ['approve', 'Approve', 'approve'],
        ['reject', 'Reject', 'reject'],
      ]) {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.action = action;
        button.dataset.ideaId = String(idea.id);
        button.className = `button ${className}`;
        button.textContent = label;
        actions.append(button);
      }
      item.append(actions);
    }

    ideasList.append(item);
  }

  function addQueueItem(entry) {
    const item = document.createElement('li');
    const copy = document.createElement('span');
    const status = document.createElement('span');
    copy.className = 'queue-copy';
    copy.textContent = `#${entry.id} ${entry.text} · by @${entry.author}`;
    status.className = 'queue-status';
    status.textContent = entry.status;
    item.append(copy, status);
    queueList.append(item);
  }

  function render(state) {
    if (!state) return;
    const ideas = Array.isArray(state.ideas) ? state.ideas : [];
    const queue = Array.isArray(state.buildQueue) ? state.buildQueue : [];
    roundNumber.textContent = String(state.round || 1);
    buildStatus.textContent = state.buildNotice?.message || 'No build running.';
    buildStatus.dataset.status = state.buildNotice?.status || 'idle';
    buildError.textContent = state.buildNotice?.errorDetails || '';
    buildError.hidden = !state.buildNotice?.errorDetails;
    undoButton.disabled = !state.canUndo;
    resetDemoButton.disabled = queue.some((entry) => ['waiting', 'building'].includes(entry.status));
    if (resetDemoButton.disabled) clearResetConfirmation();
    ideasList.replaceChildren();
    queueList.replaceChildren();
    ideasEmpty.hidden = ideas.length > 0;
    queueEmpty.hidden = queue.length > 0;
    ideas.forEach(addIdea);
    queue.forEach(addQueueItem);
  }

  function requireAdminAuthentication(response) {
    if (response.status === 401) throw new Error('Wrong password, reload and try again');
  }

  async function postAction(path, body = {}) {
    actionStatus.textContent = 'Saving…';
    const response = await fetch(`/admin/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    requireAdminAuthentication(response);
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'The action could not be completed.');
    render(result.state);
    actionStatus.textContent = 'Saved.';
  }

  async function loadState() {
    const response = await fetch('/admin/api/state', { cache: 'no-store' });
    requireAdminAuthentication(response);
    if (!response.ok) throw new Error('Could not load admin state. Refresh and sign in again.');
    const result = await response.json();
    render(result.state);
  }

  ideasList.addEventListener('click', async (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    button.disabled = true;
    try {
      await postAction(button.dataset.action, { ideaId: Number(button.dataset.ideaId) });
    } catch (error) {
      actionStatus.textContent = error.message;
      button.disabled = false;
    }
  });

  nextRoundButton.addEventListener('click', async () => {
    if (!window.confirm('Start a new round? This clears the current ideas and votes.')) return;
    nextRoundButton.disabled = true;
    try {
      await postAction('next-round');
    } catch (error) {
      actionStatus.textContent = error.message;
    } finally {
      nextRoundButton.disabled = false;
    }
  });

  undoButton.addEventListener('click', async () => {
    if (!window.confirm('Undo the last Chat Ships It game change?')) return;
    undoButton.disabled = true;
    try {
      await postAction('undo');
    } catch (error) {
      actionStatus.textContent = error.message;
      undoButton.disabled = false;
    }
  });

  resetDemoButton.addEventListener('click', () => {
    if (!resetDemoButton.disabled) armResetConfirmation();
  });

  confirmResetButton.addEventListener('click', async () => {
    if (confirmResetButton.hidden) return;
    clearResetConfirmation();
    resetDemoButton.disabled = true;
    confirmResetButton.disabled = true;
    try {
      await postAction('reset-demo');
    } catch (error) {
      actionStatus.textContent = error.message;
    } finally {
      resetDemoButton.disabled = false;
      confirmResetButton.disabled = false;
      clearResetConfirmation();
    }
  });

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.addEventListener('open', () => {
      connection.dataset.status = 'connected';
      connection.lastChild.textContent = ' Live updates connected.';
    });
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'state') {
        render(message.state);
        if (message.state?.buildNotice?.status === 'failed') {
          loadState().catch((error) => { actionStatus.textContent = error.message; });
        }
      }
    });
    socket.addEventListener('close', () => {
      connection.dataset.status = 'disconnected';
      connection.lastChild.textContent = ' Live updates disconnected. Reconnecting…';
      window.setTimeout(connect, 1500);
    });
  }

  loadState().catch((error) => { actionStatus.textContent = error.message; });
  connect();
})();
