// --- Réglages du jeu ---
const GRID = 16;
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const cell = canvas.width / GRID;

const scoreEl = document.getElementById('score');
const bestEl = document.getElementById('best');
const overlay = document.getElementById('overlay');
const overlayText = document.getElementById('overlay-text');
const startBtn = document.getElementById('start-btn');

let snake, dir, nextDir, food, score, best, loopId, running;

function resetGame() {
  snake = [{ x: 8, y: 8 }, { x: 7, y: 8 }, { x: 6, y: 8 }];
  dir = { x: 1, y: 0 };
  nextDir = dir;
  score = 0;
  scoreEl.textContent = score;
  placeFood();
  draw();
}

function placeFood() {
  let ok = false;
  while (!ok) {
    food = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    ok = !snake.some(s => s.x === food.x && s.y === food.y);
  }
}

function tick() {
  dir = nextDir;
  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };

  const hitWall = head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID;
  const hitSelf = snake.some(s => s.x === head.x && s.y === head.y);

  if (hitWall || hitSelf) {
    gameOver();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    scoreEl.textContent = score;
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // nourriture
  ctx.fillStyle = '#ff3d6e';
  ctx.beginPath();
  ctx.arc(food.x * cell + cell / 2, food.y * cell + cell / 2, cell / 2.6, 0, Math.PI * 2);
  ctx.fill();

  // serpent
  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#39ff88' : '#1d8f4f';
    ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
  });
}

function gameOver() {
  running = false;
  clearInterval(loopId);
  best = Math.max(best, score);
  bestEl.textContent = best;
  localStorage.setItem('neon-snake-best', best);
  overlayText.textContent = `Perdu ! Score : ${score}. Rejouer ?`;
  startBtn.textContent = 'Rejouer';
  overlay.classList.remove('hidden');
}

function startGame() {
  resetGame();
  overlay.classList.add('hidden');
  running = true;
  clearInterval(loopId);
  loopId = setInterval(tick, 130);
}

function setDirection(name) {
  const map = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const d = map[name];
  if (!d) return;
  // empêche le demi-tour instantané
  if (d.x === -dir.x && d.y === -dir.y) return;
  nextDir = d;
}

// --- Contrôles clavier (ordinateur) ---
window.addEventListener('keydown', (e) => {
  const keyMap = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    w: 'up', s: 'down', a: 'left', d: 'right',
  };
  if (keyMap[e.key]) {
    e.preventDefault();
    if (!running) startGame();
    setDirection(keyMap[e.key]);
  }
});

// --- Contrôles tactiles (mobile) ---
document.querySelectorAll('.dpad-btn').forEach(btn => {
  btn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (!running) startGame();
    setDirection(btn.dataset.dir);
  }, { passive: false });
  btn.addEventListener('click', () => {
    if (!running) startGame();
    setDirection(btn.dataset.dir);
  });
});

startBtn.addEventListener('click', startGame);

// --- Initialisation ---
best = Number(localStorage.getItem('neon-snake-best') || 0);
bestEl.textContent = best;
resetGame();

// --- Enregistrement du service worker (mode hors ligne) ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(err => console.warn('SW échoué :', err));
  });
}
