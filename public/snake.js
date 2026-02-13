const GRID_SIZE = 21;
const CELL_SIZE = 20;
const AUTO_RESTART_DELAY = 1300;
const DIFFICULTY_KEY = "difficulty-snake";
const DIFFICULTY_CONFIG = {
  easy: { speed: 165 },
  medium: { speed: 120 },
  hard: { speed: 92 },
  "very-hard": { speed: 72 },
};

const canvas = document.querySelector(".snake-board");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("[data-score]");
const bestEl = document.querySelector("[data-best]");
const restartBtn = document.querySelector("[data-restart-snake]");
const difficultySelect = document.querySelector("[data-difficulty]");

let snake;
let direction;
let nextDirection;
let food;
let score;
let best;
let gameOver;
let timer;
let restartTimeout = null;
let difficulty = "medium";
let touchStart = null;

function snakeCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * sx,
    y: (event.clientY - rect.top) * sy,
  };
}

function randomCell() {
  return {
    x: Math.floor(Math.random() * GRID_SIZE),
    y: Math.floor(Math.random() * GRID_SIZE),
  };
}

function isOnSnake(cell) {
  return snake.some((part) => part.x === cell.x && part.y === cell.y);
}

function spawnFood() {
  let next = randomCell();
  while (isOnSnake(next)) {
    next = randomCell();
  }
  return next;
}

function resetGame() {
  if (restartTimeout) {
    clearTimeout(restartTimeout);
    restartTimeout = null;
  }
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ];
  direction = { x: 1, y: 0 };
  nextDirection = { ...direction };
  food = spawnFood();
  score = 0;
  gameOver = false;
  updateScore();
  draw();
  startLoop();
}

function scheduleAutoRestart() {
  if (restartTimeout) return;
  restartTimeout = setTimeout(() => {
    restartTimeout = null;
    resetGame();
  }, AUTO_RESTART_DELAY);
}

function updateScore() {
  if (score > best) {
    best = score;
    localStorage.setItem("snake-best", String(best));
  }
  scoreEl.textContent = String(score);
  bestEl.textContent = String(best);
}

function startLoop() {
  if (timer) {
    clearInterval(timer);
  }
  timer = setInterval(step, DIFFICULTY_CONFIG[difficulty].speed);
}

function step() {
  if (gameOver) return;

  direction = { ...nextDirection };
  const head = {
    x: (snake[0].x + direction.x + GRID_SIZE) % GRID_SIZE,
    y: (snake[0].y + direction.y + GRID_SIZE) % GRID_SIZE,
  };

  const hitSelf = snake.some((part) => part.x === head.x && part.y === head.y);

  if (hitSelf) {
    gameOver = true;
    scheduleAutoRestart();
    draw();
    return;
  }

  snake.unshift(head);

  if (head.x === food.x && head.y === food.y) {
    score += 10;
    if (window.GameSkins) {
      window.GameSkins.awardPoints(10);
    }
    updateScore();
    food = spawnFood();
  } else {
    snake.pop();
  }

  draw();
}

function drawBoard() {
  ctx.fillStyle = "#0b130f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(78, 117, 96, 0.2)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const p = i * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(canvas.width, p);
    ctx.stroke();
  }
}

function drawSnake() {
  const skin = window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
  const primary = skin ? skin.palette.primary : "#8fe2ad";
  const secondary = skin ? skin.palette.secondary : "#3e8d62";

  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? primary : secondary;
    ctx.fillRect(
      part.x * CELL_SIZE + 1,
      part.y * CELL_SIZE + 1,
      CELL_SIZE - 2,
      CELL_SIZE - 2
    );
  });
}

function drawFood() {
  const skin = window.GameSkins ? window.GameSkins.getCurrentSkin() : null;
  ctx.fillStyle = skin ? skin.palette.accent : "#d2ffd5";
  ctx.fillRect(
    food.x * CELL_SIZE + 3,
    food.y * CELL_SIZE + 3,
    CELL_SIZE - 6,
    CELL_SIZE - 6
  );
}

function drawOverlay() {
  if (!gameOver) return;

  ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#eaf4ed";
  ctx.font = '700 30px "Manrope", sans-serif';
  ctx.textAlign = "center";
  ctx.fillText("Game Over", canvas.width / 2, canvas.height / 2 - 10);

  ctx.font = '500 16px "Manrope", sans-serif';
  ctx.fillText("Auto restart...", canvas.width / 2, canvas.height / 2 + 20);
}

function draw() {
  drawBoard();
  drawFood();
  drawSnake();
  drawOverlay();
}

function setDirection(x, y) {
  if (direction.x === -x && direction.y === -y) {
    return;
  }
  nextDirection = { x, y };
}

window.addEventListener("keydown", (event) => {
  switch (event.key.toLowerCase()) {
    case "arrowup":
    case "w":
      setDirection(0, -1);
      break;
    case "arrowdown":
    case "s":
      setDirection(0, 1);
      break;
    case "arrowleft":
    case "a":
      setDirection(-1, 0);
      break;
    case "arrowright":
    case "d":
      setDirection(1, 0);
      break;
    case " ":
      if (gameOver) resetGame();
      break;
    default:
      break;
  }
});

canvas.addEventListener("pointerdown", (event) => {
  touchStart = snakeCanvasPoint(event);
});

canvas.addEventListener("pointerup", (event) => {
  if (!touchStart) return;
  const p = snakeCanvasPoint(event);
  const dx = p.x - touchStart.x;
  const dy = p.y - touchStart.y;
  touchStart = null;

  if (Math.abs(dx) < 18 && Math.abs(dy) < 18) {
    if (gameOver) resetGame();
    return;
  }

  if (Math.abs(dx) > Math.abs(dy)) {
    setDirection(dx > 0 ? 1 : -1, 0);
  } else {
    setDirection(0, dy > 0 ? 1 : -1);
  }
});

canvas.addEventListener("pointercancel", () => {
  touchStart = null;
});

restartBtn.addEventListener("click", resetGame);
window.addEventListener("game-skin-change", () => draw());

best = Number(localStorage.getItem("snake-best") || 0);
updateScore();
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
    resetGame();
  });
}
resetGame();
