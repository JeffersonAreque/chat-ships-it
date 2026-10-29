# Chat Ships It Engine API

`game/game.js` contains the stable engine section and the editable feature section. Implement the viewer idea only in the feature section. Keep the engine section unchanged.

The engine draws an animated neon starfield behind the scene and runs `update(deltaSeconds, elapsedSeconds, Engine)` and `draw(Engine)` every animation frame.

- `Engine.width`, `Engine.height`, `Engine.palette`: canvas size and neon colors (`cyan`, `violet`, `pink`, `lime`, `white`, `background`).
- `Engine.input.isAutopilot`, `isDown(key)`, `wasPressed(key)`, `pointer()`: OBS autopilot flag and keyboard/pointer state. Keys are normalized to lowercase when applicable.
- `Engine.draw.circle(x, y, radius, color, fill)`, `rect(x, y, width, height, color, fill)`, `line(x1, y1, x2, y2, color, lineWidth)`, and `text(value, x, y, color, size, align)`: glow-ready canvas drawing helpers.
- `Engine.sprites.ship(x, y, size, color)`, `orb(x, y, radius, color)`, `asteroid(x, y, radius, color, rotation)`: polished neon sprites.
- `Engine.particles.burst(x, y, color, count)`: particle burst; particles are updated and drawn by the engine.
- `Engine.effects.spawn(x, y, color)`, `Engine.effects.hit(x, y, color)`, `Engine.effects.shake(power, duration)`: spawn/hit bursts, screen shake, and sound effects.
- `Engine.sound.play('spawn'|'hit'|'collect'|'win')`: short synthesized tones; sound is silently skipped when Web Audio is unavailable or blocked.
- `Engine.collisions.circles(first, second)` expects `{ x, y, radius }`; `pointInRect(point, rect)` expects `{ x, y }` and `{ x, y, width, height }`.
- `Engine.start({ update, draw })`: starts the shared game loop and starfield.

Keep the feature self-contained: no imports, external files, network access, packages, or assets.
