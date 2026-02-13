const path = require("path");
const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_GAMES = 10;
const MAX_SKINS = 50;
const CUSTOM_SKIN_ID_PREFIX = "custom-";
const CREATOR_UNLOCK_POINTS = 200;
const GAME_CREATOR_UNLOCK_POINTS = 350;
const DAILY_MISSIONS = [
  { id: "daily_points_120", label: "Earn 120 points today", type: "day_points", target: 120 },
  { id: "daily_points_260", label: "Earn 260 points today", type: "day_points", target: 260 },
  { id: "daily_buy_skin", label: "Buy 1 skin today", type: "day_buys", target: 1 },
  { id: "daily_streak_3", label: "Reach 3-day streak", type: "streak", target: 3 },
  { id: "daily_streak_7", label: "Reach 7-day streak", type: "streak", target: 7 },
];
const ACHIEVEMENTS = [
  { id: "ach_first_100", title: "First 100", type: "points", target: 100 },
  { id: "ach_grinder_1000", title: "Grinder", type: "points", target: 1000 },
  { id: "ach_skin_collector", title: "Skin Collector", type: "skins_bought", target: 5 },
  { id: "ach_streak_7", title: "7-day streak", type: "streak", target: 7 },
  { id: "ach_season_500", title: "Season 500", type: "season_points", target: 500 },
];
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false,
});

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

async function dbQuery(text, params = []) {
  return pool.query(text, params);
}

async function dbGet(text, params = []) {
  const result = await dbQuery(text, params);
  return result.rows[0] || null;
}

async function dbAll(text, params = []) {
  const result = await dbQuery(text, params);
  return result.rows;
}

