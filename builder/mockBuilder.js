function createMockCandidate(source, item) {
  const color = item.id % 2 === 0 ? 'Engine.palette.violet' : 'Engine.palette.pink';
  const emptyScene = /draw\(\) \{\},/;
  if (!emptyScene.test(source)) throw new Error('Mock builder could not find the blank feature scene.');
  return source.replace(emptyScene, `draw() { Engine.sprites.orb(width / 2, height / 2, 30, ${color}); },`);
}

module.exports = { createMockCandidate };
