import type { UserProfile } from "../types";

const PROFILE_KEY = "snowbear_profile";

export function loadSavedProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserProfile;
    if (!parsed?.id || !parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  if (!profile.id && !profile.email) return;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

/** Clears local session — only call on explicit sign-out. */
export function clearLocalSession(): void {
  localStorage.removeItem(PROFILE_KEY);
  localStorage.removeItem("snowbear_extension_sync");
  window.dispatchEvent(new CustomEvent("snowbear-signed-out"));
}