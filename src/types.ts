export interface PromptItem {
  id: string;
  original: string;
  improved: string;
  type: "enhance" | "compress" | "grammar" | "score";
  score?: number;
  suggestions?: string[];
  date: string;
  model?: string;
}

export type Category = "All" | "Writing" | "Coding" | "Marketing" | "Business" | "Image Generation";

export interface TemplateItem {
  id: string;
  title: string;
  description: string;
  category: Category;
  promptText: string;
}

export interface UserProfile {
  id: string;
  email: string;
  plan: "free" | "pro" | "unlimited";
  planExpiresAt?: number | null;
  planBillingCycle?: "monthly" | "yearly" | null;
}

export type PaymentMethod = "bank" | "crypto" | "jazzcash";
export type OrderStatus = "pending" | "approved" | "rejected";

export interface RtdbCredits {
  month: string;
  used: number;
  purchased: number;
}

export interface ReferralStats {
  signups: number;
  purchases: number;
  creditsEarned: number;
}

export interface RtdbUser {
  email: string;
  plan: UserProfile["plan"];
  createdAt: number;
  planUpdatedAt?: number;
  planExpiresAt?: number | null;
  planBillingCycle?: "monthly" | "yearly" | null;
  referralCode?: string;
  referredByUid?: string | null;
  referredByCode?: string | null;
  referredAt?: number | null;
  referralStats?: ReferralStats;
  credits: RtdbCredits;
  /** @deprecated no longer written — legacy reads only */
  lastSeenAt?: number;
  extensionSyncAt?: number;
  extensionConnected?: boolean;
  websiteSyncAt?: number;
}

export type OrderType = "credits" | "plan";

export interface CheckoutOrder {
  id: string;
  orderType: OrderType;
  uid: string;
  email: string;
  packId: string;
  label: string;
  credits?: number;
  plan?: UserProfile["plan"];
  billingCycle?: "monthly" | "yearly";
  amountUsd: number;
  paymentMethod: PaymentMethod;
  paymentNote: string;
  payerName?: string;
  payerPhone?: string;
  receiptUrl?: string;
  status: OrderStatus;
  createdAt: number;
  reviewedAt?: number;
  reviewedBy?: string;
  approvedPlan?: UserProfile["plan"];
  approvedBillingCycle?: "monthly" | "yearly";
}

/** @deprecated use CheckoutOrder */
export type CreditOrder = CheckoutOrder;

export interface PromoCode {
  code: string;
  credits: number;
  active: boolean;
  createdAt: number;
  createdBy: string;
  usedByUid?: string | null;
  usedByEmail?: string | null;
  usedAt?: number | null;
}

export interface PaymentInstructions {
  bank: { title: string; details: string };
  crypto: { title: string; details: string };
  jazzcash: { title: string; details: string };
}
