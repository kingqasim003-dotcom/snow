var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server/app.ts
var app_exports = {};
__export(app_exports, {
  createApp: () => createApp
});
module.exports = __toCommonJS(app_exports);
var import_fs2 = __toESM(require("fs"), 1);
var import_express = __toESM(require("express"), 1);
var import_path2 = __toESM(require("path"), 1);

// server/adminConfig.ts
function buildAdminConfigScript() {
  const databaseURL = process.env.VITE_FIREBASE_DATABASE_URL || process.env.FIREBASE_DATABASE_URL || "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app";
  const firebase = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "snowbear-online.firebaseapp.com",
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || "snowbear-online",
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "snowbear-online.firebasestorage.app",
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "420360574036",
    appId: process.env.VITE_FIREBASE_APP_ID || "1:420360574036:web:ed69dd7212199b22ca09c1",
    databaseURL
  };
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || "";
  const gatePassword = process.env.ADMIN_GATE_PASSWORD?.trim() || "";
  const adminPassword = process.env.ADMIN_PASSWORD?.trim() || "";
  const missing = [];
  if (!firebase.apiKey) missing.push("VITE_FIREBASE_API_KEY");
  if (!firebase.databaseURL) missing.push("VITE_FIREBASE_DATABASE_URL");
  if (!adminEmail) missing.push("ADMIN_EMAIL");
  if (!gatePassword) missing.push("ADMIN_GATE_PASSWORD");
  if (!adminPassword) missing.push("ADMIN_PASSWORD");
  if (missing.length) {
    const list = missing.join(", ");
    return `window.SNOWBEAR_ADMIN_CONFIG = null;
console.error("[SnowBear Admin] Missing environment variables: ${list}");
document.addEventListener("DOMContentLoaded", function () {
  var err = document.getElementById("gate-error");
  if (err) err.textContent = "Admin panel is not configured on the server. Set: ${list}";
});`;
  }
  const payload = {
    firebase,
    adminEmail,
    gatePassword,
    adminPassword
  };
  return `window.SNOWBEAR_ADMIN_CONFIG = ${JSON.stringify(payload)};`;
}

// server/groq.ts
var GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
var GROQ_MODEL = "llama-3.1-8b-instant";
var REQUEST_TIMEOUT_MS = 3e4;
var GROQ_RATE_LIMIT_PER_KEY = 30;
var GROQ_RATE_WINDOW_MS = 6e4;
var keyUsageStore = /* @__PURE__ */ new Map();
var roundRobinIndex = 0;
function loadGroqApiKeys() {
  const multi = process.env.GROQ_API_KEYS?.split(/[,\n]/).map((key) => key.trim()).filter(Boolean);
  if (multi?.length) {
    return multi;
  }
  const single = process.env.GROQ_API_KEY?.trim();
  if (single) {
    return [single];
  }
  throw new Error("No Groq API keys configured.");
}
function maskKey(key) {
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}
function isKeyAvailable(key, now) {
  const usage = keyUsageStore.get(key);
  if (!usage) return true;
  if (usage.cooldownUntil && now < usage.cooldownUntil) return false;
  if (now >= usage.resetAt) return true;
  return usage.count < GROQ_RATE_LIMIT_PER_KEY;
}
function recordKeyUsage(key, now) {
  const usage = keyUsageStore.get(key);
  if (!usage || now >= usage.resetAt) {
    keyUsageStore.set(key, { count: 1, resetAt: now + GROQ_RATE_WINDOW_MS });
    return;
  }
  usage.count += 1;
}
function markKeyRateLimited(key, now) {
  const usage = keyUsageStore.get(key);
  if (!usage || now >= usage.resetAt) {
    keyUsageStore.set(key, {
      count: GROQ_RATE_LIMIT_PER_KEY,
      resetAt: now + GROQ_RATE_WINDOW_MS,
      cooldownUntil: now + GROQ_RATE_WINDOW_MS
    });
    return;
  }
  usage.count = GROQ_RATE_LIMIT_PER_KEY;
  usage.cooldownUntil = now + GROQ_RATE_WINDOW_MS;
}
function selectNextKey(keys, tried, now) {
  const available = keys.filter((key) => !tried.has(key) && isKeyAvailable(key, now));
  if (!available.length) return null;
  const offset = roundRobinIndex % available.length;
  const selected = available[offset];
  roundRobinIndex = (roundRobinIndex + 1) % keys.length;
  return selected;
}
async function requestGroq(apiKey, systemInstruction, userPrompt, temperature, jsonMode) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const body = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt }
      ],
      temperature
    };
    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (response.status === 429) {
      throw Object.assign(new Error("Groq rate limit reached."), { status: 429 });
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error(`Groq API error [${maskKey(apiKey)}]:`, response.status, errText.slice(0, 200));
      throw new Error("AI service temporarily unavailable.");
    }
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("AI service returned an empty response.");
    }
    return content;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI request timed out.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
