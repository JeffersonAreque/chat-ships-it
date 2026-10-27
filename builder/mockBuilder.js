function createMockCandidate(source, item) {
  const color = item.id % 2 === 0 ? '#a78bfa' : '#fb7185';
  const shipColorPattern = /(context\.translate\(ship\.x, ship\.y\);\s*context\.fillStyle = )'#[0-9a-f]{6}'/i;
  if (!shipColorPattern.test(source)) throw new Error('Mock builder could not find the ship color to change.');
  let candidate = source.replace(shipColorPattern, `$1'${color}'`);

  const author = String(item.author || 'viewer').replace(/[\r\n\u0000-\u001f]/g, '').trim().slice(0, 30) || 'viewer';
  const creditBlock = [
    '    // CHAT_SHIPS_IT_BOSS_CREDIT_START',
    "    context.font = '14px system-ui, sans-serif';",
    "    context.textAlign = 'left';",
    "    context.fillStyle = '#bae6fd';",
    `    context.fillText(${JSON.stringify(`Boss by @${author}`)}, 16, 28);`,
    '    // CHAT_SHIPS_IT_BOSS_CREDIT_END',
  ].join('\n');
  const existingCredit = /    \/\/ CHAT_SHIPS_IT_BOSS_CREDIT_START[\s\S]*?    \/\/ CHAT_SHIPS_IT_BOSS_CREDIT_END/;

  if (existingCredit.test(candidate)) return candidate.replace(existingCredit, creditBlock);

  const insertionPoint = '    context.globalAlpha = 1;\n  }\n\n  function drawShip()';
  if (!candidate.includes(insertionPoint)) throw new Error('Mock builder could not find a safe place for the on-screen credit.');
  candidate = candidate.replace(insertionPoint, `    context.globalAlpha = 1;\n${creditBlock}\n  }\n\n  function drawShip()`);
  return candidate;
}

module.exports = { createMockCandidate };
