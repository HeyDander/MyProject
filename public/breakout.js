const boCanvas = document.querySelector('.arcade-board');
const boCtx = boCanvas.getContext('2d');
const boScoreEl = document.querySelector('[data-breakout-score]');
const boLivesEl = document.querySelector('[data-breakout-lives]');
const boRestartBtn = document.querySelector('[data-restart-breakout]');
const difficultySelect = document.querySelector("[data-difficulty]");
const AUTO_RESTART_DELAY = 1400;
const DIFFICULTY_KEY = "difficulty-breakout";
const DIFFICULTY_CONFIG = {
  easy: { lives: 5, paddleW: 130, ballSpeed: 3.2, rows: 4, cols: 9 },
  medium: { lives: 3, paddleW: 110, ballSpeed: 3.8, rows: 5, cols: 10 },
  hard: { lives: 2, paddleW: 96, ballSpeed: 4.3, rows: 6, cols: 10 },
  "very-hard": { lives: 1, paddleW: 88, ballSpeed: 4.9, rows: 6, cols: 11 },
};
let difficulty = "medium";

const breakout = {
  paddle: { x: 305, y: 390, w: 110, h: 14, speed: 7 },
  ball: { x: 360, y: 250, r: 8, vx: 3.8, vy: -3.8 },
  bricks: [],
  keys: new Set(),
  score: 0,
  lives: 3,
  over: false,
  win: false,
  restartTimeout: null,
  touchDrag: null,
};

function breakoutCanvasPoint(event) {
  const rect = boCanvas.getBoundingClientRect();
  const sx = boCanvas.width / rect.width;
  const sy = boCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function boSkin() {
  return window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
}

function buildBricks(rows, cols) {
  const startX = 20;
  const startY = 42;
  const gap = 6;
  const usableWidth = boCanvas.width - startX * 2 - gap * (cols - 1);
  const bw = Math.floor(usableWidth / cols);
  const bh = 20;
  const out = [];

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      out.push({ x: startX + c * (bw + gap), y: startY + r * (bh + gap), w: bw, h: bh, alive: true });
    }
  }
  return out;
}

function resetBallAndPaddle() {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  breakout.paddle.x = (boCanvas.width - breakout.paddle.w) / 2;
  breakout.ball.x = boCanvas.width / 2;
  breakout.ball.y = 250;
  breakout.ball.vx = (Math.random() > 0.5 ? 1 : -1) * cfg.ballSpeed;
  breakout.ball.vy = -cfg.ballSpeed;
}

function resetBreakout() {
  if (breakout.restartTimeout) {
    clearTimeout(breakout.restartTimeout);
    breakout.restartTimeout = null;
  }
  breakout.score = 0;
  const cfg = DIFFICULTY_CONFIG[difficulty];
  breakout.paddle.w = cfg.paddleW;
  breakout.lives = cfg.lives;
  breakout.over = false;
  breakout.win = false;
  breakout.bricks = buildBricks(cfg.rows, cfg.cols);
  resetBallAndPaddle();
  boScoreEl.textContent = String(breakout.score);
  boLivesEl.textContent = String(breakout.lives);
}

function scheduleBreakoutRestart() {
  if (breakout.restartTimeout) return;
  breakout.restartTimeout = setTimeout(() => {
    breakout.restartTimeout = null;
    resetBreakout();
  }, AUTO_RESTART_DELAY);
}

function hitRect(ball, rect) {
  return (
    ball.x + ball.r > rect.x &&
    ball.x - ball.r < rect.x + rect.w &&
    ball.y + ball.r > rect.y &&
    ball.y - ball.r < rect.y + rect.h
  );
}