async function callGroqChatCompletion({
  systemInstruction,
  userPrompt,
  temperature = 0.7,
  jsonMode = false
}) {
  const keys = loadGroqApiKeys();
  const tried = /* @__PURE__ */ new Set();
  let lastError = null;
  while (tried.size < keys.length) {
    const now = Date.now();
    const apiKey = selectNextKey(keys, tried, now);
    if (!apiKey) {
      break;
    }
    tried.add(apiKey);
    recordKeyUsage(apiKey, now);
    try {
      return await requestGroq(apiKey, systemInstruction, userPrompt, temperature, jsonMode);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown Groq error.");
      lastError = error;
      if (err.status === 429) {
        markKeyRateLimited(apiKey, now);
        console.warn(`Groq key ${maskKey(apiKey)} hit rate limit, switching to next key...`);
        continue;
      }
      throw error;
    }
  }
  throw lastError ?? new Error("All Groq API keys are at the 30 requests/minute limit. Please wait and try again.");
}

// server/extensionZip.ts
var import_fs = __toESM(require("fs"), 1);
var import_path = __toESM(require("path"), 1);
var import_adm_zip = __toESM(require("adm-zip"), 1);
function addDirectoryToZip(zip, dirPath, zipPrefix = "") {
  for (const entry of import_fs.default.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = import_path.default.join(dirPath, entry.name);
    const zipPath = zipPrefix ? `${zipPrefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      addDirectoryToZip(zip, fullPath, zipPath.replace(/\\/g, "/"));
      continue;
    }
    zip.addFile(zipPath.replace(/\\/g, "/"), import_fs.default.readFileSync(fullPath));
  }
}
function buildExtensionZip(originUrl) {
  const extensionDir = process.env.EXTENSION_PATH || "T:\\extantion\\SnowBear";
  if (!import_fs.default.existsSync(extensionDir)) {
    throw new Error(`Extension folder not found: ${extensionDir}`);
  }
  const ZipConstructor = import_adm_zip.default.default || import_adm_zip.default;
  const zip = new ZipConstructor();
  addDirectoryToZip(zip, extensionDir);
  const config = `const WEBSITE_CONFIG = { backendUrl: ${JSON.stringify(originUrl)} };
`;
  zip.addFile("website-config.js", Buffer.from(config, "utf8"));
  return zip.toBuffer();
}

// server/firebaseAdmin.ts
function serverConfig() {
  return {
    apiKey: process.env.FIREBASE_API_KEY || process.env.VITE_FIREBASE_API_KEY || "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
    databaseUrl: (process.env.FIREBASE_DATABASE_URL || process.env.VITE_FIREBASE_DATABASE_URL || "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app").replace(/\/$/, ""),
    adminEmail: process.env.ADMIN_EMAIL || process.env.FIREBASE_ADMIN_EMAIL || "snowqasimbear@gmail.com",
    adminPassword: process.env.ADMIN_PASSWORD || process.env.FIREBASE_ADMIN_PASSWORD || ""
  };
}
var adminTokenCache = null;
async function verifyUserToken(idToken) {
  const { apiKey } = serverConfig();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken })
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Invalid or expired session. Sign in again.");
  }
  const user = data.users?.[0];
  if (!user?.localId) throw new Error("Could not verify your account.");
  return { uid: user.localId, email: user.email || "" };
}
async function getAdminToken() {
  const { apiKey, adminEmail, adminPassword } = serverConfig();
  if (!adminPassword) {
    throw new Error("Server admin credentials missing (ADMIN_PASSWORD).");
  }
  if (adminTokenCache && adminTokenCache.expiresAt > Date.now() + 6e4) {
    return adminTokenCache.token;
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true
      })
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Server admin auth failed.");
  adminTokenCache = {
    token: data.idToken,
    expiresAt: Date.now() + (parseInt(data.expiresIn, 10) || 3600) * 1e3
  };
  return adminTokenCache.token;
}
async function rtdbRequest(method, path3, token, body) {
  const { databaseUrl } = serverConfig();
  const res = await fetch(`${databaseUrl}/${path3}.json?auth=${encodeURIComponent(token)}`, {
    method,
    headers: body !== void 0 ? { "Content-Type": "application/json" } : void 0,
    body: body !== void 0 ? JSON.stringify(body) : void 0
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = data?.error || `HTTP ${res.status}`;
    throw new Error(String(err));
  }
  return data;
}

// server/promoRedeem.ts
function normalizeCode(code) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
function promoPathKey(code) {
  return normalizeCode(code).replace(/[.#$[\]/]/g, "");
}
function monthKey() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
}
async function redeemPromoForUser(userIdToken, rawCode) {
  const { apiKey, databaseUrl } = serverConfig();
  if (!apiKey || !databaseUrl) {
    throw new Error("Server Firebase config missing.");
  }
  const code = normalizeCode(rawCode);
  if (!code || code.length < 4) throw new Error("Enter a valid promo code.");
  const user = await verifyUserToken(userIdToken);
  const adminToken = await getAdminToken();
  let promo = null;
  let promoKey = "";
  for (const key of [.../* @__PURE__ */ new Set([promoPathKey(code), code])]) {
    try {
      const row = await rtdbRequest(
        "GET",
        `promoCodes/${key}`,
        adminToken
      );
      if (row && row.active !== false && !row.usedByUid && (row.credits || 0) > 0) {
        promo = row;
        promoKey = key;
        break;
      }
    } catch {
    }
  }
  if (!promo || !promoKey) {
    throw new Error("Promo code not found or already used. Generate a fresh code in admin.");
  }
  const creditAmount = promo.credits || 0;
  const now = Date.now();
  await rtdbRequest("PATCH", `promoCodes/${promoKey}`, adminToken, {
    usedByUid: user.uid,
    usedByEmail: user.email,
    usedAt: now,
    active: false
  });
  const month = monthKey();
  let current = null;
  try {
    current = await rtdbRequest("GET", `users/${user.uid}/credits`, adminToken);
  } catch {
    current = null;
  }
  const normalized = current && current.month === month ? current : { month, used: 0, purchased: current && current.purchased || 0 };
  const nextCredits = {
    month: normalized.month || month,
    used: normalized.used || 0,
    purchased: (normalized.purchased || 0) + creditAmount
  };
  let existing = null;
  try {
    existing = await rtdbRequest("GET", `users/${user.uid}`, adminToken);
  } catch {
    existing = null;
  }
  if (!existing || typeof existing !== "object") {
    await rtdbRequest("PUT", `users/${user.uid}`, adminToken, {
      email: user.email,
      plan: "free",
      createdAt: now,
      credits: nextCredits
    });
  } else {
    const profilePatch = {};
    if (user.email && !existing.email) profilePatch.email = user.email;
    if (!existing.plan) profilePatch.plan = "free";
    if (!existing.createdAt) profilePatch.createdAt = now;
    if (Object.keys(profilePatch).length) {
      await rtdbRequest("PATCH", `users/${user.uid}`, adminToken, profilePatch);
    }
    await rtdbRequest("PUT", `users/${user.uid}/credits`, adminToken, nextCredits);
  }
  return { credits: creditAmount, code: promo.code || code, uid: user.uid, email: user.email };
}

// server/referral.ts
var REFERRAL_SIGNUP_CREDITS = 5;
var REFERRAL_PURCHASE_CREDITS = 20;
var SIGNUP_CLAIM_WINDOW_MS = 2 * 60 * 60 * 1e3;
function monthKey2() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 7);
}
function normalizeReferralCode(code) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}
function referralCodeFromUid(uid) {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = Math.imul(31, h) + uid.charCodeAt(i) >>> 0;
  }
  const segment = h.toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
  return `SB-${segment}`;
}
async function addPurchasedCreditsAdmin(uid, amount, adminToken) {
  const month = monthKey2();
  let current = null;
  try {
    current = await rtdbRequest("GET", `users/${uid}/credits`, adminToken);
  } catch {
    current = null;
  }
  const normalized = current && current.month === month ? current : { month, used: 0, purchased: current?.purchased || 0 };
  await rtdbRequest("PUT", `users/${uid}/credits`, adminToken, {
    month: normalized.month || month,
    used: normalized.used || 0,
    purchased: (normalized.purchased || 0) + amount
  });
}
async function bumpReferralStats(referrerUid, patch, adminToken) {
  const user = await rtdbRequest("GET", `users/${referrerUid}`, adminToken);
  const stats = user?.referralStats || { signups: 0, purchases: 0, creditsEarned: 0 };
  await rtdbRequest("PATCH", `users/${referrerUid}`, adminToken, {
    referralStats: {
      signups: (stats.signups || 0) + (patch.signups || 0),
      purchases: (stats.purchases || 0) + (patch.purchases || 0),
      creditsEarned: (stats.creditsEarned || 0) + (patch.creditsEarned || 0)
    }
  });
}
async function findReferrerUidByCode(code, adminToken) {
  try {
    const mapping = await rtdbRequest(
      "GET",
      `referralCodes/${code}`,
      adminToken
    );
    if (mapping?.uid) return mapping.uid;
  } catch {
  }
  const users = await rtdbRequest("GET", "users", adminToken);
  if (!users || typeof users !== "object") return null;
  for (const [uid, row] of Object.entries(users)) {
    if (normalizeReferralCode(row?.referralCode || "") === code) return uid;
  }
  return null;
}
async function ensureReferralCodeForUser(uid, email) {
  const adminToken = await getAdminToken();
  const user = await rtdbRequest("GET", `users/${uid}`, adminToken);
  if (user?.referralCode) return user.referralCode;
  const code = referralCodeFromUid(uid);
  const existingUid = await findReferrerUidByCode(code, adminToken);
  if (existingUid && existingUid !== uid) {
    throw new Error("Could not allocate referral code. Try again.");
  }
  try {
    await rtdbRequest("PUT", `referralCodes/${code}`, adminToken, {
      uid,
      email,
      createdAt: Date.now()
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("Permission denied")) throw err;
  }
  const profilePatch = { referralCode: code };
  if (!user?.referralStats) {
    profilePatch.referralStats = { signups: 0, purchases: 0, creditsEarned: 0 };
  }
  await rtdbRequest("PATCH", `users/${uid}`, adminToken, profilePatch);
  return code;
}
async function getReferralDashboard(idToken, siteOrigin) {
  const user = await verifyUserToken(idToken);
  const code = await ensureReferralCodeForUser(user.uid, user.email);
  const adminToken = await getAdminToken();
  const row = await rtdbRequest("GET", `users/${user.uid}`, adminToken);
  const stats = row?.referralStats || { signups: 0, purchases: 0, creditsEarned: 0 };
  const origin = siteOrigin.replace(/\/$/, "");
  return {
    code,
    link: `${origin}/?ref=${encodeURIComponent(code)}`,
    stats: {
      signups: stats.signups || 0,
      purchases: stats.purchases || 0,
      creditsEarned: stats.creditsEarned || 0
    }
  };
}
async function claimReferralSignup(idToken, rawCode) {
  const code = normalizeReferralCode(rawCode);
  if (!code || code.length < 4) {
    throw new Error("Invalid referral link.");
  }
  const user = await verifyUserToken(idToken);
  const adminToken = await getAdminToken();
  const referrerUid = await findReferrerUidByCode(code, adminToken);
  if (!referrerUid) throw new Error("Referral link not found.");
  if (referrerUid === user.uid) throw new Error("You cannot use your own referral link.");
  const newUser = await rtdbRequest("GET", `users/${user.uid}`, adminToken);
  if (newUser?.referredByUid) {
    return { ok: true, creditsGranted: 0, referrerUid: newUser.referredByUid };
  }
  const createdAt = newUser?.createdAt || Date.now();
  if (Date.now() - createdAt > SIGNUP_CLAIM_WINDOW_MS) {
    throw new Error("Referral signup window expired for this account.");
  }
  let claim = null;
  try {
    claim = await rtdbRequest("GET", `referralClaims/${user.uid}`, adminToken);
  } catch {
    claim = null;
  }
  if (claim?.signupRewardAt) {
    return { ok: true, creditsGranted: 0, referrerUid };
  }
  await rtdbRequest("PATCH", `users/${user.uid}`, adminToken, {
    referredByUid: referrerUid,
    referredByCode: code,
    referredAt: Date.now()
  });
  await addPurchasedCreditsAdmin(referrerUid, REFERRAL_SIGNUP_CREDITS, adminToken);
  await bumpReferralStats(
    referrerUid,
    { signups: 1, creditsEarned: REFERRAL_SIGNUP_CREDITS },
    adminToken
  );
  await rtdbRequest("PUT", `referralClaims/${user.uid}`, adminToken, {
    referrerUid,
    code,
    signupRewardAt: Date.now(),
    signupCredits: REFERRAL_SIGNUP_CREDITS
  });
  return { ok: true, creditsGranted: REFERRAL_SIGNUP_CREDITS, referrerUid };
}
async function grantReferralPurchaseReward(referredUid, orderId) {
  if (!referredUid || !orderId) return { granted: false, credits: 0 };
  const adminToken = await getAdminToken();
  const referred = await rtdbRequest("GET", `users/${referredUid}`, adminToken);
  const referrerUid = referred?.referredByUid;
  if (!referrerUid) return { granted: false, credits: 0 };
  const rewardKey = `${referredUid}_${orderId}`;
  let existing = null;
  try {
    existing = await rtdbRequest("GET", `referralPurchaseRewards/${rewardKey}`, adminToken);
  } catch {
    existing = null;
  }
  if (existing?.grantedAt) return { granted: false, credits: 0, referrerUid };
  await addPurchasedCreditsAdmin(referrerUid, REFERRAL_PURCHASE_CREDITS, adminToken);
  await bumpReferralStats(
    referrerUid,
    { purchases: 1, creditsEarned: REFERRAL_PURCHASE_CREDITS },
    adminToken
  );
  await rtdbRequest("PUT", `referralPurchaseRewards/${rewardKey}`, adminToken, {
    referrerUid,
    referredUid,
    orderId,
    credits: REFERRAL_PURCHASE_CREDITS,
    grantedAt: Date.now()
  });
  return { granted: true, credits: REFERRAL_PURCHASE_CREDITS, referrerUid };
}

// server/imgbb.ts
function imgbbApiKey() {
  return process.env.IMGBB_API_KEY || "";
}
async function uploadImageToImgbb(base64OrDataUrl, name) {
  const apiKey = imgbbApiKey();
  if (!apiKey) {
    throw new Error("Receipt upload is not configured on the server.");
  }
  let image = base64OrDataUrl.trim();
  if (image.includes(",")) {
    image = image.split(",")[1] || image;
  }
  if (!image || image.length < 32) {
    throw new Error("Invalid image data.");
  }
  const body = new URLSearchParams();
  body.set("image", image);
  if (name) body.set("name", name.slice(0, 120));
  const res = await fetch(
    `https://api.imgbb.com/1/upload?expiration=600&key=${encodeURIComponent(apiKey)}`,
    { method: "POST", body }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.error?.message || "Could not upload receipt image.");
  }
  return data.data?.url || data.data?.display_url || "";
}

