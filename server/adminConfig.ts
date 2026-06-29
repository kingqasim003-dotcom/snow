/** Builds runtime config for /lop — credentials come from env, never committed. */
export function buildAdminConfigScript(): string {
  const databaseURL =
    process.env.VITE_FIREBASE_DATABASE_URL ||
    process.env.FIREBASE_DATABASE_URL ||
    "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app";

  const firebase = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || "",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: process.env.VITE_FIREBASE_APP_ID || "",
    databaseURL,
  };

  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "";
  const gatePassword = process.env.ADMIN_GATE_PASSWORD?.trim() || "";
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "";

  const missing: string[] = [];
  if (!firebase.apiKey) missing.push("VITE_FIREBASE_API_KEY");
  if (!firebase.databaseURL) missing.push("VITE_FIREBASE_DATABASE_URL");
  if (!adminEmail) missing.push("ADMIN_EMAIL");
  if (!gatePassword) missing.push("ADMIN_GATE_PASSWORD");
  if (!adminPassword) missing.push("ADMIN_PASSWORD");

  if (missing.length) {
    const list = missing.join(", ");
    return `window.SNOWBEAR_ADMIN_CONFIG = null;
console.error("[SnowBear Admin] Missing environment variables: ${list}");
document.addEventListener("DOMContentLoaded", function () {
  var err = document.getElementById("gate-error");
  if (err) err.textContent = "Admin panel is not configured on the server. Set: ${list}";
});`;
  }

  const payload = {
    firebase,
    adminEmail,
    gatePassword,
    adminPassword,
  };

  return `window.SNOWBEAR_ADMIN_CONFIG = ${JSON.stringify(payload)};`;
}