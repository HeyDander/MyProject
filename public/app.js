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
    const error = payload && payload.error ? payload.error : "Ошибка запроса.";
    throw new Error(error);
  }

  return payload;
}
window.requestJson = requestJson;

function initRussianLocale() {
  const textMap = new Map([
    ["Game Hub", "Игровой хаб"],
    ["Pick a mode, jump in, earn points, and unlock skins.", "Выбери режим, играй, зарабатывай очки и открывай скины."],
    ["Loading...", "Загрузка..."],
    ["TOP-3", "ТОП-3"],
    ["Classic", "Классика"],
    ["Action", "Экшен"],
    ["Puzzle", "Головоломка"],
    ["Arcade", "Аркада"],
    ["Survival", "Выживание"],
    ["Multiplayer", "Мультиплеер"],
    ["Play Snake", "Играть в Snake"],
    ["Play Shooter", "Играть в Shooter"],
    ["Play 2042", "Играть в 2042"],
    ["Play Pong", "Играть в Pong"],
    ["Play Breakout", "Играть в Breakout"],
    ["Play Dodger", "Играть в Dodger"],
    ["Play 1v1 Pong", "Играть 1v1 Pong"],
    ["Player Profile", "Профиль игрока"],
    ["Daily Missions", "Ежедневные миссии"],
    ["Achievements", "Достижения"],
    ["Friends League", "Лига друзей"],
    ["Your Uploaded Games", "Твои загруженные игры"],
    ["Friends Co-op", "Кооператив с друзьями"],
    ["Open Shop", "Открыть магазин"],
    ["Inventory", "Инвентарь"],
    ["Upload Game", "Загрузить игру"],
    ["PC Upload Guide", "Гайд по загрузке с ПК"],
    ["Create Your Skin (200 points)", "Создать свой скин (200 очков)"],
    ["Leaderboard", "Лидерборд"],
    ["Delete Account", "Удалить аккаунт"],
    ["Back to login", "Назад к входу"],
    ["Log out", "Выйти"],
    ["Back to hub", "Назад в хаб"],
    ["Restart", "Рестарт"],
    ["Restart Match", "Перезапуск матча"],
    ["Difficulty", "Сложность"],
    ["Easy", "Легко"],
    ["Medium", "Средне"],
    ["Hard", "Сложно"],
    ["Very Hard", "Очень сложно"],
    ["Score", "Очки"],
    ["Best", "Рекорд"],
    ["Create Room", "Создать комнату"],
    ["Join Room", "Войти в комнату"],
    ["Join by code", "Войти по коду"],
    ["Create Co-op", "Создать кооп"],
    ["Leave Co-op", "Выйти из коопа"],
    ["No active co-op room.", "Нет активной кооп-комнаты."],
    ["No players yet.", "Пока нет игроков."],
    ["No data yet.", "Пока нет данных."],
    ["No incoming requests.", "Нет входящих заявок."],
    ["No outgoing requests.", "Нет исходящих заявок."],
    ["No uploaded games yet.", "Пока нет загруженных игр."],
    ["Request sent.", "Заявка отправлена."],
    ["Request accepted.", "Заявка принята."],
    ["Request closed.", "Заявка закрыта."],
    ["Incoming:", "Входящая:"],
    ["Outgoing:", "Исходящая:"],
    ["Accept", "Принять"],
    ["Reject", "Отклонить"],
    ["Cancel", "Отменить"],
    ["Code", "Код"],
    ["Status", "Статус"],
    ["Total", "Итого"],
    ["Room code", "Код комнаты"],
    ["Skin Shop", "Магазин скинов"],
    ["Inventory", "Инвентарь"],
    ["My Created Skins", "Мои созданные скины"],
    ["Uploaded Game", "Загруженная игра"],
    ["Upload Game From PC", "Загрузка игры с ПК"],
    ["Open PC Guide", "Открыть гайд по ПК"],
    ["Open Upload Page", "Открыть страницу загрузки"],
  ]);

  const placeholderMap = new Map([
    ["Friend username", "Ник друга"],
    ["Friend username (optional)", "Ник друга (необязательно)"],
    ["Room code", "Код комнаты"],
    ["Room code (6 chars)", "Код комнаты (6 символов)"],
    ["Game package file (.json)", "Файл игры (.json)"],
  ]);

  const translate = (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return value;
    if (textMap.has(trimmed)) {
      return value.replace(trimmed, textMap.get(trimmed));
    }
    return value;
  };

  const apply = (root = document) => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const blockedTags = new Set(["SCRIPT", "STYLE", "TEXTAREA", "CODE", "PRE"]);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const parent = node.parentElement;
      if (!parent || blockedTags.has(parent.tagName)) continue;
      const nextText = translate(node.nodeValue || "");
      if (nextText !== node.nodeValue) node.nodeValue = nextText;
    }

    const inputs = root.querySelectorAll
      ? root.querySelectorAll("input[placeholder], textarea[placeholder]")
      : [];
    for (const input of inputs) {
      const p = input.getAttribute("placeholder");
      if (p && placeholderMap.has(p)) {
        input.setAttribute("placeholder", placeholderMap.get(p));
      }
    }
  };

  const titleMap = new Map([
    ["Game Hub", "Игровой хаб"],
    ["Shop", "Магазин"],
    ["Inventory", "Инвентарь"],
    ["Leaderboard", "Лидерборд"],
    ["Create Skin", "Создать скин"],
    ["Upload Game", "Загрузка игры"],
    ["PC Upload Guide", "Гайд по загрузке с ПК"],
    ["Uploaded Game", "Загруженная игра"],
    ["Pong Online", "Pong Онлайн"],
  ]);
  if (titleMap.has(document.title)) {
    document.title = titleMap.get(document.title);
  }

  apply(document);
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE || node.nodeType === Node.ELEMENT_NODE) {
          apply(node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement || document);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

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
      setMessage(messageEl, "Успешно. Перенаправление...", false);
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
        top3ListEl.innerHTML = '<p class="top3-empty">Пока нет игроков.</p>';
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
  const friendsList = document.querySelector("[data-friends-list]");
  const incomingList = document.querySelector("[data-friend-incoming]");
  const outgoingList = document.querySelector("[data-friend-outgoing]");
  const continueBtn = document.querySelector("[data-continue-last]");
  const friendForm = document.querySelector("[data-friend-form]");
  const friendMsg = document.querySelector("[data-friend-message]");

  let lastGame = "/snake";

  const renderRows = (container, rows) => {
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = '<p class="hub-muted">Пока нет данных.</p>';
      return;
    }
    container.innerHTML = rows
      .map((row) => `<p class="hub-row"><span>${row.left}</span><strong>${row.right}</strong></p>`)
      .join("");
  };

  const load = async () => {
    const data = await requestJson("/api/player/home", { method: "GET" });
    if (profileLine) {
      profileLine.textContent = `${data.profile.username} | Всего очков: ${data.profile.points} | Серия: ${data.profile.dailyStreak}`;
    }
    if (seasonLine) {
      seasonLine.textContent = `Сезонные очки: ${data.profile.seasonPoints} | Место в сезоне: #${data.profile.seasonRank}`;
    }
    lastGame = data.profile.lastGame || "/snake";
    if (lastGameLine) {
      lastGameLine.textContent = `Последняя игра: ${lastGame}`;
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

    renderRows(
      friendsList,
      (data.friendsTop || []).map((f) => ({
        left: f.username,
        right: `${f.season_points} season`,
      }))
    );
  };

  const loadFriendRequests = async () => {
    if (!incomingList && !outgoingList) return;
    try {
      const data = await requestJson("/api/friends/requests", { method: "GET" });
      const incoming = Array.isArray(data.incoming) ? data.incoming : [];
      const outgoing = Array.isArray(data.outgoing) ? data.outgoing : [];

      if (incomingList) {
        if (!incoming.length) {
          incomingList.innerHTML = '<p class="hub-muted">Нет входящих заявок.</p>';
        } else {
          incomingList.innerHTML = incoming
            .map(
              (r) =>
                `<p class="hub-row"><span>Входящая: ${r.username}</span><span><button class="btn btn-ghost" type="button" data-request-accept="${r.id}">Принять</button> <button class="btn btn-ghost" type="button" data-request-reject="${r.id}">Отклонить</button></span></p>`
            )
            .join("");
        }
      }

      if (outgoingList) {
        if (!outgoing.length) {
          outgoingList.innerHTML = '<p class="hub-muted">Нет исходящих заявок.</p>';
        } else {
          outgoingList.innerHTML = outgoing
            .map(
              (r) =>
                `<p class="hub-row"><span>Исходящая: ${r.username}</span><button class="btn btn-ghost" type="button" data-request-cancel="${r.id}">Отменить</button></p>`
            )
            .join("");
        }
      }
    } catch (_error) {
      if (incomingList) incomingList.innerHTML = '<p class="hub-muted">Не удалось загрузить заявки.</p>';
      if (outgoingList) outgoingList.innerHTML = '<p class="hub-muted">Не удалось загрузить заявки.</p>';
    }
  };

  try {
    await load();
    await loadFriendRequests();
  } catch (_error) {
    if (profileLine) profileLine.textContent = "Не удалось загрузить данные игрока.";
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      window.location.href = lastGame || "/snake";
    });
  }

  if (friendForm) {
    friendForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const formData = new FormData(friendForm);
      const username = String(formData.get("username") || "").trim();
      if (!username) return;
      try {
        await requestJson("/api/friends/request", {
          method: "POST",
          body: JSON.stringify({ username }),
        });
        if (friendMsg) {
          friendMsg.textContent = "Заявка отправлена.";
          friendMsg.classList.remove("is-error");
          friendMsg.classList.add("is-success");
        }
        friendForm.reset();
        await loadFriendRequests();
        await load();
      } catch (error) {
        if (friendMsg) {
          friendMsg.textContent = error.message || "Не удалось отправить заявку в друзья.";
          friendMsg.classList.remove("is-success");
          friendMsg.classList.add("is-error");
        }
      }
    });
  }

  const onRequestAction = async (action, requestId) => {
    if (!requestId) return;
    try {
      await requestJson(`/api/friends/requests/${requestId}/${action}`, {
        method: "POST",
      });
      if (friendMsg) {
        friendMsg.textContent = action === "accept" ? "Заявка принята." : "Заявка закрыта.";
        friendMsg.classList.remove("is-error");
        friendMsg.classList.add("is-success");
      }
      await loadFriendRequests();
      await load();
    } catch (error) {
      if (friendMsg) {
        friendMsg.textContent = error.message || "Action failed.";
        friendMsg.classList.remove("is-success");
        friendMsg.classList.add("is-error");
      }
    }
  };

  if (incomingList) {
    incomingList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const acceptId = target.getAttribute("data-request-accept");
      const rejectId = target.getAttribute("data-request-reject");
      if (acceptId) onRequestAction("accept", acceptId);
      if (rejectId) onRequestAction("reject", rejectId);
    });
  }

  if (outgoingList) {
    outgoingList.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const cancelId = target.getAttribute("data-request-cancel");
      if (cancelId) onRequestAction("reject", cancelId);
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
      "Удалить аккаунт навсегда? Это действие нельзя отменить."
    );
    if (!confirmDelete) return;

    try {
      const result = await requestJson("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      window.location.href = result.redirect || "/login";
    } catch (error) {
      window.alert(error.message || "Не удалось удалить аккаунт.");
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
  // Mobile joystick is intentionally disabled.
  // Games should be controlled by swipe/touch directly on the game board.
}

async function initUploadedGames() {
  const list = document.querySelector("[data-uploaded-games-list]");
  if (!list) return;

  try {
    const data = await requestJson("/api/uploaded-games", { method: "GET" });
    const games = Array.isArray(data.games) ? data.games.slice(0, 12) : [];
    if (!games.length) {
      list.innerHTML = '<p class="hub-muted">Пока нет загруженных игр.</p>';
      return;
    }
    list.innerHTML = games
      .map(
        (g) =>
          `<p class="hub-row"><span>${g.title}</span><a class="btn btn-ghost" href="/uploaded/${g.slug}">Play</a></p>`
      )
      .join("");
  } catch (_error) {
    list.innerHTML = '<p class="hub-muted">Не удалось загрузить загруженные игры.</p>';
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
          "Не удалось прочитать файл. Загрузите JSON с полями title, description, htmlContent.",
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
      setMessage(message, error.message || "Загрузка не удалась.", true);
    }
  });
}