// server/security.ts
var MAX_PROMPT_LENGTH = 1e4;
var ALLOWED_TARGET_MODELS = /* @__PURE__ */ new Set(["ChatGPT", "Claude", "Gemini", "Grok"]);
var rateLimitStore = /* @__PURE__ */ new Map();
function getAllowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS?.trim();
  if (configured) {
    return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    return [
      "https://snowbear.online",
      "https://www.snowbear.online",
      "https://snow-tau-ten.vercel.app"
    ];
  }
  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}
function securityHeaders(_req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  res.setHeader("Cross-Origin-Resource-Policy", "same-site");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  res.removeHeader("X-Powered-By");
  next();
}
function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();
  const isAllowed = !origin || allowedOrigins.includes(origin) || origin.startsWith("chrome-extension://");
  if (origin && isAllowed) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") {
    res.sendStatus(isAllowed ? 204 : 403);
    return;
  }
  if (origin && !isAllowed) {
    res.status(403).json({ error: "Origin not allowed." });
    return;
  }
  next();
}
function createRateLimiter(maxRequests, windowMs) {
  return (req, res, next) => {
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    if (!entry || now >= entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }
    if (entry.count >= maxRequests) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }
    entry.count += 1;
    next();
  };
}
function validatePrompt(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PROMPT_LENGTH) return null;
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(trimmed)) return null;
  return trimmed;
}
function validateTargetModel(value) {
  if (value === void 0 || value === null || value === "") return void 0;
  if (typeof value !== "string") return void 0;
  return ALLOWED_TARGET_MODELS.has(value) ? value : void 0;
}
function validateBackendOrigin(value, fallback) {
  const candidate = typeof value === "string" && value.trim() ? value.trim() : fallback;
  try {
    const parsed = new URL(candidate);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return fallback;
    }
    return parsed.origin;
  } catch {
    return fallback;
  }
}
function safeClientError(err) {
  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    return err.message;
  }
  return "Request failed. Please try again later.";
}

