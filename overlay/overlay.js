(() => {
  const list = document.querySelector('#ideas');
  const empty = document.querySelector('#empty');
  const approved = document.querySelector('#approved');
  const viewerName = document.querySelector('#viewer-name');
  const viewerIdea = document.querySelector('#viewer-idea');
  const ideaCount = document.querySelector('#idea-count');
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.querySelector(`#${tab.getAttribute('aria-controls')}`));
  const codeLabel = document.querySelector('#code-label');
  const code = document.querySelector('#live-code');
  const diffLines = document.querySelector('#diff-lines');
  const codeMode = document.querySelector('#code-mode');
  const timelineList = document.querySelector('#timeline');
  const timelineEmpty = document.querySelector('#timeline-empty');
  const replayFrame = document.querySelector('#replay-frame');
  const replayPosition = document.querySelector('#replay-position');
  const timelineSteps = [];
  let selectedStep = -1;
  let latestTimelineCommit = null;

  function activateTab(index) {
    tabs.forEach((tab, tabIndex) => {
      tab.setAttribute('aria-selected', String(index === tabIndex));
      panels[tabIndex].hidden = index !== tabIndex;
    });
    if (index === 2) renderReplay();
  }

  tabs.forEach((tab, index) => tab.addEventListener('click', () => activateTab(index)));

  function renderIdeas(state) {
    const ideas = Array.isArray(state?.topIdeas) ? state.topIdeas : [];
    const approval = state?.latestApproval;
    approved.hidden = !approval;
    viewerName.textContent = approval ? `@${approval.author}` : '';
    viewerIdea.textContent = approval ? approval.text : '';
    ideaCount.textContent = `${ideas.length} ${ideas.length === 1 ? 'IDEA' : 'IDEAS'}`;
    list.replaceChildren();
    empty.hidden = ideas.length > 0;

    for (const idea of ideas) {
      const item = document.createElement('li');
      const number = document.createElement('span');
      const copy = document.createElement('span');
      const text = document.createElement('span');
      const author = document.createElement('span');
      const votes = document.createElement('span');
      item.className = 'idea';
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
    window.ChatShipsBuildNotice?.render(state);
    if (['building', 'retrying'].includes(state?.buildNotice?.status)) activateTab(1);
  }

  function renderDiff(event) {
    const item = event?.item;
    codeLabel.textContent = item
      ? `Codex’s draft for @${item.author}: ${item.text}`
      : 'Waiting for Codex to start writing…';
    codeMode.textContent = item ? 'WRITING' : 'READY';
    const diff = String(event?.diff || 'Codex has not changed game.js yet.');
    diffLines.replaceChildren();
    for (const [index, line] of diff.split('\n').entries()) {
      if (index > 0) diffLines.append(document.createTextNode('\n'));
      const lineNode = document.createElement('span');
      lineNode.textContent = line;
      if (line.startsWith('+') && !line.startsWith('+++')) lineNode.className = 'diff-add';
      if (line.startsWith('-') && !line.startsWith('---')) lineNode.className = 'diff-remove';
      diffLines.append(lineNode);
    }
    code.scrollTop = code.scrollHeight;
  }

  function renderReplay() {
    const hasSteps = timelineSteps.length > 0;
    timelineEmpty.hidden = hasSteps;
    timelineList.replaceChildren();
    for (let index = 0; index < timelineSteps.length; index += 1) {
      const step = timelineSteps[index];
      const item = document.createElement('li');
      const button = document.createElement('button');
      const thumbnail = document.createElement('span');
      const details = document.createElement('span');
      const title = document.createElement('span');
      const meta = document.createElement('span');
      button.type = 'button';
      button.className = 'timeline-step';
      button.setAttribute('aria-current', selectedStep === index ? 'step' : 'false');
      thumbnail.className = 'timeline-thumb';
      thumbnail.setAttribute('aria-hidden', 'true');
      thumbnail.textContent = String(index + 1).padStart(2, '0');
      details.className = 'step-details';
      title.className = 'step-title';
      title.textContent = step.baseline ? 'Blank starter' : step.title;
      meta.className = 'step-meta';
      const when = step.date ? new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      meta.textContent = `${step.baseline ? 'Starting screen' : `@${step.author}`} · ${when}`;
      details.append(title, meta);
      button.append(thumbnail, details);
      button.addEventListener('click', () => selectReplayStep(index));
      item.append(button);
      timelineList.append(item);
    }
    replayPosition.textContent = hasSteps ? `${selectedStep + 1} / ${timelineSteps.length}` : '0 / 0';
    replayFrame.hidden = !hasSteps;
    if (hasSteps && selectedStep >= 0) {
      const selected = timelineSteps[selectedStep];
      const nextUrl = `/game/replay.html?commit=${encodeURIComponent(selected.commit)}`;
      if (replayFrame.getAttribute('src') !== nextUrl) replayFrame.setAttribute('src', nextUrl);
    }
  }

  function selectReplayStep(index) {
    if (index < 0 || index >= timelineSteps.length) return;
    selectedStep = index;
    renderReplay();
  }

  document.querySelector('#replay-prev').addEventListener('click', () => selectReplayStep(selectedStep - 1));
  document.querySelector('#replay-next').addEventListener('click', () => selectReplayStep(selectedStep + 1));

  function renderTimeline(timeline) {
    const nextSteps = Array.isArray(timeline?.steps) ? timeline.steps : [];
    const nextLatestCommit = nextSteps.at(-1)?.commit || null;
    const latestChanged = nextLatestCommit !== latestTimelineCommit;
    timelineSteps.splice(0, timelineSteps.length, ...nextSteps);
    if (!timelineSteps.length) selectedStep = -1;
    else if (latestChanged) selectedStep = timelineSteps.length - 1;
    else if (selectedStep < 0) selectedStep = timelineSteps.length - 1;
    else selectedStep = Math.min(selectedStep, timelineSteps.length - 1);
    latestTimelineCommit = nextLatestCommit;
    renderReplay();
  }

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    socket.addEventListener('message', (event) => {
      let message;
      try { message = JSON.parse(event.data); } catch { return; }
      if (message.type === 'state') renderIdeas(message.state);
      if (message.type === 'build-diff') renderDiff(message);
      if (message.type === 'timeline') renderTimeline(message.timeline);
    });
    socket.addEventListener('close', () => window.setTimeout(connect, 1500));
  }

  connect();
})();
