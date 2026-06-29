import {
  getAdminToken,
  rtdbRequest,
  serverConfig,
  verifyUserToken,
} from "./firebaseAdmin";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function promoPathKey(code: string): string {
  return normalizeCode(code).replace(/[.#$[\]/]/g, "");
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

type PromoRecord = {
  code?: string;
  credits?: number;
  active?: boolean;
  usedByUid?: string | null;
};

export async function redeemPromoForUser(
  userIdToken: string,
  rawCode: string
): Promise<{ credits: number; code: string; uid: string; email: string }> {
  const { apiKey, databaseUrl } = serverConfig();
  if (!apiKey || !databaseUrl) {
    throw new Error("Server Firebase config missing.");
  }

  const code = normalizeCode(rawCode);
  if (!code || code.length < 4) throw new Error("Enter a valid promo code.");

  const user = await verifyUserToken(userIdToken);
  const adminToken = await getAdminToken();

  let promo: PromoRecord | null = null;
  let promoKey = "";
  for (const key of [...new Set([promoPathKey(code), code])]) {
    try {
      const row = await rtdbRequest<PromoRecord | null>(
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
      /* try next key */
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
    active: false,
  });

  const month = monthKey();
  let current: { month?: string; used?: number; purchased?: number } | null = null;
  try {
    current = await rtdbRequest("GET", `users/${user.uid}/credits`, adminToken);
  } catch {
    current = null;
  }

  const normalized =
    current && current.month === month
      ? current
      : { month, used: 0, purchased: (current && current.purchased) || 0 };

  const nextCredits = {
    month: normalized.month || month,
    used: normalized.used || 0,
    purchased: (normalized.purchased || 0) + creditAmount,
  };

  let existing: Record<string, unknown> | null = null;
  try {
    existing = await rtdbRequest<Record<string, unknown> | null>("GET", `users/${user.uid}`, adminToken);
  } catch {
    existing = null;
  }

  if (!existing || typeof existing !== "object") {
    await rtdbRequest("PUT", `users/${user.uid}`, adminToken, {
      email: user.email,
      plan: "free",
      createdAt: now,
      credits: nextCredits,
    });
  } else {
    const profilePatch: Record<string, unknown> = {};
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