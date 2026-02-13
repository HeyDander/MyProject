async function requestJson(url, options) {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(options && options.headers ? options.headers : {}),
    },
    credentials: "same-origin",
    ...options,
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch (_err) {
    payload = null;
  }

  if (!response.ok) {
    const error = payload && payload.error ? payload.error : "Request failed.";
    throw new Error(error);
  }

  return payload;
}
window.requestJson = requestJson;

function setMessage(messageEl, text, isError) {
  if (!messageEl) return;
  messageEl.textContent = text || "";
  messageEl.classList.toggle("is-error", Boolean(isError));
  messageEl.classList.toggle("is-success", !isError && Boolean(text));
}

function initAuthForm() {
  const form = document.querySelector("[data-auth-form]");
  if (!form) return;

  const endpoint = form.getAttribute("data-endpoint");
  const messageEl = form.querySelector("[data-message]");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(messageEl, "", false);

    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());
    payload.remember = formData.get("remember") === "on";

    try {
      const result = await requestJson(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(messageEl, "Success. Redirecting...", false);
      window.location.href = result.redirect || "/dashboard";
    } catch (error) {
      setMessage(messageEl, error.message, true);
    }
  });
}

function initPasswordToggles() {
  const toggles = document.querySelectorAll("[data-toggle-password]");
  if (!toggles.length) return;

  for (const toggle of toggles) {
    const targetId = toggle.getAttribute("data-target");
    if (!targetId) continue;
    const input = document.getElementById(targetId);
    if (!input) continue;

    toggle.addEventListener("click", () => {
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      toggle.textContent = isHidden ? "Hide" : "Show";
    });
  }
}

async function initDashboard() {
  const root = document.querySelector("[data-dashboard]");
  if (!root) return;

  try {
    const me = await requestJson("/api/me", { method: "GET" });
    const emailEl = document.querySelector("[data-user-email]");
    const top3ListEl = document.querySelector("[data-top3-list]");
    let leaderboard = null;
    try {
      leaderboard = await requestJson("/api/leaderboard", { method: "GET" });
    } catch (_err) {
      leaderboard = null;
    }

    if (top3ListEl) {
      const rows = Array.isArray(leaderboard?.top) ? leaderboard.top.slice(0, 3) : [];
      if (!rows.length) {
        top3ListEl.innerHTML = '<p class="top3-empty">No players yet.</p>';
      } else {
        top3ListEl.innerHTML = rows
          .map((row) => {
            const rank = Number(row.rank || 0);
            const icon = rank === 1 ? "🏆" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : "#";
            return `<p class="top3-row"><span>${icon} ${row.username}</span><strong>${row.points}</strong></p>`;
          })
          .join("");
      }
    }

    if (emailEl) {
      let label = me.username;
      const rank = Number(leaderboard?.you?.rank || 0);
      if (rank === 1) label = `🏆 #1 ${me.username}`;
      if (rank === 2) label = `🏆 #2 ${me.username}`;
      if (rank === 3) label = `🏆 #3 ${me.username}`;
      emailEl.textContent = label;
    }
  } catch (_error) {
    window.location.href = "/login";
  }
}

