const MAX_DIFF_CHARS = 24000;

function createUnifiedDiff(before, after, fileName = 'game.js') {
  const oldLines = String(before).split(/\r?\n/);
  const newLines = String(after).split(/\r?\n/);
  let prefix = 0;
  while (prefix < oldLines.length && prefix < newLines.length && oldLines[prefix] === newLines[prefix]) prefix += 1;

  let suffix = 0;
  while (
    suffix < oldLines.length - prefix
    && suffix < newLines.length - prefix
    && oldLines[oldLines.length - 1 - suffix] === newLines[newLines.length - 1 - suffix]
  ) suffix += 1;

  if (prefix === oldLines.length && prefix === newLines.length) return '';
  const contextStart = Math.max(0, prefix - 3);
  const contextBefore = oldLines.slice(contextStart, prefix);
  const removed = oldLines.slice(prefix, oldLines.length - suffix);
  const added = newLines.slice(prefix, newLines.length - suffix);
  const contextAfter = oldLines.slice(oldLines.length - suffix, oldLines.length - suffix + 3);
  const oldCount = contextBefore.length + removed.length + contextAfter.length;
  const newCount = contextBefore.length + added.length + contextAfter.length;
  const hunk = [
    `--- a/${fileName}`,
    `+++ b/${fileName}`,
    `@@ -${contextStart + 1},${oldCount} +${contextStart + 1},${newCount} @@`,
    ...contextBefore.map((line) => ` ${line}`),
    ...removed.map((line) => `-${line}`),
    ...added.map((line) => `+${line}`),
    ...contextAfter.map((line) => ` ${line}`),
  ].join('\n');
  return hunk.slice(0, MAX_DIFF_CHARS);
}

module.exports = { createUnifiedDiff, MAX_DIFF_CHARS };
