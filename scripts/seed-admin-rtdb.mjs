import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const apiKey =
  process.env.VITE_FIREBASE_API_KEY?.trim() ||
  "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA";
const databaseURL = (
  process.env.VITE_FIREBASE_DATABASE_URL?.trim() ||
  "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app"
).replace(/\/$/, "");
const adminEmail = process.env.ADMIN_EMAIL?.trim() || "snowqasimbear@gmail.com";
const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "Snowbear0io";

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Admin sign-in failed");
  return data.idToken;
}

async function main() {
  const token = await signIn();
  const emailKey = adminEmail.toLowerCase().replace(/\./g, ",");
  const adminPath = `${databaseURL}/config/adminEmails/${encodeURIComponent(emailKey)}.json?auth=${encodeURIComponent(token)}`;
  const put = await fetch(adminPath, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: "true",
  });
  if (!put.ok) {
    throw new Error(`Could not seed adminEmails: ${await put.text()}`);
  }
  console.log(`Seeded config/adminEmails/${emailKey} = true`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});