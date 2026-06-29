import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApp } from "./server/app";

async function startServer() {
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === "production";
  const HOST = process.env.HOST || (isProd ? "0.0.0.0" : "127.0.0.1");
  const app = createApp({ serveSpa: isProd });

  if (!isProd) {
    console.log("Setting up Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production static assets from /dist...");
  }

  const adminPanelDir = [path.join(process.cwd(), "admin-panel"), path.join(process.cwd(), "dist", "admin-panel")].find(
    (dir) => fs.existsSync(path.join(dir, "index.html"))
  );

  app.listen(PORT, HOST, () => {
    console.log(`SnowBear server running on http://${HOST}:${PORT}`);
    if (adminPanelDir) {
      console.log(`Admin panel: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/lop/`);
    }
  });
}

startServer().catch((error) => {
  console.error("Failed to start SnowBear server:", error);
});