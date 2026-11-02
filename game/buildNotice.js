(() => {
  const banner = document.querySelector('#build-banner');
  const clock = document.querySelector('#build-clock');
  const toast = document.querySelector('#build-toast');
  const toastKicker = document.querySelector('#toast-kicker');
  const toastTitle = document.querySelector('#toast-title');
  const toastViewer = document.querySelector('#toast-viewer');
  const particles = document.querySelector('#celebration-particles');
  const stageIds = ['queued', 'building', 'validating', 'shipped'];
  const stages = stageIds.map((stage) => document.querySelector(`#stage-${stage}`)).filter(Boolean);
  if (!banner || !clock) return;
  const showToast = window.location?.pathname?.startsWith('/overlay') && Boolean(toast);

  let activeNotice = null;
  let toastKey = '';
  let toastTimer = null;

  function elapsedTime(notice) {
    const start = Number(notice.startedAt) || Date.parse(notice.item?.createdAt) || Date.now();
    const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function setStage(index) {
    stages.forEach((dot, dotIndex) => {
      dot.classList.toggle('is-complete', dotIndex < index || index === 3);
      dot.classList.toggle('is-current', dotIndex === index && index < 3);
    });
  }

  function renderActiveNotice() {
    if (!activeNotice) return;
    clock.textContent = `${activeNotice.status === 'shipped' ? 'SHIPPED' : 'LIVE BUILD'} ${elapsedTime(activeNotice)}`;
  }

  function celebrate(notice, failed = false) {
    if (!showToast) return;
    const nextToastKey = `${notice.status}:${notice.startedAt}:${notice.message}`;
    if (nextToastKey === toastKey) return;
    toastKey = nextToastKey;
    toast.classList.toggle('is-failed', failed);
    if (toastKicker) toastKicker.textContent = failed ? 'BUILD FAILED · GAME UNCHANGED' : 'SHIPPED TO THE GAME';
    if (toastTitle) toastTitle.textContent = failed
      ? 'Build failed'
      : String(notice.item?.featureTitle || 'New Feature');
    if (toastViewer) toastViewer.textContent = notice.item?.author
      ? `by @${String(notice.item.author).replace(/^@/, '')}`
      : (failed ? 'The current game is still live' : 'Built by chat');
    if (!failed && particles) {
      particles.replaceChildren();
      for (let index = 0; index < 26; index += 1) {
        const particle = document.createElement('i');
        particle.className = 'celebration-particle';
        particle.style.setProperty('--dx', `${(Math.random() - 0.5) * 560}px`);
        particle.style.setProperty('--dy', `${(Math.random() - 0.5) * 380}px`);
        particle.style.setProperty('--hue', String(Math.floor(Math.random() * 120 + 175)));
        particle.style.setProperty('--size', `${Math.random() * 6 + 3}px`);
        particles.append(particle);
      }
    }
    toast.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastKey === nextToastKey) toast.hidden = true;
    }, 3000);
  }

  function render(state) {
    const notice = state?.buildNotice || null;
    const activeStatusIndex = { queued: 0, building: 1, retrying: 1, validating: 2 };
    if (notice && Object.hasOwn(activeStatusIndex, notice.status)) {
      activeNotice = notice;
      banner.hidden = false;
      setStage(activeStatusIndex[notice.status]);
      renderActiveNotice();
      if (toast) toast.hidden = true;
      toastKey = '';
      if (toastTimer) window.clearTimeout(toastTimer);
      return;
    }

    if (notice?.status === 'done') {
      activeNotice = { ...notice, status: 'shipped' };
      banner.hidden = false;
      setStage(3);
      renderActiveNotice();
      celebrate(notice);
      return;
    }

    activeNotice = null;
    banner.hidden = true;
    if (notice?.status === 'failed') celebrate(notice, true);
    else if (toast) {
      toast.hidden = true;
      toastKey = '';
      if (toastTimer) window.clearTimeout(toastTimer);
    }
  }

  window.setInterval(renderActiveNotice, 1000);
  window.ChatShipsBuildNotice = { render };
})();
