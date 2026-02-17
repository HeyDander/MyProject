const CORE_SKINS = [
  {
    id: "classic",
    name: "Classic",
    cost: 0,
    palette: {
      primary: "#74c691",
      secondary: "#356f4d",
      accent: "#c5f3d2",
      tileLow: "#2b5a40",
      tileMid: "#376f4f",
      tileHigh: "#4f946a",
      tileTop: "#79c89a",
    },
  },
  {
    id: "ember",
    name: "Ember",
    cost: 80,
    palette: {
      primary: "#ffb37f",
      secondary: "#d96a2f",
      accent: "#ffe0c8",
      tileLow: "#7b3f1d",
      tileMid: "#a95826",
      tileHigh: "#d9833b",
      tileTop: "#ffc18b",
    },
  },
  {
    id: "emerald",
    name: "Emerald",
    cost: 120,
    palette: {
      primary: "#43e6c6",
      secondary: "#188f7a",
      accent: "#cffff4",
      tileLow: "#13695b",
      tileMid: "#178876",
      tileHigh: "#20b79d",
      tileTop: "#66f0d8",
    },
  },
  {
    id: "sapphire",
    name: "Sapphire",
    cost: 160,
    palette: {
      primary: "#6eb7ff",
      secondary: "#2e6dc2",
      accent: "#d7ebff",
      tileLow: "#234b85",
      tileMid: "#2e5fa9",
      tileHigh: "#4384d1",
      tileTop: "#7eb9ff",
    },
  },
  {
    id: "violet",
    name: "Violet",
    cost: 190,
    palette: {
      primary: "#c19bff",
      secondary: "#7a4fc7",
      accent: "#eadcff",
      tileLow: "#583399",
      tileMid: "#7343bf",
      tileHigh: "#9360df",
      tileTop: "#c5a2ff",
    },
  },
  {
    id: "royal",
    name: "Royal",
    cost: 520,
    palette: {
      primary: "#ffd86e",
      secondary: "#9c7a1d",
      accent: "#fff2c7",
      tileLow: "#6f5515",
      tileMid: "#8c6c1b",
      tileHigh: "#b28a27",
      tileTop: "#ffe18d",
    },
  },
];

const CORE_BY_ID = new Map(CORE_SKINS.map((skin) => [skin.id, skin]));
const SKIN_MAP = new Map(CORE_SKINS.map((skin) => [skin.id, skin]));

const skinState = {
  loaded: false,
  points: 0,
  crystals: 0,
  ownedSkins: ["classic"],
  selectedSkin: "classic",
  pendingPoints: 0,
  flushTimer: null,
  loadingPromise: null,
  catalog: [],
};
const TT = (en, ru) =>
  window.UII18N && typeof window.UII18N.t === "function" ? window.UII18N.t(en, ru) : en;

function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const lig = l / 100;
  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = lig - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return "#" + toHex(r) + toHex(g) + toHex(b);
}

function generatedPalette(id) {
  const hash = hashString(id);
  const h1 = hash % 360;
  const h2 = (h1 + 120 + ((hash >> 6) % 90)) % 360;
  const h3 = (h1 + 220 + ((hash >> 12) % 120)) % 360;
  const satA = 68 + ((hash >> 3) % 24);
  const satB = 56 + ((hash >> 8) % 26);
  const satC = 74 + ((hash >> 15) % 18);
  const lA = 52 + ((hash >> 10) % 16);
  const lB = 30 + ((hash >> 16) % 18);
  const lC = 80 + ((hash >> 21) % 12);

  return {
    primary: hslToHex(h1, satA, lA),
    secondary: hslToHex(h2, satB, lB),
    accent: hslToHex(h3, satC, lC),
    tileLow: hslToHex(h2, satB - 10, Math.max(22, lB - 8)),
    tileMid: hslToHex(h2, satB, Math.min(48, lB + 2)),
    tileHigh: hslToHex(h1, satA - 8, Math.min(64, lA + 6)),
    tileTop: hslToHex(h3, satC - 6, Math.min(90, lC + 2)),
  };
}

function getSkinById(skinId) {
  return SKIN_MAP.get(skinId) || SKIN_MAP.get("classic");
}

