import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { createApp } from "./server/app";

// Vercel zero-config Express entry (static SPA is served from dist/ via vercel.json)
export default createApp();