async function initHubExtras() {
  const root = document.querySelector("[data-hub-extras]");
  if (!root) return;

  const profileLine = document.querySelector("[data-profile-line]");
  const seasonLine = document.querySelector("[data-season-line]");
  const lastGameLine = document.querySelector("[data-last-game-line]");
  const missionsList = document.querySelector("[data-missions-list]");
  const achievementsList = document.querySelector("[data-achievements-list]");
  const eventTitle = document.querySelector("[data-event-title]");
  const eventDesc = document.querySelector("[data-event-desc]");
  const friendsList = document.querySelector("[data-friends-list]");
  const shareBtn = document.querySelector("[data-share-card]");
  const shareMsg = document.querySelector("[data-share-message]");
  const continueBtn = document.querySelector("[data-continue-last]");
  const friendForm = document.querySelector("[data-friend-form]");
  const friendMsg = document.querySelector("[data-friend-message]");

  let shareText = "";
  let lastGame = "/snake";

  const renderRows = (container, rows) => {
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = '<p class="hub-muted">No data yet.</p>';
      return;
    }
    container.innerHTML = rows
      .map((row) => `<p class="hub-row"><span>${row.left}</span><strong>${row.right}</strong></p>`)
      .join("");
  };

  const load = async () => {
    const data = await requestJson("/api/player/home", { method: "GET" });
    if (profileLine) {
      profileLine.textContent = `${data.profile.username} | Total points: ${data.profile.points} | Streak: ${data.profile.dailyStreak}`;
    }
    if (seasonLine) {
      seasonLine.textContent = `Season points: ${data.profile.seasonPoints} | Season rank: #${data.profile.seasonRank}`;
    }
    lastGame = data.profile.lastGame || "/snake";
    if (lastGameLine) {
      lastGameLine.textContent = `Last game: ${lastGame}`;
    }

    renderRows(
      missionsList,
      (data.missions || []).map((m) => ({
        left: `${m.done ? "✅" : "•"} ${m.label}`,
        right: `${m.progress}/${m.target}`,
      }))
    );

    renderRows(
      achievementsList,
      (data.achievements || []).map((a) => ({
        left: `${a.unlocked ? "🏆" : "🔒"} ${a.title}`,
        right: a.unlocked ? "Unlocked" : "Locked",
      }))
    );

    if (eventTitle) eventTitle.textContent = `${data.event?.title || "Event"}`;
    if (eventDesc) eventDesc.textContent = `${data.event?.description || ""}`;
    renderRows(
      friendsList,
      (data.friendsTop || []).map((f) => ({
        left: f.username,
        right: `${f.season_points} season`,
      }))
    );
    shareText = data.shareText || "";
  };

  try {
    await load();
  } catch (_error) {
    if (profileLine) profileLine.textContent = "Failed to load player data.";
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      window.location.href = lastGame || "/snake";
    });
  }

  if (shareBtn) {
    shareBtn.addEventListener("click", async () => {
      if (!shareText) return;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(shareText);
        } else {
          const ta = document.createElement("textarea");
          ta.value = shareText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        if (shareMsg) {
          shareMsg.textContent = "Share card copied.";
          shareMsg.classList.remove("is-error");
          shareMsg.classList.add("is-success");
        }
      } catch (_error) {
        if (shareMsg) {
          shareMsg.textContent = "Failed to copy.";
          shareMsg.classList.remove("is-success");
          shareMsg.classList.add("is-error");
        }
      }
    });
  }

  if (friendForm) {
    friendForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(friendForm);
      const username = String(formData.get("username") || "").trim();
      if (!username) return;
      try {
        await requestJson("/api/friends/add", {
          method: "POST",
          body: JSON.stringify({ username }),
        });
        if (friendMsg) {
          friendMsg.textContent = "Friend added.";
          friendMsg.classList.remove("is-error");
          friendMsg.classList.add("is-success");
        }
        friendForm.reset();
        await load();
      } catch (error) {
        if (friendMsg) {
          friendMsg.textContent = error.message || "Failed to add friend.";
          friendMsg.classList.remove("is-success");
          friendMsg.classList.add("is-error");
        }
      }
    });
  }
}

function initLogout() {
  const logoutButtons = document.querySelectorAll("[data-logout]");
  if (!logoutButtons.length) return;

  for (const button of logoutButtons) {
    button.addEventListener("click", async () => {
      try {
        const result = await requestJson("/api/logout", { method: "POST" });
        window.location.href = result.redirect || "/login";
      } catch (_error) {
        window.location.href = "/login";
      }
    });
  }
}