function getCurrentSkin() {
  return getSkinById(skinState.selectedSkin);
}

function setShopMessage(text, isError = false) {
  const nodes = document.querySelectorAll("[data-shop-message]");
  for (const node of nodes) {
    node.textContent = text || "";
    node.classList.toggle("is-error", Boolean(isError));
    node.classList.toggle("is-success", !isError && Boolean(text));
  }
}

function emitSkinChange() {
  window.dispatchEvent(
    new CustomEvent("game-skin-change", {
      detail: {
        selectedSkin: skinState.selectedSkin,
        skin: getCurrentSkin(),
        points: skinState.points,
        crystals: skinState.crystals,
      },
    })
  );
}

function updateProgressUI() {
  const pointsNodes = document.querySelectorAll("[data-points]");
  for (const node of pointsNodes) {
    node.textContent = String(skinState.points);
  }
  const crystalsNodes = document.querySelectorAll("[data-crystals]");
  for (const node of crystalsNodes) {
    node.textContent = String(skinState.crystals);
  }

  const skinNameNodes = document.querySelectorAll("[data-skin-name]");
  const currentSkin = getCurrentSkin();
  for (const node of skinNameNodes) {
    node.textContent = currentSkin.name;
  }

  const creatorToggle = document.querySelector("[data-open-creator]");
  if (creatorToggle) {
    const canCreate = skinState.points >= 200;
    if (creatorToggle.tagName === "BUTTON") {
      creatorToggle.disabled = !canCreate;
      creatorToggle.textContent = canCreate
        ? TT("Create Your Skin (200 points)", "Создать свой скин (200 очков)")
        : TT("Create Your Skin (need 200 points)", "Создать свой скин (нужно 200 очков)");
    } else {
      creatorToggle.classList.toggle("disabled", !canCreate);
      creatorToggle.setAttribute("aria-disabled", canCreate ? "false" : "true");
      creatorToggle.textContent = canCreate
        ? TT("Create Your Skin (200 points)", "Создать свой скин (200 очков)")
        : TT("Create Your Skin (need 200 points)", "Создать свой скин (нужно 200 очков)");
    }
  }

  renderShop();
  emitSkinChange();
}

function ensureCatalog(serverCatalog) {
  skinState.catalog = serverCatalog.map((entry) => {
    const core = CORE_BY_ID.get(entry.id);
    const palette = core
      ? core.palette
      : entry.palette && typeof entry.palette === "object"
        ? entry.palette
        : generatedPalette(entry.id);
    const skin = {
      id: entry.id,
      name: entry.name || entry.id,
      cost: entry.cost,
      crystalCost: Number(entry.crystalCost || 0),
      exclusive: Boolean(entry.exclusive),
      palette,
      isCustom: Boolean(entry.isCustom),
      createdBy: entry.createdBy || "",
      userCreated: Boolean(entry.userCreated),
      isListed: Boolean(entry.isListed),
    };
    SKIN_MAP.set(skin.id, skin);
    return skin;
  });
}

async function loadProgress() {
  if (skinState.loadingPromise) return skinState.loadingPromise;

  skinState.loadingPromise = window
    .requestJson("/api/progress", { method: "GET" })
    .then((data) => {
      ensureCatalog(Array.isArray(data.skinCatalog) ? data.skinCatalog : []);
      skinState.points = Number(data.points || 0);
      skinState.crystals = Number(data.crystals || 0);
      skinState.ownedSkins = Array.isArray(data.ownedSkins) ? data.ownedSkins : ["classic"];
      skinState.selectedSkin = data.selectedSkin || "classic";
      if (!skinState.ownedSkins.includes("classic")) {
        skinState.ownedSkins.unshift("classic");
      }
      if (!skinState.ownedSkins.includes(skinState.selectedSkin)) {
        skinState.selectedSkin = "classic";
      }
      skinState.loaded = true;
      updateProgressUI();
      return data;
    })
    .catch((_error) => {
      skinState.loaded = false;
    });

  return skinState.loadingPromise;
}

function refreshProgress() {
  skinState.loadingPromise = null;
  return loadProgress();
}

function skinPriceText(skin) {
  if (Number(skin.crystalCost || 0) > 0) {
    return `${skin.crystalCost} ${TT("crystals", "кристаллов")}`;
  }
  return `${skin.cost} ${TT("points", "очков")}`;
}

