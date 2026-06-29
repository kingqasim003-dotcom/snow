/**
 * Publish database.rules.json to Firebase RTDB (admin auth required).
 * Run: node scripts/publish-database-rules.mjs
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CFG = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
  databaseURL:
    process.env.VITE_FIREBASE_DATABASE_URL ||
    "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  adminEmail: "snowqasimbear@gmail.com",
  adminPassword: "Snowbear0io",
};

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CFG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: CFG.adminEmail,
        password: CFG.adminPassword,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Admin sign-in failed");
  return data.idToken;
}

async function main() {
  const rulesPath = join(__dirname, "..", "database.rules.json");
  const rules = JSON.parse(readFileSync(rulesPath, "utf8"));
  const token = await signIn();
  const base = CFG.databaseURL.replace(/\/$/, "");

  const endpoints = [
    `${base}/.settings/rules.json?auth=${encodeURIComponent(token)}`,
    `${base}/.settings/rules.json?access_token=${encodeURIComponent(token)}`,
  ];

  let published = false;
  for (const url of endpoints) {
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rules),
    });
    const text = await res.text();
    console.log(`PUT ${url.split("?")[0]} → ${res.status}`);
    if (res.ok) {
      console.log("Rules published successfully.");
      published = true;
      break;
    }
    if (text) console.log(text.slice(0, 300));
  }

  if (!published) {
    console.error(
      "\nCould not auto-publish. Open Firebase Console → Realtime Database → Rules,\n" +
        "paste database.rules.json, and click Publish."
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});