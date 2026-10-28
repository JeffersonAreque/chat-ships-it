(() => {
  const banner = document.querySelector('#build-banner');
  const toast = document.querySelector('#build-toast');
  if (!banner) return;
  const showToast = window.location?.pathname?.startsWith('/overlay');

  let activeNotice = null;
  let toastKey = '';
  let toastTimer = null;

  function elapsedTime(notice) {
    const start = Number(notice.startedAt) || Date.parse(notice.item?.createdAt) || Date.now();
    const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function renderActiveNotice() {
    if (!activeNotice) return;
    const author = String(activeNotice.item?.author || 'viewer').replace(/^@/, '');
    const idea = String(activeNotice.item?.text || 'game update');
    const stages = {
      queued: 'Queued',
      building: 'Codex is building',
      validating: 'Validating',
      retrying: 'Retrying',
    };
    const stage = stages[activeNotice.status];
    if (!stage) return;
    banner.textContent = `${stage} @${author}'s idea: ${idea} - ${elapsedTime(activeNotice)}`;
  }

  function render(state) {
    const notice = state?.buildNotice || null;
    const activeStatuses = ['queued', 'building', 'validating', 'retrying'];
    if (notice && activeStatuses.includes(notice.status)) {
      activeNotice = notice;
      banner.hidden = false;
      if (toast) toast.hidden = true;
      toastKey = '';
      if (toastTimer) window.clearTimeout(toastTimer);
      renderActiveNotice();
      return;
    }

    activeNotice = null;
    banner.hidden = true;
    if (!showToast || !toast) return;
    if (!notice || !['done', 'failed'].includes(notice.status)) {
      toast.hidden = true;
      toastKey = '';
      if (toastTimer) window.clearTimeout(toastTimer);
      return;
    }

    const nextToastKey = `${notice.status}:${notice.startedAt}:${notice.message}`;
    if (nextToastKey === toastKey) return;
    toastKey = nextToastKey;
    toast.textContent = notice.message || (notice.status === 'done' ? 'Shipped!' : 'Failed, game unchanged');
    toast.hidden = false;
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      if (toastKey === nextToastKey) toast.hidden = true;
    }, 10000);
  }

  window.setInterval(renderActiveNotice, 1000);
  window.ChatShipsBuildNotice = { render };
})();
