const path = require("path");
require("dotenv").config();
const express = require("express");
const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const crypto = require("crypto");
const { createClerkClient, verifyToken } = require("@clerk/backend");

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFICATION_TTL_MS = 10 * 60 * 1000;
const PASSWORD_RESET_TTL_MS = 10 * 60 * 1000;
const MAX_CHALLENGE_GAMES = 10;
const MAX_SKINS = 50;
const EXCLUSIVE_SKIN_COUNT = 49;
const CUSTOM_SKIN_ID_PREFIX = "custom-";
const CREATOR_UNLOCK_POINTS = 200;
const PONG_TARGET_SCORE = 7;
const PONG_ROOM_TTL_MS = 1000 * 60 * 30;
const PONG_ROOM_IDLE_DROP_MS = 1000 * 60 * 10;
const COOP_ROOM_TTL_MS = 1000 * 60 * 60 * 6;
const COOP_ROOM_IDLE_DROP_MS = 1000 * 60 * 30;
const ALLOWED_CHALLENGE_IDS = new Set(["game-001", "game-010"]);
const CLERK_SECRET_KEY = String(process.env.CLERK_SECRET_KEY || "").trim();
const CLERK_PUBLISHABLE_KEY = String(
  process.env.CLERK_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || ""
).trim();
const hasClerkConfig = Boolean(CLERK_SECRET_KEY && CLERK_PUBLISHABLE_KEY);
const clerkClient = hasClerkConfig ? createClerkClient({ secretKey: CLERK_SECRET_KEY }) : null;
const DAILY_MISSION_POOL = [
  { id: "daily_points_120", label: "Earn 120 points today", type: "day_points", target: 120, rewardCrystals: 6 },
  { id: "daily_points_260", label: "Earn 260 points today", type: "day_points", target: 260, rewardCrystals: 12 },
  { id: "daily_points_420", label: "Earn 420 points today", type: "day_points", target: 420, rewardCrystals: 18 },
  { id: "daily_buy_skin", label: "Buy 1 skin today", type: "day_buys", target: 1, rewardCrystals: 8 },
  { id: "daily_buy_two", label: "Buy 2 skins today", type: "day_buys", target: 2, rewardCrystals: 14 },
  { id: "daily_streak_3", label: "Reach 3-day streak", type: "streak", target: 3, rewardCrystals: 10 },
  { id: "daily_streak_7", label: "Reach 7-day streak", type: "streak", target: 7, rewardCrystals: 20 },
];
const ACHIEVEMENTS = [
  { id: "ach_first_100", title: "Первые 100", type: "points", target: 100 },
  { id: "ach_grinder_1000", title: "Гриндер", type: "points", target: 1000 },
  { id: "ach_skin_collector", title: "Коллекционер скинов", type: "skins_bought", target: 5 },
  { id: "ach_streak_7", title: "Серия 7 дней", type: "streak", target: 7 },
  { id: "ach_season_500", title: "500 в сезоне", type: "season_points", target: 500 },
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
for (let i = 1; i <= EXCLUSIVE_SKIN_COUNT; i += 1) {
  const id = `artist-${String(i).padStart(2, "0")}`;
  rebuiltSkinCatalog[id] = {
    cost: 0,
    crystalCost: 30 + i * 7,
    exclusive: true,
  };
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
app.set("trust proxy", 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || "dev-secret-change-me",
    store: new PgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use("/vendor/clerk", express.static(path.join(__dirname, "node_modules", "@clerk", "clerk-js", "dist")));
app.use(express.static(path.join(__dirname, "public")));

const pongRooms = new Map();
const coopRooms = new Map();

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
  const list = [...DAILY_MISSION_POOL];
  const picked = [];
  let x = key || 1;
  while (picked.length < 3 && list.length) {
    x = (x * 1103515245 + 12345) >>> 0;
    picked.push(list.splice(x % list.length, 1)[0]);
  }
  return picked;
}

function missionProgressValue(progress, mission) {
  if (mission.type === "day_points") return Number(progress.dayPoints || 0);
  if (mission.type === "day_buys") return Number(progress.dayBuys || 0);
  if (mission.type === "streak") return Number(progress.dailyStreak || 0);
  return 0;
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(String(value || "[]"));
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
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

function cleanupPongRooms() {
  const now = Date.now();
  for (const [code, room] of pongRooms.entries()) {
    if (now - room.createdAt > PONG_ROOM_TTL_MS || now - room.updatedAt > PONG_ROOM_IDLE_DROP_MS) {
      pongRooms.delete(code);
    }
  }
}

function makePongCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function makeRoomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cleanupCoopRooms() {
  const now = Date.now();
  for (const [code, room] of coopRooms.entries()) {
    if (now - room.createdAt > COOP_ROOM_TTL_MS || now - room.updatedAt > COOP_ROOM_IDLE_DROP_MS) {
      coopRooms.delete(code);
    }
  }
}

function coopRole(room, userId) {
  if (Number(room.hostUserId) === Number(userId)) return "host";
  if (Number(room.friendUserId) === Number(userId)) return "friend";
  return "";
}

function newPongBall(direction = 1) {
  return {
    x: 360,
    y: 210,
    vx: direction * (3.8 + Math.random() * 0.9),
    vy: (Math.random() * 2.8 - 1.4) || 1.1,
    r: 8,
  };
}

function makePongRoom(hostUserId, hostUsername) {
  return {
    code: "",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastTickAt: Date.now(),
    status: "waiting",
    winner: null,
    hostUserId,
    guestUserId: null,
    hostName: hostUsername,
    guestName: "",
    hostY: 168,
    guestY: 168,
    hostScore: 0,
    guestScore: 0,
    ball: newPongBall(Math.random() > 0.5 ? 1 : -1),
  };
}

function getPongRole(room, userId) {
  if (Number(room.hostUserId) === Number(userId)) return "host";
  if (Number(room.guestUserId) === Number(userId)) return "guest";
  return "";
}

function resetPongRoom(room) {
  room.status = room.guestUserId ? "playing" : "waiting";
  room.winner = null;
  room.hostY = 168;
  room.guestY = 168;
  room.hostScore = 0;
  room.guestScore = 0;
  room.ball = newPongBall(Math.random() > 0.5 ? 1 : -1);
  room.updatedAt = Date.now();
  room.lastTickAt = Date.now();
}

function tickPongRoom(room) {
  if (room.status !== "playing") return;
  const now = Date.now();
  const dtMs = clamp(now - room.lastTickAt, 8, 40);
  room.lastTickAt = now;
  const step = dtMs / 16.6667;
  const ball = room.ball;

  ball.x += ball.vx * step;
  ball.y += ball.vy * step;
  const boardH = 420;
  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.vy = Math.abs(ball.vy);
  }
  if (ball.y + ball.r > boardH) {
    ball.y = boardH - ball.r;
    ball.vy = -Math.abs(ball.vy);
  }

  const paddleH = 84;
  const hostPaddle = { x: 24, y: room.hostY, w: 12, h: paddleH };
  const guestPaddle = { x: 684, y: room.guestY, w: 12, h: paddleH };

  const intersects = (p) =>
    ball.x - ball.r < p.x + p.w &&
    ball.x + ball.r > p.x &&
    ball.y + ball.r > p.y &&
    ball.y - ball.r < p.y + p.h;

  if (ball.vx < 0 && intersects(hostPaddle)) {
    const t = (ball.y - (hostPaddle.y + hostPaddle.h / 2)) / (hostPaddle.h / 2);
    ball.vx = Math.abs(ball.vx) + 0.08;
    ball.vy += t * 0.8;
    ball.x = hostPaddle.x + hostPaddle.w + ball.r + 1;
  }
  if (ball.vx > 0 && intersects(guestPaddle)) {
    const t = (ball.y - (guestPaddle.y + guestPaddle.h / 2)) / (guestPaddle.h / 2);
    ball.vx = -(Math.abs(ball.vx) + 0.08);
    ball.vy += t * 0.8;
    ball.x = guestPaddle.x - ball.r - 1;
  }

  if (ball.x < -20) {
    room.guestScore += 1;
    if (room.guestScore >= PONG_TARGET_SCORE) {
      room.status = "finished";
      room.winner = "guest";
      return;
    }
    room.ball = newPongBall(-1);
  }

  if (ball.x > 740) {
    room.hostScore += 1;
    if (room.hostScore >= PONG_TARGET_SCORE) {
      room.status = "finished";
      room.winner = "host";
      return;
    }
    room.ball = newPongBall(1);
  }
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
      email TEXT NOT NULL,
      clerk_user_id TEXT,
      password_hash TEXT NOT NULL,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await dbQuery("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key");
  await ensureColumn("users", "clerk_user_id", "TEXT");
  await dbQuery("CREATE UNIQUE INDEX IF NOT EXISTS users_clerk_user_id_idx ON users (clerk_user_id) WHERE clerk_user_id IS NOT NULL");

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
  await ensureColumn("user_progress", "crystals", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn("user_progress", "missions_key", "TEXT NOT NULL DEFAULT ''");
  await ensureColumn("user_progress", "missions_claimed", "TEXT NOT NULL DEFAULT '[]'");

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
    CREATE TABLE IF NOT EXISTS password_resets (
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
    CREATE TABLE IF NOT EXISTS uploaded_games (
      id BIGSERIAL PRIMARY KEY,
      creator_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      html_content TEXT NOT NULL DEFAULT '',
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
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id BIGSERIAL PRIMARY KEY,
      requester_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      target_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CHECK (requester_user_id <> target_user_id)
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
    .replace(/[^\p{L}\p{N}_-]/gu, "")
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
  const apiKey = String(process.env.RESEND_API_KEY || "").trim();
  const from = String(process.env.FROM_EMAIL || "").trim();
  if (!apiKey || !from) return null;
  return { apiKey, from };
}

async function sendEmailViaResend({ to, subject, text }) {
  const cfg = getMailConfig();
  if (!cfg) {
    throw new Error("Email service is unavailable. Configure RESEND_API_KEY and FROM_EMAIL.");
  }
  if (typeof fetch !== "function") {
    throw new Error("Email service is unavailable. Server runtime has no fetch support.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: cfg.from,
      to: [to],
      subject,
      text,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(payload || "Failed to send email.");
  }
}

async function sendVerificationEmail(email, code) {
  await sendEmailViaResend({
    to: email,
    subject: "Your verification code",
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
  });
}

async function sendPasswordResetEmail(email, code) {
  await sendEmailViaResend({
    to: email,
    subject: "Your password reset code",
    text: `Your password reset code is: ${code}. It expires in 10 minutes.`,
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

async function issuePasswordResetCode(userId, email) {
  const code = generateVerificationCode();
  const now = Date.now();
  const expiresAt = now + PASSWORD_RESET_TTL_MS;

  await dbQuery(
    `
    INSERT INTO password_resets (email, user_id, code_hash, expires_at, last_sent_at)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT(email) DO UPDATE SET
      user_id = EXCLUDED.user_id,
      code_hash = EXCLUDED.code_hash,
      expires_at = EXCLUDED.expires_at,
      last_sent_at = EXCLUDED.last_sent_at
    `,
    [email, userId, hashCode(code), expiresAt, now]
  );

  await sendPasswordResetEmail(email, code);
  return code;
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

function getBearerToken(req) {
  const header = String(req.headers.authorization || "");
  if (!header.startsWith("Bearer ")) return "";
  return header.slice("Bearer ".length).trim();
}

function baseUsernameFromEmail(email) {
  return normalizeUsername(String(email || "").split("@")[0]) || "player";
}

async function findUniqueUsername(base) {
  const root = normalizeUsername(base) || "player";
  let candidate = root;
  let suffix = 1;
  while (true) {
    const exists = await dbGet("SELECT id FROM users WHERE lower(username) = lower($1) LIMIT 1", [candidate]);
    if (!exists) return candidate;
    suffix += 1;
    candidate = normalizeUsername(`${root}_${suffix}`) || `player_${suffix}`;
  }
}

async function upsertLocalUserFromClerk(clerkUserId) {
  if (!clerkClient) {
    throw new Error("Clerk is not configured on server.");
  }

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const primaryEmailId = String(clerkUser.primaryEmailAddressId || "");
  const primaryEmail = (clerkUser.emailAddresses || []).find((entry) => String(entry.id) === primaryEmailId);
  const email = normalizeEmail(primaryEmail?.emailAddress || clerkUser.primaryEmailAddress?.emailAddress || "");
  if (!isValidEmail(email)) {
    throw new Error("Clerk user has no valid email.");
  }

  let local = await dbGet("SELECT id, username, email, clerk_user_id FROM users WHERE clerk_user_id = $1 LIMIT 1", [
    clerkUserId,
  ]);

  if (!local) {
    local = await dbGet(
      "SELECT id, username, email, clerk_user_id FROM users WHERE email = $1 ORDER BY id DESC LIMIT 1",
      [email]
    );
  }

  if (local) {
    const username = local.username || (await findUniqueUsername(clerkUser.username || baseUsernameFromEmail(email)));
    await dbQuery(
      `
      UPDATE users
      SET username = $1, email = $2, clerk_user_id = $3, email_verified = TRUE
      WHERE id = $4
      `,
      [username, email, clerkUserId, local.id]
    );
    return Number(local.id);
  }

  const requestedUsername = normalizeUsername(clerkUser.username || "");
  const username = await findUniqueUsername(requestedUsername || baseUsernameFromEmail(email));
  const randomPassword = crypto.randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(randomPassword, 12);
  const inserted = await dbGet(
    `
    INSERT INTO users (username, email, clerk_user_id, password_hash, email_verified)
    VALUES ($1, $2, $3, $4, TRUE)
    RETURNING id
    `,
    [username, email, clerkUserId, passwordHash]
  );
  return Number(inserted.id);
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

async function areFriends(userA, userB) {
  const row = await dbGet(
    `
    SELECT 1 FROM friend_links
    WHERE (user_id = $1 AND friend_user_id = $2)
       OR (user_id = $2 AND friend_user_id = $1)
    LIMIT 1
    `,
    [userA, userB]
  );
  return Boolean(row);
}

async function ensureProgress(userId) {
  const row = await dbGet(
    `
    SELECT
      user_id, points, owned_skins, selected_skin,
      season_key, season_points, last_seen_day, daily_streak,
      day_key, day_points, day_buys, skins_bought, last_game,
      crystals, missions_key, missions_claimed
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
    let nextCrystals = Number(row.crystals || 0);
    let nextMissionsKey = row.missions_key || nextDayKey;
    let nextMissionsClaimed = parseJsonArray(row.missions_claimed);

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
    if (nextMissionsKey !== nextDayKey) {
      nextMissionsKey = nextDayKey;
      nextMissionsClaimed = [];
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
      nextDayBuys !== Number(row.day_buys || 0) ||
      nextCrystals !== Number(row.crystals || 0) ||
      nextMissionsKey !== (row.missions_key || "") ||
      JSON.stringify(nextMissionsClaimed) !== String(row.missions_claimed || "[]");

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
          crystals = $10,
          missions_key = $11,
          missions_claimed = $12,
          updated_at = NOW()
        WHERE user_id = $13
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
          nextCrystals,
          nextMissionsKey,
          JSON.stringify(nextMissionsClaimed),
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
      crystals: nextCrystals,
      missionsKey: nextMissionsKey,
      missionsClaimed: nextMissionsClaimed,
    };
  }

  const today = todayKey();
  const season = seasonKey();
  await dbQuery(
    `
    INSERT INTO user_progress (
      user_id, points, owned_skins, selected_skin,
      season_key, season_points, last_seen_day, daily_streak,
      day_key, day_points, day_buys, skins_bought, last_game,
      crystals, missions_key, missions_claimed
    )
    VALUES ($1, 0, $2, $3, $4, 0, $5, 1, $5, 0, 0, 0, '', 0, $5, '[]')
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
    crystals: 0,
    missionsKey: today,
    missionsClaimed: [],
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

app.get("/forgot-password", (req, res) => {
  if (isAuthed(req)) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "forgot-password.html"));
});

app.get("/reset-password", (req, res) => {
  if (isAuthed(req)) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "reset-password.html"));
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

app.get("/creator", requireAuth, async (req, res) => {
  const progress = await ensureProgress(req.session.userId);
  if (progress.points < CREATOR_UNLOCK_POINTS) {
    return res.redirect("/dashboard");
  }
  res.sendFile(path.join(__dirname, "public", "creator.html"));
});

app.get("/upload-game", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload-game.html"));
});

app.get("/upload-guide", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "upload-guide.html"));
});

app.get("/uploaded/:slug", requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "uploaded-game.html"));
});

app.get("/community-games", requireAuth, (req, res) => {
  return res.sendFile(path.join(__dirname, "public", "community-games.html"));
});

app.get("/challenge/:id", requireAuth, (req, res) => {
  return res.redirect(`/game/${String(req.params.id || "")}`);
});

app.get("/game/:id", requireAuth, (req, res) => {
  const id = String(req.params.id || "");
  if (!ALLOWED_CHALLENGE_IDS.has(id)) {
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

app.get("/pong-online", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "pong-online.html"));
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
  const claimedSet = new Set(progress.missionsClaimed || []);
  const missions = missionSetForToday().map((mission) => {
    const progressValue = missionProgressValue(progress, mission);
    const done = progressValue >= mission.target;
    const claimed = claimedSet.has(mission.id);
    return {
      id: mission.id,
      label: mission.label,
      progress: Math.min(progressValue, mission.target),
      target: mission.target,
      done,
      claimed,
      canClaim: done && !claimed,
      rewardCrystals: Number(mission.rewardCrystals || 0),
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
      crystals: Number(progress.crystals || 0),
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

app.post("/api/missions/claim", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const missionId = String(req.body.missionId || "").trim();
  if (!missionId) {
    return res.status(400).json({ error: "Mission id is required." });
  }

  const progress = await ensureProgress(req.session.userId);
  const mission = missionSetForToday().find((m) => m.id === missionId);
  if (!mission) {
    return res.status(400).json({ error: "Mission is not active today." });
  }

  const claimed = new Set(progress.missionsClaimed || []);
  if (claimed.has(missionId)) {
    return res.status(409).json({ error: "Mission reward already claimed." });
  }

  const progressValue = missionProgressValue(progress, mission);
  if (progressValue < mission.target) {
    return res.status(400).json({ error: "Mission is not completed yet." });
  }

  claimed.add(missionId);
  const reward = Number(mission.rewardCrystals || 0);
  const nextCrystals = Number(progress.crystals || 0) + reward;
  await dbQuery(
    `
    UPDATE user_progress
    SET crystals = $1, missions_key = $2, missions_claimed = $3, updated_at = NOW()
    WHERE user_id = $4
    `,
    [nextCrystals, progress.missionsKey || todayKey(), JSON.stringify(Array.from(claimed)), req.session.userId]
  );

  return res.json({
    ok: true,
    crystals: nextCrystals,
    rewardCrystals: reward,
    missionId,
  });
});

app.post("/api/friends/request", async (req, res) => {
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

  const alreadyFriends = await areFriends(req.session.userId, target.id);
  if (alreadyFriends) {
    return res.status(409).json({ error: "Already in friends." });
  }

  const pending = await dbGet(
    `
    SELECT id, requester_user_id, target_user_id
    FROM friend_requests
    WHERE status = 'pending'
      AND (
        (requester_user_id = $1 AND target_user_id = $2)
        OR
        (requester_user_id = $2 AND target_user_id = $1)
      )
    LIMIT 1
    `,
    [req.session.userId, target.id]
  );
  if (pending) {
    if (Number(pending.requester_user_id) === Number(target.id)) {
      return res.status(409).json({ error: "This player already sent you a request." });
    }
    return res.status(409).json({ error: "Friend request already sent." });
  }

  await dbQuery(
    `
    INSERT INTO friend_requests (requester_user_id, target_user_id, status, created_at, updated_at)
    VALUES ($1, $2, 'pending', NOW(), NOW())
    `,
    [req.session.userId, target.id]
  );

  return res.json({ ok: true });
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

  const alreadyFriends = await areFriends(req.session.userId, target.id);
  if (alreadyFriends) {
    return res.status(409).json({ error: "Already in friends." });
  }

  const pending = await dbGet(
    `
    SELECT id, requester_user_id, target_user_id
    FROM friend_requests
    WHERE status = 'pending'
      AND (
        (requester_user_id = $1 AND target_user_id = $2)
        OR
        (requester_user_id = $2 AND target_user_id = $1)
      )
    LIMIT 1
    `,
    [req.session.userId, target.id]
  );
  if (pending) {
    if (Number(pending.requester_user_id) === Number(target.id)) {
      return res.status(409).json({ error: "This player already sent you a request." });
    }
    return res.status(409).json({ error: "Friend request already sent." });
  }

  await dbQuery(
    `
    INSERT INTO friend_requests (requester_user_id, target_user_id, status, created_at, updated_at)
    VALUES ($1, $2, 'pending', NOW(), NOW())
    `,
    [req.session.userId, target.id]
  );

  return res.json({ ok: true });
});

app.get("/api/friends/requests", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const incoming = await dbAll(
    `
    SELECT fr.id, fr.created_at, u.username
    FROM friend_requests fr
    JOIN users u ON u.id = fr.requester_user_id
    WHERE fr.target_user_id = $1 AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
    `,
    [req.session.userId]
  );
  const outgoing = await dbAll(
    `
    SELECT fr.id, fr.created_at, u.username
    FROM friend_requests fr
    JOIN users u ON u.id = fr.target_user_id
    WHERE fr.requester_user_id = $1 AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
    `,
    [req.session.userId]
  );

  return res.json({
    incoming: incoming.map((r) => ({
      id: Number(r.id),
      username: r.username || "player",
      createdAt: r.created_at,
    })),
    outgoing: outgoing.map((r) => ({
      id: Number(r.id),
      username: r.username || "player",
      createdAt: r.created_at,
    })),
  });
});

app.post("/api/friends/requests/:id/accept", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: "Invalid request id." });
  }

  const requestRow = await dbGet(
    `
    SELECT id, requester_user_id, target_user_id, status
    FROM friend_requests
    WHERE id = $1
    `,
    [requestId]
  );
  if (!requestRow || requestRow.status !== "pending") {
    return res.status(404).json({ error: "Request not found." });
  }
  if (Number(requestRow.target_user_id) !== Number(req.session.userId)) {
    return res.status(403).json({ error: "You cannot accept this request." });
  }

  await dbQuery("UPDATE friend_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1", [
    requestId,
  ]);
  await dbQuery(
    "INSERT INTO friend_links (user_id, friend_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [requestRow.requester_user_id, requestRow.target_user_id]
  );
  await dbQuery(
    "INSERT INTO friend_links (user_id, friend_user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [requestRow.target_user_id, requestRow.requester_user_id]
  );

  return res.json({ ok: true });
});

app.post("/api/friends/requests/:id/reject", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const requestId = Number(req.params.id);
  if (!Number.isInteger(requestId) || requestId <= 0) {
    return res.status(400).json({ error: "Invalid request id." });
  }

  const requestRow = await dbGet(
    `
    SELECT id, requester_user_id, target_user_id, status
    FROM friend_requests
    WHERE id = $1
    `,
    [requestId]
  );
  if (!requestRow || requestRow.status !== "pending") {
    return res.status(404).json({ error: "Request not found." });
  }
  const me = Number(req.session.userId);
  const canReject = me === Number(requestRow.target_user_id) || me === Number(requestRow.requester_user_id);
  if (!canReject) {
    return res.status(403).json({ error: "You cannot reject this request." });
  }

  await dbQuery("UPDATE friend_requests SET status = 'rejected', updated_at = NOW() WHERE id = $1", [
    requestId,
  ]);
  return res.json({ ok: true });
});

app.post("/api/coop/create", async (req, res) => {
  return res.status(410).json({ error: "Co-op mode is disabled." });
});

app.post("/api/coop/join", async (req, res) => {
  return res.status(410).json({ error: "Co-op mode is disabled." });
});

app.get("/api/coop/state/:code", async (req, res) => {
  return res.status(410).json({ error: "Co-op mode is disabled." });
});

app.post("/api/coop/add-points", async (req, res) => {
  return res.status(410).json({ error: "Co-op mode is disabled." });
});

app.post("/api/coop/leave", async (req, res) => {
  return res.status(410).json({ error: "Co-op mode is disabled." });
});

app.post("/api/multiplayer/pong/create", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  cleanupPongRooms();
  const me = await dbGet("SELECT username FROM users WHERE id = $1", [req.session.userId]);
  let code = makePongCode();
  while (pongRooms.has(code)) {
    code = makePongCode();
  }
  const room = makePongRoom(req.session.userId, me?.username || `player-${req.session.userId}`);
  room.code = code;
  pongRooms.set(code, room);

  return res.json({ ok: true, code, role: "host" });
});

app.post("/api/multiplayer/pong/join", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  cleanupPongRooms();
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid room code." });
  }

  const room = pongRooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found or expired." });

  const role = getPongRole(room, req.session.userId);
  if (role) {
    room.updatedAt = Date.now();
    return res.json({ ok: true, code, role });
  }
  if (room.guestUserId) {
    return res.status(409).json({ error: "Room already has 2 players." });
  }

  const me = await dbGet("SELECT username FROM users WHERE id = $1", [req.session.userId]);
  room.guestUserId = req.session.userId;
  room.guestName = me?.username || `player-${req.session.userId}`;
  resetPongRoom(room);
  room.updatedAt = Date.now();
  return res.json({ ok: true, code, role: "guest" });
});

