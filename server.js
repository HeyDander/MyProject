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
    "SELECT user_id, points, owned_skins, selected_skin FROM user_progress WHERE user_id = $1",
    [userId]
  );

  if (row) {
    const ownedSkins = await normalizeSkins(row.owned_skins);
    let selectedSkin = row.selected_skin;
    if (!ownedSkins.includes(selectedSkin)) {
      selectedSkin = "classic";
    }
    if (
      JSON.stringify(ownedSkins) !== row.owned_skins ||
      selectedSkin !== row.selected_skin
    ) {
      await dbQuery(
        "UPDATE user_progress SET owned_skins = $1, selected_skin = $2, updated_at = NOW() WHERE user_id = $3",
        [JSON.stringify(ownedSkins), selectedSkin, userId]
      );
    }

    return {
      userId,
      points: row.points,
      ownedSkins,
      selectedSkin,
    };
  }

  await dbQuery(
    "INSERT INTO user_progress (user_id, points, owned_skins, selected_skin) VALUES ($1, 0, $2, $3) ON CONFLICT (user_id) DO NOTHING",
    [userId, JSON.stringify(["classic"]), "classic"]
  );

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

app.get("/creator", requireAuth, async (req, res) => {
  const progress = await ensureProgress(req.session.userId);
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
  if (!Number.isInteger(points) || points <= 0 || points > 10000) {
    return res.status(400).json({ error: "Invalid points value." });
  }

  const progress = await ensureProgress(req.session.userId);
  const nextPoints = progress.points + points;

  await dbQuery("UPDATE user_progress SET points = $1, updated_at = NOW() WHERE user_id = $2", [
    nextPoints,
    req.session.userId,
  ]);

  return res.json({ ok: true, points: nextPoints });
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
    "UPDATE user_progress SET points = $1, owned_skins = $2, updated_at = NOW() WHERE user_id = $3",
    [nextPoints, JSON.stringify(nextOwnedSkins), req.session.userId]
  );
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
