const DEFAULT_BANNED_WORDS = ['asshole', 'bastard', 'bitch', 'cunt', 'fuck', 'shit'];
const MAX_IDEA_LENGTH = 120;

function normalizeUser(user) {
  return String(user || '').trim().replace(/^@/, '').toLocaleLowerCase();
}

function normalizeIdea(text) {
  return text.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function hasBannedWord(text, bannedWords) {
  const normalizedText = text.normalize('NFKC');

  return bannedWords.some((word) => {
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}_])${escapedWord}($|[^\\p{L}\\p{N}_])`, 'iu');
    return pattern.test(normalizedText);
  });
}

function createIdeaStore({ additionalBannedWords = [] } = {}) {
  const bannedWords = [...DEFAULT_BANNED_WORDS, ...additionalBannedWords]
    .map((word) => String(word).trim().toLocaleLowerCase())
    .filter(Boolean);
  const ideas = [];
  const ideasByNormalizedText = new Map();
  const activeIdeaByUser = new Map();
  const voteByUser = new Map();
  let nextIdeaId = 1;

  function getSnapshot() {
    const allIdeas = ideas.map((idea) => ({ ...idea }));
    const topIdeas = [...allIdeas]
      .sort((left, right) => right.votes - left.votes || left.id - right.id)
      .slice(0, 5);

    return { round: 1, ideas: allIdeas, topIdeas };
  }

  function addIdea(user, rawText) {
    const author = String(user || '').trim().replace(/^@/, '');
    const userKey = normalizeUser(author);
    const text = String(rawText || '').trim();
    const length = [...text].length;

    if (!userKey || !text) return { accepted: false, reason: 'Add some idea text after !idea.' };
    if (length > MAX_IDEA_LENGTH) return { accepted: false, reason: `Ideas can be up to ${MAX_IDEA_LENGTH} characters.` };
    if (hasBannedWord(text, bannedWords)) return { accepted: false, reason: 'That idea contains a banned word.' };
    if (activeIdeaByUser.has(userKey)) return { accepted: false, reason: 'You already submitted an idea this round.' };

    const normalizedText = normalizeIdea(text);
    let idea = ideasByNormalizedText.get(normalizedText);

    if (idea) {
      activeIdeaByUser.set(userKey, idea.id);
      return { accepted: true, merged: true, idea: { ...idea } };
    }

    idea = { id: nextIdeaId, author, text, votes: 0 };
    nextIdeaId += 1;
    ideas.push(idea);
    ideasByNormalizedText.set(normalizedText, idea);
    activeIdeaByUser.set(userKey, idea.id);

    return { accepted: true, merged: false, idea: { ...idea } };
  }

  function addVote(user, rawNumber) {
    const userKey = normalizeUser(user);
    const ideaId = Number(rawNumber);
    const idea = ideas.find((candidate) => candidate.id === ideaId);

    if (!userKey) return { accepted: false, reason: 'A username is required to vote.' };
    if (!Number.isSafeInteger(ideaId) || ideaId < 1 || !idea) {
      return { accepted: false, reason: 'That idea number is not on the board.' };
    }
    if (voteByUser.has(userKey)) return { accepted: false, reason: 'You already voted this round.' };

    voteByUser.set(userKey, ideaId);
    idea.votes += 1;
    return { accepted: true, idea: { ...idea } };
  }

  function handleMessage({ user, text } = {}) {
    const message = String(text || '').trim();
    const ideaCommand = message.match(/^!idea(?:\s+([\s\S]*))?$/i);
    if (ideaCommand) return { command: 'idea', ...addIdea(user, ideaCommand[1] || '') };

    const voteCommand = message.match(/^!vote\s+(\d+)$/i);
    if (voteCommand) return { command: 'vote', ...addVote(user, voteCommand[1]) };

    return null;
  }

  return { handleMessage, getSnapshot };
}

module.exports = { createIdeaStore, MAX_IDEA_LENGTH };