function actionButtonLabel(skin, mode) {
  if (skinState.selectedSkin === skin.id) return TT("Selected", "Выбран");
  if (skinState.ownedSkins.includes(skin.id)) return TT("Use", "Надеть");
  return mode === "owned" ? TT("Locked", "Закрыт") : `${TT("Buy", "Купить")} (${skinPriceText(skin)})`;
}

function actionButtonDisabled(skin, mode) {
  if (skinState.selectedSkin === skin.id) return true;
  if (skinState.ownedSkins.includes(skin.id)) return false;
  if (mode === "owned") return true;
  if (Number(skin.crystalCost || 0) > 0) return skinState.crystals < Number(skin.crystalCost || 0);
  return skinState.points < Number(skin.cost || 0);
}

async function onSkinAction(skinId) {
  const skin = getSkinById(skinId);
  setShopMessage("", false);

  if (skinState.selectedSkin === skinId) return;

  try {
    if (!skinState.ownedSkins.includes(skinId)) {
      const result = await window.requestJson("/api/progress/buy", {
        method: "POST",
        body: JSON.stringify({ skinId }),
      });
      skinState.points = result.points;
      skinState.crystals = Number(result.crystals || skinState.crystals || 0);
      skinState.ownedSkins = result.ownedSkins;
      setShopMessage(`${skin.name} ${TT("purchased.", "куплен.")}`, false);
    }

    const selected = await window.requestJson("/api/progress/select", {
      method: "POST",
      body: JSON.stringify({ skinId }),
    });

    skinState.selectedSkin = selected.selectedSkin;
    skinState.points = selected.points;
    skinState.crystals = Number(selected.crystals || skinState.crystals || 0);
    skinState.ownedSkins = selected.ownedSkins;
    setShopMessage(`${skin.name} ${TT("equipped.", "выбран.")}`, false);
    updateProgressUI();
  } catch (error) {
    setShopMessage(error.message || TT("Skin action failed.", "Не удалось выполнить действие со скином."), true);
  }
}

async function onSkinRemove(skinId) {
  const skin = getSkinById(skinId);
  setShopMessage("", false);

  try {
    const result = await window.requestJson("/api/progress/sell", {
      method: "POST",
      body: JSON.stringify({ skinId }),
    });
    skinState.points = result.points;
    skinState.crystals = Number(result.crystals || skinState.crystals || 0);
    skinState.ownedSkins = result.ownedSkins;
    skinState.selectedSkin = result.selectedSkin;
    if (Number(result.refundedCrystals || 0) > 0) {
      setShopMessage(
        `${skin.name} ${TT("removed", "удален")} (+${result.refundedCrystals} ${TT("crystals", "кристаллов")}).`,
        false
      );
    } else {
      setShopMessage(
        `${skin.name} ${TT("removed", "удален")} (+${result.refundedPoints || result.refunded} ${TT("points", "очков")}).`,
        false
      );
    }
    updateProgressUI();
  } catch (error) {
    setShopMessage(error.message || TT("Failed to remove skin.", "Не удалось удалить скин."), true);
  }
}

async function onSkinUnlist(skinId) {
  setShopMessage("", false);
  try {
    await window.requestJson("/api/skins/unlist", {
      method: "POST",
      body: JSON.stringify({ skinId }),
    });
    await refreshProgress();
    setShopMessage(TT("Skin removed from sale.", "Скин снят с продажи."), false);
  } catch (error) {
    setShopMessage(error.message || TT("Failed to remove skin from sale.", "Не удалось снять скин с продажи."), true);
  }
}