app.post("/api/multiplayer/pong/input", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const code = String(req.body.code || "").trim().toUpperCase();
  const y = Number(req.body.y);
  if (!/^[A-Z0-9]{6}$/.test(code) || !Number.isFinite(y)) {
    return res.status(400).json({ error: "Invalid input." });
  }

  const room = pongRooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found." });
  const role = getPongRole(room, req.session.userId);
  if (!role) return res.status(403).json({ error: "Not in this room." });

  if (role === "host") room.hostY = clamp(y, 0, 420 - 84);
  if (role === "guest") room.guestY = clamp(y, 0, 420 - 84);
  room.updatedAt = Date.now();
  return res.json({ ok: true });
});

app.post("/api/multiplayer/pong/restart", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const code = String(req.body.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid room code." });
  }
  const room = pongRooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found." });
  const role = getPongRole(room, req.session.userId);
  if (!role) return res.status(403).json({ error: "Not in this room." });
  if (!room.guestUserId) {
    return res.status(400).json({ error: "Need second player first." });
  }
  resetPongRoom(room);
  return res.json({ ok: true });
});

app.get("/api/multiplayer/pong/state/:code", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  cleanupPongRooms();
  const code = String(req.params.code || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid room code." });
  }
  const room = pongRooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found or expired." });

  const role = getPongRole(room, req.session.userId);
  if (!role) return res.status(403).json({ error: "Not in this room." });
  tickPongRoom(room);
  room.updatedAt = Date.now();

  return res.json({
    ok: true,
    code,
    role,
    status: room.status,
    winner: room.winner,
    players: {
      host: room.hostName || "Host",
      guest: room.guestName || "Guest",
    },
    paddles: {
      hostY: room.hostY,
      guestY: room.guestY,
      h: 84,
    },
    ball: room.ball,
    scores: {
      host: room.hostScore,
      guest: room.guestScore,
    },
  });
});

