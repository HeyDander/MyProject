const shooterCanvas = document.querySelector(".shooter-board");
const shooterCtx = shooterCanvas.getContext("2d");
const shooterScoreEl = document.querySelector("[data-shooter-score]");
const shooterBestEl = document.querySelector("[data-shooter-best]");
const shooterRestartBtn = document.querySelector("[data-restart-shooter]");
const difficultySelect = document.querySelector("[data-difficulty]");
const AUTO_RESTART_DELAY = 1400;
const DIFFICULTY_KEY = "difficulty-shooter";
const DIFFICULTY_CONFIG = {
  easy: { spawnEvery: 60, enemyMinSpeed: 1.0, enemyVarSpeed: 0.8, playerSpeed: 6.6 },
  medium: { spawnEvery: 45, enemyMinSpeed: 1.4, enemyVarSpeed: 1.2, playerSpeed: 6.0 },
  hard: { spawnEvery: 34, enemyMinSpeed: 1.8, enemyVarSpeed: 1.5, playerSpeed: 5.6 },
  "very-hard": { spawnEvery: 26, enemyMinSpeed: 2.2, enemyVarSpeed: 1.9, playerSpeed: 5.2 },
};
let difficulty = "medium";

const shooterState = {
  player: { x: 340, y: 380, w: 40, h: 18, speed: 6 },
  bullets: [],
  enemies: [],
  keys: new Set(),
  score: 0,
  best: Number(localStorage.getItem("shooter-best") || 0),
  spawnTick: 0,
  gameOver: false,
  raf: null,
  restartTimeout: null,
  touchActive: false,
  touchMoved: false,
  touchStartX: 0,
  touchStartY: 0,
  touchX: 360,
  touchY: 360,
  aimAngle: -Math.PI / 2,
  shotCooldown: 0,
};