async function onSkinDelete(skinId) {
  setShopMessage("", false);
  const ok = window.confirm(TT("Delete this custom skin from game for everyone?", "Удалить этот пользовательский скин из игры для всех?"));
  if (!ok) return;
  try {
    const result = await window.requestJson("/api/skins/delete", {
      method: "POST",
      body: JSON.stringify({ skinId }),
    });
    if (result && Array.isArray(result.ownedSkins)) {
      skinState.points = Number(result.points || 0);
      skinState.crystals = Number(result.crystals || skinState.crystals || 0);
      skinState.ownedSkins = result.ownedSkins;
      skinState.selectedSkin = result.selectedSkin || "classic";
      skinState.catalog = skinState.catalog.filter((skin) => skin.id !== skinId);
      SKIN_MAP.delete(skinId);
      updateProgressUI();
    } else {
      await refreshProgress();
    }
    setShopMessage(TT("Custom skin deleted.", "Пользовательский скин удален."), false);
  } catch (error) {
    setShopMessage(error.message || TT("Failed to delete custom skin.", "Не удалось удалить пользовательский скин."), true);
  }
}

function renderShop() {
  const shopNodes = document.querySelectorAll("[data-skin-shop]");
  if (!shopNodes.length || !skinState.loaded) return;

  for (const shop of shopNodes) {
    const mode = shop.getAttribute("data-shop-mode") || "all";
    const list = mode === "owned"
      ? skinState.catalog.filter((skin) => skinState.ownedSkins.includes(skin.id))
      : mode === "created"
        ? skinState.catalog.filter((skin) => skin.isCustom && skin.userCreated)
        : mode === "exclusive"
          ? skinState.catalog.filter((skin) => !skin.isCustom && skin.exclusive && Number(skin.crystalCost || 0) > 0)
          : skinState.catalog.filter((skin) => !skin.exclusive)

    shop.innerHTML = "";

    if (!list.length) {
      const empty = document.createElement("p");
      empty.className = "shop-message";
      empty.textContent =
        mode === "created"
          ? TT("No created skins yet.", "Пока нет созданных скинов.")
          : mode === "exclusive"
            ? TT("No exclusive crystal skins available.", "Пока нет эксклюзивных скинов за кристаллы.")
          : TT("No owned skins yet.", "Пока нет купленных скинов.");
      shop.appendChild(empty);
      continue;
    }

    for (const skin of list) {
      const card = document.createElement("article");
      card.className = `skin-card${skinState.selectedSkin === skin.id ? " selected" : ""}`;

      const title = document.createElement("h3");
      title.textContent = skin.name;

      const preview = document.createElement("div");
      preview.className = "skin-preview";
      preview.style.setProperty("--swatch-primary", skin.palette.primary);
      preview.style.setProperty("--swatch-secondary", skin.palette.secondary);
      preview.style.setProperty("--swatch-accent", skin.palette.accent);

      const price = document.createElement("p");
      price.className = "skin-price";
      price.textContent = skinState.ownedSkins.includes(skin.id)
        ? TT("Owned", "Куплен")
        : skinPriceText(skin);

      const meta = document.createElement("p");
      meta.className = "skin-meta";
      if (skin.isCustom) {
        if (skin.userCreated) {
          meta.textContent = skin.isListed
            ? TT("Your custom skin (on sale)", "Ваш скин (на продаже)")
            : TT("Your custom skin", "Ваш скин");
        } else {
          meta.textContent = `${TT("Created by", "Создал")}: ${skin.createdBy || TT("player", "игрок")}`;
        }
      } else if (skin.exclusive) {
        meta.textContent = TT("Exclusive skin", "Эксклюзивный скин");
      } else {
        meta.textContent = TT("Official skin", "Официальный скин");
      }

      const actions = document.createElement("div");
      actions.className = "skin-actions";

      const action = document.createElement("button");
      action.className = "btn skin-action";
      action.textContent = actionButtonLabel(skin, mode);
      action.disabled = actionButtonDisabled(skin, mode);
      action.addEventListener("click", () => onSkinAction(skin.id));
      actions.appendChild(action);

      const canRemove = skinState.ownedSkins.includes(skin.id) && skin.id !== "classic";
      if (canRemove) {
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn btn-ghost skin-action skin-remove";
        const refundText = Number(skin.crystalCost || 0) > 0
          ? `+${Math.max(0, Number(skin.crystalCost || 0))} ${TT("crystals", "кристаллов")}`
          : `+${Math.max(0, Number(skin.cost || 0))} ${TT("points", "очков")}`;
        removeBtn.textContent = `${TT("Remove", "Удалить")} (${refundText})`;
        removeBtn.addEventListener("click", () => onSkinRemove(skin.id));
        actions.appendChild(removeBtn);
      }

      if (skin.isCustom && skin.userCreated && skin.isListed) {
        const unlistBtn = document.createElement("button");
        unlistBtn.className = "btn btn-ghost skin-action";
        unlistBtn.textContent = TT("Remove from sale", "Снять с продажи");
        unlistBtn.addEventListener("click", () => onSkinUnlist(skin.id));
        actions.appendChild(unlistBtn);
      }

      if (skin.isCustom && skin.userCreated) {
        const deleteBtn = document.createElement("button");
        deleteBtn.className = "btn btn-ghost skin-action";
        deleteBtn.textContent = TT("Delete skin", "Удалить скин");
        deleteBtn.addEventListener("click", () => onSkinDelete(skin.id));
        actions.appendChild(deleteBtn);
      }

      card.appendChild(title);
      card.appendChild(preview);
      card.appendChild(price);
      card.appendChild(meta);
      card.appendChild(actions);
      shop.appendChild(card);
    }
  }
}