function initCoopPlay() {
  const COOP_KEY = "coop-room-code";
  const path = window.location.pathname;
  const isGamePath =
    path === "/snake" ||
    path === "/shooter" ||
    path === "/2042" ||
    path === "/pong" ||
    path === "/pong-online" ||
    path === "/breakout" ||
    path === "/dodger" ||
    path.startsWith("/uploaded/") ||
    path.startsWith("/game/");

  const createForm = document.querySelector("[data-coop-create-form]");
  const joinForm = document.querySelector("[data-coop-join-form]");
  const stateBox = document.querySelector("[data-coop-state]");
  const message = document.querySelector("[data-coop-message]");
  const leaveBtn = document.querySelector("[data-coop-leave]");

  let code = localStorage.getItem(COOP_KEY) || "";
  let pollTimer = 0;
  let sending = false;
  let overlay = null;

  if (isGamePath) {
    overlay = document.createElement("div");
    overlay.className = "hub-extra-card";
    overlay.style.position = "fixed";
    overlay.style.left = "12px";
    overlay.style.bottom = "12px";
    overlay.style.zIndex = "80";
    overlay.style.maxWidth = "260px";
    overlay.style.padding = "10px 12px";
    overlay.style.fontSize = "0.85rem";
    overlay.innerHTML = '<p class="hub-muted">Нет активной кооп-комнаты.</p>';
    document.body.appendChild(overlay);
  }

  const renderState = (room) => {
    if (!room) {
      if (stateBox) stateBox.innerHTML = '<p class="hub-muted">Нет активной кооп-комнаты.</p>';
      if (overlay) overlay.innerHTML = '<p class="hub-muted">Нет активной кооп-комнаты.</p>';
      return;
    }
    if (!stateBox && !overlay) return;
    stateBox.innerHTML = [
      `<p class="hub-row"><span>Код</span><strong>${room.code}</strong></p>`,
      `<p class="hub-row"><span>Статус</span><strong>${room.status}</strong></p>`,
      `<p class="hub-row"><span>${room.players.host}</span><strong>${room.points.host}</strong></p>`,
      `<p class="hub-row"><span>${room.players.friend}</span><strong>${room.points.friend}</strong></p>`,
      `<p class="hub-row"><span>Итого</span><strong>${room.points.total}</strong></p>`,
    ].join("");

    if (overlay) {
      overlay.innerHTML = [
        `<p class="hub-row"><span>Кооп ${room.code}</span><strong>${room.status}</strong></p>`,
        `<p class="hub-row"><span>${room.players.host}</span><strong>${room.points.host}</strong></p>`,
        `<p class="hub-row"><span>${room.players.friend}</span><strong>${room.points.friend}</strong></p>`,
        `<p class="hub-row"><span>Итого</span><strong>${room.points.total}</strong></p>`,
      ].join("");
    }
  };

  const poll = async () => {
    if (!code) {
      renderState(null);
      if (overlay) overlay.innerHTML = '<p class="hub-muted">Нет активной кооп-комнаты.</p>';
      return;
    }
    try {
      const room = await requestJson(`/api/coop/state/${encodeURIComponent(code)}`, {
        method: "GET",
      });
      renderState(room);
    } catch (_error) {
      code = "";
      localStorage.removeItem(COOP_KEY);
      renderState(null);
      if (overlay) overlay.innerHTML = '<p class="hub-muted">Кооп-комната истекла.</p>';
    }
  };

  const startPoll = () => {
    if (pollTimer) return;
    pollTimer = window.setInterval(poll, 1500);
  };

  if (createForm) {
    createForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(message, "", false);
      const formData = new FormData(createForm);
      const friendUsername = String(formData.get("friendUsername") || "").trim();
      try {
        const created = await requestJson("/api/coop/create", {
          method: "POST",
          body: JSON.stringify({ friendUsername }),
        });
        code = created.code;
        localStorage.setItem(COOP_KEY, code);
        setMessage(message, `Кооп-комната создана: ${code}`, false);
        await poll();
      } catch (error) {
        setMessage(message, error.message || "Не удалось создать кооп-комнату.", true);
      }
    });
  }

  if (joinForm) {
    joinForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      setMessage(message, "", false);
      const formData = new FormData(joinForm);
      const joinCode = String(formData.get("code") || "").trim().toUpperCase();
      if (!joinCode) return;
      try {
        await requestJson("/api/coop/join", {
          method: "POST",
          body: JSON.stringify({ code: joinCode }),
        });
        code = joinCode;
        localStorage.setItem(COOP_KEY, code);
        setMessage(message, `Вы вошли в комнату: ${code}`, false);
        await poll();
      } catch (error) {
        setMessage(message, error.message || "Не удалось войти в комнату.", true);
      }
    });
  }

  window.CoopPlay = {
    async addPoints(points, game) {
      if (!isGamePath || !code || sending) return;
      const amount = Number(points);
      if (!Number.isInteger(amount) || amount <= 0) return;
      sending = true;
      try {
        await requestJson("/api/coop/add-points", {
          method: "POST",
          body: JSON.stringify({
            code,
            points: amount,
            game: String(game || window.location.pathname).slice(0, 64),
          }),
        });
      } catch (_error) {
        // Ignore coop sync errors to not interrupt game.
      } finally {
        sending = false;
      }
    },
    getCode() {
      return code;
    },
    async leave() {
      if (!code) return;
      try {
        await requestJson("/api/coop/leave", {
          method: "POST",
          body: JSON.stringify({ code }),
        });
      } catch (_error) {
        // ignore
      }
      code = "";
      localStorage.removeItem(COOP_KEY);
      renderState(null);
    },
  };

  if (leaveBtn) {
    leaveBtn.addEventListener("click", async () => {
      await window.CoopPlay.leave();
      setMessage(message, "Кооп-комната закрыта.", false);
    });
  }

  if (code) {
    poll();
    startPoll();
  } else if (stateBox) {
    renderState(null);
  }
}

function initLastGameResume() {
  const LAST_GAME_KEY = "last-game-path";
  const path = window.location.pathname;

  const isGamePath =
    path === "/snake" ||
    path === "/shooter" ||
    path === "/2042" ||
    path === "/pong" ||
    path === "/pong-online" ||
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
  initRussianLocale();
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
  initCoopPlay();
  initLastGameResume();
});
