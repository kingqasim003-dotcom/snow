import type { Request, Response, NextFunction } from "express";

const MAX_PROMPT_LENGTH = 10_000;
const ALLOWED_TARGET_MODELS = new Set(["ChatGPT", "Claude", "Gemini", "Grok"]);

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function getAllowedOrigins(): string[] {
  const configured = process.env.ALLOWED_ORIGINS?.trim();
  if (configured) {
    return configured.split(",").map((origin) => origin.trim()).filter(Boolean);
  }
  if (process.env.NODE_ENV === "production") {
    return ["https://snowbear.online", "https://www.snowbear.online"];
  }
  return ["http://localhost:3000", "http://127.0.0.1:3000"];
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction): void {
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

export function corsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const origin = req.headers.origin;
  const allowedOrigins = getAllowedOrigins();

  const isAllowed =
    !origin ||
    allowedOrigins.includes(origin) ||
    origin.startsWith("chrome-extension://");

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

export function createRateLimiter(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
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

export function validatePrompt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PROMPT_LENGTH) return null;
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(trimmed)) return null;
  return trimmed;
}

export function validateTargetModel(value: unknown): string | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return undefined;
  return ALLOWED_TARGET_MODELS.has(value) ? value : undefined;
}

export function validateBackendOrigin(value: unknown, fallback: string): string {
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

export function safeClientError(err: unknown): string {
  if (process.env.NODE_ENV !== "production" && err instanceof Error) {
    return err.message;
  }
  return "Request failed. Please try again later.";
}