function shooterCanvasPoint(event) {
  const rect = shooterCanvas.getBoundingClientRect();
  const sx = shooterCanvas.width / rect.width;
  const sy = shooterCanvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function spawnPlayerBullet() {
  shooterState.bullets.push({
    x: shooterState.player.x + shooterState.player.w / 2 - 3,
    y: shooterState.player.y - 10,
    w: 6,
    h: 10,
    speed: 8,
  });
}

function shooterUpdateScore() {
  if (shooterState.score > shooterState.best) {
    shooterState.best = shooterState.score;
    localStorage.setItem("shooter-best", String(shooterState.best));
  }
  shooterScoreEl.textContent = String(shooterState.score);
  shooterBestEl.textContent = String(shooterState.best);
}

function currentSkin() {
  if (!window.GameSkins) return null;
  return window.GameSkins.getCurrentSkin();
}

function shooterReset() {
  if (shooterState.restartTimeout) {
    clearTimeout(shooterState.restartTimeout);
    shooterState.restartTimeout = null;
  }
  shooterState.player.x = 340;
  shooterState.bullets = [];
  shooterState.enemies = [];
  shooterState.player.speed = DIFFICULTY_CONFIG[difficulty].playerSpeed;
  shooterState.score = 0;
  shooterState.spawnTick = 0;
  shooterState.gameOver = false;
  shooterState.touchActive = false;
  shooterState.touchX = shooterCanvas.width / 2;
  shooterState.touchY = shooterCanvas.height / 2;
  shooterState.aimAngle = -Math.PI / 2;
  shooterState.shotCooldown = 0;
  shooterUpdateScore();
}

function scheduleShooterRestart() {
  if (shooterState.restartTimeout) return;
  shooterState.restartTimeout = setTimeout(() => {
    shooterState.restartTimeout = null;
    shooterReset();
  }, AUTO_RESTART_DELAY);
}

function shooterSpawnEnemy() {
  const cfg = DIFFICULTY_CONFIG[difficulty];
  const size = 24 + Math.floor(Math.random() * 10);
  shooterState.enemies.push({
    x: Math.random() * (shooterCanvas.width - size),
    y: -size,
    w: size,
    h: size,
    speed: cfg.enemyMinSpeed + Math.random() * cfg.enemyVarSpeed,
  });
}

function shooterRectHit(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function shooterInput() {
  const left = shooterState.keys.has("arrowleft") || shooterState.keys.has("a");
  const right = shooterState.keys.has("arrowright") || shooterState.keys.has("d");

  if (left) shooterState.player.x -= shooterState.player.speed;
  if (right) shooterState.player.x += shooterState.player.speed;

  if (shooterState.player.x < 0) shooterState.player.x = 0;
  if (shooterState.player.x + shooterState.player.w > shooterCanvas.width) {
    shooterState.player.x = shooterCanvas.width - shooterState.player.w;
  }

  if (shooterState.touchActive && shooterState.touchMoved) {
    shooterState.player.x = shooterState.touchX - shooterState.player.w / 2;
    if (shooterState.player.x < 0) shooterState.player.x = 0;
    if (shooterState.player.x + shooterState.player.w > shooterCanvas.width) {
      shooterState.player.x = shooterCanvas.width - shooterState.player.w;
    }
  }

  const cx = shooterState.player.x + shooterState.player.w / 2;
  const cy = shooterState.player.y + shooterState.player.h / 2;
  const targetX = shooterState.touchActive ? shooterState.touchX : cx;
  const targetY = shooterState.touchActive ? shooterState.touchY : 0;
  shooterState.aimAngle = Math.atan2(targetY - cy, targetX - cx);
}

function shooterUpdate() {
  if (shooterState.gameOver) return;

  shooterInput();
  shooterState.spawnTick += 1;

  if (shooterState.shotCooldown > 0) {
    shooterState.shotCooldown -= 1;
  }
  if (shooterState.touchActive && shooterState.shotCooldown <= 0) {
    spawnPlayerBullet();
    shooterState.shotCooldown = 7;
  }

  if (shooterState.spawnTick % DIFFICULTY_CONFIG[difficulty].spawnEvery === 0) {
    shooterSpawnEnemy();
  }

  for (const bullet of shooterState.bullets) {
    bullet.y -= bullet.speed;
  }
  shooterState.bullets = shooterState.bullets.filter((bullet) => bullet.y + bullet.h > 0);

  for (const enemy of shooterState.enemies) {
    enemy.y += enemy.speed;
  }

  for (let e = shooterState.enemies.length - 1; e >= 0; e -= 1) {
    const enemy = shooterState.enemies[e];

    if (enemy.y + enemy.h >= shooterCanvas.height) {
      shooterState.gameOver = true;
      scheduleShooterRestart();
      break;
    }

    if (shooterRectHit(enemy, shooterState.player)) {
      shooterState.gameOver = true;
      scheduleShooterRestart();
      break;
    }

    for (let b = shooterState.bullets.length - 1; b >= 0; b -= 1) {
      const bullet = shooterState.bullets[b];
      if (shooterRectHit(enemy, bullet)) {
        shooterState.enemies.splice(e, 1);
        shooterState.bullets.splice(b, 1);
        shooterState.score += 10;
        if (window.GameSkins) {
          window.GameSkins.awardPoints(10);
        }
        shooterUpdateScore();
        break;
      }
    }
  }
}

function shooterDraw() {
  shooterCtx.fillStyle = "#0b130f";
  shooterCtx.fillRect(0, 0, shooterCanvas.width, shooterCanvas.height);

  shooterCtx.strokeStyle = "rgba(78, 117, 96, 0.2)";
  for (let i = 0; i < shooterCanvas.width; i += 24) {
    shooterCtx.beginPath();
    shooterCtx.moveTo(i, 0);
    shooterCtx.lineTo(i, shooterCanvas.height);
    shooterCtx.stroke();
  }

  const skin = currentSkin();
  const primary = skin ? skin.palette.primary : "#84d9a4";
  const secondary = skin ? skin.palette.secondary : "#4ea777";
  const accent = skin ? skin.palette.accent : "#d8ffe3";

  shooterCtx.fillStyle = primary;
  shooterCtx.fillRect(
    shooterState.player.x,
    shooterState.player.y,
    shooterState.player.w,
    shooterState.player.h
  );
  shooterCtx.fillStyle = accent;
  shooterCtx.save();
  shooterCtx.translate(
    shooterState.player.x + shooterState.player.w / 2,
    shooterState.player.y + shooterState.player.h / 2
  );
  shooterCtx.rotate(shooterState.aimAngle + Math.PI / 2);
  shooterCtx.fillRect(-6, -16, 12, 20);
  shooterCtx.restore();

  shooterCtx.fillStyle = accent;
  for (const bullet of shooterState.bullets) {
    shooterCtx.fillRect(bullet.x, bullet.y, bullet.w, bullet.h);
  }

  shooterCtx.fillStyle = secondary;
  for (const enemy of shooterState.enemies) {
    shooterCtx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
  }

  if (shooterState.gameOver) {
    shooterCtx.fillStyle = "rgba(0, 0, 0, 0.55)";
    shooterCtx.fillRect(0, 0, shooterCanvas.width, shooterCanvas.height);

    shooterCtx.fillStyle = "#eaf4ed";
    shooterCtx.textAlign = "center";
    shooterCtx.font = '700 38px "Manrope", sans-serif';
    shooterCtx.fillText("Game Over", shooterCanvas.width / 2, shooterCanvas.height / 2 - 16);
    shooterCtx.font = '500 16px "Manrope", sans-serif';
    shooterCtx.fillText("Auto restart...", shooterCanvas.width / 2, shooterCanvas.height / 2 + 18);
  }
}

function shooterLoop() {
  shooterUpdate();
  shooterDraw();
  shooterState.raf = requestAnimationFrame(shooterLoop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  shooterState.keys.add(key);

  if (key === " " && !shooterState.gameOver) {
    spawnPlayerBullet();
  }
});

window.addEventListener("keyup", (event) => {
  shooterState.keys.delete(event.key.toLowerCase());
});

shooterCanvas.addEventListener("pointermove", (event) => {
  if (event.pointerType !== "touch" || !shooterState.touchActive) return;
  const p = shooterCanvasPoint(event);
  shooterState.touchX = p.x;
  shooterState.touchY = p.y;
  const dx = shooterState.touchX - shooterState.touchStartX;
  const dy = shooterState.touchY - shooterState.touchStartY;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
    shooterState.touchMoved = true;
  }
});

shooterCanvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "touch") return;
  const p = shooterCanvasPoint(event);
  shooterState.touchActive = true;
  shooterState.touchMoved = false;
  shooterState.touchX = p.x;
  shooterState.touchY = p.y;
  shooterState.touchStartX = shooterState.touchX;
  shooterState.touchStartY = shooterState.touchY;
  shooterState.shotCooldown = 0;
});

shooterCanvas.addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch") return;
  shooterState.touchActive = false;
  shooterState.touchMoved = false;
});

shooterCanvas.addEventListener("pointercancel", (event) => {
  if (event.pointerType !== "touch") return;
  shooterState.touchActive = false;
  shooterState.touchMoved = false;
});

shooterRestartBtn.addEventListener("click", shooterReset);
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
    shooterReset();
  });
}

shooterUpdateScore();
shooterReset();
shooterLoop();