async function ensureColumn(tableName, columnName, sqlTypeAndDefault) {
  const exists = await dbGet(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
    `,
    [tableName, columnName]
  );
  if (exists) return;
  await dbQuery(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${sqlTypeAndDefault}`);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey() {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function seasonKey() {
  return new Date().toISOString().slice(0, 7);
}

function missionSetForToday() {
  const key = Number(todayKey().replace(/-/g, ""));
  const list = [...DAILY_MISSIONS];
  const picked = [];
  let x = key || 1;
  while (picked.length < 3 && list.length) {
    x = (x * 1103515245 + 12345) >>> 0;
    picked.push(list.splice(x % list.length, 1)[0]);
  }
  return picked;
}

function currentEvent() {
  const now = new Date();
  const day = now.getUTCDay();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) {
    return {
      title: "Double Points Weekend",
      description: "All earned points count x2 on weekends.",
      multiplier: 2,
    };
  }
  return {
    title: "Midweek Rush",
    description: "Keep your streak active and unlock mission bonuses.",
    multiplier: 1,
  };
}

async function unlockAchievements(userId, progress) {
  const unlocked = [];
  for (const ach of ACHIEVEMENTS) {
    let value = 0;
    if (ach.type === "points") value = Number(progress.points || 0);
    if (ach.type === "season_points") value = Number(progress.seasonPoints || 0);
    if (ach.type === "streak") value = Number(progress.dailyStreak || 0);
    if (ach.type === "skins_bought") value = Number(progress.skinsBought || 0);
    if (value < ach.target) continue;
    const row = await dbGet(
      "SELECT 1 FROM user_achievements WHERE user_id = $1 AND badge_id = $2",
      [userId, ach.id]
    );
    if (row) continue;
    await dbQuery(
      "INSERT INTO user_achievements (user_id, badge_id, unlocked_at) VALUES ($1, $2, NOW())",
      [userId, ach.id]
    );
    unlocked.push(ach.id);
  }
  return unlocked;
}

async function initDatabase() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      username TEXT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS user_progress (
      user_id BIGINT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 0,
      owned_skins TEXT NOT NULL DEFAULT '["classic"]',
      selected_skin TEXT NOT NULL DEFAULT 'classic',
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await ensureColumn("user_progress", "season_key", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("user_progress", "season_points", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("user_progress", "last_seen_day", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("user_progress", "daily_streak", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("user_progress", "day_key", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("user_progress", "day_points", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("user_progress", "day_buys", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("user_progress", "skins_bought", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("user_progress", "last_game", "TEXT NOT NULL DEFAULT ''");

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      email TEXT PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code_hash TEXT NOT NULL,
      expires_at BIGINT NOT NULL,
      last_sent_at BIGINT NOT NULL
    )
  `);

  await dbQuery(`
    CREATE TABLE IF NOT EXISTS custom_skins (
      id TEXT PRIMARY KEY,
      creator_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      palette_json TEXT NOT NULL,
      list_price INTEGER NOT NULL DEFAULT 0,
      is_listed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS user_games (
      id BIGSERIAL PRIMARY KEY,
      creator_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      kind TEXT NOT NULL CHECK (kind IN ('code', 'scratch')),
      code_content TEXT NOT NULL DEFAULT '',
      scratch_json TEXT NOT NULL DEFAULT '{}',
      is_published BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL,
      unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, badge_id)
    )
  `);
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS friend_links (
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      friend_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (user_id, friend_user_id),
      CHECK (user_id <> friend_user_id)
    )
  `);

  const usersWithoutUsername = await dbAll(
    "SELECT id, email FROM users WHERE username IS NULL OR BTRIM(username) = ''"
  );
  for (const row of usersWithoutUsername) {
    const base = String(row.email || "")
      .split("@")[0]
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 20);
    const username = base ? `${base}-${row.id}` : `player-${row.id}`;
    await dbQuery("UPDATE users SET username = $1 WHERE id = $2", [username, row.id]);
  }
}

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

function normalizeSlug(input) {
  return String(input || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
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

  await dbQuery(
    `
    INSERT INTO email_verifications (email, user_id, code_hash, expires_at, last_sent_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      last_sent_at = EXCLUDED.last_sent_at
    `
    ,
    [email, userId, hashCode(code), expiresAt, now]
  );

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

async function normalizeSkins(rawOwnedSkins) {
  const customRows = await dbAll("SELECT id FROM custom_skins");
  const customIds = new Set(customRows.map((row) => String(row.id)));
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

async function getCustomSkinById(skinId) {
  return dbGet(
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
      WHERE cs.id = $1
      `
    ,
    [skinId]
  );
}

async function listVisibleCustomSkins(userId) {
  return dbAll(
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
      WHERE cs.is_listed = TRUE OR cs.creator_user_id = $1
      ORDER BY cs.created_at DESC
      `
    ,
    [userId]
  );
}

async function skinExists(skinId) {
  if (SKIN_CATALOG[skinId]) return true;
  const custom = await dbGet("SELECT id FROM custom_skins WHERE id = $1", [skinId]);
  return Boolean(custom);
}

async function ensureProgress(userId) {
  const row = await dbGet(
    `
    SELECT
      user_id, points, owned_skins, selected_skin,
      season_key, season_points, last_seen_day, daily_streak,
      day_key, day_points, day_buys, skins_bought, last_game
    FROM user_progress
    WHERE user_id = $1
    `,
    [userId]
  );

  if (row) {
    const ownedSkins = await normalizeSkins(row.owned_skins);
    let selectedSkin = row.selected_skin;
    let nextSeasonKey = row.season_key || seasonKey();
    let nextSeasonPoints = Number(row.season_points || 0);
    let nextSeenDay = row.last_seen_day || "";
    let nextStreak = Number(row.daily_streak || 0);
    let nextDayKey = row.day_key || todayKey();
    let nextDayPoints = Number(row.day_points || 0);
    let nextDayBuys = Number(row.day_buys || 0);

    const today = todayKey();
    const yesterday = yesterdayKey();
    const season = seasonKey();

    if (nextSeasonKey !== season) {
      nextSeasonKey = season;
      nextSeasonPoints = 0;
    }
    if (nextSeenDay !== today) {
      nextStreak = nextSeenDay === yesterday ? nextStreak + 1 : 1;
      nextSeenDay = today;
    }
    if (nextDayKey !== today) {
      nextDayKey = today;
      nextDayPoints = 0;
      nextDayBuys = 0;
    }

    if (!ownedSkins.includes(selectedSkin)) {
      selectedSkin = "classic";
    }
    const needWrite =
      JSON.stringify(ownedSkins) !== row.owned_skins ||
      selectedSkin !== row.selected_skin ||
      nextSeasonKey !== row.season_key ||
      nextSeasonPoints !== Number(row.season_points || 0) ||
      nextSeenDay !== (row.last_seen_day || "") ||
      nextStreak !== Number(row.daily_streak || 0) ||
      nextDayKey !== (row.day_key || "") ||
      nextDayPoints !== Number(row.day_points || 0) ||
      nextDayBuys !== Number(row.day_buys || 0);

    if (needWrite) {
      await dbQuery(
        `
        UPDATE user_progress
        SET
          owned_skins = $1,
          selected_skin = $2,
          season_key = $3,
          season_points = $4,
          last_seen_day = $5,
          daily_streak = $6,
          day_key = $7,
          day_points = $8,
          day_buys = $9,
          updated_at = NOW()
        WHERE user_id = $10
        `,
        [
          JSON.stringify(ownedSkins),
          selectedSkin,
          nextSeasonKey,
          nextSeasonPoints,
          nextSeenDay,
          nextStreak,
          nextDayKey,
          nextDayPoints,
          nextDayBuys,
          userId,
        ]
      );
    }

    return {
      userId,
      points: row.points,
      ownedSkins,
      selectedSkin,
      seasonKey: nextSeasonKey,
      seasonPoints: nextSeasonPoints,
      dailyStreak: nextStreak,
      dayKey: nextDayKey,
      dayPoints: nextDayPoints,
      dayBuys: nextDayBuys,
      skinsBought: Number(row.skins_bought || 0),
      lastGame: row.last_game || "",
    };
  }

  const today = todayKey();
  const season = seasonKey();
  await dbQuery(
    `
    INSERT INTO user_progress (
      user_id, points, owned_skins, selected_skin,
      season_key, season_points, last_seen_day, daily_streak,
      day_key, day_points, day_buys, skins_bought, last_game
    )
    VALUES ($1, 0, $2, $3, $4, 0, $5, 1, $5, 0, 0, 0, '')
    ON CONFLICT (user_id) DO NOTHING
    `,
    [userId, JSON.stringify(["classic"]), "classic", season, today]
  );

  return {
    userId,
    points: 0,
    ownedSkins: ["classic"],
    selectedSkin: "classic",
    seasonKey: season,
    seasonPoints: 0,
    dailyStreak: 1,
    dayKey: today,
    dayPoints: 0,
    dayBuys: 0,
    skinsBought: 0,
    lastGame: "",
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

app.get("/game-creator", requireAuth, async (req, res) => {
  const progress = await ensureProgress(req.session.userId);
  if (progress.points < GAME_CREATOR_UNLOCK_POINTS) {
    return res.redirect("/dashboard");
  }
  return res.sendFile(path.join(__dirname, "public", "game-creator.html"));
});

app.get("/creator", requireAuth, async (req, res) => {
  const progress = await ensureProgress(req.session.userId);
  if (progress.points < CREATOR_UNLOCK_POINTS) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "creator.html"));
});

app.get("/ugc/:slug", requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "ugc-game.html"));
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

app.get("/api/me", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const user = await dbGet(
    "SELECT id, username, email, email_verified, created_at FROM users WHERE id = $1",
    [req.session.userId]
  );

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

app.get("/api/leaderboard", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const me = await dbGet(
    `
      SELECT u.id, u.username, up.points
      FROM users u
      JOIN user_progress up ON up.user_id = u.id
      WHERE u.id = $1 AND u.email_verified = TRUE
      `
    ,
    [req.session.userId]
  );

  if (!me) {
    return res.status(404).json({ error: "Current user not found in leaderboard." });
  }

  const rankRow = await dbGet(
    `
      SELECT COUNT(*) + 1 AS rank
      FROM users u
      JOIN user_progress up ON up.user_id = u.id
      WHERE
        u.email_verified = TRUE
        AND (up.points > $1 OR (up.points = $2 AND u.id < $3))
      `
    ,
    [me.points, me.points, me.id]
  );

  const rows = await dbAll(
    `
      SELECT
        u.id,
        u.username,
        up.points
      FROM users u
      JOIN user_progress up ON up.user_id = u.id
      WHERE u.email_verified = TRUE
      ORDER BY up.points DESC, u.id ASC
      LIMIT 20
      `
  );

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

app.get("/api/player/home", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const meUser = await dbGet(
    "SELECT id, username, email_verified FROM users WHERE id = $1",
    [req.session.userId]
  );
  if (!meUser) return res.status(404).json({ error: "User not found." });

  const progress = await ensureProgress(req.session.userId);
  await unlockAchievements(req.session.userId, progress);
  const missions = missionSetForToday().map((mission) => {
    let progressValue = 0;
    if (mission.type === "day_points") progressValue = Number(progress.dayPoints || 0);
    if (mission.type === "day_buys") progressValue = Number(progress.dayBuys || 0);
    if (mission.type === "streak") progressValue = Number(progress.dailyStreak || 0);
    const done = progressValue >= mission.target;
    return {
      id: mission.id,
      label: mission.label,
      progress: Math.min(progressValue, mission.target),
      target: mission.target,
      done,
    };
  });

  const achievements = await dbAll(
    "SELECT badge_id, unlocked_at FROM user_achievements WHERE user_id = $1 ORDER BY unlocked_at DESC",
    [req.session.userId]
  );
  const unlockedSet = new Set(achievements.map((a) => String(a.badge_id)));
  const allAchievementCards = ACHIEVEMENTS.map((a) => ({
    id: a.id,
    title: a.title,
    unlocked: unlockedSet.has(a.id),
  }));

  const seasonRankRow = await dbGet(
    `
    SELECT COUNT(*) + 1 AS rank
    FROM user_progress up
    JOIN users u ON u.id = up.user_id
    WHERE u.email_verified = TRUE
      AND (up.season_points > $1 OR (up.season_points = $1 AND u.id < $2))
    `,
    [progress.seasonPoints, req.session.userId]
  );

  const friendsTop = await dbAll(
    `
    SELECT u.username, up.season_points, up.points
    FROM user_progress up
    JOIN users u ON u.id = up.user_id
    WHERE up.user_id IN (
      SELECT friend_user_id FROM friend_links WHERE user_id = $1
      UNION
      SELECT $1
    )
    ORDER BY up.season_points DESC, u.id ASC
    LIMIT 10
    `,
    [req.session.userId]
  );

  const event = currentEvent();
  return res.json({
    profile: {
      username: meUser.username || `player-${req.session.userId}`,
      points: Number(progress.points || 0),
      seasonPoints: Number(progress.seasonPoints || 0),
      dailyStreak: Number(progress.dailyStreak || 0),
      seasonRank: Number(seasonRankRow?.rank || 0),
      lastGame: progress.lastGame || "/snake",
    },
    missions,
    achievements: allAchievementCards,
    event,
    friendsTop,
    shareText: `Player ${meUser.username || `player-${req.session.userId}`} | Season points: ${Number(progress.seasonPoints || 0)} | Total points: ${Number(progress.points || 0)}`,
  });
});

app.post("/api/friends/add", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const username = normalizeUsername(req.body.username);
  if (!username || username.length < 3) {
    return res.status(400).json({ error: "Enter a valid username." });
  }

  const target = await dbGet(
    "SELECT id, username FROM users WHERE lower(username) = lower($1)",
    [username]
  );
  if (!target) {
    return res.status(404).json({ error: "Player not found." });
  }
  if (Number(target.id) === Number(req.session.userId)) {
    return res.status(400).json({ error: "You cannot add yourself." });
  }

  await dbQuery(
    "INSERT INTO friend_links (user_id, friend_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [req.session.userId, target.id]
  );

  return res.json({ ok: true });
});

app.get("/api/user-games", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rows = await dbAll(
    `
    SELECT
      g.id, g.slug, g.title, g.description, g.kind, g.created_at, g.creator_user_id, g.is_published,
      u.username AS creator_username
    FROM user_games g
    JOIN users u ON u.id = g.creator_user_id
    WHERE g.is_published = TRUE OR g.creator_user_id = $1
    ORDER BY g.created_at DESC
    LIMIT 100
    `,
    [req.session.userId]
  );

  return res.json({
    games: rows.map((row) => ({
      id: Number(row.id),
      slug: row.slug,
      title: row.title,
      description: row.description,
      kind: row.kind,
      createdAt: row.created_at,
      creator: row.creator_username || `player-${row.creator_user_id}`,
      mine: Number(row.creator_user_id) === Number(req.session.userId),
    })),
  });
});

app.get("/api/user-games/:slug", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const slug = normalizeSlug(req.params.slug);
  if (!slug) return res.status(400).json({ error: "Invalid game id." });

  const game = await dbGet(
    `
    SELECT
      g.id, g.slug, g.title, g.description, g.kind, g.code_content, g.scratch_json, g.creator_user_id, g.is_published,
      u.username AS creator_username
    FROM user_games g
    JOIN users u ON u.id = g.creator_user_id
    WHERE g.slug = $1
    `,
    [slug]
  );
  if (!game) return res.status(404).json({ error: "Game not found." });
  if (!game.is_published && Number(game.creator_user_id) !== Number(req.session.userId)) {
    return res.status(403).json({ error: "Access denied." });
  }

  let scratch = {};
  try {
    scratch = JSON.parse(game.scratch_json || "{}");
  } catch (_err) {
    scratch = {};
  }

  return res.json({
    id: Number(game.id),
    slug: game.slug,
    title: game.title,
    description: game.description,
    kind: game.kind,
    codeContent: game.code_content || "",
    scratch,
    creator: game.creator_username || `player-${game.creator_user_id}`,
    mine: Number(game.creator_user_id) === Number(req.session.userId),
  });
});

app.post("/api/user-games/create", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const progress = await ensureProgress(req.session.userId);
  if (progress.points < GAME_CREATOR_UNLOCK_POINTS) {
    return res.status(400).json({ error: `Need ${GAME_CREATOR_UNLOCK_POINTS} points to use game creator.` });
  }

  const title = String(req.body.title || "").trim().slice(0, 48);
  const description = String(req.body.description || "").trim().slice(0, 220);
  const kind = String(req.body.kind || "").trim();
  if (title.length < 3) return res.status(400).json({ error: "Title must be at least 3 chars." });
  if (kind !== "code" && kind !== "scratch") {
    return res.status(400).json({ error: "Invalid game type." });
  }

  const baseSlug = normalizeSlug(title) || `user-game-${Date.now()}`;
  let slug = baseSlug;
  let n = 1;
  while (await dbGet("SELECT id FROM user_games WHERE slug = $1", [slug])) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  let codeContent = "";
  let scratchJson = "{}";
  if (kind === "code") {
    codeContent = String(req.body.codeContent || "").trim();
    if (codeContent.length < 30) {
      return res.status(400).json({ error: "Code content is too short." });
    }
    if (codeContent.length > 40000) {
      return res.status(400).json({ error: "Code content is too large." });
    }
  } else {
    const raw = req.body.scratch || {};
    const allowedBlocks = new Set([
      "mode_dodger",
      "mode_collector",
      "mode_survivor",
      "speed_up",
      "speed_down",
      "spawn_more",
      "spawn_less",
      "points_up",
    ]);
    const blocks = Array.isArray(raw.blocks)
      ? raw.blocks
          .map((x) => String(x))
          .filter((x) => allowedBlocks.has(x))
          .slice(0, 120)
      : [];
    const scratch = {
      mode: String(raw.mode || "dodger").slice(0, 20),
      speed: Math.max(1, Math.min(6, Number(raw.speed || 3))),
      playerColor: /^#[0-9a-fA-F]{6}$/.test(String(raw.playerColor || "")) ? String(raw.playerColor) : "#7be0a4",
      enemyColor: /^#[0-9a-fA-F]{6}$/.test(String(raw.enemyColor || "")) ? String(raw.enemyColor) : "#4f8f68",
      bgColor: /^#[0-9a-fA-F]{6}$/.test(String(raw.bgColor || "")) ? String(raw.bgColor) : "#08110d",
      spawnScale: Math.max(0.45, Math.min(2.4, Number(raw.spawnScale || 1))),
      pointBonus: Math.max(0, Math.min(40, Number(raw.pointBonus || 0))),
      blocks,
    };
    scratchJson = JSON.stringify(scratch);
  }

  await dbQuery(
    `
    INSERT INTO user_games (creator_user_id, slug, title, description, kind, code_content, scratch_json, is_published)
    VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)
    `,
    [req.session.userId, slug, title, description, kind, codeContent, scratchJson]
  );

  return res.json({ ok: true, slug });
});

app.get("/api/progress", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const progress = await ensureProgress(req.session.userId);
  const baseCatalog = Object.entries(SKIN_CATALOG).map(([id, data]) => ({
    id,
    name: skinNameFromId(id),
    cost: data.cost,
    isCustom: false,
  }));
  const customCatalog = (await listVisibleCustomSkins(req.session.userId))
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
    seasonPoints: progress.seasonPoints,
    dailyStreak: progress.dailyStreak,
    ownedSkins: progress.ownedSkins,
    selectedSkin: progress.selectedSkin,
    skinCatalog: [...baseCatalog, ...customCatalog],
  });
});

app.post("/api/progress/add", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const points = Number(req.body.points);
  const gamePath = String(req.body.game || "").slice(0, 64);
  if (!Number.isInteger(points) || points <= 0 || points > 10000) {
    return res.status(400).json({ error: "Invalid points value." });
  }

  const progress = await ensureProgress(req.session.userId);
  const event = currentEvent();
  const awarded = points * Number(event.multiplier || 1);
  const nextPoints = progress.points + awarded;
  const nextSeasonPoints = progress.seasonPoints + awarded;
  const nextDayPoints = progress.dayPoints + awarded;

  await dbQuery(
    `
    UPDATE user_progress
    SET points = $1, season_points = $2, day_points = $3, last_game = $4, updated_at = NOW()
    WHERE user_id = $5
    `,
    [nextPoints, nextSeasonPoints, nextDayPoints, gamePath || progress.lastGame || "", req.session.userId]
  );
  await unlockAchievements(req.session.userId, {
    ...progress,
    points: nextPoints,
    seasonPoints: nextSeasonPoints,
    dayPoints: nextDayPoints,
  });

  return res.json({
    ok: true,
    points: nextPoints,
    seasonPoints: nextSeasonPoints,
    multiplier: Number(event.multiplier || 1),
  });
});

app.post("/api/progress/buy", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "");
  const baseSkin = SKIN_CATALOG[skinId];
  const customSkin = baseSkin ? null : await getCustomSkinById(skinId);
  if (!baseSkin && !customSkin) {
    return res.status(400).json({ error: "Unknown skin." });
  }

  const progress = await ensureProgress(req.session.userId);
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

  await dbQuery(
    "UPDATE user_progress SET points = $1, owned_skins = $2, day_buys = day_buys + 1, skins_bought = skins_bought + 1, updated_at = NOW() WHERE user_id = $3",
    [nextPoints, JSON.stringify(nextOwnedSkins), req.session.userId]
  );
  await unlockAchievements(req.session.userId, {
    ...progress,
    points: nextPoints,
    skinsBought: Number(progress.skinsBought || 0) + 1,
  });
  if (customSkin) {
    const sellerProgress = await ensureProgress(customSkin.creator_user_id);
    await dbQuery("UPDATE user_progress SET points = $1, updated_at = NOW() WHERE user_id = $2", [
      sellerProgress.points + cost,
      customSkin.creator_user_id,
    ]);
  }

  return res.json({
    ok: true,
    points: nextPoints,
    seasonPoints: progress.seasonPoints,
    ownedSkins: nextOwnedSkins,
    selectedSkin: progress.selectedSkin,
  });
});

