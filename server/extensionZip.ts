import fs from "fs";
import path from "path";
import AdmZip from "adm-zip";

function addDirectoryToZip(zip: AdmZip, dirPath: string, zipPrefix = "") {
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, zipPath.replace(/\\/g, "/"));
      continue;
    }

    zip.addFile(zipPath.replace(/\\/g, "/"), fs.readFileSync(fullPath));
  }
}

export function buildExtensionZip(originUrl: string): Buffer {
  const extensionDir = process.env.EXTENSION_PATH || "T:\\extantion\\SnowBear";

  if (!fs.existsSync(extensionDir)) {
    throw new Error(`Extension folder not found: ${extensionDir}`);
  }

  const ZipConstructor = (AdmZip as unknown as { default?: typeof AdmZip }).default || AdmZip;
  const zip = new ZipConstructor();

  addDirectoryToZip(zip, extensionDir);

  const config = `const WEBSITE_CONFIG = { backendUrl: ${JSON.stringify(originUrl)} };\n`;
  zip.addFile("website-config.js", Buffer.from(config, "utf8"));

  return zip.toBuffer();
}