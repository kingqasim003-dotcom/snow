import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { createApp } from "../server/app";

const app = createApp();

export default app;