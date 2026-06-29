const PENDING_REF_KEY = "snowbear_pending_ref";

export const REFERRAL_SIGNUP_CREDITS = 50;
export const REFERRAL_PURCHASE_CREDITS = 20;

export function normalizeReferralCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

/** Persist ?ref= from URL for attribution after Google sign-in. */
export function captureReferralFromUrl(search?: string): void {
  const params = new URLSearchParams(search ?? window.location.search);
  const ref = params.get("ref");
  if (ref) {
    localStorage.setItem(PENDING_REF_KEY, normalizeReferralCode(ref));
  }
}

export function getPendingReferralCode(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_REF_KEY);
    return raw ? normalizeReferralCode(raw) : null;
  } catch {
    return null;
  }
}

export function clearPendingReferralCode(): void {
  try {
    localStorage.removeItem(PENDING_REF_KEY);
  } catch {
    /* ignore */
  }
}

export function buildReferralLink(code: string, origin = window.location.origin): string {
  return `${origin.replace(/\/$/, "")}/?ref=${encodeURIComponent(code)}`;
}