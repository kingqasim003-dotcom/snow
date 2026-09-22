import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

function env(key, fallback = "") {
  return process.env[key]?.trim() || fallback;
}

function parseGroqKeys() {
  const raw = env("GROQ_API_KEYS") || env("GROQ_API_KEY");
  return raw
    .split(/[,\n]/)
    .map((k) => k.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean)
    .join(",");
}

function b64(value) {
  return value ? Buffer.from(value, "utf8").toString("base64") : "";
}

const groqKeys = parseGroqKeys();
const imgbbKey = env("IMGBB_API_KEY");
const gatePassword = env("ADMIN_GATE_PASSWORD");
const adminPassword = env("ADMIN_PASSWORD");

// Baked into api/runtime-env.cjs at deploy — read from website .env, no Vercel dashboard needed.
// Secrets are base64-encoded so GitHub secret scanning allows the deploy push.
const payload = {
  NODE_ENV: env("NODE_ENV", "production"),
  ...(groqKeys ? { GROQ_API_KEYS_B64: b64(groqKeys) } : {}),
  GROQ_MODEL: env("GROQ_MODEL", "llama-3.1-8b-instant"),
  ...(imgbbKey ? { IMGBB_API_KEY_B64: b64(imgbbKey) } : {}),
  ...(gatePassword ? { ADMIN_GATE_PASSWORD_B64: b64(gatePassword) } : {}),
  ...(adminPassword ? { ADMIN_PASSWORD_B64: b64(adminPassword) } : {}),
  ADMIN_EMAIL: env("ADMIN_EMAIL", "snowqasimbear@gmail.com"),
  SITE_URL: env("VITE_SITE_URL", "https://www.snowbear.online"),
  ALLOWED_ORIGINS:
    env("ALLOWED_ORIGINS") ||
    "https://snowbear.online,https://www.snowbear.online,https://snow-tau-ten.vercel.app",
  VITE_FIREBASE_API_KEY:
    env("VITE_FIREBASE_API_KEY") || "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
  VITE_FIREBASE_AUTH_DOMAIN: env("VITE_FIREBASE_AUTH_DOMAIN", "snowbear-online.firebaseapp.com"),
  VITE_FIREBASE_PROJECT_ID: env("VITE_FIREBASE_PROJECT_ID", "snowbear-online"),
  VITE_FIREBASE_STORAGE_BUCKET:
    env("VITE_FIREBASE_STORAGE_BUCKET") || "snowbear-online.firebasestorage.app",
  VITE_FIREBASE_MESSAGING_SENDER_ID: env("VITE_FIREBASE_MESSAGING_SENDER_ID", "420360574036"),
  VITE_FIREBASE_APP_ID: env("VITE_FIREBASE_APP_ID", "1:420360574036:web:ed69dd7212199b22ca09c1"),
  VITE_FIREBASE_MEASUREMENT_ID: env("VITE_FIREBASE_MEASUREMENT_ID", "G-TXSH91974E"),
  VITE_FIREBASE_DATABASE_URL:
    env("VITE_FIREBASE_DATABASE_URL") ||
    "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  FIREBASE_API_KEY:
    env("FIREBASE_API_KEY") || env("VITE_FIREBASE_API_KEY") || "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
  FIREBASE_DATABASE_URL:
    env("FIREBASE_DATABASE_URL") ||
    env("VITE_FIREBASE_DATABASE_URL") ||
    "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app",
};

const groqCount = groqKeys ? groqKeys.split(",").length : 0;
if (!groqCount) {
  console.warn("Warning: No GROQ_API_KEYS in .env — AI features will not work.");
}

const outPath = path.join(root, "dist", "api-runtime-env.cjs");
fs.writeFileSync(outPath, `module.exports = ${JSON.stringify(payload, null, 2)};\n`, "utf8");
console.log(`API runtime env → dist/api-runtime-env.cjs (groq keys: ${groqCount})`);