app.get("/api/progress", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const progress = await ensureProgress(req.session.userId);
  const baseCatalog = Object.entries(SKIN_CATALOG).map(([id, data]) => ({
    id,
    name: skinNameFromId(id),
    cost: Number(data.cost || 0),
    crystalCost: Number(data.crystalCost || 0),
    exclusive: Boolean(data.exclusive),
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
          crystalCost: 0,
          exclusive: false,
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
    crystals: progress.crystals,
    seasonPoints: progress.seasonPoints,
    dailyStreak: progress.dailyStreak,
    ownedSkins: progress.ownedSkins,
    selectedSkin: progress.selectedSkin,
    skinCatalog: [...baseCatalog, ...customCatalog],
  });
});

app.get("/api/uploaded-games", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const rows = await dbAll(
    `
    SELECT
      g.id, g.slug, g.title, g.description, g.creator_user_id, g.created_at,
      u.username AS creator_username
    FROM uploaded_games g
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
      createdAt: row.created_at,
      creator: row.creator_username || `player-${row.creator_user_id}`,
      mine: Number(row.creator_user_id) === Number(req.session.userId),
    })),
  });
});

app.get("/api/uploaded-games/:slug", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const slug = normalizeSlug(req.params.slug);
  if (!slug) return res.status(400).json({ error: "Invalid game id." });

  const game = await dbGet(
    `
    SELECT
      g.id, g.slug, g.title, g.description, g.html_content, g.creator_user_id, g.is_published,
      u.username AS creator_username
    FROM uploaded_games g
    JOIN users u ON u.id = g.creator_user_id
    WHERE g.slug = $1
    `,
    [slug]
  );
  if (!game) return res.status(404).json({ error: "Game not found." });
  if (!game.is_published && Number(game.creator_user_id) !== Number(req.session.userId)) {
    return res.status(403).json({ error: "Access denied." });
  }

  return res.json({
    id: Number(game.id),
    slug: game.slug,
    title: game.title,
    description: game.description,
    htmlContent: String(game.html_content || ""),
    creator: game.creator_username || `player-${game.creator_user_id}`,
    mine: Number(game.creator_user_id) === Number(req.session.userId),
  });
});

app.post("/api/uploaded-games/create", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const title = String(req.body.title || "").trim().slice(0, 64);
  const description = String(req.body.description || "").trim().slice(0, 220);
  const htmlContent = String(req.body.htmlContent || "");
  const isPublished = req.body.isPublished !== false;

  if (title.length < 3) {
    return res.status(400).json({ error: "Title must be at least 3 chars." });
  }
  if (htmlContent.trim().length < 60) {
    return res.status(400).json({ error: "Game content is too short." });
  }
  if (htmlContent.length > 180000) {
    return res.status(400).json({ error: "Game content is too large." });
  }

  const baseSlug = normalizeSlug(title) || `uploaded-game-${Date.now()}`;
  let slug = baseSlug;
  let n = 1;
  while (await dbGet("SELECT id FROM uploaded_games WHERE slug = $1", [slug])) {
    n += 1;
    slug = `${baseSlug}-${n}`;
  }

  await dbQuery(
    `
    INSERT INTO uploaded_games (creator_user_id, slug, title, description, html_content, is_published)
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [req.session.userId, slug, title, description, htmlContent, Boolean(isPublished)]
  );

  return res.json({ ok: true, slug });
});

