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

  function updateStatus(id, status) {
    if (!BUILD_STATUSES.includes(status)) return { accepted: false, reason: 'Unknown build status.' };
    const item = items.find((candidate) => candidate.id === Number(id));
    if (!item) return { accepted: false, reason: 'Build queue item not found.' };
    item.status = status;
    return { accepted: true, item: { ...item } };
  }

  return { enqueue, getItems, updateStatus };
}

module.exports = { createBuildQueue, BUILD_STATUSES };
