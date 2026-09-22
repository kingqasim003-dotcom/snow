import fs from "fs";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import path from "path";
import { buildAdminConfigScript } from "./adminConfig";
import { callGroqChatCompletion, groqMaxTokens } from "./groq";
import {
  cleanModelOutput,
  compressSystemInstructionFast,
  compressUserPrompt,
  enhanceSystemInstruction,
  enhanceUserPrompt,
  grammarSystemInstructionFast,
  grammarUserPrompt,
  guardGrammarOutput,
} from "./prompts";
import { buildExtensionZip } from "./extensionZip";
import { redeemPromoForUser } from "./promoRedeem";
import {
  claimReferralSignup,
  getReferralDashboard,
  grantReferralPurchaseReward,
} from "./referral";
import {
  resolveHealthSlot,
  runAndPersistHealthCheck,
  type HealthSlot,
} from "./apiHealth";
import { runPlanMaintenance } from "./planCron";
import { getAdminToken, rtdbRequest, serverConfig } from "./firebaseAdmin";
import { uploadImageToImgbb } from "./imgbb";
import {
  corsMiddleware,
  createRateLimiter,
  safeClientError,
  securityHeaders,
  validateBackendOrigin,
  validatePrompt,
  validateTargetModel,
} from "./security";

function resolveAdminPanelDir(): string {
  const candidates = [
    path.join(process.cwd(), "admin-panel"),
    path.join(process.cwd(), "dist", "admin-panel"),
  ];
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "index.html"))) return dir;
  }
  return path.join(process.cwd(), "admin-panel");
}

function readAdminGatePassword(): string {
  return (
    process.env.ADMIN_GATE_PASSWORD?.trim() ||
    (process.env.ADMIN_GATE_PASSWORD_B64
      ? Buffer.from(process.env.ADMIN_GATE_PASSWORD_B64, "base64").toString("utf8")
      : "")
  );
}

function readHealthCronSecret(): string {
  return (
    process.env.CRON_SECRET?.trim() ||
    process.env.HEALTH_CRON_SECRET?.trim() ||
    readAdminGatePassword() ||
    ""
  );
}

function isValidAdminGatePassword(gatePassword: string): boolean {
  const expected = readAdminGatePassword();
  return !!(expected && gatePassword && gatePassword === expected);
}

function isValidHealthCronSecret(req: Request): boolean {
  const expected = readHealthCronSecret();
  if (!expected) return false;
  const header = req.headers.authorization?.replace(/^Bearer\s+/i, "").trim();
  const query = typeof req.query.secret === "string" ? req.query.secret : "";
  return header === expected || query === expected;
}

