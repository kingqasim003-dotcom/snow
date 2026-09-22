import fs from "fs";
import path from "path";
import dotenv from "dotenv";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const src = path.join(root, "admin-panel");
const dest = path.join(root, "dist", "lop");

if (!fs.existsSync(src)) {
  console.error("admin-panel folder not found — skip staging.");
  process.exit(0);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === "config.js") continue;
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function buildAdminConfigScript() {
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

  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "snowqasimbear@gmail.com";
  const payload = { firebase, adminEmail };
  return `window.SNOWBEAR_ADMIN_CONFIG = ${JSON.stringify(payload)};`;
}

copyDir(src, dest);
fs.writeFileSync(path.join(dest, "config.js"), buildAdminConfigScript(), "utf8");

fs.writeFileSync(
  path.join(root, "dist", ".deploy-vercel.json"),
  `${JSON.stringify(
    {
      installCommand: "npm install --omit=dev",
      buildCommand: "echo skip",
      outputDirectory: "dist",
      framework: null,
      functions: {
        "api/index.js": {
          includeFiles: "dist/lop/**",
        },
      },
      rewrites: [
        { source: "/api/:path*", destination: "/api" },
        { source: "/lop", destination: "/lop/index.html" },
        {
          source:
            "/((?!api/|assets/|lop/|lop$|polar-bear|robots\\.txt|sitemap\\.xml|googled78b9c1a3f72a025\\.html|snowbear-chrome-extension\\.zip).*)",
          destination: "/index.html",
        },
      ],
    },
    null,
    2
  )}\n`,
  "utf8"
);

// Remove legacy admin-panel path if present
const legacy = path.join(root, "dist", "admin-panel");
if (fs.existsSync(legacy)) {
  fs.rmSync(legacy, { recursive: true, force: true });
}

console.log("Staged admin panel → dist/lop (with config.js)");