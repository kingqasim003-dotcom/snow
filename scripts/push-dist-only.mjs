import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const root = process.cwd();
const dist = path.join(root, "dist");
const remote = "https://github.com/kingqasim003-dotcom/snow.git";

const DEPLOY_ITEMS = [
  "index.html",
  "assets",
  "lop",
  "robots.txt",
  "sitemap.xml",
  "googled78b9c1a3f72a025.html",
  "polar-bear-logo.png",
  "polar-bear-logo.jpg",
  "polar-bear-logo-source.jpg",
  "snowbear-chrome-extension.zip",
];

function copyRecursive(from, to) {
  const stat = fs.statSync(from);
  if (stat.isDirectory()) {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from)) {
      copyRecursive(path.join(from, entry), path.join(to, entry));
    }
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.copyFileSync(from, to);
}

console.log("Seeding admin in Firebase RTDB...");
execSync("node scripts/seed-admin-rtdb.mjs", { cwd: root, stdio: "inherit", shell: true });

console.log("Building static dist...");
execSync(
  "npx vite build && node scripts/stage-admin.mjs && node scripts/stage-extension.mjs",
  { cwd: root, stdio: "inherit", shell: true }
);

console.log("Generating API env + bundling server for Vercel...");
execSync("node scripts/generate-api-env.mjs", { cwd: root, stdio: "inherit", shell: true });
execSync(
  "npx esbuild server/app.ts --bundle --platform=node --format=cjs --packages=external --outfile=dist/server-app.cjs",
  { cwd: root, stdio: "inherit", shell: true }
);

for (const item of DEPLOY_ITEMS) {
  const src = path.join(dist, item);
  if (!fs.existsSync(src)) {
    console.error(`Missing deploy artifact: ${item}`);
    process.exit(1);
  }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "snow-dist-deploy-"));
const tmpDist = path.join(tmp, "dist");
const tmpApi = path.join(tmp, "api");
console.log(`Preparing deploy bundle in ${tmp}`);

fs.mkdirSync(tmpDist, { recursive: true });
for (const item of DEPLOY_ITEMS) {
  copyRecursive(path.join(dist, item), path.join(tmpDist, item));
}

fs.mkdirSync(tmpApi, { recursive: true });
fs.copyFileSync(path.join(dist, "server-app.cjs"), path.join(tmpApi, "server-app.cjs"));
fs.copyFileSync(path.join(dist, "api-runtime-env.cjs"), path.join(tmpApi, "runtime-env.cjs"));
fs.writeFileSync(
  path.join(tmpApi, "index.js"),
  [
    'require("dotenv").config();',
    "const runtimeEnv = require(\"./runtime-env.cjs\");",
    "for (const [key, value] of Object.entries(runtimeEnv)) {",
    "  if (value && !process.env[key]) process.env[key] = value;",
    "}",
    "const __b64Pairs = [",
    "  [\"GROQ_API_KEYS_B64\", \"GROQ_API_KEYS\"],",
    "  [\"IMGBB_API_KEY_B64\", \"IMGBB_API_KEY\"],",
    "  [\"ADMIN_GATE_PASSWORD_B64\", \"ADMIN_GATE_PASSWORD\"],",
    "  [\"ADMIN_PASSWORD_B64\", \"ADMIN_PASSWORD\"],",
    "];",
    "for (const [enc, plain] of __b64Pairs) {",
    "  if (process.env[enc] && !process.env[plain]) {",
    "    process.env[plain] = Buffer.from(process.env[enc], \"base64\").toString(\"utf8\");",
    "  }",
    "}",
    'const { createApp } = require("./server-app.cjs");',
    "module.exports = createApp();",
    "",
  ].join("\n"),
  "utf8"
);

const vercelTemplate = path.join(dist, ".deploy-vercel.json");
if (!fs.existsSync(vercelTemplate)) {
  console.error("Missing .deploy-vercel.json — run stage-admin first.");
  process.exit(1);
}
fs.copyFileSync(vercelTemplate, path.join(tmp, "vercel.json"));

fs.writeFileSync(
  path.join(tmp, "package.json"),
  JSON.stringify(
    {
      name: "snowbear-static",
      private: true,
      version: "1.0.0",
      dependencies: {
        "adm-zip": "^0.5.17",
        dotenv: "^17.2.3",
        express: "^4.21.2",
      },
    },
    null,
    2
  ) + "\n",
  "utf8"
);

execSync("git init", { cwd: tmp, stdio: "inherit" });
execSync('git config user.email "snowqasimbear@gmail.com"', { cwd: tmp, stdio: "inherit" });
execSync('git config user.name "SnowBear Deploy"', { cwd: tmp, stdio: "inherit" });
execSync("git branch -M main", { cwd: tmp, stdio: "inherit" });
execSync(`git remote add origin ${remote}`, { cwd: tmp, stdio: "inherit" });
execSync("git add -A", { cwd: tmp, stdio: "inherit" });
execSync('git commit -m "Deploy dist + extension zip + API"', {
  cwd: tmp,
  stdio: "inherit",
});
execSync("git push -f origin main", { cwd: tmp, stdio: "inherit" });

console.log("Done — deployed site, /lop admin, extension ZIP, and API.");
console.log("Extension: https://snow-tau-ten.vercel.app/snowbear-chrome-extension.zip");
console.log("Admin: https://snow-tau-ten.vercel.app/lop/");