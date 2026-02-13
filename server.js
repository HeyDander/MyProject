const path = require("path");
const fs = require("fs");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const Database = require("better-sqlite3");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_GAMES = 10;
const MAX_SKINS = 50;
const CUSTOM_SKIN_ID_PREFIX = "custom-";
const CREATOR_UNLOCK_POINTS = 200;
const SKIN_CATALOG = {
  "classic": { cost: 0 },
  "ember": { cost: 80 },
  "emerald": { cost: 120 },
  "sapphire": { cost: 160 },
  "violet": { cost: 190 },
  "crimson": { cost: 220 },
  "graphite": { cost: 250 },
  "frost": { cost: 280 },
  "sunset": { cost: 320 },
  "toxic": { cost: 360 },
  "neon": { cost: 420 },
  "royal": { cost: 520 },
  "aurora": { cost: 80 },
  "magma": { cost: 95 },
  "citrus": { cost: 110 },
  "oceanic": { cost: 125 },
  "plasma": { cost: 140 },
  "twilight": { cost: 155 },
  "candy": { cost: 170 },
  "glacier": { cost: 185 },
  "jungle": { cost: 200 },
  "copper": { cost: 215 },
  "berry": { cost: 230 },
  "storm": { cost: 245 },
  "peach": { cost: 260 },
  "venom": { cost: 275 },
  "cosmos": { cost: 290 },
  "lemon-lime": { cost: 305 },
  "rosegold": { cost: 320 },
  "arctic": { cost: 335 },
  "obsidian": { cost: 350 },
  "sunset-pop": { cost: 365 },
  "mint-fizz": { cost: 380 },
  "ultra-violet": { cost: 395 },
  "skyfire": { cost: 410 },
  "cherry-ice": { cost: 425 },
  "lagoon": { cost: 440 },
  "bronze": { cost: 455 },
  "moonlight": { cost: 470 },
  "wildfire": { cost: 485 },
  "synthwave": { cost: 500 },
  "cotton-candy": { cost: 515 },
  "desert": { cost: 530 },
  "electric-lime": { cost: 545 },
  "blue-ember": { cost: 560 },
  "ruby-night": { cost: 575 },
  "neon-mint": { cost: 590 },
  "polar-night": { cost: 605 },
  "tangerine": { cost: 620 },
  "grape-soda": { cost: 635 },
  "seafoam": { cost: 650 },
  "infrared": { cost: 665 },
  "prism": { cost: 680 },
  "forest-flare": { cost: 695 },
  "acid-rain": { cost: 710 },
  "lava-lamp": { cost: 725 },
  "deep-space": { cost: 740 },
  "orchid": { cost: 755 },
  "jade-fire": { cost: 770 },
  "retro-wave": { cost: 785 },
  "hazard": { cost: 800 },
  "mint-chrome": { cost: 815 },
  "plum-shock": { cost: 830 },
  "gold-rush": { cost: 845 },
  "redline": { cost: 860 },
  "nightfall": { cost: 875 },
  "aqua-punch": { cost: 890 },
  "melon": { cost: 905 },
  "starlight": { cost: 920 },
  "ember-ice": { cost: 935 },
  "pineapple": { cost: 950 },
  "rainbow-x": { cost: 965 },
  "abyss": { cost: 980 },
  "lava-core": { cost: 995 },
  "jade-dragon": { cost: 1010 },
  "ultravolt": { cost: 1025 },
  "hyper-cyan": { cost: 1040 },
  "rose-neon": { cost: 1055 },
  "mystic-sand": { cost: 1070 },
  "plasma-green": { cost: 1085 },
  "nova": { cost: 1100 },
  "quantum": { cost: 1120 },
};
for (const id of Object.keys(SKIN_CATALOG).slice(MAX_SKINS)) {
  delete SKIN_CATALOG[id];
}
const preservedSkinIds = [
  "classic",
  "ember",
  "emerald",
  "sapphire",
  "violet",
  "royal",
  "crimson",
  "graphite",
  "frost",
  "sunset",
];
const rebuiltSkinCatalog = {};
for (const id of preservedSkinIds) {
  if (SKIN_CATALOG[id]) rebuiltSkinCatalog[id] = { ...SKIN_CATALOG[id] };
}
for (let i = 1; i <= MAX_SKINS - preservedSkinIds.length; i += 1) {
  const id = `artist-${String(i).padStart(2, "0")}`;
  rebuiltSkinCatalog[id] = { cost: 180 + i * 22 };
}
for (const id of Object.keys(SKIN_CATALOG)) {
  delete SKIN_CATALOG[id];
}
Object.assign(SKIN_CATALOG, rebuiltSkinCatalog);

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(path.join(dataDir, "auth.db"));
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  )
`);
const userColumns = db.prepare("PRAGMA table_info(users)").all();
if (!userColumns.some((col) => col.name === "username")) {
  db.exec("ALTER TABLE users ADD COLUMN username TEXT");
}
const addedEmailVerifiedColumn = !userColumns.some((col) => col.name === "email_verified");
if (addedEmailVerifiedColumn) {
  db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER NOT NULL DEFAULT 0");
}
if (addedEmailVerifiedColumn) {
  db.exec("UPDATE users SET email_verified = 1");
}
const usersWithoutUsername = db
  .prepare("SELECT id, email FROM users WHERE username IS NULL OR TRIM(username) = ''")
  .all();
for (const row of usersWithoutUsername) {
  const base = String(row.email || "")
    .split("@")[0]
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 20);
  const username = base ? `${base}-${row.id}` : `player-${row.id}`;
  db.prepare("UPDATE users SET username = ? WHERE id = ?").run(username, row.id);
}
db.exec(`
  CREATE TABLE IF NOT EXISTS user_progress (
    user_id INTEGER PRIMARY KEY,
    points INTEGER NOT NULL DEFAULT 0,
    owned_skins TEXT NOT NULL DEFAULT '["classic"]',
    selected_skin TEXT NOT NULL DEFAULT 'classic',
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    email TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code_hash TEXT NOT NULL,
    expires_at INTEGER NOT NULL,
    last_sent_at INTEGER NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);
