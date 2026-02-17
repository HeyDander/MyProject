const UI_LANG_KEY = "ui-lang";
const UI_LANG = localStorage.getItem(UI_LANG_KEY) === "ru" ? "ru" : "en";
const T = (en, ru) => (UI_LANG === "ru" ? ru : en);

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
    const error = payload && payload.error ? payload.error : T("Request failed.", "Ошибка запроса.");
    throw new Error(error);
  }

  return payload;
}
window.requestJson = requestJson;
window.UII18N = { lang: UI_LANG, t: T };

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
    ["All Created Games", "Все созданные игры"],
    ["Games published by all players.", "Игры, опубликованные всеми игроками."],
    ["Loading games...", "Загрузка игр..."],
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
    ["No community games yet.", "Пока нет игр от сообщества."],
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
    ["Game files", "Файлы игры"],
    ["+ Add file", "+ Добавить файл"],
    ["File name", "Имя файла"],
    ["Code", "Код"],
    ["Fullscreen", "Полный экран"],
    ["Exit Fullscreen", "Выйти из полного экрана"],
    ["Remove", "Удалить"],
    ["Add at least one HTML file.", "Добавьте хотя бы один HTML файл."],
    ["Games published by all players.", "Игры, опубликованные всеми игроками."],
    ["Open PC Guide", "Открыть гайд по ПК"],
    ["Open Upload Page", "Открыть страницу загрузки"],
    ["Community Games", "Игры сообщества"],
    ["Arcade Games", "Аркадные игры"],
    ["Arcade", "Аркада"],
    ["40 Separate Games", "40 отдельных игр"],
    ["Pick any game from the list and play.", "Выберите любую игру из списка и играйте."],
    ["Welcome back", "С возвращением"],
    ["Sign in to your account", "Войдите в свой аккаунт"],
    ["Secure Access", "Безопасный доступ"],
    ["Sign in to continue with your files and personalized workspace settings.", "Войдите, чтобы продолжить работу с файлами и персональными настройками."],
    ["Enter your account credentials", "Введите данные аккаунта"],
    ["Don't have an account?", "Еще нет аккаунта?"],
    ["Register now", "Зарегистрироваться"],
    ["New Account", "Новый аккаунт"],
    ["Register", "Регистрация"],
    ["Register to unlock your secure dashboard and keep your data in one place.", "Зарегистрируйтесь, чтобы открыть защищенный хаб и хранить данные в одном месте."],
    ["At least 8 characters", "Минимум 8 символов"],
    ["Keep me signed in", "Оставаться в системе"],
    ["I already have an account", "У меня уже есть аккаунт"],
    ["Verification", "Подтверждение"],
    ["Confirm your email", "Подтвердите почту"],
    ["We sent a 6-digit code to your email. Enter it below to activate your account.", "Мы отправили 6-значный код на вашу почту. Введите его ниже для активации аккаунта."],
    ["Verify Email", "Подтверждение почты"],
    ["Check your inbox and enter the verification code", "Проверьте почту и введите код подтверждения"],
    ["Code", "Код"],
    ["6-digit code", "6-значный код"],
    ["Verify", "Подтвердить"],
    ["Resend code", "Отправить код повторно"],
    ["Already verified?", "Уже подтвердили?"],
    ["Go to login", "Перейти ко входу"],
    ["Email", "Почта"],
    ["Password", "Пароль"],
    ["Remember me", "Запомнить меня"],
    ["Forgot password?", "Забыли пароль?"],
    ["Forgot Password", "Забыли пароль"],
    ["Reset Password", "Сброс пароля"],
    ["Recovery", "Восстановление"],
    ["Enter your email and we will send a 6-digit reset code.", "Введите почту, и мы отправим 6-значный код сброса."],
    ["Reset access", "Восстановление доступа"],
    ["Request password reset code", "Запросить код сброса пароля"],
    ["Send reset code", "Отправить код сброса"],
    ["Remembered your password?", "Вспомнили пароль?"],
    ["Reset password", "Сбросить пароль"],
    ["Enter email, code, and new password to restore access.", "Введите почту, код и новый пароль для восстановления доступа."],
    ["Set new password", "Установить новый пароль"],
    ["Use 6-digit code from email", "Используйте 6-значный код из письма"],
    ["New password", "Новый пароль"],
    ["Update password", "Обновить пароль"],
    ["Need another code?", "Нужен новый код?"],
    ["Resend reset code", "Отправить код повторно"],
    ["Sign in", "Войти"],
    ["No account yet?", "Еще нет аккаунта?"],
    ["Create account", "Создать аккаунт"],
    ["Show", "Показать"],
    ["Hide", "Скрыть"],
    ["Create your profile", "Создайте профиль"],
    ["Create your account in less than a minute", "Создайте аккаунт меньше чем за минуту"],
    ["Username", "Имя пользователя"],
    ["Already have an account?", "Уже есть аккаунт?"],
    ["Create Account", "Создать аккаунт"],
    ["Verify Email", "Подтверждение почты"],
    ["Sign Up", "Регистрация"],
    ["Log In", "Вход"],
  ]);
  const normalizedTextMap = new Map(
    Array.from(textMap.entries()).map(([en, ru]) => [String(en).replace(/\s+/g, " ").trim(), ru])
  );

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
    const normalized = trimmed.replace(/\s+/g, " ").trim();
    if (normalizedTextMap.has(normalized)) {
      return value.replace(trimmed, normalizedTextMap.get(normalized));
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
    ["Community Games", "Игры сообщества"],
    ["Pong Online", "Pong Онлайн"],
    ["Arcade Games", "Аркадные игры"],
    ["Login", "Вход"],
    ["Create Account", "Создать аккаунт"],
    ["Forgot Password", "Забыли пароль"],
    ["Reset Password", "Сброс пароля"],
  ]);
  if (titleMap.has(document.title)) {
    document.title = titleMap.get(document.title);
  }

  if (UI_LANG !== "ru") return;
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

