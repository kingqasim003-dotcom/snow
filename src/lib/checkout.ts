import { getCreditPack } from "../data/creditPacks";
import { getPlanPack, getPlanPackByQuery } from "../data/planPacks";
import type { OrderType } from "../types";

export interface CheckoutItem {
  orderType: OrderType;
  packId: string;
  label: string;
  amountUsd: number;
  credits?: number;
  plan?: "pro" | "unlimited";
  billingCycle?: "monthly" | "yearly";
  subtitle: string;
  backPath: string;
}

export function resolveCheckoutItem(
  packId: string | null,
  plan: string | null,
  cycle: string | null
): CheckoutItem | null {
  if (packId) {
    const pack = getCreditPack(packId);
    if (!pack) return null;
    return {
      orderType: "credits",
      packId: pack.id,
      label: pack.label,
      amountUsd: pack.priceUsd,
      credits: pack.credits,
      subtitle: `${pack.credits} bonus credits · Manual admin verification`,
      backPath: "/credits",
    };
  }

  const planPack = getPlanPackByQuery(plan, cycle) || (plan ? getPlanPack(plan) : undefined);
  if (!planPack || planPack.plan === "free") return null;

  return {
    orderType: "plan",
    packId: planPack.id,
    label: planPack.label,
    amountUsd: planPack.priceUsd,
    plan: planPack.plan,
    billingCycle: planPack.billingCycle,
    subtitle: planPack.description,
    backPath: "/pricing",
  };
}