function updateBreakout() {
  if (breakout.over) return;

  if (breakout.keys.has('a') || breakout.keys.has('arrowleft')) breakout.paddle.x -= breakout.paddle.speed;
  if (breakout.keys.has('d') || breakout.keys.has('arrowright')) breakout.paddle.x += breakout.paddle.speed;
  breakout.paddle.x = Math.max(0, Math.min(boCanvas.width - breakout.paddle.w, breakout.paddle.x));

  breakout.ball.x += breakout.ball.vx;
  breakout.ball.y += breakout.ball.vy;

  if (breakout.ball.x - breakout.ball.r <= 0 || breakout.ball.x + breakout.ball.r >= boCanvas.width) {
    breakout.ball.vx *= -1;
  }
  if (breakout.ball.y - breakout.ball.r <= 0) {
    breakout.ball.vy *= -1;
  }

  if (hitRect(breakout.ball, breakout.paddle) && breakout.ball.vy > 0) {
    const t = (breakout.ball.x - (breakout.paddle.x + breakout.paddle.w / 2)) / (breakout.paddle.w / 2);
    breakout.ball.vx += t * 1.4;
    breakout.ball.vy = -Math.abs(breakout.ball.vy);
  }

  for (const brick of breakout.bricks) {
    if (!brick.alive) continue;
    if (hitRect(breakout.ball, brick)) {
      brick.alive = false;
      breakout.ball.vy *= -1;
      breakout.score += 8;
      boScoreEl.textContent = String(breakout.score);
      if (window.GameSkins) window.GameSkins.awardPoints(8);
      break;
    }
  }

  if (breakout.ball.y - breakout.ball.r > boCanvas.height) {
    breakout.lives -= 1;
    boLivesEl.textContent = String(breakout.lives);
    if (breakout.lives <= 0) {
      breakout.over = true;
      scheduleBreakoutRestart();
    } else {
      resetBallAndPaddle();
    }
  }

  if (breakout.bricks.every((b) => !b.alive)) {
    breakout.over = true;
    breakout.win = true;
    if (window.GameSkins) window.GameSkins.awardPoints(120);
    scheduleBreakoutRestart();
  }
}

function drawBreakout() {
  const skin = boSkin();
  const primary = skin ? skin.palette.primary : '#74c691';
  const secondary = skin ? skin.palette.secondary : '#356f4d';
  const accent = skin ? skin.palette.accent : '#c5f3d2';

  boCtx.fillStyle = '#0b130f';
  boCtx.fillRect(0, 0, boCanvas.width, boCanvas.height);

  boCtx.fillStyle = primary;
  boCtx.fillRect(breakout.paddle.x, breakout.paddle.y, breakout.paddle.w, breakout.paddle.h);

  boCtx.fillStyle = accent;
  boCtx.beginPath();
  boCtx.arc(breakout.ball.x, breakout.ball.y, breakout.ball.r, 0, Math.PI * 2);
  boCtx.fill();

  boCtx.fillStyle = secondary;
  for (const brick of breakout.bricks) {
    if (!brick.alive) continue;
    boCtx.fillRect(brick.x, brick.y, brick.w, brick.h);
  }

  if (breakout.over) {
    boCtx.fillStyle = 'rgba(0,0,0,0.54)';
    boCtx.fillRect(0, 0, boCanvas.width, boCanvas.height);
    boCtx.fillStyle = accent;
    boCtx.font = '700 38px "Manrope", sans-serif';
    boCtx.textAlign = 'center';
    boCtx.fillText(breakout.win ? 'You Cleared It' : 'Game Over', boCanvas.width / 2, boCanvas.height / 2);
  }
}

function breakoutFrame() {
  updateBreakout();
  drawBreakout();
  requestAnimationFrame(breakoutFrame);
}

window.addEventListener('keydown', (event) => {
  breakout.keys.add(event.key.toLowerCase());
});
window.addEventListener('keyup', (event) => {
  breakout.keys.delete(event.key.toLowerCase());
});
boCanvas.addEventListener('mousemove', (event) => {
  const p = breakoutCanvasPoint(event);
  const x = p.x;
  breakout.paddle.x = x - breakout.paddle.w / 2;
});

boCanvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch' || !breakout.touchDrag) return;
  const p = breakoutCanvasPoint(event);
  const x = p.x;
  const dx = x - breakout.touchDrag.startX;
  if (Math.abs(dx) < 6) return;
  breakout.paddle.x = breakout.touchDrag.startPaddleX + dx;
  breakout.paddle.x = Math.max(0, Math.min(boCanvas.width - breakout.paddle.w, breakout.paddle.x));
});

boCanvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  const p = breakoutCanvasPoint(event);
  breakout.touchDrag = {
    startX: p.x,
    startPaddleX: breakout.paddle.x,
  };
});

boCanvas.addEventListener('pointerup', (event) => {
  if (event.pointerType !== 'touch') return;
  breakout.touchDrag = null;
});

boCanvas.addEventListener('pointercancel', (event) => {
  if (event.pointerType !== 'touch') return;
  breakout.touchDrag = null;
});

boRestartBtn.addEventListener('click', resetBreakout);
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
    resetBreakout();
  });
}
window.addEventListener('game-skin-change', drawBreakout);

resetBreakout();
breakoutFrame();
