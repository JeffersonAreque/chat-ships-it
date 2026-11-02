(() => {
  const section = document.querySelector('#viewer-credits');
  const list = document.querySelector('#credit-list');
  const track = document.querySelector('#credits-track');

  async function loadCredits() {
    try {
      const response = await fetch('/game/api/credits', { cache: 'no-store' });
      if (!response.ok) return;
      const result = await response.json();
      const credits = Array.isArray(result.credits) ? result.credits : [];
      list.replaceChildren();
      for (const credit of credits) {
        const item = document.createElement('li');
        item.textContent = String(credit.text || '');
        list.append(item);
      }
      section.hidden = credits.length === 0;
      track.querySelector('.ticker-copy')?.remove();
      if (credits.length > 0) {
        const copy = list.cloneNode(true);
        copy.removeAttribute('id');
        copy.className = 'ticker-copy';
        copy.setAttribute('aria-hidden', 'true');
        track.append(copy);
      }
    } catch {
      section.hidden = true;
    }
  }

  loadCredits();
})();