export function createApp(options: { serveSpa?: boolean } = {}): Express {
  const { serveSpa = false } = options;
  const app = express();
  const isProd = process.env.NODE_ENV === "production";

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(securityHeaders);
  app.use(corsMiddleware);

  app.post(
    "/api/upload-receipt",
    express.json({ limit: "8mb" }),
    createRateLimiter(12, 60_000),
    async (req, res) => {
      const image = typeof req.body?.image === "string" ? req.body.image.trim() : "";
      if (!image) {
        return res.status(400).json({ error: "Choose a receipt image to upload." });
      }
      try {
        const url = await uploadImageToImgbb(
          image,
          typeof req.body?.name === "string" ? req.body.name : undefined
        );
        res.json({ ok: true, url });
      } catch (err) {
        console.error("Receipt upload error:", err);
        res.status(400).json({
          ok: false,
          error: err instanceof Error ? err.message : "Could not upload receipt.",
        });
      }
    }
  );

  app.use(express.json({ limit: "32kb" }));
  app.use("/api", createRateLimiter(60, 60_000));
  app.use(
    ["/api/enhance", "/api/compress", "/api/grammar", "/api/score"],
    createRateLimiter(15, 60_000)
  );

  app.post("/api/admin/session", createRateLimiter(8, 60_000), (req, res) => {
    const gatePassword =
      typeof req.body?.gatePassword === "string" ? req.body.gatePassword : "";
    const expected =
      process.env.ADMIN_GATE_PASSWORD?.trim() ||
      (process.env.ADMIN_GATE_PASSWORD_B64
        ? Buffer.from(process.env.ADMIN_GATE_PASSWORD_B64, "base64").toString("utf8")
        : "");
    const { adminEmail, adminPassword } = serverConfig();

    if (!expected || !adminPassword) {
      return res.status(503).json({ ok: false, error: "Admin panel is not configured on the server." });
    }
    if (gatePassword !== expected) {
      return res.status(401).json({ ok: false, error: "Wrong password." });
    }

    res.json({ ok: true, adminEmail, adminPassword });
  });

  app.get("/api/admin/health-status", createRateLimiter(30, 60_000), async (_req, res) => {
    try {
      const token = await getAdminToken();
      const snapshot = await rtdbRequest<Record<string, unknown> | null>(
        "GET",
        "config/apiHealth",
        token,
      );
      res.json({ ok: true, health: snapshot || null });
    } catch (err) {
      console.error("Health status read error:", err);
      res.status(500).json({ ok: false, error: safeClientError(err) });
    }
  });

  app.post("/api/admin/health-check", createRateLimiter(6, 60_000), async (req, res) => {
    const gatePassword =
      typeof req.body?.gatePassword === "string" ? req.body.gatePassword : "";
    if (!isValidAdminGatePassword(gatePassword)) {
      return res.status(401).json({ ok: false, error: "Wrong admin password." });
    }

    const slotRaw = typeof req.body?.slot === "string" ? req.body.slot : "";
    const slot: HealthSlot | undefined =
      slotRaw === "morning" || slotRaw === "midday" || slotRaw === "night"
        ? slotRaw
        : undefined;

    try {
      const health = await runAndPersistHealthCheck(slot);
      res.json({ ok: true, health });
    } catch (err) {
      console.error("Health check error:", err);
      res.status(500).json({ ok: false, error: safeClientError(err) });
    }
  });

  app.get("/api/admin/health-cron", createRateLimiter(12, 60_000), async (req, res) => {
    if (!isValidHealthCronSecret(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized cron." });
    }

    const slotRaw = typeof req.query.slot === "string" ? req.query.slot : "";
    const slot: HealthSlot | undefined =
      slotRaw === "morning" || slotRaw === "midday" || slotRaw === "night"
        ? slotRaw
        : resolveHealthSlot();

    try {
      const health = await runAndPersistHealthCheck(slot);
      res.json({ ok: true, health });
    } catch (err) {
      console.error("Health cron error:", err);
      res.status(500).json({ ok: false, error: safeClientError(err) });
    }
  });

  app.get("/api/admin/plan-cron", createRateLimiter(12, 60_000), async (req, res) => {
    if (!isValidHealthCronSecret(req)) {
      return res.status(401).json({ ok: false, error: "Unauthorized cron." });
    }

    try {
      const result = await runPlanMaintenance();
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Plan cron error:", err);
      res.status(500).json({ ok: false, error: safeClientError(err) });
    }
  });

  app.get("/api/health", (_req, res) => {
    let groqConfigured = false;
    try {
      if (!process.env.GROQ_API_KEYS && process.env.GROQ_API_KEYS_B64) {
        process.env.GROQ_API_KEYS = Buffer.from(process.env.GROQ_API_KEYS_B64, "base64").toString("utf8");
      }
      const keys = process.env.GROQ_API_KEYS?.split(/[,\n]/).map((k) => k.trim()).filter(Boolean);
      groqConfigured = !!(keys?.length || process.env.GROQ_API_KEY?.trim());
    } catch {
      groqConfigured = false;
    }
    res.json({
      status: "ok",
      groqConfigured,
      groqModel: process.env.GROQ_MODEL?.trim() || "llama-3.1-8b-instant",
      time: new Date().toISOString(),
    });
  });

  app.post("/api/enhance", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res
        .status(400)
        .json({ error: "A valid prompt is required (max 10,000 characters)." });
    }

    const targetModel = validateTargetModel(req.body?.targetModel);

    try {
      const result = await callGroqChatCompletion({
        systemInstruction: enhanceSystemInstruction(targetModel),
        userPrompt: enhanceUserPrompt(prompt),
        temperature: 0.15,
        maxTokens: groqMaxTokens("enhance", prompt),
      });

      res.json({ result: cleanModelOutput(result) });
    } catch (err) {
      console.error("Enhance error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });

  app.post("/api/compress", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res
        .status(400)
        .json({ error: "A valid prompt is required (max 10,000 characters)." });
    }

    try {
      const result = await callGroqChatCompletion({
        systemInstruction: compressSystemInstructionFast(),
        userPrompt: compressUserPrompt(prompt),
        temperature: 0,
        maxTokens: groqMaxTokens("compress", prompt),
      });

      const cleaned = cleanModelOutput(result);
      res.json({ result: cleaned.length < prompt.length ? cleaned : prompt });
    } catch (err) {
      console.error("Compress error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });

  app.post("/api/grammar", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res
        .status(400)
        .json({ error: "A valid prompt is required (max 10,000 characters)." });
    }

    try {
      const result = await callGroqChatCompletion({
        systemInstruction: grammarSystemInstructionFast(),
        userPrompt: grammarUserPrompt(prompt),
        temperature: 0,
        maxTokens: groqMaxTokens("grammar", prompt),
      });

      res.json({ result: guardGrammarOutput(prompt, result) });
    } catch (err) {
      console.error("Grammar error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });

  app.post("/api/score", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res
        .status(400)
        .json({ error: "A valid prompt is required (max 10,000 characters)." });
    }

    try {
      const systemInstruction =
        'Score prompt quality 0-100. Return strict JSON only: {"score":number,"suggestions":["tip1","tip2","tip3"]}. Max 3 short suggestions.';
      const result = await callGroqChatCompletion({
        systemInstruction,
        userPrompt: prompt,
        temperature: 0.1,
        jsonMode: true,
        maxTokens: groqMaxTokens("score", prompt),
      });

      const parsed = JSON.parse(result || "{}");
      const score = Number(parsed.score);
      const suggestions = Array.isArray(parsed.suggestions)
        ? parsed.suggestions.filter((item: unknown) => typeof item === "string").slice(0, 10)
        : [];

      if (!Number.isFinite(score) || score < 0 || score > 100) {
        return res.status(502).json({ error: "AI service returned an invalid score." });
      }

      res.json({ score: Math.round(score), suggestions });
    } catch (err) {
      console.error("Score error:", err);
      res.status(500).json({ error: safeClientError(err) });
    }
  });

  app.post("/api/referral/me", createRateLimiter(30, 60_000), async (req, res) => {
    const idToken = typeof req.body?.idToken === "string" ? req.body.idToken.trim() : "";
    if (!idToken) {
      return res.status(400).json({ ok: false, error: "Sign in to view your referral link." });
    }
    try {
      const origin = validateBackendOrigin(
        typeof req.body?.origin === "string" ? req.body.origin : undefined,
        `${req.protocol}://${req.get("host")}`
      );
      const dashboard = await getReferralDashboard(idToken, origin);
      res.json({ ok: true, ...dashboard });
    } catch (err) {
      console.error("Referral dashboard error:", err);
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Could not load referral link.",
      });
    }
  });

  app.post("/api/referral/claim", createRateLimiter(15, 60_000), async (req, res) => {
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
        error: err instanceof Error ? err.message : "Could not apply referral.",
      });
    }
  });

  app.post("/api/referral/purchase-reward", createRateLimiter(40, 60_000), async (req, res) => {
    const referredUid =
      typeof req.body?.referredUid === "string" ? req.body.referredUid.trim() : "";
    const orderId = typeof req.body?.orderId === "string" ? req.body.orderId.trim() : "";
    if (!referredUid || !orderId) {
      return res.status(400).json({ ok: false, error: "Missing order details." });
    }
    try {
      const adminToken = await getAdminToken();
      const order = await rtdbRequest<{
        uid?: string;
        status?: string;
      } | null>("GET", `orders/${orderId}`, adminToken);
      if (!order || order.uid !== referredUid || order.status !== "approved") {
        return res.status(400).json({ ok: false, error: "Order not approved." });
      }
      const result = await grantReferralPurchaseReward(referredUid, orderId);
      res.json({ ok: true, ...result });
    } catch (err) {
      console.error("Referral purchase reward error:", err);
      res.status(400).json({
        ok: false,
        error: err instanceof Error ? err.message : "Could not grant referral reward.",
      });
    }
  });

  app.post("/api/redeem-promo", createRateLimiter(20, 60_000), async (req, res) => {
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
        error: err instanceof Error ? err.message : "Could not redeem code.",
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
    express.static(adminPanelDir, {
      index: "index.html",
      maxAge: isProd ? "1h" : 0,
      setHeaders(res, filePath) {
        if (filePath.endsWith(".html")) {
          res.setHeader("Cache-Control", "no-cache");
        }
        if (filePath.endsWith("config.js")) {
          res.setHeader("Cache-Control", "no-store");
        }
      },
    })
  );

  app.get("/lop", (_req, res) => {
    res.redirect(301, "/lop/");
  });

  if (serveSpa) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(path.join(process.cwd(), "public")));
    app.use("/src/assets", express.static(path.join(process.cwd(), "src/assets")));
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/lop")) {
        res.status(404).type("text/plain").send("Admin resource not found.");
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled server error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: safeClientError(err) });
    }
  });

  return app;
}