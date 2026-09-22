require("dotenv").config({ path: ".env.local" });
require("dotenv").config();

const { createApp } = require("../dist/server-app.cjs");

module.exports = createApp();