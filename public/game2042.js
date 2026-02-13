const boardEl = document.querySelector("[data-2042-board]");
const scoreEl = document.querySelector("[data-2042-score]");
const bestEl = document.querySelector("[data-2042-best]");
const statusEl = document.querySelector("[data-2042-status]");
const restartBtn = document.querySelector("[data-restart-2042]");
const difficultySelect = document.querySelector("[data-difficulty]");
const AUTO_RESTART_DELAY = 1700;
const DIFFICULTY_KEY = "difficulty-2042";
const DIFFICULTY_CONFIG = {
  easy: { chance4: 0.06, extraSpawnChance: 0.0 },
  medium: { chance4: 0.1, extraSpawnChance: 0.0 },
  hard: { chance4: 0.2, extraSpawnChance: 0.15 },
  "very-hard": { chance4: 0.3, extraSpawnChance: 0.28 },
};

let board;
let score;
let best;
let gameOver;
let won;
let dragStart = null;
let restartTimeout = null;
let difficulty = "medium";

function boardPoint(event) {
  const rect = boardEl.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function createEmptyBoard() {
  return Array.from({ length: 4 }, () => Array(4).fill(0));
}

function randomEmptyCell() {
  const cells = [];
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      if (board[r][c] === 0) {
        cells.push([r, c]);
      }
    }
  }
  if (!cells.length) return null;
  return cells[Math.floor(Math.random() * cells.length)];
}

function addRandomTile() {
  const cell = randomEmptyCell();
  if (!cell) return;
  const [r, c] = cell;
  board[r][c] = Math.random() < 1 - DIFFICULTY_CONFIG[difficulty].chance4 ? 2 : 4;
}

function slideAndMerge(row) {
  const compact = row.filter((n) => n !== 0);
  const merged = [];
  let gained = 0;

  for (let i = 0; i < compact.length; i += 1) {
    if (compact[i] === compact[i + 1]) {
      const value = compact[i] * 2;
      merged.push(value);
      gained += value;
      i += 1;
    } else {
      merged.push(compact[i]);
    }
  }

  while (merged.length < 4) merged.push(0);
  return { row: merged, gained };
}

function rotateClockwise(matrix) {
  const result = createEmptyBoard();
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      result[c][3 - r] = matrix[r][c];
    }
  }
  return result;
}

function moveLeft() {
  let moved = false;
  let gainedTotal = 0;

  board = board.map((row) => {
    const before = row.join(",");
    const { row: afterRow, gained } = slideAndMerge(row);
    if (before !== afterRow.join(",")) {
      moved = true;
    }
    gainedTotal += gained;
    return afterRow;
  });

  score += gainedTotal;
  if (gainedTotal > 0 && window.GameSkins) {
    window.GameSkins.awardPoints(gainedTotal);
  }
  return moved;
}

function move(direction) {
  if (gameOver) return;

  let turns = 0;
  if (direction === "up") turns = 3;
  if (direction === "right") turns = 2;
  if (direction === "down") turns = 1;

  for (let i = 0; i < turns; i += 1) board = rotateClockwise(board);
  const moved = moveLeft();
  for (let i = 0; i < (4 - turns) % 4; i += 1) board = rotateClockwise(board);

  if (moved) {
    addRandomTile();
    if (Math.random() < DIFFICULTY_CONFIG[difficulty].extraSpawnChance) {
      addRandomTile();
    }
    if (score > best) {
      best = score;
      localStorage.setItem("2042-best", String(best));
    }
  }

  won = won || score >= 2042;
  gameOver = !canMove();
  if (gameOver && !restartTimeout) {
    restartTimeout = setTimeout(() => {
      restartTimeout = null;
      reset();
    }, AUTO_RESTART_DELAY);
  }
  render();
}

function canMove() {
  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const value = board[r][c];
      if (value === 0) return true;
      if (c < 3 && value === board[r][c + 1]) return true;
      if (r < 3 && value === board[r + 1][c]) return true;
    }
  }
  return false;
}

function tileClass(value) {
  if (value === 0) return "tile empty";
  if (value <= 8) return "tile low";
  if (value <= 64) return "tile mid";
  if (value <= 512) return "tile high";
  return "tile top";
}

function applySkinTheme() {
  const skin = window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
  if (!skin) return;

  boardEl.style.setProperty("--tile-low", skin.palette.tileLow);
  boardEl.style.setProperty("--tile-mid", skin.palette.tileMid);
  boardEl.style.setProperty("--tile-high", skin.palette.tileHigh);
  boardEl.style.setProperty("--tile-top", skin.palette.tileTop);
}

function render() {
  boardEl.innerHTML = "";

  for (let r = 0; r < 4; r += 1) {
    for (let c = 0; c < 4; c += 1) {
      const value = board[r][c];
      const tile = document.createElement("div");
      tile.className = tileClass(value);
      tile.textContent = value === 0 ? "" : String(value);
      boardEl.appendChild(tile);
    }
  }

  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);

  if (gameOver) {
    statusEl.textContent = "Game over. Auto restart...";
  } else if (won) {
    statusEl.textContent = "You reached 2042 score. Keep going.";
  } else {
    statusEl.textContent = "Swipe or use Arrow keys/WASD to move tiles.";
  }
}

function reset() {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
  board = createEmptyBoard();
  score = 0;
  gameOver = false;
  won = false;
  addRandomTile();
  addRandomTile();
  applySkinTheme();
  render();
}

function handleDragEnd(startX, startY, endX, endY) {
  const dx = endX - startX;
  const dy = endY - startY;
  const min = 24;

  if (Math.abs(dx) < min && Math.abs(dy) < min) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    move(dx > 0 ? "right" : "left");
  } else {
    move(dy > 0 ? "down" : "up");
  }
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowleft" || key === "a") move("left");
  if (key === "arrowright" || key === "d") move("right");
  if (key === "arrowup" || key === "w") move("up");
  if (key === "arrowdown" || key === "s") move("down");
});

restartBtn.addEventListener("click", reset);
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
    reset();
  });
}
boardEl.addEventListener("pointerdown", (event) => {
  dragStart = boardPoint(event);
});

boardEl.addEventListener("pointerup", (event) => {
  if (!dragStart) return;
  const p = boardPoint(event);
  handleDragEnd(dragStart.x, dragStart.y, p.x, p.y);
  dragStart = null;
});

boardEl.addEventListener("pointercancel", () => {
  dragStart = null;
});

window.addEventListener("game-skin-change", () => {
  applySkinTheme();
  render();
});

best = Number(localStorage.getItem("2042-best") || 0);
reset();
