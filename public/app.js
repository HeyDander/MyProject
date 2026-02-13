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

async function initUploadedGames() {
  const list = document.querySelector("[data-uploaded-games-list]");
  if (!list) return;

  try {
    const data = await requestJson("/api/uploaded-games", { method: "GET" });
    const games = Array.isArray(data.games) ? data.games.slice(0, 12) : [];
    if (!games.length) {
      list.innerHTML = '<p class="hub-muted">No uploaded games yet.</p>';
      return;
    }
    list.innerHTML = games
      .map(
        (g) =>
          `<p class="hub-row"><span>${g.title}</span><a class="btn btn-ghost" href="/uploaded/${g.slug}">Play</a></p>`
      )
      .join("");
  } catch (_error) {
    list.innerHTML = '<p class="hub-muted">Failed to load uploaded games.</p>';
  }
}

function initUploadGameForm() {
  const form = document.querySelector("[data-upload-game-form]");
  if (!form) return;

  const fileInput = form.querySelector('input[name="gameFile"]');
  const titleInput = form.querySelector('input[name="title"]');
  const descriptionInput = form.querySelector('textarea[name="description"]');
  const htmlInput = form.querySelector('textarea[name="htmlContent"]');
  const publishInput = form.querySelector('input[name="isPublished"]');
  const message = document.querySelector("[data-upload-game-message]");

  const applyPackage = (pkg) => {
    if (!pkg || typeof pkg !== "object") {
      throw new Error("Invalid file format.");
    }
    if (titleInput && typeof pkg.title === "string") titleInput.value = pkg.title.slice(0, 64);
    if (descriptionInput && typeof pkg.description === "string") {
      descriptionInput.value = pkg.description.slice(0, 220);
    }
    if (htmlInput && typeof pkg.htmlContent === "string") htmlInput.value = pkg.htmlContent;
  };

  if (fileInput) {
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) return;
      try {
        const raw = await file.text();
        const pkg = JSON.parse(raw);
        applyPackage(pkg);
        setMessage(message, "Game file loaded. Check fields and publish.", false);
      } catch (_error) {
        setMessage(
          message,
          "Cannot read file. Upload JSON package with title, description, htmlContent.",
          true
        );
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(message, "", false);

    const payload = {
      title: String(titleInput?.value || ""),
      description: String(descriptionInput?.value || ""),
      htmlContent: String(htmlInput?.value || ""),
      isPublished: Boolean(publishInput?.checked),
    };

    try {
      const result = await requestJson("/api/uploaded-games/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setMessage(message, "Game uploaded. Opening now...", false);
      if (result.slug) {
        setTimeout(() => {
          window.location.href = `/uploaded/${result.slug}`;
        }, 350);
      }
    } catch (error) {
      setMessage(message, error.message || "Upload failed.", true);
    }
  });
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
    path.startsWith("/uploaded/") ||
    path.startsWith("/game/");

  if (isGamePath) {
    localStorage.setItem(
      LAST_GAME_KEY,
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    );
  }
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
  initUploadedGames();
  initUploadGameForm();
  initLastGameResume();
});