function initLanguageToggle() {
  const existing = document.querySelector("[data-lang-toggle]");
  if (existing) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost language-toggle";
  btn.setAttribute("data-lang-toggle", "true");
  btn.textContent = UI_LANG === "ru" ? "EN" : "RU";
  btn.addEventListener("click", () => {
    const next = UI_LANG === "ru" ? "en" : "ru";
    localStorage.setItem(UI_LANG_KEY, next);
    window.location.reload();
  });
  document.body.appendChild(btn);
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
  const emailInput = form.querySelector('input[name="email"]');
  const codeInput = form.querySelector('input[name="code"]');
  if (emailInput && !emailInput.value) {
    const fromQuery = new URLSearchParams(window.location.search).get("email");
    if (fromQuery) emailInput.value = fromQuery;
  }
  if (codeInput && !codeInput.value) {
    const fromQuery = new URLSearchParams(window.location.search).get("code");
    if (fromQuery) codeInput.value = fromQuery;
  }

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
      setMessage(messageEl, T("Success. Redirecting...", "Успешно. Перенаправление..."), false);
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
      toggle.textContent = isHidden ? T("Hide", "Скрыть") : T("Show", "Показать");
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
        top3ListEl.innerHTML = `<p class="top3-empty">${T("No players yet.", "Пока нет игроков.")}</p>`;
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
  const LAST_GAME_KEY = "last-game-path";

  const isValidLastGamePath = (value) => {
    const raw = String(value || "").trim();
    if (!raw.startsWith("/")) return false;
    let pathname = raw;
    try {
      const parsed = new URL(raw, window.location.origin);
      pathname = parsed.pathname;
    } catch (_error) {
      pathname = raw.split("?")[0].split("#")[0];
    }
    return (
      pathname === "/snake" ||
      pathname === "/shooter" ||
      pathname === "/2042" ||
      pathname === "/pong" ||
      pathname === "/pong-online" ||
      pathname === "/breakout" ||
      pathname === "/dodger" ||
      pathname.startsWith("/uploaded/") ||
      pathname.startsWith("/game/")
    );
  };

  const readLocalLastGame = () => {
    const stored = localStorage.getItem(LAST_GAME_KEY) || "";
    return isValidLastGamePath(stored) ? stored : "";
  };

  const renderRows = (container, rows) => {
    if (!container) return;
    if (!rows.length) {
      container.innerHTML = `<p class="hub-muted">${T("No data yet.", "Пока нет данных.")}</p>`;
      return;
    }
    container.innerHTML = rows
      .map((row) => `<p class="hub-row"><span>${row.left}</span><strong>${row.right}</strong></p>`)
      .join("");
  };

  const load = async () => {
    const data = await requestJson("/api/player/home", { method: "GET" });
    if (profileLine) {
      profileLine.textContent = `${data.profile.username} | ${T("Total points", "Всего очков")}: ${data.profile.points} | ${T("Streak", "Серия")}: ${data.profile.dailyStreak}`;
    }
    if (seasonLine) {
      seasonLine.textContent = `${T("Season points", "Сезонные очки")}: ${data.profile.seasonPoints} | ${T("Season rank", "Место в сезоне")}: #${data.profile.seasonRank}`;
    }
    const apiLastGame = data.profile.lastGame || "/snake";
    const localLastGame = readLocalLastGame();
    lastGame = localLastGame || apiLastGame || "/snake";
    if (lastGameLine) {
      lastGameLine.textContent = `${T("Last game", "Последняя игра")}: ${lastGame}`;
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
          incomingList.innerHTML = `<p class="hub-muted">${T("No incoming requests.", "Нет входящих заявок.")}</p>`;
        } else {
          incomingList.innerHTML = incoming
            .map(
              (r) =>
                `<p class="hub-row"><span>${T("Incoming", "Входящая")}: ${r.username}</span><span><button class="btn btn-ghost" type="button" data-request-accept="${r.id}">${T("Accept", "Принять")}</button> <button class="btn btn-ghost" type="button" data-request-reject="${r.id}">${T("Reject", "Отклонить")}</button></span></p>`
            )
            .join("");
        }
      }

      if (outgoingList) {
        if (!outgoing.length) {
          outgoingList.innerHTML = `<p class="hub-muted">${T("No outgoing requests.", "Нет исходящих заявок.")}</p>`;
        } else {
          outgoingList.innerHTML = outgoing
            .map(
              (r) =>
                `<p class="hub-row"><span>${T("Outgoing", "Исходящая")}: ${r.username}</span><button class="btn btn-ghost" type="button" data-request-cancel="${r.id}">${T("Cancel", "Отменить")}</button></p>`
            )
            .join("");
        }
      }
    } catch (_error) {
      if (incomingList) incomingList.innerHTML = `<p class="hub-muted">${T("Failed to load requests.", "Не удалось загрузить заявки.")}</p>`;
      if (outgoingList) outgoingList.innerHTML = `<p class="hub-muted">${T("Failed to load requests.", "Не удалось загрузить заявки.")}</p>`;
    }
  };

  try {
    await load();
    await loadFriendRequests();
  } catch (_error) {
    if (profileLine) profileLine.textContent = T("Failed to load player data.", "Не удалось загрузить данные игрока.");
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", () => {
      const freshLocal = readLocalLastGame();
      window.location.href = freshLocal || lastGame || "/snake";
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
          friendMsg.textContent = T("Request sent.", "Заявка отправлена.");
          friendMsg.classList.remove("is-error");
          friendMsg.classList.add("is-success");
        }
        friendForm.reset();
        await loadFriendRequests();
        await load();
      } catch (error) {
        if (friendMsg) {
          friendMsg.textContent = error.message || T("Failed to send friend request.", "Не удалось отправить заявку в друзья.");
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
        friendMsg.textContent = action === "accept"
          ? T("Request accepted.", "Заявка принята.")
          : T("Request closed.", "Заявка закрыта.");
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
      T("Delete account permanently? This action cannot be undone.", "Удалить аккаунт навсегда? Это действие нельзя отменить.")
    );
    if (!confirmDelete) return;

    try {
      const result = await requestJson("/api/account/delete", {
        method: "POST",
        body: JSON.stringify({ password }),
      });
      window.location.href = result.redirect || "/login";
    } catch (error) {
      window.alert(error.message || T("Failed to delete account.", "Не удалось удалить аккаунт."));
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
      list.innerHTML = `<p class="hub-muted">${T("No uploaded games yet.", "Пока нет загруженных игр.")}</p>`;
      return;
    }
    list.innerHTML = games
      .map(
        (g) =>
          `<p class="hub-row"><span>${g.title}</span><a class="btn btn-ghost" href="/uploaded/${g.slug}">Play</a></p>`
      )
      .join("");
  } catch (_error) {
    list.innerHTML = `<p class="hub-muted">${T("Failed to load uploaded games.", "Не удалось загрузить загруженные игры.")}</p>`;
  }
}

