require("dotenv").config();
const runtimeEnv = require("./runtime-env.cjs");
for (const [key, value] of Object.entries(runtimeEnv)) {
  if (value && !process.env[key]) process.env[key] = value;
}
const { createApp } = require("./server-app.cjs");
module.exports = createApp();
