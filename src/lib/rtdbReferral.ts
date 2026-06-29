export interface ReferralDashboard {
  code: string;
  link: string;
  stats: {
    signups: number;
    purchases: number;
    creditsEarned: number;
  };
}

export async function fetchReferralDashboard(idToken: string): Promise<ReferralDashboard> {
  const res = await fetch("/api/referral/me", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken, origin: window.location.origin }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "Could not load referral link.");
  }
  return data as ReferralDashboard;
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