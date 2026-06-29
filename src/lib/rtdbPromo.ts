import { get, ref } from "firebase/database";
import { auth } from "./firebase";
import { rtdb } from "./rtdb";
import { setCreditsRecord, getCreditsRecord } from "./credits";
import type { RtdbCredits } from "../types";

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Safe RTDB path key for a promo code */
export function promoPathKey(code: string): string {
  return normalizeCode(code).replace(/[.#$[\]/]/g, "");
}

async function redeemViaServerApi(
  rawCode: string,
  uid: string
): Promise<{ credits: number; code: string } | null> {
  const user = auth.currentUser;
  if (!user || user.uid !== uid) return null;
  const idToken = await user.getIdToken().catch(() => null);
  if (!idToken) return null;

  const res = await fetch("/api/redeem-promo", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, code: rawCode }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Could not redeem code.");
  }
  return { credits: data.credits, code: data.code };
}

export async function redeemPromoCode(
  uid: string,
  email: string,
  rawCode: string
): Promise<{ credits: number; code: string }> {
  const code = normalizeCode(rawCode);
  if (!code || code.length < 4) throw new Error("Enter a valid promo code.");

  const viaApi = await redeemViaServerApi(rawCode, uid).catch((err) => {
    throw err instanceof Error ? err : new Error("Could not redeem code.");
  });
  if (viaApi) {
    try {
      const creditsRef = ref(rtdb, `users/${uid}/credits`);
      const remote = (await get(creditsRef)).val() as RtdbCredits | null;
      if (remote) setCreditsRecord(uid, remote);
      else {
        const local = getCreditsRecord(uid);
        setCreditsRecord(uid, { ...local, purchased: local.purchased + viaApi.credits });
      }
    } catch {
      const local = getCreditsRecord(uid);
      setCreditsRecord(uid, { ...local, purchased: local.purchased + viaApi.credits });
    }
    return viaApi;
  }

  throw new Error("Sign in and try again.");
}