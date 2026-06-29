import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();
import fs from "fs";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { buildAdminConfigScript } from "./server/adminConfig";
import { callGroqChatCompletion } from "./server/groq";
import { buildExtensionZip } from "./server/extensionZip";
import { redeemPromoForUser } from "./server/promoRedeem";
import {
  claimReferralSignup,
  getReferralDashboard,
  grantReferralPurchaseReward,
} from "./server/referral";
import { getAdminToken, rtdbRequest } from "./server/firebaseAdmin";
import { uploadImageToImgbb } from "./server/imgbb";
import {
  corsMiddleware,
  createRateLimiter,
  safeClientError,
  securityHeaders,
  validateBackendOrigin,
  validatePrompt,
  validateTargetModel,
} from "./server/security";

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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === "production";
  const HOST = process.env.HOST || (isProd ? "0.0.0.0" : "127.0.0.1");

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
        const url = await uploadImageToImgbb(image, typeof req.body?.name === "string" ? req.body.name : undefined);
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
  app.use(["/api/enhance", "/api/compress", "/api/grammar", "/api/score"], createRateLimiter(15, 60_000));

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // API Route - Enhance Prompt
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

  // API Route - Compress Prompt (Token Saver)
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

  // API Route - Grammar Fix
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

  // API Route - Prompt Score & Suggestions
  app.post("/api/score", async (req, res) => {
    const prompt = validatePrompt(req.body?.prompt);
    if (!prompt) {
      return res.status(400).json({ error: "A valid prompt is required (max 10,000 characters)." });
    }

    try {
      const systemInstruction = "Analyze the provided prompt for quality, detail, specificity, constraints, and context. Calculate a score from 0 to 100 where 100 is a flawless, context-rich, instruction-clear prompt, and 0 is extremely vague. Generate 3 to 5 clear, actionable bullet-point suggestions to improve the prompt. Return your response as a strict JSON object with fields 'score' (integer) and 'suggestions' (array of strings).";
      const result = await callGroqChatCompletion({
        systemInstruction,
        userPrompt: `Analyze this prompt and rate its quality:\n\n${prompt}`,
        temperature: 0.3,
        jsonMode: true
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
    const referredUid = typeof req.body?.referredUid === "string" ? req.body.referredUid.trim() : "";
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

  // API Route - Download Chrome Extension ZIP Package
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

  // Standalone admin panel — password gate at /lop (not linked from main site)
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

  // Setup Vite development server or production static serving
  if (!isProd) {
    console.log("Setting up Vite in middleware mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving production static assets from /dist...");
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

  app.listen(PORT, HOST, () => {
    console.log(`SnowBear server running on http://${HOST}:${PORT}`);
    if (fs.existsSync(path.join(adminPanelDir, "index.html"))) {
      console.log(`Admin panel: http://${HOST === "0.0.0.0" ? "localhost" : HOST}:${PORT}/lop/`);
    }
  });
}

startServer().catch((error) => {
  console.error("Failed to start SnowBear server:", error);
});
