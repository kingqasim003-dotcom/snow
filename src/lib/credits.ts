import type { UserProfile } from "../types";

export type CreditAction = "enhance" | "compress" | "grammar" | "score";
export type StoragePlan = "free" | "pro" | "polar" | "unlimited";

export const CREDIT_COSTS: Record<CreditAction, number> = {
  enhance: 2,
  compress: 1,
  grammar: 1,
  score: 0,
};

export const PLAN_ALLOWANCE: Record<StoragePlan, number> = {
  free: 10,
  pro: 100,
  polar: 100,
  unlimited: Infinity,
};

export const PLAN_LABELS: Record<StoragePlan, string> = {
  free: "Free Plan",
  pro: "Polar Pro",
  polar: "Polar Plan",
  unlimited: "Unlimited Plan",
};

export interface CreditsRecord {
  month: string;
  used: number;
  purchased: number;
}

export interface CreditStatus {
  allowed: boolean;
  plan: StoragePlan;
  planLabel: string;
  used: number;
  remaining: number;
  limit: number;
  purchased: number;
  totalPool: number | "∞";
  cost: number;
  month: string;
  message: string;
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export function normalizePlan(plan?: string | null): StoragePlan {
  if (plan === "pro" || plan === "polar") return "polar";
  if (plan === "unlimited") return "unlimited";
  return "free";
}

export function toWebsitePlan(plan: StoragePlan): UserProfile["plan"] {
  if (plan === "polar") return "pro";
  if (plan === "unlimited") return "unlimited";
  return "free";
}

export function fromWebsitePlan(plan: UserProfile["plan"]): StoragePlan {
  return normalizePlan(plan);
}

function readCreditsStore(): Record<string, CreditsRecord> {
  try {
    const raw = localStorage.getItem("snowbear_credits");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeCreditsStore(store: Record<string, CreditsRecord>) {
  localStorage.setItem("snowbear_credits", JSON.stringify(store));
}

export function getCreditsRecord(uid: string): CreditsRecord {
  const month = monthKey();
  const entry = readCreditsStore()[uid];
  if (!entry || entry.month !== month) {
    return { month, used: 0, purchased: entry?.purchased || 0 };
  }
  return { month: entry.month, used: entry.used || 0, purchased: entry.purchased || 0 };
}

export function setCreditsRecord(uid: string, record: CreditsRecord) {
  const store = readCreditsStore();
  store[uid] = record;
  writeCreditsStore(store);
}

export function getCreditStatus(uid: string | null, plan: UserProfile["plan"], action?: CreditAction): CreditStatus {
  const normalized = fromWebsitePlan(plan);
  const allowance = PLAN_ALLOWANCE[normalized];
  const cost = action ? CREDIT_COSTS[action] : 0;

  if (!uid) {
    return {
      allowed: false,
      plan: "free",
      planLabel: PLAN_LABELS.free,
      used: 0,
      remaining: 0,
      limit: PLAN_ALLOWANCE.free,
      purchased: 0,
      totalPool: PLAN_ALLOWANCE.free,
      cost,
      month: monthKey(),
      message: "Please sign in first.",
    };
  }

  const record = getCreditsRecord(uid);
  const totalPool = normalized === "unlimited" ? Infinity : allowance + record.purchased;
  const remaining = normalized === "unlimited" ? Infinity : Math.max(0, totalPool - record.used);

  if (normalized === "unlimited" || cost === 0) {
    return {
      allowed: true,
      plan: normalized,
      planLabel: PLAN_LABELS[normalized],
      used: record.used,
      remaining,
      limit: allowance,
      purchased: record.purchased,
      totalPool: normalized === "unlimited" ? "∞" : totalPool,
      cost,
      month: record.month,
      message: "",
    };
  }

  const allowed = remaining >= cost;
  return {
    allowed,
    plan: normalized,
    planLabel: PLAN_LABELS[normalized],
    used: record.used,
    remaining,
    limit: allowance,
    purchased: record.purchased,
    totalPool,
    cost,
    month: record.month,
    message: allowed
      ? ""
      : `Not enough credits. This action needs ${cost} credit${cost > 1 ? "s" : ""}. You have ${remaining} left this month.`,
  };
}

export function consumeCredits(uid: string, plan: UserProfile["plan"], action: CreditAction): CreditStatus & { consumed: boolean } {
  const status = getCreditStatus(uid, plan, action);
  if (!status.allowed) return { ...status, consumed: false };

  const cost = CREDIT_COSTS[action];
  if (status.plan === "unlimited" || cost === 0) {
    return { ...status, consumed: true };
  }

  const record = getCreditsRecord(uid);
  record.used += cost;
  setCreditsRecord(uid, record);
  window.dispatchEvent(new CustomEvent("snowbear-credits-updated"));

  let email = "";
  try {
    const profile = JSON.parse(localStorage.getItem("snowbear_profile") || "{}");
    if (profile.id === uid) email = profile.email || "";
  } catch { /* ignore */ }

  void import("./rtdbUsers").then(({ syncCreditsToRtdb }) =>
    syncCreditsToRtdb(uid, record, email).catch(console.error)
  );

  try {
    const profile = JSON.parse(localStorage.getItem("snowbear_profile") || "{}");
    if (profile.id === uid || !profile.id) {
      window.dispatchEvent(new CustomEvent("snowbear-sync-ready"));
    }
  } catch { /* ignore */ }

  const refreshed = getCreditStatus(uid, plan, action);
  return { ...refreshed, consumed: true };
}

export function mergeCreditsRecords(a: CreditsRecord, b: CreditsRecord): CreditsRecord {
  const month = monthKey();
  const normalize = (entry: CreditsRecord): CreditsRecord =>
    entry.month === month ? entry : { month, used: 0, purchased: entry.purchased || 0 };

  const left = normalize(a);
  const right = normalize(b);
  return {
    month,
    used: Math.max(left.used, right.used),
    purchased: Math.max(left.purchased, right.purchased),
  };
}