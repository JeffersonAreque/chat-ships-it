(() => {
  const section = document.querySelector('#viewer-credits');
  const list = document.querySelector('#credit-list');

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
    } catch {
      section.hidden = true;
    }
  }

  loadCredits();
})();
