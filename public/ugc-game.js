const titleEl = document.querySelector("[data-ugc-title]");
const metaEl = document.querySelector("[data-ugc-meta]");
const descEl = document.querySelector("[data-ugc-desc]");
const stageEl = document.querySelector("[data-ugc-stage]");

function slugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function spawnScratchGame(config) {
  const canvas = document.createElement("canvas");
  canvas.className = "arcade-board";
  canvas.width = 720;
  canvas.height = 420;
  stageEl.replaceChildren(canvas);
  const ctx = canvas.getContext("2d");

  const mode = String(config.mode || "dodger");
  const speed = Math.max(1, Math.min(6, Number(config.speed || 3)));
  const playerColor = config.playerColor || "#7be0a4";
  const enemyColor = config.enemyColor || "#4f8f68";
  const bgColor = config.bgColor || "#08110d";
  const player = { x: 350, y: 360, w: 24, h: 24 };
  const entities = [];
  let score = 0;
  let over = false;
  const keys = new Set();
  let spawnTick = 0;

  const collide = (a, b) =>
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  const loop = () => {
    if (keys.has("arrowleft")) player.x -= 2.4 + speed * 0.5;
    if (keys.has("arrowright")) player.x += 2.4 + speed * 0.5;
    if (keys.has("arrowup")) player.y -= 2.4 + speed * 0.5;
    if (keys.has("arrowdown")) player.y += 2.4 + speed * 0.5;

    player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
    player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

    if (!over) {
      spawnTick += 1;
      if (spawnTick % Math.max(10, 34 - speed * 4) === 0) {
        const kind = mode === "collector" && Math.random() < 0.35 ? "pickup" : "hazard";
        entities.push({
          kind,
          x: Math.random() * (canvas.width - 20),
          y: -24,
          w: 20,
          h: 20,
          vy: 1.8 + speed * 0.45 + Math.random() * 1.4,
        });
      }
    }

    for (const e of entities) e.y += e.vy;
    for (let i = entities.length - 1; i >= 0; i -= 1) {
      const e = entities[i];
      if (e.y > canvas.height + 40) {
        entities.splice(i, 1);
        continue;
      }
      if (!over && collide(player, e)) {
        if (e.kind === "pickup") {
          score += 8;
          entities.splice(i, 1);
          if (window.GameSkins) window.GameSkins.awardPoints(8);
        } else {
          over = true;
        }
      }
    }

    if (!over && mode !== "collector" && spawnTick % 24 === 0) {
      score += 2;
      if (window.GameSkins) window.GameSkins.awardPoints(2);
    }

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const e of entities) {
      ctx.fillStyle = e.kind === "pickup" ? "#d2ffd5" : enemyColor;
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    ctx.fillStyle = playerColor;
    ctx.fillRect(player.x, player.y, player.w, player.h);
    ctx.fillStyle = "#d7ede0";
    ctx.font = '700 18px "Manrope", sans-serif';
    ctx.fillText(`Score: ${score}`, 14, 24);
    if (over) {
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#ecfff4";
      ctx.font = '700 34px "Manrope", sans-serif';
      ctx.fillText("Game Over", canvas.width / 2 - 90, canvas.height / 2);
    }
    requestAnimationFrame(loop);
  };

  window.addEventListener("keydown", (event) => keys.add(event.key.toLowerCase()));
  window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));
  loop();
}

async function init() {
  const slug = slugFromPath();
  if (!slug) return;
  try {
    const game = await window.requestJson(`/api/user-games/${encodeURIComponent(slug)}`, {
      method: "GET",
    });
    titleEl.textContent = game.title;
    metaEl.textContent = `${game.kind.toUpperCase()} | by ${game.creator}`;
    descEl.textContent = game.description || "";

    if (game.kind === "code") {
      const iframe = document.createElement("iframe");
      iframe.className = "ugc-frame";
      iframe.sandbox = "allow-scripts";
      iframe.referrerPolicy = "no-referrer";
      iframe.srcdoc = game.codeContent;
      stageEl.replaceChildren(iframe);
    } else {
      spawnScratchGame(game.scratch || {});
    }
  } catch (_error) {
    titleEl.textContent = "Game not found";
    metaEl.textContent = "";
    descEl.textContent = "This user game is unavailable.";
  }
}

document.addEventListener("DOMContentLoaded", init);
