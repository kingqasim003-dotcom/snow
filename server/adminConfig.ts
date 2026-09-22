/** Builds public runtime config for /lop — passwords stay server-side only. */
export function buildAdminConfigScript(): string {
  const databaseURL =
    process.env.VITE_FIREBASE_DATABASE_URL ||
    process.env.FIREBASE_DATABASE_URL ||
    "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app";

  const firebase = {
    apiKey:
      process.env.VITE_FIREBASE_API_KEY ||
      process.env.FIREBASE_API_KEY ||
      "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
    authDomain:
      process.env.VITE_FIREBASE_AUTH_DOMAIN || "snowbear-online.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "snowbear-online",
    storageBucket:
      process.env.VITE_FIREBASE_STORAGE_BUCKET ||
      "snowbear-online.firebasestorage.app",
    messagingSenderId:
      process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "420360574036",
    appId:
      process.env.VITE_FIREBASE_APP_ID ||
      "1:420360574036:web:ed69dd7212199b22ca09c1",
    databaseURL,
  };

  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "";

  const missing: string[] = [];
  if (!firebase.apiKey) missing.push("VITE_FIREBASE_API_KEY");
  if (!firebase.databaseURL) missing.push("VITE_FIREBASE_DATABASE_URL");
  if (!adminEmail) missing.push("ADMIN_EMAIL");

  if (missing.length) {
    const list = missing.join(", ");
    return `window.SNOWBEAR_ADMIN_CONFIG = null;
console.error("[SnowBear Admin] Missing environment variables: ${list}");
document.addEventListener("DOMContentLoaded", function () {
  var err = document.getElementById("gate-error");
  if (err) err.textContent = "Admin panel is not configured on the server. Set: ${list}";
});`;
  }

  const payload = { firebase, adminEmail };

  return `window.SNOWBEAR_ADMIN_CONFIG = ${JSON.stringify(payload)};`;
}