app.post("/api/progress/select", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "");
  if (!(await skinExists(skinId))) {
    return res.status(400).json({ error: "Unknown skin." });
  }

  const progress = await ensureProgress(req.session.userId);
  if (!progress.ownedSkins.includes(skinId)) {
    return res.status(400).json({ error: "Skin is not owned." });
  }

  await dbQuery(
    "UPDATE user_progress SET selected_skin = $1, updated_at = NOW() WHERE user_id = $2",
    [skinId, req.session.userId]
  );

  return res.json({
    ok: true,
    points: progress.points,
    ownedSkins: progress.ownedSkins,
    selectedSkin: skinId,
  });
});

app.post("/api/progress/sell", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "");
  if (!skinId || skinId === "classic") {
    return res.status(400).json({ error: "Classic skin cannot be removed." });
  }

  const progress = await ensureProgress(req.session.userId);
  if (!progress.ownedSkins.includes(skinId)) {
    return res.status(400).json({ error: "Skin is not in your inventory." });
  }

  const baseSkin = SKIN_CATALOG[skinId];
  const customSkin = baseSkin ? null : await getCustomSkinById(skinId);
  if (!baseSkin && !customSkin) {
    return res.status(400).json({ error: "Unknown skin." });
  }

  const refund = baseSkin
    ? Number(baseSkin.cost || 0)
    : Math.max(0, Number(customSkin.list_price || 0));
  const nextOwnedSkins = progress.ownedSkins.filter((id) => id !== skinId);
  const nextSelectedSkin = progress.selectedSkin === skinId ? "classic" : progress.selectedSkin;
  const nextPoints = progress.points + refund;

  await dbQuery(
    `
    UPDATE user_progress
    SET points = $1, owned_skins = $2, selected_skin = $3, updated_at = NOW()
    WHERE user_id = $4
    `
    ,
    [nextPoints, JSON.stringify(nextOwnedSkins), nextSelectedSkin, req.session.userId]
  );

  return res.json({
    ok: true,
    points: nextPoints,
    ownedSkins: nextOwnedSkins,
    selectedSkin: nextSelectedSkin,
    refunded: refund,
  });
});

