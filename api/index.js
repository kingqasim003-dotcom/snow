require("dotenv").config();
const runtimeEnv = require("./runtime-env.cjs");
for (const [key, value] of Object.entries(runtimeEnv)) {
  if (value && !process.env[key]) process.env[key] = value;
}
const __b64Pairs = [
  ["GROQ_API_KEYS_B64", "GROQ_API_KEYS"],
  ["IMGBB_API_KEY_B64", "IMGBB_API_KEY"],
  ["ADMIN_GATE_PASSWORD_B64", "ADMIN_GATE_PASSWORD"],
  ["ADMIN_PASSWORD_B64", "ADMIN_PASSWORD"],
];
for (const [enc, plain] of __b64Pairs) {
  if (process.env[enc] && !process.env[plain]) {
    process.env[plain] = Buffer.from(process.env[enc], "base64").toString("utf8");
  }
}
const { createApp } = require("./server-app.cjs");
module.exports = createApp();