app.post("/api/uploaded-games/delete", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const slug = normalizeSlug(req.body.slug);
  if (!slug) {
    return res.status(400).json({ error: "Invalid game id." });
  }

  const game = await dbGet(
    "SELECT id, creator_user_id FROM uploaded_games WHERE slug = $1",
    [slug]
  );
  if (!game) {
    return res.status(404).json({ error: "Game not found." });
  }
  if (Number(game.creator_user_id) !== Number(req.session.userId)) {
    return res.status(403).json({ error: "You can delete only your games." });
  }

  await dbQuery("DELETE FROM uploaded_games WHERE id = $1", [game.id]);
  return res.json({ ok: true, slug });
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

app.post("/api/progress/last-game", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const gamePath = String(req.body.game || "").slice(0, 96);
  const isAllowed =
    gamePath === "/snake" ||
    gamePath === "/shooter" ||
    gamePath === "/2042" ||
    gamePath === "/pong" ||
    gamePath === "/pong-online" ||
    gamePath === "/breakout" ||
    gamePath === "/dodger" ||
    gamePath.startsWith("/game/") ||
    gamePath.startsWith("/uploaded/");

  if (!isAllowed) {
    return res.status(400).json({ error: "Invalid game path." });
  }

  await dbQuery(
    "UPDATE user_progress SET last_game = $1, updated_at = NOW() WHERE user_id = $2",
    [gamePath, req.session.userId]
  );
  return res.json({ ok: true, lastGame: gamePath });
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

  let costPoints = 0;
  let costCrystals = 0;
  if (baseSkin) {
    costPoints = Number(baseSkin.cost || 0);
    costCrystals = Number(baseSkin.crystalCost || 0);
    if (costPoints <= 0 && costCrystals <= 0) {
      return res.status(400).json({ error: "This skin is already free." });
    }
  } else {
    if (!customSkin.is_listed || Number(customSkin.list_price || 0) <= 0) {
      return res.status(400).json({ error: "This custom skin is not for sale." });
    }
    if (Number(customSkin.creator_user_id) === Number(req.session.userId)) {
      return res.status(400).json({ error: "You already own your custom skin." });
    }
    costPoints = Number(customSkin.list_price || 0);
  }

  if (costCrystals > 0 && progress.crystals < costCrystals) {
    return res.status(400).json({ error: "Not enough crystals." });
  }
  if (costPoints > 0 && progress.points < costPoints) {
    return res.status(400).json({ error: "Not enough points." });
  }

  const nextPoints = progress.points - costPoints;
  const nextCrystals = Number(progress.crystals || 0) - costCrystals;
  const nextOwnedSkins = [...progress.ownedSkins, skinId];

  await dbQuery(
    "UPDATE user_progress SET points = $1, crystals = $2, owned_skins = $3, day_buys = day_buys + 1, skins_bought = skins_bought + 1, updated_at = NOW() WHERE user_id = $4",
    [nextPoints, nextCrystals, JSON.stringify(nextOwnedSkins), req.session.userId]
  );
  await unlockAchievements(req.session.userId, {
    ...progress,
    points: nextPoints,
    skinsBought: Number(progress.skinsBought || 0) + 1,
  });
  if (customSkin) {
    const sellerProgress = await ensureProgress(customSkin.creator_user_id);
    await dbQuery("UPDATE user_progress SET points = $1, updated_at = NOW() WHERE user_id = $2", [
      sellerProgress.points + costPoints,
      customSkin.creator_user_id,
    ]);
  }

  return res.json({
    ok: true,
    points: nextPoints,
    crystals: nextCrystals,
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
    crystals: progress.crystals,
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

  const refundPoints = baseSkin
    ? Number(baseSkin.cost || 0)
    : Math.max(0, Number(customSkin.list_price || 0));
  const refundCrystals = baseSkin ? Number(baseSkin.crystalCost || 0) : 0;
  const nextOwnedSkins = progress.ownedSkins.filter((id) => id !== skinId);
  const nextSelectedSkin = progress.selectedSkin === skinId ? "classic" : progress.selectedSkin;
  const nextPoints = progress.points + refundPoints;
  const nextCrystals = Number(progress.crystals || 0) + refundCrystals;

  await dbQuery(
    `
    UPDATE user_progress
    SET points = $1, crystals = $2, owned_skins = $3, selected_skin = $4, updated_at = NOW()
    WHERE user_id = $5
    `
    ,
    [nextPoints, nextCrystals, JSON.stringify(nextOwnedSkins), nextSelectedSkin, req.session.userId]
  );

  return res.json({
    ok: true,
    points: nextPoints,
    crystals: nextCrystals,
    ownedSkins: nextOwnedSkins,
    selectedSkin: nextSelectedSkin,
    refunded: refundPoints + refundCrystals,
    refundedPoints: refundPoints,
    refundedCrystals: refundCrystals,
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

app.post("/api/skins/unlist", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "").trim();
  if (!skinId || !skinId.startsWith(CUSTOM_SKIN_ID_PREFIX)) {
    return res.status(400).json({ error: "Invalid custom skin id." });
  }

  const customSkin = await getCustomSkinById(skinId);
  if (!customSkin) {
    return res.status(404).json({ error: "Custom skin not found." });
  }
  if (Number(customSkin.creator_user_id) !== Number(req.session.userId)) {
    return res.status(403).json({ error: "You can only manage your own skins." });
  }

  await dbQuery(
    "UPDATE custom_skins SET is_listed = FALSE, updated_at = NOW() WHERE id = $1",
    [skinId]
  ).catch(async () => {
    // Backward compatibility for old schema without updated_at.
    await dbQuery("UPDATE custom_skins SET is_listed = FALSE WHERE id = $1", [skinId]);
  });

  return res.json({ ok: true, skinId, isListed: false });
});

app.post("/api/skins/delete", async (req, res) => {
  if (!isAuthed(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const skinId = String(req.body.skinId || "").trim();
  if (!skinId) {
    return res.status(400).json({ error: "Invalid custom skin id." });
  }

  const customSkin = await dbGet(
    `
    SELECT id, creator_user_id
    FROM custom_skins
    WHERE id = $1
    `,
    [skinId]
  );
  if (!customSkin) {
    return res.status(404).json({ error: "Custom skin not found." });
  }
  if (Number(customSkin.creator_user_id) !== Number(req.session.userId)) {
    return res.status(403).json({ error: "You can only delete your own custom skins." });
  }

  await dbQuery("DELETE FROM custom_skins WHERE id = $1", [skinId]);

  const candidates = await dbAll(
    "SELECT user_id, owned_skins, selected_skin FROM user_progress WHERE owned_skins LIKE $1 OR selected_skin = $2",
    [`%${skinId}%`, skinId]
  );

  for (const row of candidates) {
    let owned = ["classic"];
    try {
      const parsed = JSON.parse(row.owned_skins || "[]");
      owned = Array.isArray(parsed) ? parsed : ["classic"];
    } catch (_error) {
      owned = ["classic"];
    }
    const filtered = owned.filter((id) => id !== skinId);
    const nextOwned = filtered.includes("classic") ? filtered : ["classic", ...filtered];
    const nextSelected = row.selected_skin === skinId ? "classic" : row.selected_skin;
    await dbQuery(
      "UPDATE user_progress SET owned_skins = $1, selected_skin = $2, updated_at = NOW() WHERE user_id = $3",
      [JSON.stringify(nextOwned), nextSelected, row.user_id]
    );
  }

  const meProgress = await ensureProgress(req.session.userId);

  return res.json({
    ok: true,
    skinId,
    affectedPlayers: candidates.length,
    points: meProgress.points,
    ownedSkins: meProgress.ownedSkins,
    selectedSkin: meProgress.selectedSkin,
  });
});

app.get("/api/auth/clerk/config", (_req, res) => {
  if (!hasClerkConfig) {
    return res.status(503).json({ error: "Clerk is not configured." });
  }
  return res.json({ publishableKey: CLERK_PUBLISHABLE_KEY });
});

app.post("/api/auth/clerk/exchange", async (req, res) => {
  if (!hasClerkConfig) {
    return res.status(503).json({ error: "Clerk is not configured." });
  }

  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Missing Clerk token." });
  }

  try {
    const payload = await verifyToken(token, { secretKey: CLERK_SECRET_KEY });
    const clerkUserId = String(payload?.sub || "").trim();
    if (!clerkUserId) {
      return res.status(401).json({ error: "Invalid Clerk token." });
    }

    const userId = await upsertLocalUserFromClerk(clerkUserId);
    await ensureProgress(userId);
    const user = await dbGet("SELECT id, email FROM users WHERE id = $1", [userId]);
    if (!user || !isValidEmail(user.email)) {
      return res.status(400).json({ error: "User email is not available for verification." });
    }

    // Clerk already verifies identity; create local session immediately.
    req.session.userId = userId;
    req.session.pendingEmail = null;
    req.session.cookie.maxAge = 1000 * 60 * 60 * 24 * 7;

    return res.json({
      ok: true,
      requiresVerification: false,
      redirect: "/dashboard",
    });
  } catch (error) {
    return res.status(401).json({ error: error.message || "Clerk authentication failed." });
  }
});

app.post("/api/register", async (req, res) => {
  const username = normalizeUsername(req.body.username);
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");

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
  req.session.userId = null;
  req.session.pendingEmail = email;
  req.session.cookie.maxAge = 1000 * 60 * 15;

  try {
    await issueVerificationCode(userId, email);
    return res.json({ ok: true, redirect: `/verify?email=${encodeURIComponent(email)}` });
  } catch (error) {
    return res.status(500).json({
      error:
        error.message ||
        "Failed to send verification code. Please try again later.",
    });
  }
});

app.post("/api/login", async (req, res) => {
  const identifierRaw = String(req.body.email || "").trim();
  const email = normalizeEmail(identifierRaw);
  const username = normalizeUsername(identifierRaw);
  const password = String(req.body.password || "");
  const remember = Boolean(req.body.remember);

  if (!identifierRaw || !password) {
    return res.status(400).json({ error: "Invalid login or password." });
  }

  let user = null;
  if (username && username.length >= 3) {
    user = await dbGet(
      "SELECT id, email, password_hash, email_verified FROM users WHERE lower(username) = lower($1) ORDER BY id DESC LIMIT 1",
      [username]
    );
  }
  if (!user && isValidEmail(email)) {
    user = await dbGet(
      "SELECT id, email, password_hash, email_verified FROM users WHERE email = $1 ORDER BY id DESC LIMIT 1",
      [email]
    );
  }

  if (!user) {
    return res.status(401).json({ error: "Invalid login or password." });
  }

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: "Invalid login or password." });
  }

  if (user.email_verified) {
    req.session.userId = user.id;
    req.session.pendingEmail = null;
    req.session.cookie.maxAge = remember
      ? 1000 * 60 * 60 * 24 * 30
      : 1000 * 60 * 60 * 24;
    return res.json({
      ok: true,
      requiresVerification: false,
      redirect: "/dashboard",
    });
  }

  req.session.userId = null;
  req.session.pendingEmail = user.email;
  req.session.cookie.maxAge = remember
    ? 1000 * 60 * 60 * 24 * 30
    : 1000 * 60 * 15;

  const previous = await dbGet("SELECT last_sent_at FROM email_verifications WHERE email = $1", [user.email]);
  if (!previous || Date.now() - Number(previous.last_sent_at) >= 45 * 1000) {
    try {
      await issueVerificationCode(user.id, user.email);
    } catch (error) {
      return res.status(500).json({
        error: error.message || "Failed to send verification code.",
      });
    }
  }

  return res.json({
    ok: true,
    requiresVerification: true,
    redirect: `/verify?email=${encodeURIComponent(user.email)}`,
  });
});

app.post("/api/password/forgot", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Please enter a valid email." });
  }

  const user = await dbGet(
    "SELECT id, email_verified FROM users WHERE email = $1 ORDER BY id DESC LIMIT 1",
    [email]
  );
  if (!user) {
    return res.json({
      ok: true,
      message: "If this email exists, a reset code was sent.",
      redirect: `/reset-password?email=${encodeURIComponent(email)}`,
    });
  }

  const previous = await dbGet(
    "SELECT last_sent_at FROM password_resets WHERE email = $1",
    [email]
  );
  if (previous && Date.now() - Number(previous.last_sent_at) < 45 * 1000) {
    return res.status(429).json({ error: "Please wait before requesting another code." });
  }

  try {
    await issuePasswordResetCode(user.id, email);
    return res.json({
      ok: true,
      message: "Reset code sent.",
      redirect: `/reset-password?email=${encodeURIComponent(email)}`,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to send reset code." });
  }
});

app.post("/api/password/reset", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const code = String(req.body.code || "").trim();
  const newPassword = String(req.body.password || "");

  if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ error: "Invalid email or code format." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters long." });
  }

  const reset = await dbGet(
    "SELECT user_id, code_hash, expires_at FROM password_resets WHERE email = $1",
    [email]
  );
  if (!reset) {
    return res.status(400).json({ error: "Reset code not found. Request a new one." });
  }
  if (Date.now() > Number(reset.expires_at)) {
    return res.status(400).json({ error: "Reset code expired. Request a new one." });
  }
  if (hashCode(code) !== reset.code_hash) {
    return res.status(400).json({ error: "Incorrect reset code." });
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await dbQuery("UPDATE users SET password_hash = $1 WHERE id = $2", [passwordHash, reset.user_id]);
  await dbQuery("DELETE FROM password_resets WHERE email = $1", [email]);

  req.session.userId = Number(reset.user_id);
  req.session.pendingEmail = null;
  req.session.cookie.maxAge = 1000 * 60 * 60 * 24;

  return res.json({ ok: true, redirect: "/dashboard" });
});

app.post("/api/verify/resend", async (req, res) => {
  const email = normalizeEmail(req.body.email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: "Invalid email." });
  }

  const user = await dbGet(
    "SELECT id, email_verified FROM users WHERE email = $1 ORDER BY id DESC LIMIT 1",
    [email]
  );
  if (!user) {
    return res.status(404).json({ error: "Account not found." });
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
    res.json({ ok: true, redirect: "/login?logout=1" });
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
