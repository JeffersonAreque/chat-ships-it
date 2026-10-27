(() => {
  const canvas = document.querySelector('#game');
  const context = canvas.getContext('2d');
  const scoreLabel = document.querySelector('#score');

  const width = canvas.width;
  const height = canvas.height;
  const keys = new Set();
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    size: Math.random() * 2 + 0.5,
    speed: Math.random() * 25 + 12,
  }));

  let ship;
  let asteroids;
  let score;
  let spawnTimer;
  let lastFrame;
  let gameOver;

  function startGame() {
    ship = { x: width / 2, y: height - 75, radius: 17, speed: 290 };
    asteroids = [];
    score = 0;
    spawnTimer = 0;
    lastFrame = 0;
    gameOver = false;
    scoreLabel.textContent = '0';
    requestAnimationFrame(frame);
  }

  function drawBackground(delta) {
    context.fillStyle = '#081827';
    context.fillRect(0, 0, width, height);

    context.fillStyle = '#c6e5ff';
    for (const star of stars) {
      star.y += star.speed * delta;
      if (star.y > height) {
        star.y = 0;
        star.x = Math.random() * width;
      }
      context.globalAlpha = 0.35 + star.size / 4;
      context.fillRect(star.x, star.y, star.size, star.size);
    }
    context.globalAlpha = 1;
  }

  function drawShip() {
    context.save();
    context.translate(ship.x, ship.y);
    context.fillStyle = '#22c55e';
    context.strokeStyle = '#e0fbff';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(0, -21);
    context.lineTo(15, 17);
    context.lineTo(0, 10);
    context.lineTo(-15, 17);
    context.closePath();
    context.fill();
    context.stroke();

    context.fillStyle = '#fb923c';
    context.beginPath();
    context.moveTo(-6, 17);
    context.lineTo(0, 28 + Math.random() * 8);
    context.lineTo(6, 17);
    context.fill();
    context.restore();
  }

  function spawnAsteroid() {
    const radius = 15 + Math.random() * 22;
    asteroids.push({
      x: radius + Math.random() * (width - radius * 2),
      y: -radius,
      radius,
      speed: 120 + Math.random() * 100 + Math.min(score, 800) * 0.12,
      rotation: Math.random() * Math.PI,
      spin: (Math.random() - 0.5) * 1.5,
    });
  }

  function drawAsteroid(asteroid) {
    asteroid.rotation += asteroid.spin * (1 / 60);
    context.save();
    context.translate(asteroid.x, asteroid.y);
    context.rotate(asteroid.rotation);
    context.fillStyle = '#ec4899';
    context.strokeStyle = '#fbcfe8';
    context.lineWidth = 2;
    context.beginPath();
    for (let point = 0; point < 10; point += 1) {
      const angle = (point / 10) * Math.PI * 2;
      const bump = point % 2 === 0 ? 1 : 0.78;
      const x = Math.cos(angle) * asteroid.radius * bump;
      const y = Math.sin(angle) * asteroid.radius * bump;
      if (point === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }

  function collides(asteroid) {
    const dx = ship.x - asteroid.x;
    const dy = ship.y - asteroid.y;
    const safeDistance = ship.radius + asteroid.radius * 0.82;
    return dx * dx + dy * dy < safeDistance * safeDistance;
  }

  function drawGameOver() {
    context.fillStyle = '#020617bb';
    context.fillRect(0, 0, width, height);
    context.textAlign = 'center';
    context.fillStyle = '#f8fafc';
    context.font = 'bold 48px system-ui, sans-serif';
    context.fillText('Ship down!', width / 2, height / 2 - 14);
    context.fillStyle = '#bae6fd';
    context.font = '22px system-ui, sans-serif';
    context.fillText(`Score: ${Math.floor(score)}  ·  Press Space to restart`, width / 2, height / 2 + 30);
  }

  function frame(timestamp) {
    const delta = lastFrame ? Math.min((timestamp - lastFrame) / 1000, 0.04) : 0;
    lastFrame = timestamp;
    drawBackground(delta);

    if (!gameOver) {
      const horizontal = Number(keys.has('ArrowRight') || keys.has('d')) - Number(keys.has('ArrowLeft') || keys.has('a'));
      const vertical = Number(keys.has('ArrowDown') || keys.has('s')) - Number(keys.has('ArrowUp') || keys.has('w'));
      const diagonalScale = horizontal && vertical ? Math.SQRT1_2 : 1;
      ship.x = Math.max(ship.radius, Math.min(width - ship.radius, ship.x + horizontal * ship.speed * delta * diagonalScale));
      ship.y = Math.max(ship.radius + 8, Math.min(height - ship.radius, ship.y + vertical * ship.speed * delta * diagonalScale));

      spawnTimer += delta;
      if (spawnTimer >= Math.max(0.34, 0.9 - score / 1800)) {
        spawnAsteroid();
        spawnTimer = 0;
      }

      for (const asteroid of asteroids) {
        asteroid.y += asteroid.speed * delta;
        drawAsteroid(asteroid);
        if (collides(asteroid)) gameOver = true;
      }
      asteroids = asteroids.filter((asteroid) => asteroid.y < height + asteroid.radius);

      score += delta * 10;
      scoreLabel.textContent = String(Math.floor(score));
      drawShip();
    } else {
      for (const asteroid of asteroids) drawAsteroid(asteroid);
      drawShip();
      drawGameOver();
    }

    requestAnimationFrame(frame);
  }

  window.addEventListener('keydown', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(key)) event.preventDefault();
    if (key === ' ' && gameOver) startGame();
    keys.add(key);
  });

  window.addEventListener('keyup', (event) => {
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    keys.delete(key);
  });

  startGame();
})();