app.post("/api/skins/create", async (req, res) => {
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

  const progress = await ensureProgress(req.session.userId);
  if (progress.points < CREATOR_UNLOCK_POINTS) {
    return res
      .status(400)
      .json({ error: `You need at least ${CREATOR_UNLOCK_POINTS} points to open creator.` });
  }

  const skinId = `${CUSTOM_SKIN_ID_PREFIX}${crypto.randomBytes(4).toString("hex")}`;
  await dbQuery(
    `
    INSERT INTO custom_skins (id, creator_user_id, name, palette_json, list_price, is_listed)
    VALUES ($1, $2, $3, $4, $5, $6)
    `
    ,
    [skinId, req.session.userId, name, JSON.stringify(palette), listPrice, listPrice > 0]
  );

  const nextOwned = progress.ownedSkins.includes(skinId)
    ? progress.ownedSkins
    : [...progress.ownedSkins, skinId];
  await dbQuery("UPDATE user_progress SET owned_skins = $1, updated_at = NOW() WHERE user_id = $2", [
    JSON.stringify(nextOwned),
    req.session.userId,
  ]);

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
  const exists = await dbGet("SELECT id FROM users WHERE email = $1", [email]);
  if (exists) {
    return res.status(409).json({ error: "Account with this email already exists." });
  }
  const usernameExists = await dbGet("SELECT id FROM users WHERE lower(username) = lower($1)", [
    username,
  ]);
  if (usernameExists) {
    return res.status(409).json({ error: "Username is already taken." });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const created = await dbGet(
    "INSERT INTO users (username, email, password_hash, email_verified) VALUES ($1, $2, $3, FALSE) RETURNING id",
    [username, email, passwordHash]
  );
  const userId = Number(created.id);
  await ensureProgress(userId);
  const mailConfig = getMailConfig();
  if (!mailConfig) {
    await dbQuery("UPDATE users SET email_verified = TRUE WHERE id = $1", [userId]);
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
    // Fallback: do not drop account if SMTP is temporarily broken.
    await dbQuery("UPDATE users SET email_verified = TRUE WHERE id = $1", [userId]);
    req.session.userId = userId;
    req.session.pendingEmail = null;
    req.session.cookie.maxAge = remember
      ? 1000 * 60 * 60 * 24 * 30
      : 1000 * 60 * 60 * 24;
    return res.json({ ok: true, redirect: "/dashboard" });
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

  const user = await dbGet("SELECT id, password_hash, email_verified FROM users WHERE email = $1", [
    email,
  ]);

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
  await ensureProgress(req.session.userId);
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

  const user = await dbGet("SELECT id, email_verified FROM users WHERE email = $1", [email]);
  if (!user) {
    return res.status(404).json({ error: "Account not found." });
  }
  if (user.email_verified) {
    return res.status(400).json({ error: "Email already verified." });
  }

  const previous = await dbGet(
    "SELECT last_sent_at FROM email_verifications WHERE email = $1",
    [email]
  );
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

app.post("/api/verify/confirm", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid email or code format." });
  }

  const verification = await dbGet(
    "SELECT user_id, code_hash, expires_at FROM email_verifications WHERE email = $1",
    [email]
  );
  if (!verification) {
    return res.status(400).json({ error: "Verification code not found. Request a new one." });
  }
  if (Date.now() > Number(verification.expires_at)) {
    return res.status(400).json({ error: "Verification code expired. Request a new one." });
  }
  if (hashCode(code) !== verification.code_hash) {
    return res.status(400).json({ error: "Incorrect verification code." });
  }

  await dbQuery("UPDATE users SET email_verified = TRUE WHERE id = $1", [verification.user_id]);
  await dbQuery("DELETE FROM email_verifications WHERE email = $1", [email]);

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

  const user = await dbGet("SELECT id, email, password_hash FROM users WHERE id = $1", [
    req.session.userId,
  ]);
  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Incorrect password." });
  }

  await dbQuery("DELETE FROM email_verifications WHERE email = $1", [user.email]);
  await dbQuery("DELETE FROM user_progress WHERE user_id = $1", [user.id]);
  await dbQuery("DELETE FROM users WHERE id = $1", [user.id]);

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

async function startServer() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Configure Supabase Postgres connection string.");
  }
  await initDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error.message);
  process.exit(1);
});
