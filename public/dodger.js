const ddCanvas = document.querySelector('.arcade-board');
const ddCtx = ddCanvas.getContext('2d');
const ddTimeEl = document.querySelector('[data-dodger-time]');
const ddBestEl = document.querySelector('[data-dodger-best]');
const ddRestartBtn = document.querySelector('[data-restart-dodger]');
const difficultySelect = document.querySelector("[data-difficulty]");
const AUTO_RESTART_DELAY = 1300;
const DIFFICULTY_KEY = "difficulty-dodger";
const DIFFICULTY_CONFIG = {
  easy: { spawnEvery: 38, speedMin: 1.6, speedVar: 1.2, playerSpeed: 6.8 },
  medium: { spawnEvery: 28, speedMin: 2.0, speedVar: 2.4, playerSpeed: 6.0 },
  hard: { spawnEvery: 22, speedMin: 2.5, speedVar: 2.8, playerSpeed: 5.5 },
  "very-hard": { spawnEvery: 16, speedMin: 3.1, speedVar: 3.1, playerSpeed: 5.0 },
};
let difficulty = "medium";

const dodger = {
  player: { x: 340, y: 378, w: 40, h: 22, speed: 6 },
  blocks: [],
  keys: new Set(),
  over: false,
  startAt: performance.now(),
  survivedSec: 0,
  bestSec: Number(localStorage.getItem('dodger-best-sec') || 0),
  lastAwardSec: 0,
  spawnTick: 0,
  restartTimeout: null,
  touchDrag: null,
};

function dodgerCanvasPoint(event) {
  const rect = ddCanvas.getBoundingClientRect();
  const sx = ddCanvas.width / rect.width;
  const sy = ddCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function ddSkin() {
  return window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
}

function ddReset() {
  if (dodger.restartTimeout) {
    clearTimeout(dodger.restartTimeout);
    dodger.restartTimeout = null;
  }
  dodger.player.x = 340;
  dodger.player.speed = DIFFICULTY_CONFIG[difficulty].playerSpeed;
  dodger.blocks = [];
  dodger.over = false;
  dodger.startAt = performance.now();
  dodger.survivedSec = 0;
  dodger.lastAwardSec = 0;
  dodger.spawnTick = 0;
  ddTimeEl.textContent = '0';
  ddBestEl.textContent = String(dodger.bestSec);
}

function scheduleDodgerRestart() {
  if (dodger.restartTimeout) return;
  dodger.restartTimeout = setTimeout(() => {
    dodger.restartTimeout = null;
    ddReset();
  }, AUTO_RESTART_DELAY);
}

function ddHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function ddUpdate() {
  if (dodger.over) return;

  if (dodger.keys.has('a') || dodger.keys.has('arrowleft')) dodger.player.x -= dodger.player.speed;
  if (dodger.keys.has('d') || dodger.keys.has('arrowright')) dodger.player.x += dodger.player.speed;
  dodger.player.x = Math.max(0, Math.min(ddCanvas.width - dodger.player.w, dodger.player.x));

  dodger.spawnTick += 1;
  const cfg = DIFFICULTY_CONFIG[difficulty];
  if (dodger.spawnTick % cfg.spawnEvery === 0) {
    const w = 24 + Math.random() * 36;
    dodger.blocks.push({
      x: Math.random() * (ddCanvas.width - w),
      y: -30,
      w,
      h: 18 + Math.random() * 18,
      speed: cfg.speedMin + Math.random() * cfg.speedVar,
    });
  }

  for (const block of dodger.blocks) block.y += block.speed;
  dodger.blocks = dodger.blocks.filter((b) => b.y < ddCanvas.height + 40);

  for (const block of dodger.blocks) {
    if (ddHit(dodger.player, block)) {
      dodger.over = true;
      scheduleDodgerRestart();
      break;
    }
  }

  dodger.survivedSec = Math.floor((performance.now() - dodger.startAt) / 1000);
  ddTimeEl.textContent = String(dodger.survivedSec);

  if (dodger.survivedSec > dodger.bestSec) {
    dodger.bestSec = dodger.survivedSec;
    localStorage.setItem('dodger-best-sec', String(dodger.bestSec));
    ddBestEl.textContent = String(dodger.bestSec);
  }

  if (dodger.survivedSec > dodger.lastAwardSec && dodger.survivedSec % 2 === 0) {
    dodger.lastAwardSec = dodger.survivedSec;
    if (window.GameSkins) window.GameSkins.awardPoints(6);
  }
}

function ddDraw() {
  const skin = ddSkin();
  const primary = skin ? skin.palette.primary : '#74c691';
  const secondary = skin ? skin.palette.secondary : '#356f4d';
  const accent = skin ? skin.palette.accent : '#c5f3d2';

  ddCtx.fillStyle = '#0b130f';
  ddCtx.fillRect(0, 0, ddCanvas.width, ddCanvas.height);

  ddCtx.fillStyle = secondary;
  for (const block of dodger.blocks) {
    ddCtx.fillRect(block.x, block.y, block.w, block.h);
  }

  ddCtx.fillStyle = primary;
  ddCtx.fillRect(dodger.player.x, dodger.player.y, dodger.player.w, dodger.player.h);
  ddCtx.fillStyle = accent;
  ddCtx.fillRect(dodger.player.x + 12, dodger.player.y - 7, 16, 7);

  if (dodger.over) {
    ddCtx.fillStyle = 'rgba(0,0,0,0.56)';
    ddCtx.fillRect(0, 0, ddCanvas.width, ddCanvas.height);
    ddCtx.fillStyle = accent;
    ddCtx.font = '700 38px "Manrope", sans-serif';
    ddCtx.textAlign = 'center';
    ddCtx.fillText('Game Over', ddCanvas.width / 2, ddCanvas.height / 2);
  }
}

function ddFrame() {
  ddUpdate();
  ddDraw();
  requestAnimationFrame(ddFrame);
}

window.addEventListener('keydown', (event) => {
  dodger.keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup', (event) => {
  dodger.keys.delete(event.key.toLowerCase());
});

ddCanvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch' || !dodger.touchDrag) return;
  const p = dodgerCanvasPoint(event);
  const x = p.x;
  const dx = x - dodger.touchDrag.startX;
  if (Math.abs(dx) < 6) return;
  dodger.player.x = dodger.touchDrag.startPlayerX + dx;
  dodger.player.x = Math.max(0, Math.min(ddCanvas.width - dodger.player.w, dodger.player.x));
});

ddCanvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  const p = dodgerCanvasPoint(event);
  dodger.touchDrag = {
    startX: p.x,
    startPlayerX: dodger.player.x,
  };
});

ddCanvas.addEventListener('pointerup', (event) => {
  if (event.pointerType !== 'touch') return;
  dodger.touchDrag = null;
});

ddCanvas.addEventListener('pointercancel', (event) => {
  if (event.pointerType !== 'touch') return;
  dodger.touchDrag = null;
});

ddRestartBtn.addEventListener('click', ddReset);
if (difficultySelect) {
  const savedDifficulty = localStorage.getItem(DIFFICULTY_KEY);
  if (savedDifficulty && DIFFICULTY_CONFIG[savedDifficulty]) {
    difficulty = savedDifficulty;
  }
  difficultySelect.value = difficulty;
  difficultySelect.addEventListener("change", () => {
    const next = difficultySelect.value;
    if (!DIFFICULTY_CONFIG[next]) return;
    difficulty = next;
    localStorage.setItem(DIFFICULTY_KEY, difficulty);
    ddReset();
  });
}
window.addEventListener('game-skin-change', ddDraw);

ddReset();
ddFrame();
