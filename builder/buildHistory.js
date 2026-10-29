const { execFileSync } = require('node:child_process');
const path = require('node:path');

const RESET_SUBJECT = 'Reset demo to starter game';

function git(root, args) {
  const safeRoot = path.resolve(root).replace(/\\/g, '/');
  return execFileSync('git', ['-c', `safe.directory=${safeRoot}`, ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function findBaselineCommit(root) {
  const commits = git(root, ['log', '--first-parent', '--format=%H%x09%s']).split(/\r?\n/).filter(Boolean);
  const marker = commits.find((line) => line.slice(line.indexOf('\t') + 1) === RESET_SUBJECT);
  return marker ? marker.slice(0, marker.indexOf('\t')) : null;
}

function parseBuildSubject(subject) {
  const match = String(subject).match(/^Chat idea #(\d+) by @([^ ]+) \[([^\]]+)\]:\s*(.*)$/);
  if (!match) return null;
  return { ideaId: Number(match[1]), author: match[2], title: match[3], idea: match[4] };
}

function readReplayTimeline(root) {
  const baselineCommit = findBaselineCommit(root);
  if (!baselineCommit) return { baselineCommit: null, steps: [] };

  const args = ['log', '--first-parent', '--reverse', '--format=%H%x09%cI%x09%s', `${baselineCommit}..HEAD`, '--', 'game/game.js'];
  const lines = git(root, args).split(/\r?\n/).filter(Boolean);
  const active = [];
  for (const line of lines) {
    const firstTab = line.indexOf('\t');
    const secondTab = line.indexOf('\t', firstTab + 1);
    const commit = line.slice(0, firstTab);
    const date = line.slice(firstTab + 1, secondTab);
    const subject = line.slice(secondTab + 1);
    const build = parseBuildSubject(subject);
    if (build) {
      active.push({ commit, date, ...build });
    } else if (subject.startsWith('Undo chat build ')) {
      const target = subject.slice('Undo chat build '.length).trim();
      const index = active.findIndex((step) => step.commit.startsWith(target));
      if (index >= 0) active.splice(index, 1);
    }
  }

  return {
    baselineCommit,
    steps: [
      { commit: baselineCommit, date: git(root, ['show', '-s', '--format=%cI', baselineCommit]), title: 'Blank starter', author: 'Chat Ships It', baseline: true },
      ...active,
    ],
  };
}

function readReplaySource(root, commit) {
  const timeline = readReplayTimeline(root);
  if (!timeline.steps.some((step) => step.commit === commit)) throw new Error('That replay step is not part of the current demo timeline.');
  const safeRoot = path.resolve(root).replace(/\\/g, '/');
  return execFileSync('git', ['-c', `safe.directory=${safeRoot}`, 'show', `${commit}:game/game.js`], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

module.exports = { findBaselineCommit, parseBuildSubject, readReplayTimeline, readReplaySource, RESET_SUBJECT };
