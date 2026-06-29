import {
  onValue,
  ref,
  set,
  update,
  get,
  type DataSnapshot,
  type Unsubscribe,
} from "firebase/database";
import { auth, rtdb, monthKey } from "./firebase";

import { setCreditsRecord, getCreditsRecord } from "./credits";
import {
  effectiveUserPlan,
  isPlanExpired,
  planExpiresAtFromBilling,
  type PlanBillingCycle,
} from "./planExpiry";
import type { RtdbCredits, RtdbUser, UserProfile } from "../types";

async function waitForAuthMatch(uid: string): Promise<void> {
  for (let i = 0; i < 30; i++) {
    if (auth.currentUser?.uid === uid) {
      await auth.currentUser.getIdToken();
      return;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  if (auth.currentUser?.uid !== uid) {
    throw new Error("Sign-in required before saving profile to database.");
  }
}

function defaultCredits(): RtdbCredits {
  const month = monthKey();
  return { month, used: 0, purchased: 0 };
}

async function readRtdbUser(uid: string): Promise<(RtdbUser & { uid: string }) | null> {
  const snap = await get(ref(rtdb, `users/${uid}`));
  if (!snap.exists()) return null;
  return { uid, ...(snap.val() as RtdbUser) };
}

/** Downgrade paid plan to free when subscription period ends. */
export async function expireUserPlanIfNeeded(uid: string, user?: RtdbUser | null): Promise<boolean> {
  const record = user || (await readRtdbUser(uid));
  if (!record) return false;

  const plan = record.plan || "free";
  if (plan === "free" || !isPlanExpired(record.planExpiresAt)) return false;

  await adminApplyUserPlan(uid, "free");
  return true;
}

export interface UserPlanState {
  plan: UserProfile["plan"];
  planExpiresAt?: number | null;
  planBillingCycle?: "monthly" | "yearly" | null;
}

function resolveUserPlanState(user: RtdbUser): UserPlanState {
  const plan = effectiveUserPlan(user.plan, user.planExpiresAt);
  return {
    plan,
    planExpiresAt: plan === "free" ? null : user.planExpiresAt ?? null,
    planBillingCycle: plan === "free" ? null : user.planBillingCycle ?? null,
  };
}

/** Create or repair user record — runs on every login so admin sees users immediately. */
export async function ensureUserRecord(user: UserProfile): Promise<void> {
  if (!user.id || !user.email?.includes("@")) return;
  await waitForAuthMatch(user.id);

  const userRef = ref(rtdb, `users/${user.id}`);
  const snap = await get(userRef);
  const existingData = snap.exists() ? (snap.val() as RtdbUser) : null;
  if (existingData) await expireUserPlanIfNeeded(user.id, existingData);
  const credits = defaultCredits();

  if (!snap.exists()) {
    await set(userRef, {
      email: user.email,
      plan: user.plan || "free",
      createdAt: Date.now(),
      credits,
    });
    setCreditsRecord(user.id, credits);
    return;
  }

  const existing = snap.val() as Partial<RtdbUser>;
  const patch: Record<string, unknown> = {};

  if (user.email && existing.email !== user.email) patch.email = user.email;
  if (!existing.plan) patch.plan = user.plan || "free";
  if (!existing.createdAt) patch.createdAt = Date.now();

  if (!existing.credits) {
    await set(ref(rtdb, `users/${user.id}/credits`), credits);
  }

  if (Object.keys(patch).length) {
    await update(userRef, patch);
  }
}

export async function registerUserIfNeeded(user: UserProfile): Promise<void> {
  await ensureUserRecord(user);
}

/** Write credits — ensures parent user record exists first. */
export async function syncCreditsToRtdb(uid: string, credits?: RtdbCredits, email?: string): Promise<void> {
  if (!uid) return;
  await ensureUserRecord({
    id: uid,
    email: email || auth.currentUser?.email || "",
    plan: "free",
  });

  const month = monthKey();
  const record = credits || getCreditsRecord(uid);
  const payload: RtdbCredits = {
    month: record.month || month,
    used: record.used || 0,
    purchased: record.purchased || 0,
  };
  await set(ref(rtdb, `users/${uid}/credits`), payload);
}

/** @deprecated Use ensureUserRecord */
export async function upsertUserProfile(user: UserProfile): Promise<void> {
  await ensureUserRecord(user);
}

function mergeCredits(remote: RtdbCredits | undefined, local: RtdbCredits): RtdbCredits {
  const month = monthKey();
  const norm = (c: RtdbCredits) =>
    c.month === month ? c : { month, used: 0, purchased: c.purchased || 0 };

  const r = norm(remote || { month, used: 0, purchased: 0 });
  const l = norm(local);
  return {
    month,
    used: Math.max(r.used, l.used),
    purchased: Math.max(r.purchased, l.purchased),
  };
}

export function listenUserCredits(
  uid: string,
  onChange: (credits: RtdbCredits) => void
): Unsubscribe {
  return onValue(ref(rtdb, `users/${uid}/credits`), (snap) => {
    const val = snap.val() as RtdbCredits | null;
    if (val) onChange(val);
  });
}

export function applyRemoteCreditsToLocal(uid: string, credits: RtdbCredits): boolean {
  const current = getCreditsRecord(uid);
  const month = monthKey();
  const remoteNorm =
    credits.month === month ? credits : { month, used: 0, purchased: credits.purchased || 0 };
  // RTDB is source of truth — admin resets must not be overridden by stale local purchased/used.
  const next: RtdbCredits = {
    month: remoteNorm.month || month,
    used: remoteNorm.used || 0,
    purchased: remoteNorm.purchased || 0,
  };
  if (
    next.used === current.used &&
    next.purchased === current.purchased &&
    next.month === current.month
  ) {
    return false;
  }
  setCreditsRecord(uid, next);
  return true;
}

export async function setUserPlan(uid: string, plan: UserProfile["plan"]): Promise<void> {
  await adminApplyUserPlan(uid, plan);
}

export function listenUserPlan(
  uid: string,
  onChange: (state: UserPlanState) => void
): Unsubscribe {
  return onValue(ref(rtdb, `users/${uid}`), (snap) => {
    void (async () => {
      const raw = snap.val() as RtdbUser | null;
      if (!raw) return;
      await expireUserPlanIfNeeded(uid, raw);
      const fresh = (await readRtdbUser(uid)) || raw;
      onChange(resolveUserPlanState(fresh));
    })();
  });
}

export async function fetchUserPlan(uid: string): Promise<UserPlanState | null> {
  const record = await readRtdbUser(uid);
  if (!record) return null;
  await expireUserPlanIfNeeded(uid, record);
  const fresh = (await readRtdbUser(uid)) || record;
  return resolveUserPlanState(fresh);
}

export async function addPurchasedCredits(uid: string, amount: number): Promise<RtdbCredits> {
  const creditsRef = ref(rtdb, `users/${uid}/credits`);
  const snap = await get(creditsRef);
  const month = monthKey();
  const current = (snap.val() as RtdbCredits) || { month, used: 0, purchased: 0 };
  const next: RtdbCredits = {
    month: current.month === month ? current.month : month,
    used: current.month === month ? current.used || 0 : 0,
    purchased: (current.month === month ? current.purchased || 0 : current.purchased || 0) + amount,
  };
  await set(creditsRef, next);
  setCreditsRecord(uid, next);
  return next;
}

export interface UserStats {
  total: number;
  free: number;
  pro: number;
  unlimited: number;
  extensionOnline: number;
}

const EMPTY_STATS: UserStats = {
  total: 0,
  free: 0,
  pro: 0,
  unlimited: 0,
  extensionOnline: 0,
};

function scanUsers(
  snap: DataSnapshot,
  includeList: boolean
): { stats: UserStats; users: Array<RtdbUser & { uid: string }> } {
  const stats: UserStats = { total: 0, free: 0, pro: 0, unlimited: 0, extensionOnline: 0 };
  const users: Array<RtdbUser & { uid: string }> = [];
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;

  snap.forEach((child) => {
    const u = child.val() as RtdbUser;
    stats.total += 1;
    const plan = effectiveUserPlan(u.plan, u.planExpiresAt);
    if (plan === "unlimited") stats.unlimited += 1;
    else if (plan === "pro") stats.pro += 1;
    else stats.free += 1;
    if (u.extensionConnected && u.extensionSyncAt && u.extensionSyncAt > fiveMinAgo) {
      stats.extensionOnline += 1;
    }
    if (includeList) {
      users.push({ uid: child.key!, ...u });
    }
  });

  if (includeList) {
    users.sort((a, b) => (b.planUpdatedAt || b.createdAt || 0) - (a.planUpdatedAt || a.createdAt || 0));
  }

  return { stats, users };
}

export function listenUserStats(onChange: (stats: UserStats) => void): Unsubscribe {
  return onValue(ref(rtdb, "users"), (snap) => {
    onChange(scanUsers(snap, false).stats);
  });
}

export function listenAllUsers(onChange: (users: Array<RtdbUser & { uid: string }>) => void): Unsubscribe {
  return onValue(ref(rtdb, "users"), (snap) => {
    onChange(scanUsers(snap, true).users);
  });
}

/** One-shot read — use only when listeners are not active. */
export async function fetchUsersAdmin(): Promise<{
  stats: UserStats;
  users: Array<RtdbUser & { uid: string }>;
}> {
  const snap = await get(ref(rtdb, "users"));
  if (!snap.exists()) return { stats: { ...EMPTY_STATS }, users: [] };
  return scanUsers(snap, true);
}

export function listenUsersAdmin(
  onStats: (stats: UserStats) => void,
  onUsers: (users: Array<RtdbUser & { uid: string }>) => void,
  onError?: (message: string) => void
): Unsubscribe {
  return onValue(
    ref(rtdb, "users"),
    (snap) => {
      if (!snap.exists()) {
        onStats({ ...EMPTY_STATS });
        onUsers([]);
        return;
      }
      const { stats, users } = scanUsers(snap, true);
      onStats(stats);
      onUsers(users);
    },
    (err) => onError?.(err.message || "Could not load users.")
  );
}

export async function adminSetUserPlan(uid: string, plan: UserProfile["plan"]): Promise<void> {
  await adminApplyUserPlan(uid, plan);
}

export interface ApplyUserPlanOptions {
  billingCycle?: PlanBillingCycle;
}

/** Admin or checkout approval — sets plan and resets monthly used for a fresh allowance. */
export async function adminApplyUserPlan(
  uid: string,
  plan: UserProfile["plan"],
  options?: ApplyUserPlanOptions
): Promise<void> {
  const month = monthKey();
  const creditsRef = ref(rtdb, `users/${uid}/credits`);
  const snap = await get(creditsRef);
  const current = (snap.val() as RtdbCredits) || { month, used: 0, purchased: 0 };
  const next: RtdbCredits = {
    month,
    used: 0,
    purchased: current.purchased || 0,
  };

  const now = Date.now();
  const patch: Record<string, unknown> = {
    plan,
    planUpdatedAt: now,
  };

  if (plan === "free") {
    patch.planExpiresAt = null;
    patch.planBillingCycle = null;
  } else if (options?.billingCycle) {
    patch.planExpiresAt = planExpiresAtFromBilling(options.billingCycle, now);
    patch.planBillingCycle = options.billingCycle;
  } else {
    patch.planExpiresAt = null;
    patch.planBillingCycle = null;
  }

  await update(ref(rtdb, `users/${uid}`), patch);
  await set(creditsRef, next);
  setCreditsRecord(uid, next);
}

export async function adminGrantCredits(uid: string, amount: number): Promise<RtdbCredits> {
  return addPurchasedCredits(uid, amount);
}

export async function adminSetCreditsUsed(uid: string, used: number): Promise<void> {
  const creditsRef = ref(rtdb, `users/${uid}/credits`);
  const snap = await get(creditsRef);
  const month = monthKey();
  const current = (snap.val() as RtdbCredits) || { month, used: 0, purchased: 0 };
  const next: RtdbCredits = {
    month: current.month === month ? current.month : month,
    used: Math.max(0, used),
    purchased: current.month === month ? current.purchased || 0 : current.purchased || 0,
  };
  await set(creditsRef, next);
  setCreditsRecord(uid, next);
}