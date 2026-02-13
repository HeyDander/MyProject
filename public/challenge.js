const canvas = document.querySelector(".arcade-board");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("[data-ch-score]");
const bestEl = document.querySelector("[data-ch-best]");
const titleEl = document.querySelector("[data-ch-title]");
const descEl = document.querySelector("[data-ch-desc]");
const restartBtn = document.querySelector("[data-restart-ch]");
const difficultySelect = document.querySelector("[data-difficulty]");
const wordleWrapEl = document.querySelector("[data-wordle-wrap]");
const wordleGridEl = document.querySelector("[data-wordle-grid]");
const wordleFormEl = document.querySelector("[data-wordle-form]");
const wordleInputEl = document.querySelector("[data-wordle-input]");
const wordleStatusEl = document.querySelector("[data-wordle-status]");

const AUTO_RESTART_DELAY = 1400;
const WORDLE_WORDS = [
  "cloud", "track", "shard", "sword", "laser", "drift", "storm", "block", "brick", "light",
  "vapor", "scope", "skill", "spike", "boost", "flare", "quest", "arena", "snare", "glide",
];
const DIFFICULTY = {
  easy: 0.78,
  medium: 1,
  hard: 1.27,
  "very-hard": 1.55,
};

const gameId = window.location.pathname.split("/").pop() || "game-001";
const gameNumber = Number((/game-(\d{3,4})/.exec(gameId) || [null, "1"])[1]);
const catalog = window.CHALLENGE_CATALOG || [];
const gameMeta = catalog.find((g) => g.id === gameId) || catalog[0] || {
  id: gameId,
  mode: "dodge",
  name: "Challenge",
  description: "Survive",
};

const state = {
  mode: gameMeta.mode,
  score: 0,
  best: Number(localStorage.getItem(`challenge-best-${gameId}`) || 0),
  player: { x: 350, y: 360, w: 24, h: 24, speed: 5.8 },
  entities: [],
  bullets: [],
  keys: new Set(),
  over: false,
  restartTimeout: null,
  spawnTick: 0,
  awardTick: 0,
  difficulty: localStorage.getItem(`difficulty-${gameId}`) || "medium",
  touchTarget: null,
  touchDrag: null,
  lastTapAt: 0,
  wordle: {
    target: "",
    guesses: [],
    maxGuesses: 6,
  },
};

function challengeCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function skin() {
  return window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
}

function scale() {
  return DIFFICULTY[state.difficulty] || 1;
}

function setMeta() {
  titleEl.textContent = gameMeta.name;
  descEl.textContent = gameMeta.description;
  difficultySelect.value = state.difficulty;
  const isWordle = state.mode === "wordle";
  canvas.hidden = isWordle;
  descEl.hidden = isWordle;
  if (wordleWrapEl) wordleWrapEl.hidden = !isWordle;
}

function resetGame() {
  if (state.restartTimeout) {
    clearTimeout(state.restartTimeout);
    state.restartTimeout = null;
  }
  state.score = 0;
  state.over = false;
  state.spawnTick = 0;
  state.awardTick = 0;
  state.entities = [];
  state.bullets = [];
  state.player.x = canvas.width / 2 - state.player.w / 2;
  state.player.y = canvas.height - 46;
  state.player.speed = 5.6 / Math.max(0.82, scale() * 0.74);
  state.touchTarget = null;
  state.touchDrag = null;

  if (state.mode === "wordle") {
    const idx = (gameNumber * 7 + Math.floor(Date.now() / 60000)) % WORDLE_WORDS.length;
    state.wordle.target = WORDLE_WORDS[idx];
    state.wordle.guesses = [];
    renderWordle();
    renderScore();
    return;
  }
  renderScore();
}

function renderScore() {
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem(`challenge-best-${gameId}`, String(state.best));
  }
  scoreEl.textContent = String(state.score);
  bestEl.textContent = String(state.best);
}

function award(points) {
  state.score += points;
  renderScore();
  if (window.GameSkins) window.GameSkins.awardPoints(points);
}