async function initCommunityGames() {
  const list = document.querySelector("[data-community-games-list]");
  if (!list) return;

  try {
    const data = await requestJson("/api/uploaded-games", { method: "GET" });
    const games = Array.isArray(data.games) ? data.games.filter((g) => !g.mine).slice(0, 200) : [];
    if (!games.length) {
      list.innerHTML = `<p class="hub-muted">${T("No community games yet.", "Пока нет игр от сообщества.")}</p>`;
      return;
    }
    list.innerHTML = games
      .map(
        (g) =>
          `<p class="hub-row"><span>${g.title} (${g.creator})</span><a class="btn btn-ghost" href="/uploaded/${g.slug}">${T("Play", "Играть")}</a></p>`
      )
      .join("");
  } catch (_error) {
    list.innerHTML = `<p class="hub-muted">${T("Failed to load community games.", "Не удалось загрузить игры сообщества.")}</p>`;
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
  const filesList = form.querySelector("[data-upload-files-list]");
  const addFileBtn = form.querySelector("[data-add-upload-file]");
  const message = document.querySelector("[data-upload-game-message]");

  const LANGS = [
    "html",
    "css",
    "javascript",
  ];

  const normalizeLanguage = (value) => {
    const lang = String(value || "").trim().toLowerCase();
    return LANGS.includes(lang) ? lang : "javascript";
  };

  const guessLanguageByName = (name) => {
    const file = String(name || "").trim().toLowerCase();
    if (file.endsWith(".html") || file.endsWith(".htm")) return "html";
    if (file.endsWith(".css")) return "css";
    if (file.endsWith(".js") || file.endsWith(".mjs")) return "javascript";
    return "javascript";
  };

  const addFileRow = (initial = {}) => {
    if (!filesList) return;
    const item = document.createElement("div");
    item.className = "upload-file-item";
    item.innerHTML = `
      <div class="upload-file-top">
        <input type="text" data-upload-file-name placeholder="${T("File name", "Имя файла")}" maxlength="64" value="${String(initial.name || "").replace(/"/g, "&quot;")}" />
        <select data-upload-file-language>
          ${LANGS.map((lang) => `<option value="${lang}">${lang}</option>`).join("")}
        </select>
        <button class="btn btn-ghost" type="button" data-upload-file-remove>${T("Remove", "Удалить")}</button>
      </div>
      <textarea class="upload-file-code" data-upload-file-code rows="8" placeholder="${T("Code", "Код")}"></textarea>
    `;
    filesList.appendChild(item);

    const nameInput = item.querySelector("[data-upload-file-name]");
    const languageSelect = item.querySelector("[data-upload-file-language]");
    const codeArea = item.querySelector("[data-upload-file-code]");
    const removeBtn = item.querySelector("[data-upload-file-remove]");

    const initialLang = normalizeLanguage(initial.language || guessLanguageByName(initial.name));
    if (languageSelect) languageSelect.value = initialLang;
    if (codeArea) codeArea.value = String(initial.code || "");

    if (nameInput && languageSelect) {
      nameInput.addEventListener("change", () => {
        languageSelect.value = guessLanguageByName(nameInput.value);
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        item.remove();
      });
    }
  };

  const collectFiles = () => {
    if (!filesList) return [];
    const rows = filesList.querySelectorAll(".upload-file-item");
    return Array.from(rows)
      .map((row) => {
        const name = String(row.querySelector("[data-upload-file-name]")?.value || "").trim().slice(0, 64);
        const language = normalizeLanguage(row.querySelector("[data-upload-file-language]")?.value || "");
        const code = String(row.querySelector("[data-upload-file-code]")?.value || "");
        return { name, language, code };
      })
      .filter((f) => f.name && f.code.trim().length > 0);
  };

  const injectIntoHtml = (html, insertion, closeTag) => {
    const lower = html.toLowerCase();
    const idx = lower.lastIndexOf(closeTag);
    if (idx === -1) return `${html}\n${insertion}`;
    return `${html.slice(0, idx)}\n${insertion}\n${html.slice(idx)}`;
  };

  const compileFilesToHtml = (files) => {
    const htmlFile = files.find((f) => f.language === "html");
    let html = String(htmlFile?.code || "");
    const cssBundle = files
      .filter((f) => f.language === "css")
      .map((f) => `/* ${f.name || "style.css"} */\n${f.code}`)
      .join("\n\n");
    const jsBundle = files
      .filter((f) => f.language === "javascript")
      .map((f) => `// ${f.name || "script.js"}\n${f.code}`)
      .join("\n\n");
    const notes = files
      .filter((f) => !["html", "css", "javascript"].includes(f.language))
      .map((f) => `${f.language}: ${f.name}`)
      .join(", ");
    const hasWebCode = Boolean(htmlFile) || cssBundle.trim().length > 0 || jsBundle.trim().length > 0;

    if (!html.trim()) {
      html = `<!doctype html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>Custom Game</title>
</head>
<body>
  <div id="app"></div>
</body>
</html>`;
    }

    if (cssBundle) {
      html = injectIntoHtml(html, `<style>\n${cssBundle}\n</style>`, "</head>");
    }
    if (jsBundle) {
      html = injectIntoHtml(html, `<script>\n${jsBundle}\n</script>`, "</body>");
    }
    if (!hasWebCode) {
      html = injectIntoHtml(
        html,
        `<script>
          const app = document.getElementById("app");
          if (app) {
            app.innerHTML = "<div style=\\"padding:16px;font-family:system-ui;color:#eaf4ed\\">No runnable web code found. Add HTML/CSS/JavaScript file.</div>";
          }
        </script>`,
        "</body>"
      );
    }
    if (notes) {
      html = `${html}\n<!-- Additional files attached (not executable in browser): ${notes} -->`;
    }
    return html;
  };

  const applyPackage = (pkg) => {
    if (!pkg || typeof pkg !== "object") {
      throw new Error("Invalid file format.");
    }
    if (titleInput && typeof pkg.title === "string") titleInput.value = pkg.title.slice(0, 64);
    if (descriptionInput && typeof pkg.description === "string") {
      descriptionInput.value = pkg.description.slice(0, 220);
    }
    if (filesList) filesList.innerHTML = "";
    if (Array.isArray(pkg.files) && pkg.files.length) {
      pkg.files.forEach((f) => addFileRow(f));
      if (htmlInput) {
        try {
          htmlInput.value = compileFilesToHtml(collectFiles());
        } catch (_error) {
          htmlInput.value = "";
        }
      }
      return;
    }
    if (htmlInput && typeof pkg.htmlContent === "string") {
      htmlInput.value = pkg.htmlContent;
      addFileRow({
        name: "index.html",
        language: "html",
        code: pkg.htmlContent,
      });
    }
  };

  if (filesList && !filesList.children.length) {
    addFileRow({
      name: "index.html",
      language: "html",
      code:
        "<!doctype html>\n<html>\n<head>\n  <meta charset=\"UTF-8\" />\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1.0\" />\n  <title>My Game</title>\n</head>\n<body>\n  <h1>My Game</h1>\n  <script>console.log('Game started');</script>\n</body>\n</html>",
    });
  }

  if (addFileBtn) {
    addFileBtn.addEventListener("click", () => {
      addFileRow({
        name: `file-${Date.now()}.js`,
        language: "javascript",
        code: "",
      });
    });
  }

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
          T(
            "Cannot read file. Upload JSON package with title, description, htmlContent.",
            "Не удалось прочитать файл. Загрузите JSON с полями title, description, htmlContent."
          ),
          true
        );
      }
    });
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(message, "", false);

    let compiledHtml = String(htmlInput?.value || "");
    const files = collectFiles();
    if (files.length) {
      try {
        compiledHtml = compileFilesToHtml(files);
      } catch (error) {
        setMessage(message, error.message || T("Compile failed.", "Сборка не удалась."), true);
        return;
      }
    }
    if (htmlInput) htmlInput.value = compiledHtml;

    const payload = {
      title: String(titleInput?.value || ""),
      description: String(descriptionInput?.value || ""),
      htmlContent: compiledHtml,
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
      setMessage(message, error.message || T("Upload failed.", "Загрузка не удалась."), true);
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
    requestJson("/api/progress/last-game", {
      method: "POST",
      body: JSON.stringify({ game: window.location.pathname }),
    }).catch(() => {
      // Ignore sync errors to not block gameplay.
    });
  }
}

