const titleEl = document.querySelector("[data-ugc-title]");
const metaEl = document.querySelector("[data-ugc-meta]");
const descEl = document.querySelector("[data-ugc-desc]");
const stageEl = document.querySelector("[data-ugc-stage]");

function slugFromPath() {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[parts.length - 1] || "";
}

function buildCodeSrcdoc(rawCode) {
  const source = String(rawCode || "").trim();
  const hasHtmlTags = /<\s*(html|body|script|canvas|div|style)\b/i.test(source);
  if (hasHtmlTags) return source;

  // If user entered plain JS, execute it inside a minimal game shell.
  const escaped = source
    .replace(/<\/script/gi, "<\\/script")
    .replace(/<!--/g, "<\\!--");
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #08110d; overflow: hidden; }
      #game-root { width: 100%; height: 100%; display: grid; place-items: center; color: #d8eddf; font-family: sans-serif; }
      canvas { max-width: 100%; max-height: 100%; border: 1px solid #305640; background: #0b130f; }
      #runtime-error {
        position: fixed;
        left: 10px;
        right: 10px;
        bottom: 10px;
        z-index: 99;
        background: rgba(35, 8, 8, 0.92);
        color: #ffd4d4;
        border: 1px solid rgba(255, 120, 120, 0.45);
        border-radius: 10px;
        padding: 10px;
        font: 13px/1.4 sans-serif;
        display: none;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <div id="game-root"></div>
    <div id="runtime-error"></div>
    <script>
      (function () {
        const root = document.getElementById("game-root");
        const errorBox = document.getElementById("runtime-error");
        function showError(text) {
          errorBox.style.display = "block";
          errorBox.textContent = String(text || "Runtime error");
        }
        window.addEventListener("error", function (event) {
          showError(event && event.message ? event.message : "Script error");
        });
        window.addEventListener("unhandledrejection", function (event) {
          const reason = event && event.reason ? event.reason : "Promise rejection";
          showError(reason && reason.message ? reason.message : String(reason));
        });

        try {
${escaped}
        } catch (err) {
          showError(err && err.message ? err.message : String(err));
        }

        setTimeout(function () {
          const hasVisibleOutput =
            !!root.querySelector("canvas, svg, button, iframe") ||
            (root.textContent || "").trim().length > 0;
          if (!hasVisibleOutput && errorBox.style.display === "none") {
            showError(
              "Your code ran but did not render UI. Add elements to #game-root or create a canvas."
            );
          }
        }, 350);
      })();
    </script>
  </body>
</html>`;
}

function spawnScratchGame(config) {
  const canvas = document.createElement("canvas");
  canvas.className = "arcade-board";
  canvas.width = 720;
  canvas.height = 420;
  stageEl.replaceChildren(canvas);
  const ctx = canvas.getContext("2d");

  const blocks = Array.isArray(config.blocks) ? config.blocks : [];
  const scratch = {
    mode: String(config.mode || "dodger"),
    speed: Math.max(1, Math.min(6, Number(config.speed || 3))),
    playerColor: config.playerColor || "#7be0a4",
    enemyColor: config.enemyColor || "#4f8f68",
    bgColor: config.bgColor || "#08110d",
    spawnScale: Math.max(0.45, Math.min(2.4, Number(config.spawnScale || 1))),
    pointBonus: Number(config.pointBonus || 0),
  };
  for (const block of blocks) {
    if (block === "mode_dodger") scratch.mode = "dodger";
    if (block === "mode_collector") scratch.mode = "collector";
    if (block === "mode_survivor") scratch.mode = "survivor";
    if (block === "speed_up") scratch.speed = Math.min(6, scratch.speed + 1);
    if (block === "speed_down") scratch.speed = Math.max(1, scratch.speed - 1);
    if (block === "spawn_more") scratch.spawnScale = Math.min(2.4, scratch.spawnScale + 0.25);
    if (block === "spawn_less") scratch.spawnScale = Math.max(0.45, scratch.spawnScale - 0.2);
    if (block === "points_up") scratch.pointBonus += 2;
  }
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
      if (spawnTick % Math.max(8, Math.floor(34 / Math.max(0.5, scratch.spawnScale))) === 0) {
        const kind = scratch.mode === "collector" && Math.random() < 0.35 ? "pickup" : "hazard";
        entities.push({
          kind,
          x: Math.random() * (canvas.width - 20),
          y: -24,
          w: 20,
          h: 20,
          vy: 1.8 + scratch.speed * 0.45 + Math.random() * 1.4,
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
          score += 8 + scratch.pointBonus;
          entities.splice(i, 1);
          if (window.GameSkins) window.GameSkins.awardPoints(8 + scratch.pointBonus);
        } else {
          over = true;
        }
      }
    }

    if (!over && scratch.mode !== "collector" && spawnTick % 24 === 0) {
      const gain = 2 + Math.floor(scratch.pointBonus / 2);
      score += gain;
      if (window.GameSkins) window.GameSkins.awardPoints(gain);
    }

    ctx.fillStyle = scratch.bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (const e of entities) {
      ctx.fillStyle = e.kind === "pickup" ? "#d2ffd5" : scratch.enemyColor;
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    ctx.fillStyle = scratch.playerColor;
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
      iframe.srcdoc = buildCodeSrcdoc(game.codeContent);
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