function spawnEntity() {
  const d = scale();
  const r = (gameNumber * 97 + state.spawnTick * 37) % 100;

  if (state.mode === "collector") {
    if (r < 35) {
      state.entities.push({ kind: "pickup", x: Math.random() * (canvas.width - 16), y: -22, w: 16, h: 16, vx: 0, vy: 2.2 * d });
    } else {
      state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 22), y: -24, w: 22, h: 22, vx: 0, vy: (2.4 + Math.random() * 1.6) * d });
    }
    return;
  }

  if (state.mode === "blaster") {
    state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 26), y: -28, w: 26, h: 26, vx: 0, vy: (1.8 + Math.random() * 1.8) * d, hp: 1 });
    return;
  }

  if (state.mode === "dash") {
    state.entities.push({ kind: "hazard", x: canvas.width + 10, y: Math.random() * (canvas.height - 60), w: 20 + Math.random() * 24, h: 22 + Math.random() * 30, vx: -(3.0 + Math.random() * 2.4) * d, vy: 0 });
    return;
  }

  if (state.mode === "hunter") {
    state.entities.push({ kind: "hunter", x: Math.random() * (canvas.width - 24), y: -20, w: 22, h: 22, vx: 0, vy: 1.6 * d });
    return;
  }

  if (state.mode === "zigzag") {
    const vx = Math.random() > 0.5 ? 2.2 * d : -2.2 * d;
    state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 24), y: -24, w: 24, h: 24, vx, vy: 2.2 * d, zigzag: true });
    return;
  }

  if (state.mode === "shield") {
    if (r < 30) {
      state.entities.push({ kind: "pickup", x: Math.random() * (canvas.width - 18), y: -20, w: 18, h: 18, vx: 0, vy: 2.0 * d, shield: true });
    } else {
      state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 22), y: -24, w: 22, h: 22, vx: 0, vy: 2.5 * d });
    }
    return;
  }

  if (state.mode === "survivor") {
    state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 20), y: -24, w: 20, h: 20, vx: ((Math.random() * 2) - 1) * 2.1 * d, vy: (2.9 + Math.random() * 2.0) * d });
    return;
  }

  if (state.mode === "sniper") {
    state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 30), y: -32, w: 30, h: 30, vx: 0, vy: (1.5 + Math.random() * 1.2) * d, hp: 1 });
    return;
  }

  state.entities.push({ kind: "hazard", x: Math.random() * (canvas.width - 24), y: -24, w: 24, h: 24, vx: ((Math.random() * 2) - 1) * 1.3 * d, vy: (2.2 + Math.random() * 1.8) * d });
}

