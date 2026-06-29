import fs from "fs";
import path from "path";

const root = process.cwd();
const src = path.join(root, "admin-panel");
const dest = path.join(root, "dist", "admin-panel");

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

copyDir(src, dest);
console.log("Staged admin panel → dist/admin-panel");