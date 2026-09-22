import type { UserProfile } from "../types";

export interface PlanPack {
  id: string;
  plan: UserProfile["plan"];
  billingCycle: "monthly" | "yearly";
  priceUsd: number;
  label: string;
  description: string;
}

export const PLAN_PACKS: PlanPack[] = [
  {
    id: "plan_pro_monthly",
    plan: "pro",
    billingCycle: "monthly",
    priceUsd: 4.99,
    label: "Polar Pro",
    description: "100 credits / month · Monthly billing",
  },
  {
    id: "plan_pro_yearly",
    plan: "pro",
    billingCycle: "yearly",
    priceUsd: 47.88,
    label: "Polar Pro",
    description: "100 credits / month · Yearly billing (save 20%)",
  },
  {
    id: "plan_unlimited_monthly",
    plan: "unlimited",
    billingCycle: "monthly",
    priceUsd: 19.99,
    label: "Unlimited",
    description: "Unlimited credits · Monthly billing",
  },
  {
    id: "plan_unlimited_yearly",
    plan: "unlimited",
    billingCycle: "yearly",
    priceUsd: 191.88,
    label: "Unlimited",
    description: "Unlimited credits · Yearly billing (save 20%)",
  },
];

export function getPlanPack(id: string): PlanPack | undefined {
  return PLAN_PACKS.find((p) => p.id === id);
}

export function getPlanPackByQuery(
  plan: string | null,
  cycle: string | null
): PlanPack | undefined {
  if (!plan || !cycle) return undefined;
  const normalizedPlan = plan === "polar" ? "pro" : plan;
  if (normalizedPlan !== "pro" && normalizedPlan !== "unlimited") return undefined;
  if (cycle !== "monthly" && cycle !== "yearly") return undefined;
  return PLAN_PACKS.find((p) => p.plan === normalizedPlan && p.billingCycle === cycle);
}

export function updatePlanPacksPrices(pricing: {
  polarMonthly: number;
  polarYearly: number;
  unlimitedMonthly: number;
  unlimitedYearly: number;
}) {
  const proMonthly = PLAN_PACKS.find((p) => p.id === "plan_pro_monthly");
  if (proMonthly) {
    proMonthly.priceUsd = pricing.polarMonthly;
  }
  const proYearly = PLAN_PACKS.find((p) => p.id === "plan_pro_yearly");
  if (proYearly) {
    proYearly.priceUsd = pricing.polarYearly;
  }
  const unlimitedMonthly = PLAN_PACKS.find((p) => p.id === "plan_unlimited_monthly");
  if (unlimitedMonthly) {
    unlimitedMonthly.priceUsd = pricing.unlimitedMonthly;
  }
  const unlimitedYearly = PLAN_PACKS.find((p) => p.id === "plan_unlimited_yearly");
  if (unlimitedYearly) {
    unlimitedYearly.priceUsd = pricing.unlimitedYearly;
  }
}