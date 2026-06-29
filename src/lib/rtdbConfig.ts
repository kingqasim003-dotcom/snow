import { get, onValue, ref, set, type Unsubscribe } from "firebase/database";
import { rtdb } from "./rtdb";
import type { PaymentInstructions } from "../types";

export const DEFAULT_PAYMENT_INSTRUCTIONS: PaymentInstructions = {
  bank: {
    title: "Pay with Bank Transfer",
    details:
      "ACCOUNT TITLE\nSnowBear AI — Qasim Sialvi\n\nBANK\nMeezan Bank\n\nACCOUNT NUMBER\n0123-4567890-1\n\nIBAN\nPK00MEZN00012345678901\n\nSWIFT / BIC\nMEZNPKKA\n\nSend the exact USD amount shown above. Keep your bank receipt — you will upload it on this page.",
  },
  crypto: {
    title: "Pay with Crypto (USDT)",
    details:
      "NETWORK\nTRON (TRC20) only\n\nWALLET ADDRESS\nTXyzSnowBearWalletAddress123\n\nCOIN\nUSDT (Tether)\n\nSend the exact amount from Binance, OKX, or any exchange. Screenshot your withdrawal confirmation — you will upload it below.",
  },
  jazzcash: {
    title: "Pay with JazzCash",
    details:
      "ACCOUNT TITLE\nSnowBear AI — Qasim Sialvi\n\nJAZZCASH NUMBER\n0300-1234567\n\nSend the exact amount via JazzCash app. Save the transaction ID and screenshot — you will upload proof below.",
  },
};

export function listenPaymentInstructions(
  onChange: (instructions: PaymentInstructions) => void
): Unsubscribe {
  return onValue(ref(rtdb, "config/paymentInstructions"), (snap) => {
    onChange(snap.val() || DEFAULT_PAYMENT_INSTRUCTIONS);
  });
}

export async function savePaymentInstructions(instructions: PaymentInstructions): Promise<void> {
  await set(ref(rtdb, "config/paymentInstructions"), instructions);
}

export async function getPaymentInstructions(): Promise<PaymentInstructions> {
  const snap = await get(ref(rtdb, "config/paymentInstructions"));
  return snap.val() || DEFAULT_PAYMENT_INSTRUCTIONS;
}