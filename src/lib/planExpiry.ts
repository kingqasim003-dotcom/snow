import type { UserProfile } from "../types";

export type PlanBillingCycle = "monthly" | "yearly";

const DAY_MS = 24 * 60 * 60 * 1000;

export const PLAN_DURATION_MS: Record<PlanBillingCycle, number> = {
  monthly: 30 * DAY_MS,
  yearly: 365 * DAY_MS,
};

export function planExpiresAtFromBilling(
  billingCycle: PlanBillingCycle,
  from = Date.now()
): number {
  return from + PLAN_DURATION_MS[billingCycle];
}

export function effectiveUserPlan(
  plan: UserProfile["plan"] | undefined,
  planExpiresAt?: number | null
): UserProfile["plan"] {
  const normalized = plan || "free";
  if (normalized === "free") return "free";
  if (typeof planExpiresAt !== "number") return normalized;
  return Date.now() >= planExpiresAt ? "free" : normalized;
}

export function isPlanExpired(planExpiresAt?: number | null): boolean {
  return typeof planExpiresAt === "number" && Date.now() >= planExpiresAt;
}

export function formatPlanExpiry(planExpiresAt?: number | null): string | null {
  if (typeof planExpiresAt !== "number") return null;
  return new Date(planExpiresAt).toLocaleString();
}