function initDeleteAccount() {
  const deleteBtn = document.querySelector("[data-delete-account]");
  if (!deleteBtn) return;

  deleteBtn.addEventListener("click", async () => {
    const password = window.prompt("Enter your password to delete account:");
    if (!password) return;

    const confirmDelete = window.confirm(
      "Delete account permanently? This action cannot be undone."
    );
    if (!confirmDelete) return;

    try {
      const result = await requestJson("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      window.location.href = result.redirect || "/login";
    } catch (error) {
      window.alert(error.message || "Failed to delete account.");
    }
  });
}

function preventPageScrollKeys() {
  const blockedKeys = new Set([" ", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

  document.addEventListener(
    "keydown",
    (event) => {
      if (!blockedKeys.has(event.key)) return;

      const target = event.target;
      const isTypingField =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if (!isTypingField) {
        event.preventDefault();
      }
    },
    { passive: false }
  );
}

function initWatermark() {
  if (document.querySelector("[data-watermark]")) return;
  const mark = document.createElement("div");
  mark.className = "side-watermark";
  mark.setAttribute("data-watermark", "true");
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "Made by HeyDander";
  document.body.appendChild(mark);
}

function initMobileGamepad() {
  const hasGameBoard = document.querySelector(
    ".snake-board, .shooter-board, .arcade-board, [data-2042-board]"
  );
  if (!hasGameBoard) return;
  if (!window.matchMedia || !window.matchMedia("(pointer: coarse)").matches) return;
  if (document.querySelector("[data-mobile-gamepad]")) return;

  const pad = document.createElement("div");
  pad.className = "mobile-gamepad";
  pad.setAttribute("data-mobile-gamepad", "true");

  const left = document.createElement("button");
  left.type = "button";
  left.className = "mobile-pad-btn";
  left.textContent = "◀";
  left.setAttribute("aria-label", "Move left");

  const right = document.createElement("button");
  right.type = "button";
  right.className = "mobile-pad-btn";
  right.textContent = "▶";
  right.setAttribute("aria-label", "Move right");

  const up = document.createElement("button");
  up.type = "button";
  up.className = "mobile-pad-btn";
  up.textContent = "▲";
  up.setAttribute("aria-label", "Move up");

  const down = document.createElement("button");
  down.type = "button";
  down.className = "mobile-pad-btn";
  down.textContent = "▼";
  down.setAttribute("aria-label", "Move down");

  const action = document.createElement("button");
  action.type = "button";
  action.className = "mobile-action-btn";
  action.textContent = "Action";
  action.setAttribute("aria-label", "Action");

  const arrows = document.createElement("div");
  arrows.className = "mobile-pad-arrows";
  arrows.appendChild(up);
  arrows.appendChild(left);
  arrows.appendChild(down);
  arrows.appendChild(right);

  pad.appendChild(arrows);
  pad.appendChild(action);
  document.body.appendChild(pad);

  const pressed = new Set();
  const dispatchKey = (type, key) => {
    window.dispatchEvent(
      new KeyboardEvent(type, {
        key,
        bubbles: true,
      })
    );
  };

  const bindHoldButton = (el, key) => {
    const onDown = (event) => {
      event.preventDefault();
      if (pressed.has(key)) return;
      pressed.add(key);
      dispatchKey("keydown", key);
    };
    const onUp = (event) => {
      event.preventDefault();
      if (!pressed.has(key)) return;
      pressed.delete(key);
      dispatchKey("keyup", key);
    };
    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("pointerleave", onUp);
  };

  bindHoldButton(left, "ArrowLeft");
  bindHoldButton(right, "ArrowRight");
  bindHoldButton(up, "ArrowUp");
  bindHoldButton(down, "ArrowDown");
  bindHoldButton(action, " ");
}

function initLastGameResume() {
  const LAST_GAME_KEY = "last-game-path";
  const path = window.location.pathname;

  const isGamePath =
    path === "/snake" ||
    path === "/shooter" ||
    path === "/2042" ||
    path === "/pong" ||
    path === "/breakout" ||
    path === "/dodger" ||
    path.startsWith("/game/");

  if (isGamePath) {
    localStorage.setItem(
      LAST_GAME_KEY,
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
    return;
  }

  if (path !== "/dashboard") return;
  const target = localStorage.getItem(LAST_GAME_KEY);
  if (!target || typeof target !== "string") return;

  const isValidTarget =
    target === "/snake" ||
    target === "/shooter" ||
    target === "/2042" ||
    target === "/pong" ||
    target === "/breakout" ||
    target === "/dodger" ||
    target.startsWith("/game/");

  if (!isValidTarget) return;

  // Skip redirect if user just arrived from auth pages and wants hub first.
  const fromAuth = document.referrer.includes("/login") || document.referrer.includes("/register");
  if (fromAuth) return;

  window.location.replace(target);
}

async function initUserGames() {
  const list = document.querySelector("[data-user-games-list]");
  if (!list) return;

  try {
    const data = await requestJson("/api/user-games", { method: "GET" });
    const games = Array.isArray(data.games) ? data.games.slice(0, 12) : [];
    if (!games.length) {
      list.innerHTML = '<p class="hub-muted">No community games yet.</p>';
      return;
    }
    list.innerHTML = games
      .map(
        (g) =>
          `<p class="hub-row"><span>${g.title} <small>(${g.kind})</small></span><a class="btn btn-ghost" href="/ugc/${g.slug}">Play</a></p>`
      )
      .join("");
  } catch (_error) {
    list.innerHTML = '<p class="hub-muted">Failed to load community games.</p>';
  }
}

function initGameCreatorForm() {
  const form = document.querySelector("[data-game-creator-form]");
  if (!form) return;
  const kindSelect = form.querySelector("[data-game-kind]");
  const scratchWrap = form.querySelector("[data-scratch-settings]");
  const codeWrap = form.querySelector("[data-code-settings]");
  const scratchBlocksWrap = form.querySelector("[data-scratch-blocks]");
  const scratchBuilder = form.querySelector("[data-scratch-builder]");
  const previewStage = form.querySelector("[data-game-preview-stage]");
  const previewRunBtn = form.querySelector("[data-preview-run]");
  const message = document.querySelector("[data-game-creator-message]");
  const blockButtons = form.querySelectorAll("[data-add-block]");
  const clearBlocksBtn = form.querySelector("[data-scratch-clear]");
  const codeTextarea = form.querySelector('textarea[name="codeContent"]');
  const scratchState = { blocks: [] };
  let previewCleanup = () => {};

  const BLOCK_LABELS = {
    mode_dodger: "Set Mode: Dodger",
    mode_collector: "Set Mode: Collector",
    mode_survivor: "Set Mode: Survivor",
    speed_up: "Speed +1",
    speed_down: "Speed -1",
    spawn_more: "Spawn More",
    spawn_less: "Spawn Less",
    points_up: "Points Gain +2",
  };

  const interpretBlocks = (base) => {
    const next = { ...base, spawnScale: 1, pointBonus: 0 };
    for (const block of scratchState.blocks) {
      if (block === "mode_dodger") next.mode = "dodger";
      if (block === "mode_collector") next.mode = "collector";
      if (block === "mode_survivor") next.mode = "survivor";
      if (block === "speed_up") next.speed = Math.min(6, next.speed + 1);
      if (block === "speed_down") next.speed = Math.max(1, next.speed - 1);
      if (block === "spawn_more") next.spawnScale = Math.min(2.4, next.spawnScale + 0.25);
      if (block === "spawn_less") next.spawnScale = Math.max(0.45, next.spawnScale - 0.2);
      if (block === "points_up") next.pointBonus += 2;
    }
    return next;
  };

  const renderBlocks = () => {
    if (!scratchBlocksWrap) return;
    if (!scratchState.blocks.length) {
      scratchBlocksWrap.innerHTML = '<p class="hub-muted">Add blocks from palette.</p>';
      return;
    }
    scratchBlocksWrap.innerHTML = "";
    scratchState.blocks.forEach((block, index) => {
      const row = document.createElement("div");
      row.className = "scratch-block";
      const label = document.createElement("span");
      label.textContent = BLOCK_LABELS[block] || block;
      row.appendChild(label);

      const up = document.createElement("button");
      up.type = "button";
      up.className = "scratch-mini";
      up.textContent = "Up";
      up.addEventListener("click", () => {
        if (index === 0) return;
        const tmp = scratchState.blocks[index - 1];
        scratchState.blocks[index - 1] = scratchState.blocks[index];
        scratchState.blocks[index] = tmp;
        renderBlocks();
      });
      row.appendChild(up);

      const down = document.createElement("button");
      down.type = "button";
      down.className = "scratch-mini";
      down.textContent = "Down";
      down.addEventListener("click", () => {
        if (index >= scratchState.blocks.length - 1) return;
        const tmp = scratchState.blocks[index + 1];
        scratchState.blocks[index + 1] = scratchState.blocks[index];
        scratchState.blocks[index] = tmp;
        renderBlocks();
      });
      row.appendChild(down);

      const del = document.createElement("button");
      del.type = "button";
      del.className = "scratch-mini";
      del.textContent = "Delete";
      del.addEventListener("click", () => {
        scratchState.blocks.splice(index, 1);
        renderBlocks();
      });
      row.appendChild(del);
      scratchBlocksWrap.appendChild(row);
    });
  };

  const runScratchPreview = (config) => {
    if (!previewStage) return;
    previewCleanup();
    const canvas = document.createElement("canvas");
    canvas.className = "arcade-board";
    canvas.width = 720;
    canvas.height = 420;
    previewStage.replaceChildren(canvas);
    const ctx = canvas.getContext("2d");
    const keys = new Set();
    const player = { x: 350, y: 360, w: 24, h: 24 };
    const entities = [];
    let score = 0;
    let over = false;
    let tick = 0;
    let raf = 0;

    const collide = (a, b) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

    const onKeyDown = (event) => keys.add(event.key.toLowerCase());
    const onKeyUp = (event) => keys.delete(event.key.toLowerCase());
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const loop = () => {
      tick += 1;
      const speed = 2.2 + config.speed * 0.52;
      if (keys.has("arrowleft")) player.x -= speed;
      if (keys.has("arrowright")) player.x += speed;
      if (keys.has("arrowup")) player.y -= speed;
      if (keys.has("arrowdown")) player.y += speed;
      player.x = Math.max(0, Math.min(canvas.width - player.w, player.x));
      player.y = Math.max(0, Math.min(canvas.height - player.h, player.y));

      if (!over && tick % Math.max(8, Math.floor(36 / Math.max(0.5, config.spawnScale))) === 0) {
        const pickupChance = config.mode === "collector" ? 0.42 : 0.18;
        const kind = Math.random() < pickupChance ? "pickup" : "hazard";
        entities.push({
          kind,
          x: Math.random() * (canvas.width - 22),
          y: -24,
          w: 22,
          h: 22,
          vy: 1.8 + config.speed * 0.55 + Math.random() * 1.4,
        });
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
            score += 8 + config.pointBonus;
            entities.splice(i, 1);
          } else {
            over = true;
          }
        }
      }

      if (!over && config.mode !== "collector" && tick % 24 === 0) {
        score += 2 + Math.floor(config.pointBonus / 2);
      }

      ctx.fillStyle = config.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      for (const e of entities) {
        ctx.fillStyle = e.kind === "pickup" ? "#dcffe8" : config.enemyColor;
        ctx.fillRect(e.x, e.y, e.w, e.h);
      }
      ctx.fillStyle = config.playerColor;
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.fillStyle = "#d8eddf";
      ctx.font = '700 18px "Manrope", sans-serif';
      ctx.fillText(`Preview score: ${score}`, 14, 24);
      if (over) {
        ctx.fillStyle = "rgba(0,0,0,0.48)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#f0fff6";
        ctx.font = '700 34px "Manrope", sans-serif';
        ctx.fillText("Preview Over", canvas.width / 2 - 110, canvas.height / 2);
      }
      raf = requestAnimationFrame(loop);
    };

    loop();
    previewCleanup = () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  };

  const runCodePreview = () => {
    if (!previewStage) return;
    previewCleanup();
    const iframe = document.createElement("iframe");
    iframe.className = "ugc-frame";
    iframe.sandbox = "allow-scripts";
    iframe.referrerPolicy = "no-referrer";
    const source = String(codeTextarea?.value || "").trim();
    const hasHtmlTags = /<\s*(html|body|script|canvas|div|style)\b/i.test(source);
    if (hasHtmlTags) {
      iframe.srcdoc = source;
    } else {
      const escaped = source
        .replace(/<\/script/gi, "<\\/script")
        .replace(/<!--/g, "<\\!--");
      iframe.srcdoc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      html, body { margin: 0; width: 100%; height: 100%; background: #08110d; overflow: hidden; }
      #game-root { width: 100%; height: 100%; display: grid; place-items: center; color: #d8eddf; font-family: sans-serif; }
      canvas { max-width: 100%; max-height: 100%; border: 1px solid #305640; background: #0b130f; }
    </style>
  </head>
  <body>
    <div id="game-root"></div>
    <script>
      (function () {
        const root = document.getElementById("game-root");
        try {
${escaped}
        } catch (err) {
          root.textContent = "Code error: " + (err && err.message ? err.message : String(err));
        }
      })();
    </script>
  </body>
</html>`;
    }
    previewStage.replaceChildren(iframe);
    previewCleanup = () => {};
  };

  const syncKind = () => {
    const kind = String(kindSelect?.value || "scratch");
    if (scratchWrap) scratchWrap.hidden = kind !== "scratch";
    if (codeWrap) codeWrap.hidden = kind !== "code";
    if (scratchBuilder) scratchBuilder.hidden = kind !== "scratch";
  };
  syncKind();
  if (kindSelect) kindSelect.addEventListener("change", syncKind);
  for (const btn of blockButtons) {
    btn.addEventListener("click", () => {
      const block = btn.getAttribute("data-add-block");
      if (!block) return;
      scratchState.blocks.push(block);
      renderBlocks();
    });
  }
  if (clearBlocksBtn) {
    clearBlocksBtn.addEventListener("click", () => {
      scratchState.blocks = [];
      renderBlocks();
    });
  }
  renderBlocks();

  if (previewRunBtn) {
    previewRunBtn.addEventListener("click", () => {
      const fd = new FormData(form);
      const kind = String(fd.get("kind") || "scratch");
      if (kind === "code") {
        runCodePreview();
        return;
      }
      const base = {
        mode: String(fd.get("scratchMode") || "dodger"),
        speed: Number(fd.get("scratchSpeed") || 3),
        playerColor: String(fd.get("scratchPlayerColor") || "#7be0a4"),
        enemyColor: String(fd.get("scratchEnemyColor") || "#4f8f68"),
        bgColor: String(fd.get("scratchBgColor") || "#08110d"),
      };
      runScratchPreview(interpretBlocks(base));
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (message) {
      message.textContent = "";
      message.classList.remove("is-error", "is-success");
    }
    const fd = new FormData(form);
    const kind = String(fd.get("kind") || "scratch");
    const payload = {
      title: String(fd.get("title") || ""),
      description: String(fd.get("description") || ""),
      kind,
    };
    if (kind === "code") {
      payload.codeContent = String(fd.get("codeContent") || "");
    } else {
      const base = {
        mode: String(fd.get("scratchMode") || "dodger"),
        speed: Number(fd.get("scratchSpeed") || 3),
        playerColor: String(fd.get("scratchPlayerColor") || "#7be0a4"),
        enemyColor: String(fd.get("scratchEnemyColor") || "#4f8f68"),
        bgColor: String(fd.get("scratchBgColor") || "#08110d"),
      };
      payload.scratch = {
        ...interpretBlocks(base),
        blocks: [...scratchState.blocks],
      };
    }

    try {
      const result = await requestJson("/api/user-games/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      if (message) {
        message.textContent = "Game published.";
        message.classList.add("is-success");
      }
      if (result.slug) {
        setTimeout(() => {
          window.location.href = `/ugc/${result.slug}`;
        }, 500);
      }
    } catch (error) {
      if (message) {
        message.textContent = error.message || "Failed to publish game.";
        message.classList.add("is-error");
      }
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initAuthForm();
  initPasswordToggles();
  initDashboard();
  initHubExtras();
  initLogout();
  initDeleteAccount();
  preventPageScrollKeys();
  initWatermark();
  initMobileGamepad();
  initLastGameResume();
  initUserGames();
  initGameCreatorForm();
});
