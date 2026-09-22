import type { UserProfile } from "../types";

export type PlanBillingCycle = "monthly" | "yearly";

/** Same clock time on the next calendar month or year (e.g. Mar 15 3:00pm → Apr 15 3:00pm). */
export function planExpiresAtFromBilling(
  billingCycle: PlanBillingCycle,
  from = Date.now()
): number {
  const d = new Date(from);
  if (billingCycle === "yearly") {
    d.setFullYear(d.getFullYear() + 1);
  } else {
    d.setMonth(d.getMonth() + 1);
  }
  return d.getTime();
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