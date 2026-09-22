import { get, ref, update } from "firebase/database";
import { auth, rtdb } from "./firebase";
import {
  buildReferralLink,
  referralCodeFromUid,
} from "./referral";
import { getSiteOrigin } from "./siteOrigin";

export interface ReferralDashboard {
  code: string;
  link: string;
  stats: {
    signups: number;
    purchases: number;
    creditsEarned: number;
  };
}

async function loadReferralDashboardClient(
  uid: string,
  email: string
): Promise<ReferralDashboard> {
  const userRef = ref(rtdb, `users/${uid}`);
  const snap = await get(userRef);
  const user = snap.val() || {};

  let code = typeof user.referralCode === "string" ? user.referralCode : "";
  if (!code) {
    code = referralCodeFromUid(uid);
    await update(userRef, {
      referralCode: code,
      referralStats: user.referralStats || {
        signups: 0,
        purchases: 0,
        creditsEarned: 0,
      },
    });
  }

  const stats = user.referralStats || { signups: 0, purchases: 0, creditsEarned: 0 };
  return {
    code,
    link: buildReferralLink(code, getSiteOrigin()),
    stats: {
      signups: stats.signups || 0,
      purchases: stats.purchases || 0,
      creditsEarned: stats.creditsEarned || 0,
    },
  };
}

export async function fetchReferralDashboard(idToken: string): Promise<ReferralDashboard> {
  const origin = getSiteOrigin();
  try {
    const res = await fetch("/api/referral/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken, origin }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data?.ok) {
      return {
        code: data.code,
        link: data.link || buildReferralLink(data.code, origin),
        stats: data.stats || { signups: 0, purchases: 0, creditsEarned: 0 },
      };
    }
  } catch {
    /* fall through to client-side profile */
  }

  const user = auth.currentUser;
  if (!user?.uid) {
    throw new Error("Sign in to view your referral link.");
  }
  return loadReferralDashboardClient(user.uid, user.email || "");
}

export async function claimReferralSignup(idToken: string, code: string): Promise<{
  creditsGranted: number;
}> {
  const res = await fetch("/api/referral/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Could not apply referral.");
  }
  return { creditsGranted: data.creditsGranted || 0 };
}