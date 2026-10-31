(() => {
  const canvas = document.querySelector('#game');
  const context = canvas.getContext('2d');
  const scoreLabel = document.querySelector('#score');
  const width = canvas.width;
  const height = canvas.height;
  const autopilot = /(?:^|[?&])autopilot=1(?:&|$)/.test(window.location?.search || '');

  // CHAT_SHIPS_ENGINE_START
  const Engine = (() => {
    const palette = Object.freeze({
      background: '#050814',
      cyan: '#67e8f9',
      violet: '#a78bfa',
      pink: '#fb7185',
      lime: '#a3e635',
      white: '#f8fafc',
    });
    const keys = new Set();
    const pressed = new Set();
    const stars = Array.from({ length: 110 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.8 + 0.5,
      speed: Math.random() * 23 + 8,
      phase: Math.random() * Math.PI * 2,
    }));
    const particles = [];
    let scene = { update() {}, draw() {} };
    let lastFrame = 0;
    let elapsed = 0;
    let shakeTime = 0;
    let shakePower = 0;
    let pointer = { x: width / 2, y: height / 2, down: false };
    let audio = null;

    function normalizeKey(key) {
      return key.length === 1 ? key.toLowerCase() : key;
    }

    function unlockAudio() {
      const AudioContextType = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextType) return;
      if (!audio) audio = new AudioContextType();
      if (audio.state === 'suspended') audio.resume().catch(() => {});
    }

    function playSound(kind = 'spawn') {
      unlockAudio();
      if (!audio || audio.state !== 'running') return;
      const notes = { spawn: [540, 760], hit: [180, 90], collect: [660, 990], win: [520, 780] };
      const [startFrequency, endFrequency] = notes[kind] || notes.spawn;
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const now = audio.currentTime;
      oscillator.type = kind === 'hit' ? 'sawtooth' : 'sine';
      oscillator.frequency.setValueAtTime(startFrequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + 0.12);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.08, now + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      oscillator.connect(gain);
      gain.connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.17);
    }

    function burst(x, y, color = palette.cyan, count = 18) {
      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 35 + Math.random() * 180;
        const life = 0.25 + Math.random() * 0.55;
        particles.push({
          x, y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          maxLife: life,
          size: 1.5 + Math.random() * 3,
          color,
        });
      }
    }

    function updateParticles(delta) {
      for (const particle of particles) {
        particle.life -= delta;
        particle.x += particle.vx * delta;
        particle.y += particle.vy * delta;
        particle.vx *= 1 - delta * 1.4;
        particle.vy *= 1 - delta * 1.4;
      }
      for (let index = particles.length - 1; index >= 0; index -= 1) {
        if (particles[index].life <= 0) particles.splice(index, 1);
      }
    }

    function drawParticles() {
      for (const particle of particles) {
        context.save();
        context.globalAlpha = Math.max(0, particle.life / particle.maxLife);
        context.fillStyle = particle.color;
        context.shadowColor = particle.color;
        context.shadowBlur = 14;
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
        context.restore();
      }
    }

    function drawStarfield(delta) {
      context.fillStyle = palette.background;
      context.fillRect(0, 0, width, height);
      for (const star of stars) {
        star.y += star.speed * delta;
        star.phase += delta * 2;
        if (star.y > height) {
          star.y = -star.size;
          star.x = Math.random() * width;
        }
        context.globalAlpha = 0.3 + (Math.sin(star.phase) + 1) * 0.24;
        context.fillStyle = star.size > 1.8 ? palette.cyan : palette.white;
        context.shadowColor = palette.cyan;
        context.shadowBlur = star.size > 1.8 ? 8 : 0;
        context.fillRect(star.x, star.y, star.size, star.size);
      }
      context.globalAlpha = 1;
      context.shadowBlur = 0;
    }

    function frame(timestamp) {
      const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.04) : 0;
      lastFrame = timestamp;
      elapsed += delta;
      updateParticles(delta);
      for (const star of stars) {
        star.y += star.speed * delta;
        star.phase += delta * 2;
        if (star.y > height) {
          star.y = -star.size;
          star.x = Math.random() * width;
        }
      }

      scene.update(delta, elapsed, Engine);
      drawStarfield(0);
      const shake = shakeTime > 0 ? shakePower * (shakeTime / 0.24) : 0;
      context.save();
      if (shake > 0) context.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      scene.draw(Engine);
      drawParticles();
      context.restore();
      shakeTime = Math.max(0, shakeTime - delta);
      if (shakeTime === 0) shakePower = 0;
      pressed.clear();
      requestAnimationFrame(frame);
    }

    function setPointer(event, down = pointer.down) {
      const rect = canvas.getBoundingClientRect ? canvas.getBoundingClientRect() : { left: 0, top: 0, width, height };
      pointer = {
        x: (event.clientX - rect.left) * (width / (rect.width || width)),
        y: (event.clientY - rect.top) * (height / (rect.height || height)),
        down,
      };
    }

    window.addEventListener('keydown', (event) => {
      const key = normalizeKey(event.key);
      if (!keys.has(key)) pressed.add(key);
      keys.add(key);
      unlockAudio();
    });
    window.addEventListener('keyup', (event) => keys.delete(normalizeKey(event.key)));
    window.addEventListener('pointermove', (event) => setPointer(event));
    window.addEventListener('pointerdown', (event) => { setPointer(event, true); unlockAudio(); });
    window.addEventListener('pointerup', (event) => setPointer(event, false));

    const EngineApi = {
      width,
      height,
      palette,
      input: {
        isAutopilot: autopilot,
        isDown: (key) => keys.has(normalizeKey(key)),
        wasPressed: (key) => pressed.has(normalizeKey(key)),
        pointer: () => ({ ...pointer }),
      },
      draw: {
        circle(x, y, radius, color = palette.cyan, fill = true) {
          context.save();
          context.fillStyle = color;
          context.strokeStyle = color;
          context.shadowColor = color;
          context.shadowBlur = 16;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          if (fill) context.fill();
          else context.stroke();
          context.restore();
        },
        rect(x, y, rectWidth, rectHeight, color = palette.cyan, fill = true) {
          context.save();
          context.fillStyle = color;
          context.strokeStyle = color;
          context.shadowColor = color;
          context.shadowBlur = 14;
          if (fill) context.fillRect(x, y, rectWidth, rectHeight);
          else context.strokeRect(x, y, rectWidth, rectHeight);
          context.restore();
        },
        line(x1, y1, x2, y2, color = palette.cyan, lineWidth = 2) {
          context.save();
          context.strokeStyle = color;
          context.lineWidth = lineWidth;
          context.shadowColor = color;
          context.shadowBlur = 12;
          context.beginPath();
          context.moveTo(x1, y1);
          context.lineTo(x2, y2);
          context.stroke();
          context.restore();
        },
        text(value, x, y, color = palette.white, size = 22, align = 'center') {
          context.save();
          context.fillStyle = color;
          context.font = `700 ${size}px system-ui, sans-serif`;
          context.textAlign = align;
          context.shadowColor = color;
          context.shadowBlur = 12;
          context.fillText(String(value), x, y);
          context.restore();
        },
      },
      sprites: {
        ship(x, y, size = 22, color = palette.cyan) {
          context.save();
          context.translate(x, y);
          context.fillStyle = color;
          context.strokeStyle = palette.white;
          context.lineWidth = 2;
          context.shadowColor = color;
          context.shadowBlur = 18;
          context.beginPath();
          context.moveTo(0, -size);
          context.lineTo(size * 0.72, size * 0.72);
          context.lineTo(0, size * 0.38);
          context.lineTo(-size * 0.72, size * 0.72);
          context.closePath();
          context.fill();
          context.stroke();
          context.restore();
        },
        orb(x, y, radius = 14, color = palette.pink) {
          EngineApi.draw.circle(x, y, radius, color);
          EngineApi.draw.circle(x - radius * 0.25, y - radius * 0.25, radius * 0.28, palette.white);
        },
        asteroid(x, y, radius = 20, color = palette.violet, rotation = 0) {
          context.save();
          context.translate(x, y);
          context.rotate(rotation);
          context.fillStyle = color;
          context.strokeStyle = palette.white;
          context.lineWidth = 2;
          context.shadowColor = color;
          context.shadowBlur = 15;
          context.beginPath();
          for (let point = 0; point < 10; point += 1) {
            const angle = (point / 10) * Math.PI * 2;
            const bump = point % 2 === 0 ? 1 : 0.78;
            const px = Math.cos(angle) * radius * bump;
            const py = Math.sin(angle) * radius * bump;
            if (point === 0) context.moveTo(px, py);
            else context.lineTo(px, py);
          }
          context.closePath();
          context.fill();
          context.stroke();
          context.restore();
        },
      },
      particles: {
        burst,
        update: updateParticles,
        draw: drawParticles,
      },
      effects: {
        shake(power = 7, duration = 0.24) {
          shakePower = Math.max(shakePower, power);
          shakeTime = Math.max(shakeTime, duration);
        },
        spawn(x, y, color = palette.cyan) {
          burst(x, y, color, 12);
          playSound('spawn');
        },
        hit(x, y, color = palette.pink) {
          burst(x, y, color, 26);
          EngineApi.effects.shake(10, 0.3);
          playSound('hit');
        },
      },
      sound: { play: playSound },
      collisions: {
        circles(first, second) {
          const dx = first.x - second.x;
          const dy = first.y - second.y;
          const radius = (first.radius || 0) + (second.radius || 0);
          return dx * dx + dy * dy <= radius * radius;
        },
        pointInRect(point, rect) {
          return point.x >= rect.x && point.x <= rect.x + rect.width
            && point.y >= rect.y && point.y <= rect.y + rect.height;
        },
      },
      start(nextScene) {
        scene = nextScene || { update() {}, draw() {} };
        lastFrame = 0;
        if (scoreLabel) scoreLabel.textContent = '0';
        requestAnimationFrame(frame);
      },
    };
    return EngineApi;
  })();
  // CHAT_SHIPS_ENGINE_END

  // CHAT_SHIPS_FEATURE_START
  const ship = { x: width / 2, y: height - 72, radius: 17, speed: 280 };
  const enemies = [];
  let spawnTimer = 0;
  let score = 0;
  let lives = 3;
  let invulnerable = 0;
  let gameOver = false;

  const feature = {
    update(delta, elapsed, Engine) {
      if (gameOver) {
        if (Engine.input.isAutopilot || Engine.input.wasPressed(' ')) {
          gameOver = false;
          score = 0;
          lives = 3;
          enemies.length = 0;
          spawnTimer = 0;
          ship.x = width / 2;
          if (scoreLabel) scoreLabel.textContent = '0';
        }
        return;
      }

      invulnerable = Math.max(0, invulnerable - delta);
      if (Engine.input.isAutopilot) {
        let safestX = ship.x;
        let safestScore = -Infinity;
        for (let candidate = ship.radius; candidate <= width - ship.radius; candidate += 24) {
          let safety = 0;
          for (const enemy of enemies) {
            const timeToShip = Math.max(0, (ship.y - enemy.y) / enemy.speed);
            safety += Math.min(180, Math.abs(candidate - enemy.x)) / (1 + timeToShip * 0.7);
          }
          if (safety > safestScore) { safestScore = safety; safestX = candidate; }
        }
        const step = ship.speed * delta;
        ship.x += Math.max(-step, Math.min(step, safestX - ship.x));
      } else {
        const horizontal = Number(Engine.input.isDown('ArrowRight')) - Number(Engine.input.isDown('ArrowLeft'));
        const vertical = Number(Engine.input.isDown('ArrowDown')) - Number(Engine.input.isDown('ArrowUp'));
        const length = Math.hypot(horizontal, vertical) || 1;
        ship.x += horizontal / length * ship.speed * delta;
        ship.y += vertical / length * ship.speed * delta;
      }
      ship.x = Math.max(ship.radius, Math.min(width - ship.radius, ship.x));
      ship.y = Math.max(ship.radius, Math.min(height - ship.radius, ship.y));

      spawnTimer -= delta;
      if (spawnTimer <= 0) {
        const radius = 15 + Math.random() * 9;
        const enemy = { x: radius + Math.random() * (width - radius * 2), y: -radius, radius, speed: 105 + Math.random() * 65, rotation: Math.random() * Math.PI };
        enemies.push(enemy);
        Engine.effects.spawn(enemy.x, enemy.y, Engine.palette.violet);
        spawnTimer = Math.max(0.42, 1.1 - elapsed * 0.008);
      }

      for (let i = enemies.length - 1; i >= 0; i -= 1) {
        const enemy = enemies[i];
        enemy.y += enemy.speed * delta;
        enemy.rotation += delta * 0.8;
        if (Engine.collisions.circles(ship, enemy) && invulnerable <= 0) {
          Engine.effects.hit(enemy.x, enemy.y, Engine.palette.pink);
          enemies.splice(i, 1);
          lives -= 1;
          invulnerable = 1.1;
          if (lives <= 0) gameOver = true;
        } else {
          if (!enemy.scored && enemy.y - enemy.radius > ship.y + ship.radius) {
            enemy.scored = true;
            score += 1;
            if (scoreLabel) scoreLabel.textContent = String(score);
          }
          if (enemy.y - enemy.radius > height) enemies.splice(i, 1);
        }
      }
    },
    draw(Engine) {
      for (const enemy of enemies) Engine.sprites.asteroid(enemy.x, enemy.y, enemy.radius, Engine.palette.violet, enemy.rotation);
      if (invulnerable <= 0 || Math.floor(invulnerable * 12) % 2 === 0) Engine.sprites.ship(ship.x, ship.y, ship.radius, Engine.palette.cyan);
      Engine.draw.text(`LIVES ${lives}   •   DODGED ${score}`, width / 2, 28, Engine.palette.white, 14);
      if (gameOver) {
        Engine.draw.text('SHIP DESTROYED', width / 2, height / 2 - 8, Engine.palette.pink, 28);
        Engine.draw.text('PRESS SPACE TO RESTART', width / 2, height / 2 + 24, Engine.palette.white, 14);
      } else if (!Engine.input.isAutopilot) {
        Engine.draw.text('ARROW KEYS TO DODGE', width / 2, height - 18, Engine.palette.cyan, 13);
      }
    },
  };
  Engine.start(feature);
  // CHAT_SHIPS_FEATURE_END
})();
