import { get, onValue, push, ref, set, update, type Unsubscribe } from "firebase/database";
import { rtdb } from "./rtdb";
import { addPurchasedCredits, adminApplyUserPlan } from "./rtdbUsers";
import type { CheckoutOrder, OrderStatus, OrderType, PaymentMethod, UserProfile } from "../types";

/** Firebase RTDB rejects undefined values — omit those keys before write. */
function omitUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = {} as T;
  for (const key of Object.keys(obj) as (keyof T)[]) {
    const value = obj[key];
    if (value !== undefined) out[key] = value;
  }
  return out;
}

export async function createCheckoutOrder(input: {
  user: UserProfile;
  orderType: OrderType;
  packId: string;
  label: string;
  amountUsd: number;
  paymentMethod: PaymentMethod;
  paymentNote: string;
  payerName?: string;
  payerPhone?: string;
  receiptUrl?: string;
  credits?: number;
  plan?: UserProfile["plan"];
  billingCycle?: "monthly" | "yearly";
}): Promise<string> {
  const ordersRef = ref(rtdb, "orders");
  const newRef = push(ordersRef);
  const id = newRef.key!;
  const order = omitUndefined({
    orderType: input.orderType,
    uid: input.user.id,
    email: input.user.email,
    packId: input.packId,
    label: input.label,
    credits: input.credits,
    plan: input.plan,
    billingCycle: input.billingCycle,
    amountUsd: input.amountUsd,
    paymentMethod: input.paymentMethod,
    paymentNote: input.paymentNote.trim(),
    payerName: input.payerName?.trim(),
    payerPhone: input.payerPhone?.trim(),
    receiptUrl: input.receiptUrl?.trim(),
    status: "pending" as const,
    createdAt: Date.now(),
  });
  await set(newRef, order);
  return id;
}

export function listenOrders(onChange: (orders: CheckoutOrder[]) => void): Unsubscribe {
  return onValue(ref(rtdb, "orders"), (snap) => {
    const orders: CheckoutOrder[] = [];
    snap.forEach((child) => {
      const raw = child.val() as Omit<CheckoutOrder, "id">;
      orders.push({
        ...raw,
        id: child.key!,
        orderType: raw.orderType || "credits",
      });
    });
    orders.sort((a, b) => b.createdAt - a.createdAt);
    onChange(orders);
  });
}

export async function reviewOrder(
  orderId: string,
  status: Exclude<OrderStatus, "pending">,
  adminEmail: string
): Promise<void> {
  const orderRef = ref(rtdb, `orders/${orderId}`);
  const snap = await get(orderRef);
  if (!snap.exists()) throw new Error("Order not found.");

  const order = snap.val() as Omit<CheckoutOrder, "id">;
  if (order.status !== "pending") throw new Error("Order already reviewed.");

  await update(orderRef, {
    status,
    reviewedAt: Date.now(),
    reviewedBy: adminEmail,
  });

  if (status !== "approved") return;

  if (order.orderType === "plan" && order.plan) {
    await adminApplyUserPlan(order.uid, order.plan, {
      billingCycle: order.billingCycle,
    });
  } else {
    const credits = order.credits || 0;
    if (credits > 0) {
      await addPurchasedCredits(order.uid, credits);
    }
  }

  try {
    await fetch("/api/referral/purchase-reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referredUid: order.uid, orderId }),
    });
  } catch {
    /* non-fatal */
  }
}