import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';
import {defineConfig} from 'vite';

function readExtensionVersion(): string {
  const candidates = [
    process.env.EXTENSION_PATH?.trim()
      ? path.join(process.env.EXTENSION_PATH.trim(), 'manifest.json')
      : '',
    'T:\\extantion\\SnowBear\\manifest.json',
    path.resolve(__dirname, '..', 'extantion', 'SnowBear', 'manifest.json'),
  ].filter(Boolean);

  for (const manifestPath of candidates) {
    try {
      if (!fs.existsSync(manifestPath)) continue;
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as { version?: string };
      if (manifest.version) return manifest.version;
    } catch {
      /* try next path */
    }
  }
  return '1.0.0';
}

export default defineConfig(() => {
  const extensionVersion = readExtensionVersion();
  return {
    plugins: [react(), tailwindcss()],
    define: {
      'import.meta.env.VITE_EXTENSION_VERSION': JSON.stringify(extensionVersion),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
