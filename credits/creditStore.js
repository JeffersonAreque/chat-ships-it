const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const MAX_CREDITS = 50;
const LEGACY_START = '// CHAT_SHIPS_IT_BOSS_CREDIT_START';
const LEGACY_END = '// CHAT_SHIPS_IT_BOSS_CREDIT_END';

function sanitizeAuthor(author) {
  return String(author || 'viewer').replace(/^@/, '').replace(/[\r\n\u0000-\u001f]/g, '').trim().slice(0, 30) || 'viewer';
}

function sanitizeFeatureTitle(value) {
  const words = String(value || '').normalize('NFKC').match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) || [];
  if (words.length < 2 || words.length > 3) return 'Game Update';
  return words.map((word) => `${word[0].toLocaleUpperCase()}${word.slice(1).toLocaleLowerCase()}`).join(' ');
}

function extractLegacyCredits(source) {
  const start = source.indexOf(LEGACY_START);
  const end = source.indexOf(LEGACY_END, start + LEGACY_START.length);
  if (start < 0 || end < 0) return [];

  const block = source.slice(start + LEGACY_START.length, end);
  const credits = [];
  const pattern = /context\.fillText\(\s*("(?:\\.|[^"\\])*")\s*,/g;
  for (const match of block.matchAll(pattern)) {
    let text;
    try { text = JSON.parse(match[1]); } catch { continue; }
    const author = text.match(/\bby\s+@([^\s]+)$/i)?.[1];
    if (!author) continue;
    credits.push({ id: crypto.randomUUID(), author: sanitizeAuthor(author), text, createdAt: new Date().toISOString() });
  }
  return credits.slice(-MAX_CREDITS);
}

function createCreditStore({ filePath, legacyGamePath } = {}) {
  if (!filePath) throw new Error('A credits file path is required.');
  const absoluteFilePath = path.resolve(filePath);
  let credits;

  if (fs.existsSync(absoluteFilePath)) {
    const stored = JSON.parse(fs.readFileSync(absoluteFilePath, 'utf8'));
    if (!stored || !Array.isArray(stored.credits)) throw new Error('The credits file has an invalid format.');
    credits = stored.credits.slice(-MAX_CREDITS);
  } else {
    const legacySource = legacyGamePath && fs.existsSync(legacyGamePath)
      ? fs.readFileSync(legacyGamePath, 'utf8')
      : '';
    credits = extractLegacyCredits(legacySource);
    persist(credits);
  }

  function persist(nextCredits) {
    fs.mkdirSync(path.dirname(absoluteFilePath), { recursive: true });
    const temporaryPath = `${absoluteFilePath}.${process.pid}.tmp`;
    try {
      fs.writeFileSync(temporaryPath, `${JSON.stringify({ version: 1, credits: nextCredits }, null, 2)}\n`, 'utf8');
      fs.renameSync(temporaryPath, absoluteFilePath);
    } catch (error) {
      try { fs.rmSync(temporaryPath, { force: true }); } catch {}
      throw error;
    }
  }

  function getCredits() {
    return credits.slice(-10).reverse().map((credit) => ({ ...credit }));
  }

  function addBuild(item) {
    const author = sanitizeAuthor(item?.author);
    const credit = {
      id: crypto.randomUUID(),
      ideaId: Number(item?.ideaId) || null,
      author,
      featureTitle: sanitizeFeatureTitle(item?.featureTitle),
      text: `${sanitizeFeatureTitle(item?.featureTitle)} by @${author}`,
      createdAt: new Date().toISOString(),
    };
    const nextCredits = [...credits, credit].slice(-MAX_CREDITS);
    persist(nextCredits);
    credits = nextCredits;
    return { ...credit };
  }

  function clear() {
    persist([]);
    credits = [];
  }

  return { getCredits, addBuild, clear };
}

module.exports = { createCreditStore, extractLegacyCredits, sanitizeFeatureTitle, MAX_CREDITS };