// server/app.ts
function resolveAdminPanelDir() {
  const candidates = [
    import_path2.default.join(process.cwd(), "admin-panel"),
    import_path2.default.join(process.cwd(), "dist", "admin-panel")
  ];
  for (const dir of candidates) {
    if (import_fs2.default.existsSync(import_path2.default.join(dir, "index.html"))) return dir;
  }
  return import_path2.default.join(process.cwd(), "admin-panel");
}
function createApp(options = {}) {
  const { serveSpa = false } = options;
  const app = (0, import_express.default)();
  const isProd = process.env.NODE_ENV === "production";
  app.set("trust proxy", 1);
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(corsMiddleware);
  app.post(
    "/api/upload-receipt",
    import_express.default.json({ limit: "8mb" }),
    createRateLimiter(12, 6e4),
    async (req, res) => {
      const image = typeof req.body?.image === "string" ? req.body.image.trim() : "";
      if (!image) {
        return res.status(400).json({ error: "Choose a receipt image to upload." });
      }
      try {
        const url = await uploadImageToImgbb(
          image,
          typeof req.body?.name === "string" ? req.body.name : void 0
        );
        res.json({ ok: true, url });
      } catch (err) {
        console.error("Receipt upload error:", err);
        res.status(400).json({
          ok: false,
          error: err instanceof Error ? err.message : "Could not upload receipt."
        });
      }
    }
  );
  app.use(import_express.default.json({ limit: "32kb" }));
  app.use("/api", createRateLimiter(60, 6e4));
  app.use(
    ["/api/enhance", "/api/compress", "/api/grammar", "/api/score"],
    createRateLimiter(15, 6e4)
  );
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
  });
  app.post("/api/enhance", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ error: "A valid prompt is required (max 10,000 characters)." });
    }
    const targetModel = validateTargetModel(req.body?.targetModel);
    try {
      const modelTargetStr = targetModel ? ` This prompt is specifically being enhanced for ${targetModel}.` : "";
      const systemInstruction = `You are SnowBear, a highly skilled AI prompt engineer mascot. Your job is to transform simple, vague prompts into extremely effective, structured, and detailed prompts that yield superior AI results. Maintain the user's core intent but add relevant context, specify the optimal persona, output formats, constraints, and examples if appropriate.${modelTargetStr} Respond with the enhanced prompt ONLY, in plain text (Markdown structure is allowed). Do not include any meta-text like 'Here is your enhanced prompt:' or 'Sure!'. Keep your response strictly to the final enhanced prompt itself.`;
      const result = await callGroqChatCompletion({
        systemInstruction,
        userPrompt: prompt,
        temperature: 0.7
      });
      res.json({ result });
    } catch (err) {
      console.error("Enhance error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });
  app.post("/api/compress", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ error: "A valid prompt is required (max 10,000 characters)." });
    }
    try {
      const systemInstruction = "You are SnowBear, an expert in LLM token optimization. Your job is to compress the provided prompt as much as possible while perfectly preserving its core instructions, intent, parameters, and meaning. Eliminate fluff, redundant words, and passive language. Use dense, high-information terminology. Respond with the compressed prompt ONLY, in plain text. Do not include any introductory or concluding remarks.";
      const result = await callGroqChatCompletion({
        systemInstruction,
        userPrompt: prompt,
        temperature: 0.3
      });
      res.json({ result });
    } catch (err) {
      console.error("Compress error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });
  app.post("/api/grammar", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ error: "A valid prompt is required (max 10,000 characters)." });
    }
    try {
      const systemInstruction = "You are SnowBear, an AI editor. Your job is to fix spelling, grammar, and sentence structure issues in the user's prompt to make it clear, crisp, and professional. Do not completely rewrite the prompt's structure unless it is highly confusing; just polish the grammar and clarity. Respond with the grammatically corrected prompt ONLY, in plain text.";
      const result = await callGroqChatCompletion({
        systemInstruction,
        userPrompt: prompt,
        temperature: 0.2
      });
      res.json({ result });
    } catch (err) {
      console.error("Grammar error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });
  app.post("/api/score", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ error: "A valid prompt is required (max 10,000 characters)." });
    }
    try {
      const systemInstruction = "Analyze the provided prompt for quality, detail, specificity, constraints, and context. Calculate a score from 0 to 100 where 100 is a flawless, context-rich, instruction-clear prompt, and 0 is extremely vague. Generate 3 to 5 clear, actionable bullet-point suggestions to improve the prompt. Return your response as a strict JSON object with fields 'score' (integer) and 'suggestions' (array of strings).";
      const result = await callGroqChatCompletion({
        systemInstruction,
        userPrompt: `Analyze this prompt and rate its quality:

${prompt}`,
        temperature: 0.3,
        jsonMode: true
      });
      const parsed = JSON.parse(result || "{}");
      const score = Number(parsed.score);
      const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter((item) => typeof item === "string").slice(0, 10) : [];
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(502).json({ error: "AI service returned an invalid score." });
      }
      res.json({ score: Math.round(score), suggestions });
    } catch (err) {
      console.error("Score error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });
  app.post("/api/referral/me", createRateLimiter(30, 6e4), async (req, res) => {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
    if (!idToken) {
      return res.status(400).json({ ok: false, error: "Sign in to view your referral link." });
    }
    try {
      const origin = validateBackendOrigin(
        typeof req.body?.origin === "string" ? req.body.origin : void 0,
        `${req.protocol}://${req.get("host")}`
      );
      const dashboard = await getReferralDashboard(idToken, origin);
      res.json({ ok: true, ...dashboard });
    } catch (err) {
      console.error("Referral dashboard error:", err);
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Could not load referral link."
      });
    }
  });
  app.post("/api/referral/claim", createRateLimiter(15, 6e4), async (req, res) => {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!idToken || !code) {
      return res.status(400).json({ ok: false, error: "Sign in with a valid referral link." });
    }
    try {
      const result = await claimReferralSignup(idToken, code);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Referral claim error:", err);
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Could not apply referral."
      });
    }
  });
  app.post("/api/referral/purchase-reward", createRateLimiter(40, 6e4), async (req, res) => {
    const referredUid = typeof req.body?.referredUid === "string" ? req.body.referredUid.trim() : "";
    const orderId = typeof req.body?.orderId === "string" ? req.body.orderId.trim() : "";
    if (!referredUid || !orderId) {
      return res.status(400).json({ ok: false, error: "Missing order details." });
    }
    try {
      const adminToken = await getAdminToken();
      const order = await rtdbRequest("GET", `orders/${orderId}`, adminToken);
      if (!order || order.uid !== referredUid || order.status !== "approved") {
        return res.status(400).json({ ok: false, error: "Order not approved." });
      }
      const result = await grantReferralPurchaseReward(referredUid, orderId);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Referral purchase reward error:", err);
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Could not grant referral reward."
      });
    }
  });
  app.post("/api/redeem-promo", createRateLimiter(20, 6e4), async (req, res) => {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
    const code = typeof req.body?.code === "string" ? req.body.code.trim() : "";
    if (!idToken || !code) {
      return res.status(400).json({ error: "Sign in and enter a promo code." });
    }
    try {
      const result = await redeemPromoForUser(idToken, code);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Promo redeem error:", err);
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Could not redeem code."
      });
    }
  });
  app.get("/api/download-extension", (req, res) => {
    try {
      const fallbackOrigin = `${req.protocol}://${req.get("host")}`;
      const originUrl = validateBackendOrigin(req.query.origin, fallbackOrigin);
      const zipBuffer = buildExtensionZip(originUrl);
      res.setHeader("Content-Disposition", 'attachment; filename="snowbear-chrome-extension.zip"');
      res.setHeader("Content-Type", "application/zip");
      res.setHeader("Content-Length", zipBuffer.length.toString());
      res.send(zipBuffer);
    } catch (err) {
      console.error("ZIP creation failed:", err);
      res.status(500).json({ error: "Failed to create extension package." });
    }
  });
  const adminPanelDir = resolveAdminPanelDir();
  app.get("/lop/config.js", (_req, res) => {
    res.setHeader("Content-Type", "application/javascript; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.send(buildAdminConfigScript());
  });
  app.use(
    "/lop",
    import_express.default.static(adminPanelDir, {
      index: "index.html",
      maxAge: isProd ? "1h" : 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
        if (filePath.endsWith("config.js")) {
          res.setHeader("Cache-Control", "no-store");
        }
      }
    })
  );
  app.get("/lop", (_req, res) => {
    res.redirect(301, "/lop/");
  });
  if (serveSpa) {
    const distPath = import_path2.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(import_path2.default.join(process.cwd(), "public")));
    app.use("/src/assets", import_express.default.static(import_path2.default.join(process.cwd(), "src/assets")));
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/lop")) {
        res.status(404).type("text/plain").send("Admin resource not found.");
        return;
      }
      res.sendFile(import_path2.default.join(distPath, "index.html"));
    });
  }
  app.use((err, _req, res, _next) => {
    console.error("Unhandled server error:", err);
    if (!res.headersSent) {
      res.status(500).json({
        error: err instanceof Error ? err.message : "Internal server error."
      });
    }
  });
  return app;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createApp
});
