const BUILD_STATUSES = ['waiting', 'building', 'done', 'failed'];

function createBuildQueue() {
  const items = [];
  let nextId = 1;

  function enqueue(idea, round) {
    const item = {
      id: nextId,
      ideaId: idea.id,
      round,
      text: idea.text,
      author: idea.author,
      votes: idea.votes,
      featureTitle: null,
      status: 'waiting',
      createdAt: new Date().toISOString(),
    };
    nextId += 1;
    items.push(item);
    return { ...item };
  }

  function getItems() {
    return items.map((item) => ({ ...item }));
  }

  function claimNext() {
    const item = items.find((candidate) => candidate.status === 'waiting');
    if (!item) return null;
    item.status = 'building';
    return { ...item };
  }

  function hasWaiting() {
    return items.some((item) => item.status === 'waiting');
  }

  function updateStatus(id, status, details = {}) {
    if (!BUILD_STATUSES.includes(status)) return { accepted: false, reason: 'Unknown build status.' };
    const item = items.find((candidate) => candidate.id === Number(id));
    if (!item) return { accepted: false, reason: 'Build queue item not found.' };
    item.status = status;
    if (typeof details.featureTitle === 'string') item.featureTitle = details.featureTitle;
    return { accepted: true, item: { ...item } };
  }

  function clear() {
    items.length = 0;
    nextId = 1;
  }

  return { enqueue, getItems, claimNext, hasWaiting, updateStatus, clear };
}

module.exports = { createBuildQueue, BUILD_STATUSES };