db.exec(`
  CREATE TABLE IF NOT EXISTS custom_skins (
    id TEXT PRIMARY KEY,
    creator_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    palette_json TEXT NOT NULL,
    list_price INTEGER NOT NULL DEFAULT 0,
    is_listed INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(creator_user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(express.static(path.join(__dirname, "public")));

function isAuthed(req) {
  return Boolean(req.session && req.session.userId);
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeUsername(username) {
  return String(username || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
}

function generateVerificationCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function hashCode(code) {
  return crypto.createHash("sha256").update(String(code)).digest("hex");
}

function getMailConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 0);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.FROM_EMAIL || process.env.SMTP_USER;
  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

async function sendVerificationEmail(email, code) {
  const cfg = getMailConfig();
  if (!cfg) {
    throw new Error(
      "Email service is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL."
    );
  }

  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: {
      user: cfg.user,
      pass: cfg.pass,
    },
  });

  await transporter.sendMail({
    from: cfg.from,
    to: email,
    subject: "Your verification code",
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
  });
}

async function issueVerificationCode(userId, email) {
  const code = generateVerificationCode();
  const now = Date.now();
  const expiresAt = now + VERIFICATION_TTL_MS;

  db.prepare(
    `
    INSERT INTO email_verifications (email, user_id, code_hash, expires_at, last_sent_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      user_id = excluded.user_id,
      code_hash = excluded.code_hash,
      expires_at = excluded.expires_at,
      last_sent_at = excluded.last_sent_at
    `
  ).run(email, userId, hashCode(code), expiresAt, now);

  await sendVerificationEmail(email, code);
}

function skinNameFromId(id) {
  return id
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function requireAuth(req, res, next) {
  if (!isAuthed(req)) {
    return res.redirect("/login");
  }
  next();
}

function normalizeSkins(rawOwnedSkins) {
  const customIds = new Set(
    db.prepare("SELECT id FROM custom_skins").all().map((row) => String(row.id))
  );
  try {
    const parsed = JSON.parse(rawOwnedSkins);
    if (!Array.isArray(parsed)) return ["classic"];
    const filtered = parsed.filter((skin) => SKIN_CATALOG[skin] || customIds.has(skin));
    return filtered.includes("classic") ? filtered : ["classic", ...filtered];
  } catch (_err) {
    return ["classic"];
  }
}

function isValidHexColor(value) {
  return /^#[0-9a-fA-F]{6}$/.test(String(value || ""));
}

function parseCustomPalette(rawPalette) {
  const palette = rawPalette && typeof rawPalette === "object" ? rawPalette : {};
  const normalized = {
    primary: String(palette.primary || "").trim(),
    secondary: String(palette.secondary || "").trim(),
    accent: String(palette.accent || "").trim(),
    tileLow: String(palette.tileLow || "").trim(),
    tileMid: String(palette.tileMid || "").trim(),
    tileHigh: String(palette.tileHigh || "").trim(),
    tileTop: String(palette.tileTop || "").trim(),
  };
  if (!Object.values(normalized).every(isValidHexColor)) {
    return null;
  }
  return normalized;
}

function getCustomSkinById(skinId) {
  return db
    .prepare(
      `
      SELECT
        cs.id,
        cs.creator_user_id,
        cs.name,
        cs.palette_json,
        cs.list_price,
        cs.is_listed,
        u.username AS creator_username
      FROM custom_skins cs
      LEFT JOIN users u ON u.id = cs.creator_user_id
      WHERE cs.id = ?
      `
    )
    .get(skinId);
}

function listVisibleCustomSkins(userId) {
  return db
    .prepare(
      `
      SELECT
        cs.id,
        cs.creator_user_id,
        cs.name,
        cs.palette_json,
        cs.list_price,
        cs.is_listed,
        u.username AS creator_username
      FROM custom_skins cs
      LEFT JOIN users u ON u.id = cs.creator_user_id
      WHERE cs.is_listed = 1 OR cs.creator_user_id = ?
      ORDER BY cs.created_at DESC
      `
    )
    .all(userId);
}

function skinExists(skinId) {
  if (SKIN_CATALOG[skinId]) return true;
  const custom = db.prepare("SELECT id FROM custom_skins WHERE id = ?").get(skinId);
  return Boolean(custom);
}

function ensureProgress(userId) {
  const row = db
    .prepare(
      "SELECT user_id, points, owned_skins, selected_skin FROM user_progress WHERE user_id = ?"
    )
    .get(userId);

  if (row) {
    const ownedSkins = normalizeSkins(row.owned_skins);
    let selectedSkin = row.selected_skin;
    if (!ownedSkins.includes(selectedSkin)) {
      selectedSkin = "classic";
    }
    if (
      JSON.stringify(ownedSkins) !== row.owned_skins ||
      selectedSkin !== row.selected_skin
    ) {
      db.prepare(
        "UPDATE user_progress SET owned_skins = ?, selected_skin = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
      ).run(JSON.stringify(ownedSkins), selectedSkin, userId);
    }

    return {
      userId,
      points: row.points,
      ownedSkins,
      selectedSkin,
    };
  }

  db.prepare(
    "INSERT INTO user_progress (user_id, points, owned_skins, selected_skin) VALUES (?, 0, ?, ?)"
  ).run(userId, JSON.stringify(["classic"]), "classic");

  return {
    userId,
    points: 0,
    ownedSkins: ["classic"],
    selectedSkin: "classic",
  };
}

app.get("/", (req, res) => {
  if (isAuthed(req)) {
    return res.redirect("/dashboard");
  }
  return res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (isAuthed(req)) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  if (isAuthed(req)) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

app.get("/verify", (req, res) => {
  if (isAuthed(req)) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "verify.html"));
});

app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

app.get("/games", requireAuth, (req, res) => {
  return res.redirect("/dashboard");
});

app.get("/snake", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "snake.html"));
});

app.get("/shooter", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "shooter.html"));
});

app.get("/2042", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "game2042.html"));
});

app.get("/shop", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "shop.html"));
});

app.get("/inventory", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "inventory.html"));
});

app.get("/creator", requireAuth, (req, res) => {
  const progress = ensureProgress(req.session.userId);
  if (progress.points < CREATOR_UNLOCK_POINTS) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "creator.html"));
});

app.get("/challenge/:id", requireAuth, (req, res) => {
  return res.redirect(`/game/${String(req.params.id || "")}`);
});

app.get("/game/:id", requireAuth, (req, res) => {
  const id = String(req.params.id || "");
  const match = /^game-(\d{3,4})$/.exec(id);
  if (!match) {
    return res.redirect("/games");
  }

  const num = Number(match[1]);
  if (!Number.isInteger(num) || num < 1 || num > MAX_CHALLENGE_GAMES) {
    return res.redirect("/games");
  }

  return res.sendFile(path.join(__dirname, "public", "challenge.html"));
});

app.get("/leaderboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "leaderboard.html"));
});

app.get("/pong", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pong.html"));
});

app.get("/breakout", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "breakout.html"));
});

app.get("/dodger", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dodger.html"));
});

app.get("/api/me", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = db
    .prepare("SELECT id, username, email, email_verified, created_at FROM users WHERE id = ?")
    .get(req.session.userId);

  if (!user) {
    req.session.destroy(() => {});
    return res.status(401).json({ error: "Unauthorized" });
  }

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    emailVerified: Boolean(user.email_verified),
    createdAt: user.created_at,
  };

  return res.json({
    ...payload,
    user: payload,
  });
});

app.get("/api/leaderboard", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const me = db
    .prepare(
      `
      SELECT u.id, u.username, up.points
      FROM users u
      JOIN user_progress up ON up.user_id = u.id
      WHERE u.id = ? AND u.email_verified = 1
      `
    )
    .get(req.session.userId);

  if (!me) {
    return res.status(404).json({ error: "Current user not found in leaderboard." });
  }

  const rankRow = db
    .prepare(
      `
      SELECT COUNT(*) + 1 AS rank
      FROM users u
      JOIN user_progress up ON up.user_id = u.id
      WHERE
        u.email_verified = 1
        AND (up.points > ? OR (up.points = ? AND u.id < ?))
      `
    )
    .get(me.points, me.points, me.id);

  const rows = db
    .prepare(
      `
      SELECT
        u.id,
        u.username,
        up.points
      FROM users u
      JOIN user_progress up ON up.user_id = u.id
      WHERE u.email_verified = 1
      ORDER BY up.points DESC, u.id ASC
      LIMIT 20
      `
    )
    .all();

  const top = rows.map((row, idx) => {
    return {
      rank: idx + 1,
      username: row.username || `player-${row.id}`,
      points: row.points,
      isYou: row.id === me.id,
    };
  });

  return res.json({
    you: {
      username: me.username || `player-${me.id}`,
      points: me.points,
      rank: Number(rankRow.rank || 0),
    },
    top,
  });
});

app.get("/api/progress", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const progress = ensureProgress(req.session.userId);
  const baseCatalog = Object.entries(SKIN_CATALOG).map(([id, data]) => ({
    id,
    name: skinNameFromId(id),
    cost: data.cost,
    isCustom: false,
  }));
  const customCatalog = listVisibleCustomSkins(req.session.userId)
    .map((row) => {
      try {
        const palette = JSON.parse(row.palette_json);
        return {
          id: row.id,
          name: row.name,
          cost: Number(row.list_price || 0),
          isCustom: true,
          isListed: Boolean(row.is_listed),
          createdBy: row.creator_username || `player-${row.creator_user_id}`,
          userCreated: Number(row.creator_user_id) === Number(req.session.userId),
          palette,
        };
      } catch (_err) {
        return null;
      }
    })
    .filter(Boolean);
  return res.json({
    points: progress.points,
    ownedSkins: progress.ownedSkins,
    selectedSkin: progress.selectedSkin,
    skinCatalog: [...baseCatalog, ...customCatalog],
  });
});

app.post("/api/progress/add", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const points = Number(req.body.points);
  if (!Number.isInteger(points) || points <= 0 || points > 10000) {
    return res.status(400).json({ error: "Invalid points value." });
  }

  const progress = ensureProgress(req.session.userId);
  const nextPoints = progress.points + points;

  db.prepare(
    "UPDATE user_progress SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(nextPoints, req.session.userId);

  return res.json({ ok: true, points: nextPoints });
});

app.post("/api/progress/buy", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "");
  const baseSkin = SKIN_CATALOG[skinId];
  const customSkin = baseSkin ? null : getCustomSkinById(skinId);
  if (!baseSkin && !customSkin) {
    return res.status(400).json({ error: "Unknown skin." });
  }

  const progress = ensureProgress(req.session.userId);
  if (progress.ownedSkins.includes(skinId)) {
    return res.status(409).json({ error: "Skin already owned." });
  }

  let cost = 0;
  if (baseSkin) {
    cost = Number(baseSkin.cost || 0);
    if (cost === 0) {
      return res.status(400).json({ error: "This skin is already free." });
    }
  } else {
    if (!customSkin.is_listed || Number(customSkin.list_price || 0) <= 0) {
      return res.status(400).json({ error: "This custom skin is not for sale." });
    }
    if (Number(customSkin.creator_user_id) === Number(req.session.userId)) {
      return res.status(400).json({ error: "You already own your custom skin." });
    }
    cost = Number(customSkin.list_price || 0);
  }

  if (progress.points < cost) {
    return res.status(400).json({ error: "Not enough points." });
  }

  const nextPoints = progress.points - cost;
  const nextOwnedSkins = [...progress.ownedSkins, skinId];

  db.prepare(
    "UPDATE user_progress SET points = ?, owned_skins = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(nextPoints, JSON.stringify(nextOwnedSkins), req.session.userId);
  if (customSkin) {
    const sellerProgress = ensureProgress(customSkin.creator_user_id);
    db.prepare(
      "UPDATE user_progress SET points = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
    ).run(sellerProgress.points + cost, customSkin.creator_user_id);
  }

  return res.json({
    ok: true,
    points: nextPoints,
    ownedSkins: nextOwnedSkins,
    selectedSkin: progress.selectedSkin,
  });
});

app.post("/api/progress/select", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "");
  if (!skinExists(skinId)) {
    return res.status(400).json({ error: "Unknown skin." });
  }

  const progress = ensureProgress(req.session.userId);
  if (!progress.ownedSkins.includes(skinId)) {
    return res.status(400).json({ error: "Skin is not owned." });
  }

  db.prepare(
    "UPDATE user_progress SET selected_skin = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(skinId, req.session.userId);

  return res.json({
    ok: true,
    points: progress.points,
    ownedSkins: progress.ownedSkins,
    selectedSkin: skinId,
  });
});

app.post("/api/progress/sell", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "");
  if (!skinId || skinId === "classic") {
    return res.status(400).json({ error: "Classic skin cannot be removed." });
  }

  const progress = ensureProgress(req.session.userId);
  if (!progress.ownedSkins.includes(skinId)) {
    return res.status(400).json({ error: "Skin is not in your inventory." });
  }

  const baseSkin = SKIN_CATALOG[skinId];
  const customSkin = baseSkin ? null : getCustomSkinById(skinId);
  if (!baseSkin && !customSkin) {
    return res.status(400).json({ error: "Unknown skin." });
  }

  const refund = baseSkin
    ? Number(baseSkin.cost || 0)
    : Math.max(0, Number(customSkin.list_price || 0));
  const nextOwnedSkins = progress.ownedSkins.filter((id) => id !== skinId);
  const nextSelectedSkin = progress.selectedSkin === skinId ? "classic" : progress.selectedSkin;
  const nextPoints = progress.points + refund;

  db.prepare(
    `
    UPDATE user_progress
    SET points = ?, owned_skins = ?, selected_skin = ?, updated_at = CURRENT_TIMESTAMP
    WHERE user_id = ?
    `
  ).run(nextPoints, JSON.stringify(nextOwnedSkins), nextSelectedSkin, req.session.userId);

  return res.json({
    ok: true,
    points: nextPoints,
    ownedSkins: nextOwnedSkins,
    selectedSkin: nextSelectedSkin,
    refunded: refund,
  });
});

app.post("/api/skins/create", (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const name = String(req.body.name || "").trim().slice(0, 40);
  const listPrice = Number(req.body.listPrice || 0);
  const palette = parseCustomPalette(req.body.palette);

  if (name.length < 3) {
    return res.status(400).json({ error: "Skin name must be at least 3 characters." });
  }
  if (!Number.isInteger(listPrice) || listPrice < 0 || listPrice > 50000) {
    return res.status(400).json({ error: "Invalid sale price." });
  }
  if (!palette) {
    return res.status(400).json({ error: "Invalid palette colors." });
  }

  const progress = ensureProgress(req.session.userId);
  if (progress.points < CREATOR_UNLOCK_POINTS) {
    return res
      .status(400)
      .json({ error: `You need at least ${CREATOR_UNLOCK_POINTS} points to open creator.` });
  }

  const skinId = `${CUSTOM_SKIN_ID_PREFIX}${crypto.randomBytes(4).toString("hex")}`;
  db.prepare(
    `
    INSERT INTO custom_skins (id, creator_user_id, name, palette_json, list_price, is_listed)
    VALUES (?, ?, ?, ?, ?, ?)
    `
  ).run(
    skinId,
    req.session.userId,
    name,
    JSON.stringify(palette),
    listPrice,
    listPrice > 0 ? 1 : 0
  );

  const nextOwned = progress.ownedSkins.includes(skinId)
    ? progress.ownedSkins
    : [...progress.ownedSkins, skinId];
  db.prepare(
    "UPDATE user_progress SET owned_skins = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?"
  ).run(JSON.stringify(nextOwned), req.session.userId);

  return res.json({ ok: true, skinId, points: progress.points });
});

app.post("/api/register", async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const remember = Boolean(req.body.remember);

  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Username must be at least 3 characters." });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email." });
  }
  if (password.length < 8) {
    return res
      .status(400)
      .json({ error: "Password must be at least 8 characters long." });
  }
  const exists = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (exists) {
    return res.status(409).json({ error: "Account with this email already exists." });
  }
  const usernameExists = db
    .prepare("SELECT id FROM users WHERE lower(username) = lower(?)")
    .get(username);
  if (usernameExists) {
    return res.status(409).json({ error: "Username is already taken." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = db
    .prepare("INSERT INTO users (username, email, password_hash, email_verified) VALUES (?, ?, ?, 0)")
    .run(username, email, passwordHash);

  const userId = Number(result.lastInsertRowid);
  ensureProgress(userId);
  const mailConfig = getMailConfig();
  if (!mailConfig) {
    db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(userId);
    req.session.userId = userId;
    req.session.pendingEmail = null;
    req.session.cookie.maxAge = remember
      ? 1000 * 60 * 60 * 24 * 30
      : 1000 * 60 * 60 * 24;
    return res.json({ ok: true, redirect: "/dashboard" });
  }

  try {
    await issueVerificationCode(userId, email);
  } catch (error) {
    db.prepare("DELETE FROM user_progress WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    return res.status(500).json({ error: error.message || "Failed to send verification email." });
  }

  req.session.pendingEmail = email;
  req.session.cookie.maxAge = remember
    ? 1000 * 60 * 60 * 24 * 30
    : 1000 * 60 * 60 * 24;

  return res.json({ ok: true, redirect: `/verify?email=${encodeURIComponent(email)}` });
});

app.post("/api/login", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const remember = Boolean(req.body.remember);

  if (!isValidEmail(email) || !password) {
    return res.status(400).json({ error: "Invalid email or password." });
  }

  const user = db
    .prepare("SELECT id, password_hash, email_verified FROM users WHERE email = ?")
    .get(email);

  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  if (!user.email_verified) {
    return res.status(403).json({ error: "Email is not verified. Please verify your email first." });
  }

  req.session.userId = user.id;
  req.session.pendingEmail = null;
  ensureProgress(req.session.userId);
  req.session.cookie.maxAge = remember
    ? 1000 * 60 * 60 * 24 * 30
    : 1000 * 60 * 60 * 24;

  return res.json({ ok: true, redirect: "/dashboard" });
});

app.post("/api/verify/resend", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email." });
  }

  const user = db.prepare("SELECT id, email_verified FROM users WHERE email = ?").get(email);
  if (!user) {
    return res.status(404).json({ error: "Account not found." });
  }
  if (user.email_verified) {
    return res.status(400).json({ error: "Email already verified." });
  }

  const previous = db
    .prepare("SELECT last_sent_at FROM email_verifications WHERE email = ?")
    .get(email);
  if (previous && Date.now() - Number(previous.last_sent_at) < 45 * 1000) {
    return res.status(429).json({ error: "Please wait before requesting another code." });
  }

  try {
    await issueVerificationCode(user.id, email);
    return res.json({ ok: true });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to send verification email." });
  }
});

app.post("/api/verify/confirm", (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid email or code format." });
  }

  const verification = db
    .prepare("SELECT user_id, code_hash, expires_at FROM email_verifications WHERE email = ?")
    .get(email);
  if (!verification) {
    return res.status(400).json({ error: "Verification code not found. Request a new one." });
  }
  if (Date.now() > Number(verification.expires_at)) {
    return res.status(400).json({ error: "Verification code expired. Request a new one." });
  }
  if (hashCode(code) !== verification.code_hash) {
    return res.status(400).json({ error: "Incorrect verification code." });
  }

  db.prepare("UPDATE users SET email_verified = 1 WHERE id = ?").run(verification.user_id);
  db.prepare("DELETE FROM email_verifications WHERE email = ?").run(email);

  req.session.userId = verification.user_id;
  req.session.pendingEmail = null;
  return res.json({ ok: true, redirect: "/dashboard" });
});

app.post("/api/account/delete", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const password = String(req.body.password || "");
  if (!password) {
    return res.status(400).json({ error: "Password is required." });
  }

  const user = db
    .prepare("SELECT id, email, password_hash FROM users WHERE id = ?")
    .get(req.session.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  db.prepare("DELETE FROM email_verifications WHERE email = ?").run(user.email);
  db.prepare("DELETE FROM user_progress WHERE user_id = ?").run(user.id);
  db.prepare("DELETE FROM users WHERE id = ?").run(user.id);

  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true, redirect: "/login" });
  });
});

app.post("/api/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("connect.sid");
    res.json({ ok: true, redirect: "/login" });
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
