import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import AdmZip from "adm-zip";

const root = process.cwd();
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const extensionDir =
  process.env.EXTENSION_PATH?.trim() || "T:\\extantion\\SnowBear";
const backendUrl =
  process.env.DEPLOY_ORIGIN?.trim() ||
  process.env.VITE_SITE_ORIGIN?.trim() ||
  "https://www.snowbear.online";
const outZip = path.join(root, "dist", "snowbear-chrome-extension.zip");

if (!fs.existsSync(extensionDir)) {
  console.error(`Extension folder not found: ${extensionDir}`);
  process.exit(1);
}

function parseGroqKeys() {
  const raw = process.env.GROQ_API_KEYS || process.env.GROQ_API_KEY || "";
  return raw
    .split(/[,\n]/)
    .map((k) => k.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

const embedGroqKeys = process.env.EXTENSION_EMBED_GROQ_KEYS === "true";

function buildGroqConfigPayload() {
  return {
    apiKeys: embedGroqKeys ? parseGroqKeys() : [],
    rateLimitPerKey: 30,
    rateWindowMs: 60000,
    model: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
    apiUrl: "https://api.groq.com/openai/v1/chat/completions",
    requestTimeoutMs: 9000,
  };
}

function buildGroqConfigScript() {
  return `const GROQ_CONFIG = ${JSON.stringify(buildGroqConfigPayload(), null, 2)};\n`;
}

function addDirectoryToZip(zip, dirPath, zipPrefix = "") {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, zipPath.replace(/\\/g, "/"));
      continue;
    }

    if (entry.name === "website-config.js" || entry.name === "groq-config.js") continue;
    zip.addFile(zipPath.replace(/\\/g, "/"), fs.readFileSync(fullPath));
  }
}

const zip = new AdmZip();
addDirectoryToZip(zip, extensionDir);

const websiteConfig = `const WEBSITE_CONFIG = { backendUrl: ${JSON.stringify(backendUrl)} };\n`;
zip.addFile("website-config.js", Buffer.from(websiteConfig, "utf8"));
zip.addFile("groq-config.js", Buffer.from(buildGroqConfigScript(), "utf8"));

zip.writeZip(outZip);

let extensionVersion = "?";
try {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(extensionDir, "manifest.json"), "utf8")
  );
  extensionVersion = manifest.version || extensionVersion;
} catch (_) {}

const keyCount = buildGroqConfigPayload().apiKeys.length;
console.log(
  `Extension ZIP → dist/snowbear-chrome-extension.zip (v${extensionVersion}, backend: ${backendUrl}, groq keys: ${keyCount}${embedGroqKeys ? " [dev embed]" : " [server-only]"})`
);
if (!keyCount) {
  console.log(
    "Extension uses website API for AI — set GROQ_API_KEYS in Vercel project settings."
  );
}