function initCreatorForm() {
  const toggleBtn = document.querySelector("[data-open-creator]");
  const form = document.querySelector("[data-creator-form]");
  if (!form) return;

  if (toggleBtn && toggleBtn.tagName === "BUTTON") {
    toggleBtn.addEventListener("click", () => {
      if (skinState.points < 200) {
        setShopMessage(TT("You need 200 points to open creator.", "Нужно 200 очков, чтобы открыть редактор."), true);
        return;
      }
      form.hidden = !form.hidden;
      toggleBtn.textContent = form.hidden
        ? TT("Create Your Skin (200 points)", "Создать свой скин (200 очков)")
        : TT("Close Creator", "Закрыть редактор");
    });
  } else if (toggleBtn && toggleBtn.tagName === "A") {
    toggleBtn.addEventListener("click", (event) => {
      if (skinState.points >= 200) return;
      event.preventDefault();
      setShopMessage(TT("You need 200 points to open creator.", "Нужно 200 очков, чтобы открыть редактор."), true);
    });
  } else {
    form.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      name: String(formData.get("name") || ""),
      listPrice: Number(formData.get("listPrice") || 0),
      palette: {
        primary: String(formData.get("primary") || ""),
        secondary: String(formData.get("secondary") || ""),
        accent: String(formData.get("accent") || ""),
        tileLow: String(formData.get("tileLow") || ""),
        tileMid: String(formData.get("tileMid") || ""),
        tileHigh: String(formData.get("tileHigh") || ""),
        tileTop: String(formData.get("tileTop") || ""),
      },
    };

    try {
      await window.requestJson("/api/skins/create", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await refreshProgress();
      setShopMessage(TT("Custom skin created.", "Пользовательский скин создан."), false);
      form.reset();
    } catch (error) {
      setShopMessage(error.message || TT("Failed to create custom skin.", "Не удалось создать пользовательский скин."), true);
    }
  });
}

function flushPoints() {
  if (skinState.pendingPoints <= 0) return;
  const pointsToSend = skinState.pendingPoints;
  skinState.pendingPoints = 0;

  window
    .requestJson("/api/progress/add", {
      method: "POST",
      body: JSON.stringify({ points: pointsToSend, game: window.location.pathname }),
    })
    .then((data) => {
      skinState.points = data.points;
      updateProgressUI();
    })
    .catch((_error) => {
      skinState.points -= pointsToSend;
      if (skinState.points < 0) skinState.points = 0;
      updateProgressUI();
    });
}

function awardPoints(points) {
  const amount = Number(points);
  if (!Number.isFinite(amount) || amount <= 0) return;

  const normalized = Math.floor(amount);
  skinState.points += normalized;
  skinState.pendingPoints += normalized;
  updateProgressUI();

  if (skinState.flushTimer) {
    clearTimeout(skinState.flushTimer);
  }
  skinState.flushTimer = setTimeout(flushPoints, 500);
}

window.GameSkins = {
  getCurrentSkin,
  awardPoints,
  refreshProgress,
};

document.addEventListener("DOMContentLoaded", () => {
  if (!document.querySelector("[data-skin-shop]") && !document.querySelector("[data-points]")) {
    return;
  }
  initCreatorForm();
  loadProgress();
});