function collide(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function die() {
  if (state.over) return;
  state.over = true;
  state.restartTimeout = setTimeout(() => {
    state.restartTimeout = null;
    resetGame();
  }, AUTO_RESTART_DELAY);
}

function renderWordle() {
  if (!wordleGridEl || !wordleStatusEl || !wordleInputEl) return;
  const guesses = state.wordle.guesses;
  const target = state.wordle.target;
  wordleGridEl.innerHTML = "";

  for (let r = 0; r < state.wordle.maxGuesses; r += 1) {
    const row = document.createElement("div");
    row.className = "wordle-row";
    const guess = guesses[r] || "";
    for (let i = 0; i < 5; i += 1) {
      const cell = document.createElement("div");
      cell.className = "wordle-cell";
      const ch = guess[i] || "";
      cell.textContent = ch.toUpperCase();
      if (guess.length === 5) {
        if (target[i] === ch) cell.classList.add("hit");
        else if (target.includes(ch)) cell.classList.add("near");
        else cell.classList.add("miss");
      }
      row.appendChild(cell);
    }
    wordleGridEl.appendChild(row);
  }

  if (state.over) {
    const last = guesses[guesses.length - 1];
    if (last === target) {
      wordleStatusEl.textContent = "Correct! Auto restart...";
    } else {
      wordleStatusEl.textContent = `Word was "${target.toUpperCase()}". Auto restart...`;
    }
  } else {
    wordleStatusEl.textContent = `Guess ${guesses.length + 1} of ${state.wordle.maxGuesses}`;
  }
  wordleInputEl.value = "";
  wordleInputEl.disabled = state.over;
}

function submitWordleGuess(guess) {
  if (state.mode !== "wordle" || state.over) return;
  const normalized = String(guess || "").trim().toLowerCase();
  if (!/^[a-z]{5}$/.test(normalized)) return;
  if (state.wordle.guesses.length >= state.wordle.maxGuesses) return;

  state.wordle.guesses.push(normalized);
  if (normalized === state.wordle.target) {
    const bonus = 20 + (state.wordle.maxGuesses - state.wordle.guesses.length) * 10;
    award(bonus);
    state.over = true;
  } else if (state.wordle.guesses.length >= state.wordle.maxGuesses) {
    state.over = true;
  }

  if (state.over) {
    state.restartTimeout = setTimeout(() => {
      state.restartTimeout = null;
      resetGame();
    }, AUTO_RESTART_DELAY);
  }
  renderWordle();
}

function update() {
  if (state.mode === "wordle") return;
  if (state.over) return;

  const left = state.keys.has("arrowleft") || state.keys.has("a");
  const right = state.keys.has("arrowright") || state.keys.has("d");
  const up = state.keys.has("arrowup") || state.keys.has("w");
  const down = state.keys.has("arrowdown") || state.keys.has("s");

  if (left) state.player.x -= state.player.speed;
  if (right) state.player.x += state.player.speed;
  if (up) state.player.y -= state.player.speed;
  if (down) state.player.y += state.player.speed;

  if (state.touchTarget) {
    const dx = state.touchTarget.x - (state.player.x + state.player.w / 2);
    const dy = state.touchTarget.y - (state.player.y + state.player.h / 2);
    const len = Math.hypot(dx, dy);
    if (len > 4) {
      const step = state.player.speed * 1.15;
      state.player.x += (dx / len) * step;
      state.player.y += (dy / len) * step;
    }
  }

  state.player.x = Math.max(0, Math.min(canvas.width - state.player.w, state.player.x));
  state.player.y = Math.max(0, Math.min(canvas.height - state.player.h, state.player.y));

  state.spawnTick += 1;
  const interval = Math.max(13, Math.floor(34 / scale()));
  if (state.spawnTick % interval === 0) spawnEntity();

  if ((state.mode === "blaster" || state.mode === "sniper") && state.keys.has(" ")) {
    const fireTick = state.mode === "sniper" ? 14 : 7;
    if (state.spawnTick % fireTick !== 0) {
      // no-op
    } else {
      state.bullets.push({ x: state.player.x + state.player.w / 2 - 3, y: state.player.y - 10, w: 6, h: 10, vy: -8.5 });
    }
  }

  if (state.mode === "shield") {
    const shieldPickup = state.entities.find((e) => e.kind === "pickup" && e.shield && collide(state.player, e));
    if (shieldPickup) {
      state.entities = state.entities.filter((e) => e !== shieldPickup);
      state.player.shield = (state.player.shield || 0) + 1;
      award(8);
    }
  }

  for (const bullet of state.bullets) bullet.y += bullet.vy;
  state.bullets = state.bullets.filter((b) => b.y + b.h > 0);

  for (const e of state.entities) {
    if (e.kind === "hunter") {
      const dx = state.player.x - e.x;
      const dy = state.player.y - e.y;
      const len = Math.max(1, Math.hypot(dx, dy));
      e.x += (dx / len) * 1.6 * scale();
      e.y += (dy / len) * 1.6 * scale();
    } else {
      e.x += e.vx;
      e.y += e.vy;
      if (e.zigzag && (e.x < 0 || e.x + e.w > canvas.width)) {
        e.vx *= -1;
      }
    }
  }

  for (let i = state.entities.length - 1; i >= 0; i -= 1) {
    const e = state.entities[i];

    if (e.y > canvas.height + 40 || e.x < -60 || e.x > canvas.width + 60) {
      state.entities.splice(i, 1);
      continue;
    }

    if (e.kind === "pickup" && collide(state.player, e)) {
      state.entities.splice(i, 1);
      award(12);
      continue;
    }

    if ((e.kind === "hazard" || e.kind === "hunter") && collide(state.player, e)) {
      if (state.player.shield && state.player.shield > 0) {
        state.player.shield -= 1;
        state.entities.splice(i, 1);
        continue;
      }
      die();
      break;
    }

    if (state.mode === "blaster" || state.mode === "sniper") {
      for (let b = state.bullets.length - 1; b >= 0; b -= 1) {
        if (collide(state.bullets[b], e)) {
          state.bullets.splice(b, 1);
          state.entities.splice(i, 1);
          award(state.mode === "sniper" ? 16 : 10);
          break;
        }
      }
    }
  }

  if (state.mode !== "collector" && state.mode !== "blaster" && state.mode !== "sniper" && state.mode !== "wordle") {
    state.awardTick += 1;
    const awardEvery = state.mode === "survivor" ? 20 : 28;
    if (state.awardTick >= awardEvery) {
      state.awardTick = 0;
      award(state.mode === "survivor" ? 5 : 3);
    }
  }
}

function draw() {
  if (state.mode === "wordle") return;
  const s = skin();
  const primary = s ? s.palette.primary : "#74c691";
  const secondary = s ? s.palette.secondary : "#356f4d";
  const accent = s ? s.palette.accent : "#c5f3d2";

  ctx.fillStyle = "#0b130f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const e of state.entities) {
    ctx.fillStyle = e.kind === "pickup" ? accent : secondary;
    ctx.fillRect(e.x, e.y, e.w, e.h);
  }

  ctx.fillStyle = accent;
  for (const b of state.bullets) {
    ctx.fillRect(b.x, b.y, b.w, b.h);
  }

  ctx.fillStyle = primary;
  ctx.fillRect(state.player.x, state.player.y, state.player.w, state.player.h);
  if (state.player.shield && state.player.shield > 0) {
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.strokeRect(state.player.x - 3, state.player.y - 3, state.player.w + 6, state.player.h + 6);
  }

  if (state.over) {
    ctx.fillStyle = "rgba(0,0,0,0.52)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = accent;
    ctx.font = '700 36px "Manrope", sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 8);
    ctx.font = '500 16px "Manrope", sans-serif';
    ctx.fillText("Auto restart...", canvas.width / 2, canvas.height / 2 + 18);
  }
}

