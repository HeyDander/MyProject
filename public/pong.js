const pongCanvas = document.querySelector('.arcade-board');
const pongCtx = pongCanvas.getContext('2d');
const youEl = document.querySelector('[data-pong-you]');
const aiEl = document.querySelector('[data-pong-ai]');
const restartPongBtn = document.querySelector('[data-restart-pong]');
const difficultySelect = document.querySelector("[data-difficulty]");
const AUTO_RESTART_DELAY = 1500;
const DIFFICULTY_KEY = "difficulty-pong";
const DIFFICULTY_CONFIG = {
  easy: { playerH: 96, aiH: 70, aiSpeed: 2.7, aiDeadzone: 30, ballSpeed: 3.2 },
  medium: { playerH: 86, aiH: 86, aiSpeed: 4.2, aiDeadzone: 10, ballSpeed: 3.8 },
  hard: { playerH: 82, aiH: 96, aiSpeed: 5.2, aiDeadzone: 6, ballSpeed: 4.3 },
  "very-hard": { playerH: 76, aiH: 108, aiSpeed: 6.1, aiDeadzone: 2, ballSpeed: 4.9 },
};
let difficulty = "medium";

const pong = {
  you: { x: 24, y: 170, w: 12, h: 84, speed: 6 },
  ai: { x: 684, y: 170, w: 12, h: 84, speed: 4.6 },
  ball: { x: 360, y: 210, r: 8, vx: 4, vy: 3 },
  keys: new Set(),
  youScore: 0,
  aiScore: 0,
  over: false,
  restartTimeout: null,
  touchDrag: null,
};

