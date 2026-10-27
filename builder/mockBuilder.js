function createMockCandidate(source, item) {
  const color = item.id % 2 === 0 ? '#a78bfa' : '#fb7185';
  const shipColorPattern = /(context\.translate\(ship\.x, ship\.y\);\s*context\.fillStyle = )'#[0-9a-f]{6}'/i;
  if (!shipColorPattern.test(source)) throw new Error('Mock builder could not find the ship color to change.');
  return source.replace(shipColorPattern, `$1'${color}'`);
}

module.exports = { createMockCandidate };