function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => state.keys.add(event.key.toLowerCase()));
window.addEventListener("keyup", (event) => state.keys.delete(event.key.toLowerCase()));
window.addEventListener("game-skin-change", draw);

canvas.addEventListener("pointerdown", (event) => {
  if (state.mode === "wordle") return;
  if (event.pointerType !== "touch") return;
  const p = challengeCanvasPoint(event);
  const x = p.x;
  const y = p.y;
  state.touchDrag = { startX: x, startY: y };
  state.touchTarget = null;

  const now = performance.now();
  if ((state.mode === "blaster" || state.mode === "sniper") && now - state.lastTapAt > 120 && !state.over) {
    state.lastTapAt = now;
    state.bullets.push({ x: state.player.x + state.player.w / 2 - 3, y: state.player.y - 10, w: 6, h: 10, vy: -8.5 });
  }
});

canvas.addEventListener("pointermove", (event) => {
  if (state.mode === "wordle") return;
  if (event.pointerType !== "touch" || !state.touchDrag) return;
  const p = challengeCanvasPoint(event);
  const x = p.x;
  const y = p.y;
  const dx = x - state.touchDrag.startX;
  const dy = y - state.touchDrag.startY;
  if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
  state.touchTarget = { x, y };
});

canvas.addEventListener("pointerup", (event) => {
  if (state.mode === "wordle") return;
  if (event.pointerType !== "touch") return;
  state.touchDrag = null;
  state.touchTarget = null;
});

canvas.addEventListener("pointercancel", (event) => {
  if (state.mode === "wordle") return;
  if (event.pointerType !== "touch") return;
  state.touchDrag = null;
  state.touchTarget = null;
});

difficultySelect.addEventListener("change", () => {
  state.difficulty = difficultySelect.value;
  localStorage.setItem(`difficulty-${gameId}`, state.difficulty);
  resetGame();
});

restartBtn.addEventListener("click", resetGame);
if (wordleFormEl && wordleInputEl) {
  wordleFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    submitWordleGuess(wordleInputEl.value);
  });
}
setMeta();
renderScore();
resetGame();
loop();
