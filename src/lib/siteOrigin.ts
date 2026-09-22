/** Canonical public site URL for referral links and auth return paths. */
export function getSiteOrigin(): string {
  const configured = import.meta.env.VITE_SITE_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const host = window.location.hostname;
  if (host === "localhost" || host === "127.0.0.1") {
    return window.location.origin;
  }

  return "https://www.snowbear.online";
}