function initFullscreenForGames() {
  const gameTarget =
    document.querySelector(".snake-board") ||
    document.querySelector(".shooter-board") ||
    document.querySelector(".arcade-board") ||
    document.querySelector("[data-2042-board]") ||
    document.querySelector(".ugc-frame") ||
    document.querySelector("[data-uploaded-stage]");
  if (!gameTarget) return;

  const actions = document.querySelector(".dashboard-actions");
  if (!actions || actions.querySelector("[data-fullscreen-btn]")) return;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-ghost";
  button.setAttribute("data-fullscreen-btn", "true");

  const getFullscreenElement = () =>
    document.fullscreenElement || document.webkitFullscreenElement || null;

  const updateLabel = () => {
    button.textContent = getFullscreenElement()
      ? T("Exit Fullscreen", "Выйти из полного экрана")
      : T("Fullscreen", "Полный экран");
  };

  const requestFs = (el) => {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    return Promise.resolve();
  };

  const exitFs = () => {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    return Promise.resolve();
  };

  button.addEventListener("click", async () => {
    try {
      if (getFullscreenElement()) {
        await exitFs();
      } else {
        await requestFs(gameTarget);
      }
    } catch (_error) {
      // Ignore and keep page usable on devices without fullscreen API.
    } finally {
      updateLabel();
    }
  });

  document.addEventListener("fullscreenchange", updateLabel);
  document.addEventListener("webkitfullscreenchange", updateLabel);
  updateLabel();
  actions.insertBefore(button, actions.firstChild);
}

document.addEventListener("DOMContentLoaded", () => {
  initRussianLocale();
  initLanguageToggle();
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
  initCommunityGames();
  initUploadGameForm();
  initLastGameResume();
  initFullscreenForGames();
});
  