function pongCanvasPoint(event) {
  const rect = pongCanvas.getBoundingClientRect();
  const sx = pongCanvas.width / rect.width;
  const sy = pongCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function pongSkin() {
  return window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
}

function resetBall(direction = 1) {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  pong.ball.x = pongCanvas.width / 2;
  pong.ball.y = pongCanvas.height / 2;
  pong.ball.vx = (cfg.ballSpeed + Math.random() * 1.3) * direction;
  pong.ball.vy = (Math.random() * 3.4 - 1.7) || 1.2;
}

function updateScore() {
  youEl.textContent = String(pong.youScore);
  aiEl.textContent = String(pong.aiScore);
}

function resetPong() {
  if (pong.restartTimeout) {
    clearTimeout(pong.restartTimeout);
    pong.restartTimeout = null;
  }
  pong.youScore = 0;
  pong.aiScore = 0;
  pong.over = false;
  const cfg = DIFFICULTY_CONFIG[difficulty];
  pong.you.h = cfg.playerH;
  pong.ai.h = cfg.aiH;
  pong.ai.speed = cfg.aiSpeed;
  pong.you.y = (pongCanvas.height - pong.you.h) / 2;
  pong.ai.y = (pongCanvas.height - pong.ai.h) / 2;
  resetBall(Math.random() > 0.5 ? 1 : -1);
  updateScore();
}

function schedulePongRestart() {
  if (pong.restartTimeout) return;
  pong.restartTimeout = setTimeout(() => {
    pong.restartTimeout = null;
    resetPong();
  }, AUTO_RESTART_DELAY);
}

function paddleHit(p) {
  return (
    pong.ball.x - pong.ball.r < p.x + p.w &&
    pong.ball.x + pong.ball.r > p.x &&
    pong.ball.y + pong.ball.r > p.y &&
    pong.ball.y - pong.ball.r < p.y + p.h
  );
}

function updatePong() {
  if (pong.over) return;

  if (pong.keys.has('w') || pong.keys.has('arrowup')) pong.you.y -= pong.you.speed;
  if (pong.keys.has('s') || pong.keys.has('arrowdown')) pong.you.y += pong.you.speed;
  pong.you.y = Math.max(0, Math.min(pongCanvas.height - pong.you.h, pong.you.y));

  const cfg = DIFFICULTY_CONFIG[difficulty];
  const aiCenter = pong.ai.y + pong.ai.h / 2;
  if (pong.ball.y < aiCenter - cfg.aiDeadzone) pong.ai.y -= pong.ai.speed;
  if (pong.ball.y > aiCenter + cfg.aiDeadzone) pong.ai.y += pong.ai.speed;
  pong.ai.y = Math.max(0, Math.min(pongCanvas.height - pong.ai.h, pong.ai.y));

  pong.ball.x += pong.ball.vx;
  pong.ball.y += pong.ball.vy;

  if (pong.ball.y - pong.ball.r <= 0 || pong.ball.y + pong.ball.r >= pongCanvas.height) {
    pong.ball.vy *= -1;
  }

  if (paddleHit(pong.you) && pong.ball.vx < 0) {
    const t = (pong.ball.y - (pong.you.y + pong.you.h / 2)) / (pong.you.h / 2);
    pong.ball.vx = Math.abs(pong.ball.vx) + 0.15;
    pong.ball.vy += t * 1.2;
  }

  if (paddleHit(pong.ai) && pong.ball.vx > 0) {
    const t = (pong.ball.y - (pong.ai.y + pong.ai.h / 2)) / (pong.ai.h / 2);
    pong.ball.vx = -(Math.abs(pong.ball.vx) + 0.15);
    pong.ball.vy += t * 1.2;
  }

  if (pong.ball.x < -20) {
    pong.aiScore += 1;
    if (pong.aiScore >= 7) {
      pong.over = true;
      schedulePongRestart();
    }
    resetBall(-1);
    updateScore();
  }

  if (pong.ball.x > pongCanvas.width + 20) {
    pong.youScore += 1;
    if (window.GameSkins) window.GameSkins.awardPoints(20);
    if (pong.youScore >= 7) {
      pong.over = true;
      schedulePongRestart();
    }
    resetBall(1);
    updateScore();
  }
}

function drawPong() {
  const skin = pongSkin();
  const primary = skin ? skin.palette.primary : '#74c691';
  const secondary = skin ? skin.palette.secondary : '#356f4d';
  const accent = skin ? skin.palette.accent : '#c5f3d2';

  pongCtx.fillStyle = '#0b130f';
  pongCtx.fillRect(0, 0, pongCanvas.width, pongCanvas.height);

  pongCtx.strokeStyle = 'rgba(124, 168, 140, 0.35)';
  pongCtx.setLineDash([10, 10]);
  pongCtx.beginPath();
  pongCtx.moveTo(pongCanvas.width / 2, 0);
  pongCtx.lineTo(pongCanvas.width / 2, pongCanvas.height);
  pongCtx.stroke();
  pongCtx.setLineDash([]);

  pongCtx.fillStyle = primary;
  pongCtx.fillRect(pong.you.x, pong.you.y, pong.you.w, pong.you.h);
  pongCtx.fillRect(pong.ai.x, pong.ai.y, pong.ai.w, pong.ai.h);

  pongCtx.fillStyle = accent;
  pongCtx.beginPath();
  pongCtx.arc(pong.ball.x, pong.ball.y, pong.ball.r, 0, Math.PI * 2);
  pongCtx.fill();

  if (pong.over) {
    pongCtx.fillStyle = 'rgba(0,0,0,0.5)';
    pongCtx.fillRect(0, 0, pongCanvas.width, pongCanvas.height);
    pongCtx.fillStyle = secondary;
    pongCtx.font = '700 40px "Manrope", sans-serif';
    pongCtx.textAlign = 'center';
    const text = pong.youScore > pong.aiScore ? 'You Win' : 'AI Wins';
    pongCtx.fillText(text, pongCanvas.width / 2, pongCanvas.height / 2);
  }
}

function pongFrame() {
  updatePong();
  drawPong();
  requestAnimationFrame(pongFrame);
}

window.addEventListener('keydown', (event) => {
  pong.keys.add(event.key.toLowerCase());
});

window.addEventListener('keyup', (event) => {
  pong.keys.delete(event.key.toLowerCase());
});

pongCanvas.addEventListener('pointermove', (event) => {
  if (event.pointerType !== 'touch' || !pong.touchDrag) return;
  const p = pongCanvasPoint(event);
  const y = p.y;
  const dy = y - pong.touchDrag.startY;
  if (Math.abs(dy) < 6) return;
  pong.you.y = pong.touchDrag.startPaddleY + dy;
  pong.you.y = Math.max(0, Math.min(pongCanvas.height - pong.you.h, pong.you.y));
});

pongCanvas.addEventListener('pointerdown', (event) => {
  if (event.pointerType !== 'touch') return;
  const p = pongCanvasPoint(event);
  pong.touchDrag = {
    startY: p.y,
    startPaddleY: pong.you.y,
  };
});

pongCanvas.addEventListener('pointerup', (event) => {
  if (event.pointerType !== 'touch') return;
  pong.touchDrag = null;
});

pongCanvas.addEventListener('pointercancel', (event) => {
  if (event.pointerType !== 'touch') return;
  pong.touchDrag = null;
});

restartPongBtn.addEventListener('click', resetPong);
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
    resetPong();
  });
}
window.addEventListener('game-skin-change', drawPong);

resetPong();
pongFrame();
