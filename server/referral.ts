import { getAdminToken, rtdbRequest, verifyUserToken } from "./firebaseAdmin";

export const REFERRAL_SIGNUP_CREDITS = 50;
export const REFERRAL_PURCHASE_CREDITS = 20;
const SIGNUP_CLAIM_WINDOW_MS = 2 * 60 * 60 * 1000;

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function referralCodeFromUid(uid: string): string {
  let h = 0;
  for (let i = 0; i < uid.length; i++) {
    h = (Math.imul(31, h) + uid.charCodeAt(i)) >>> 0;
  }
  const segment = h.toString(36).toUpperCase().slice(0, 6).padStart(6, "0");
  return `SB-${segment}`;
}

type ReferralCodeRow = { uid?: string; email?: string; createdAt?: number };
type ReferralStats = { signups?: number; purchases?: number; creditsEarned?: number };
type UserRow = {
  email?: string;
  createdAt?: number;
  referralCode?: string;
  referredByUid?: string | null;
  referralStats?: ReferralStats;
  credits?: { month?: string; used?: number; purchased?: number };
};

async function addPurchasedCreditsAdmin(
  uid: string,
  amount: number,
  adminToken: string
): Promise<void> {
  const month = monthKey();
  let current: UserRow["credits"] | null = null;
  try {
    current = await rtdbRequest<UserRow["credits"]>("GET", `users/${uid}/credits`, adminToken);
  } catch {
    current = null;
  }
  const normalized =
    current && current.month === month
      ? current
      : { month, used: 0, purchased: current?.purchased || 0 };
  await rtdbRequest("PUT", `users/${uid}/credits`, adminToken, {
    month: normalized.month || month,
    used: normalized.used || 0,
    purchased: (normalized.purchased || 0) + amount,
  });
}

async function bumpReferralStats(
  referrerUid: string,
  patch: Partial<ReferralStats>,
  adminToken: string
): Promise<void> {
  const user = await rtdbRequest<UserRow>("GET", `users/${referrerUid}`, adminToken);
  const stats = user?.referralStats || { signups: 0, purchases: 0, creditsEarned: 0 };
  await rtdbRequest("PATCH", `users/${referrerUid}`, adminToken, {
    referralStats: {
      signups: (stats.signups || 0) + (patch.signups || 0),
      purchases: (stats.purchases || 0) + (patch.purchases || 0),
      creditsEarned: (stats.creditsEarned || 0) + (patch.creditsEarned || 0),
    },
  });
}

export async function ensureReferralCodeForUser(
  uid: string,
  email: string
): Promise<string> {
  const adminToken = await getAdminToken();
  const user = await rtdbRequest<UserRow | null>("GET", `users/${uid}`, adminToken);
  if (user?.referralCode) return user.referralCode;

  const code = referralCodeFromUid(uid);
  const existing = await rtdbRequest<ReferralCodeRow | null>(
    "GET",
    `referralCodes/${code}`,
    adminToken
  );
  if (existing?.uid && existing.uid !== uid) {
    throw new Error("Could not allocate referral code. Try again.");
  }

  await rtdbRequest("PUT", `referralCodes/${code}`, adminToken, {
    uid,
    email,
    createdAt: Date.now(),
  });

  const profilePatch: Record<string, unknown> = { referralCode: code };
  if (!user?.referralStats) {
    profilePatch.referralStats = { signups: 0, purchases: 0, creditsEarned: 0 };
  }
  await rtdbRequest("PATCH", `users/${uid}`, adminToken, profilePatch);
  return code;
}

export async function getReferralDashboard(
  idToken: string,
  siteOrigin: string
): Promise<{
  code: string;
  link: string;
  stats: { signups: number; purchases: number; creditsEarned: number };
}> {
  const user = await verifyUserToken(idToken);
  const code = await ensureReferralCodeForUser(user.uid, user.email);
  const adminToken = await getAdminToken();
  const row = await rtdbRequest<UserRow>("GET", `users/${user.uid}`, adminToken);
  const stats = row?.referralStats || { signups: 0, purchases: 0, creditsEarned: 0 };
  const origin = siteOrigin.replace(/\/$/, "");
  return {
    code,
    link: `${origin}/?ref=${encodeURIComponent(code)}`,
    stats: {
      signups: stats.signups || 0,
      purchases: stats.purchases || 0,
      creditsEarned: stats.creditsEarned || 0,
    },
  };
}

export async function claimReferralSignup(
  idToken: string,
  rawCode: string
): Promise<{ ok: boolean; creditsGranted: number; referrerUid: string }> {
  const code = normalizeReferralCode(rawCode);
  if (!code || code.length < 4) {
    throw new Error("Invalid referral link.");
  }

  const user = await verifyUserToken(idToken);
  const adminToken = await getAdminToken();

  const mapping = await rtdbRequest<ReferralCodeRow | null>(
    "GET",
    `referralCodes/${code}`,
    adminToken
  );
  const referrerUid = mapping?.uid;
  if (!referrerUid) throw new Error("Referral link not found.");
  if (referrerUid === user.uid) throw new Error("You cannot use your own referral link.");

  const newUser = await rtdbRequest<UserRow>("GET", `users/${user.uid}`, adminToken);
  if (newUser?.referredByUid) {
    return { ok: true, creditsGranted: 0, referrerUid: newUser.referredByUid };
  }

  const createdAt = newUser?.createdAt || Date.now();
  if (Date.now() - createdAt > SIGNUP_CLAIM_WINDOW_MS) {
    throw new Error("Referral signup window expired for this account.");
  }

  let claim: { signupRewardAt?: number } | null = null;
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
    referredAt: Date.now(),
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
    signupCredits: REFERRAL_SIGNUP_CREDITS,
  });

  return { ok: true, creditsGranted: REFERRAL_SIGNUP_CREDITS, referrerUid };
}

export async function grantReferralPurchaseReward(
  referredUid: string,
  orderId: string
): Promise<{ granted: boolean; credits: number; referrerUid?: string }> {
  if (!referredUid || !orderId) return { granted: false, credits: 0 };

  const adminToken = await getAdminToken();
  const referred = await rtdbRequest<UserRow>("GET", `users/${referredUid}`, adminToken);
  const referrerUid = referred?.referredByUid;
  if (!referrerUid) return { granted: false, credits: 0 };

  const rewardKey = `${referredUid}_${orderId}`;
  let existing: { grantedAt?: number } | null = null;
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
    grantedAt: Date.now(),
  });

  return { granted: true, credits: REFERRAL_PURCHASE_CREDITS, referrerUid };
}