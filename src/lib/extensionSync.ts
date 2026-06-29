import type { PromptItem, UserProfile } from "../types";
import { getCreditsRecord, type CreditsRecord } from "./credits";
import { getUserHistory } from "./history";

export const EXTENSION_SYNC_KEY = "snowbear_extension_sync";

export interface ExtensionSyncPayload {
  uid: string;
  email: string;
  plan: UserProfile["plan"];
  credits: CreditsRecord;
  history: PromptItem[];
  syncedAt: number;
  idToken?: string;
}

export function buildExtensionSyncPayload(
  user: UserProfile,
  idToken?: string | null
): ExtensionSyncPayload | null {
  if (!user.id) return null;
  const payload: ExtensionSyncPayload = {
    uid: user.id,
    email: user.email,
    plan: user.plan,
    credits: getCreditsRecord(user.id),
    history: getUserHistory(user.id),
    syncedAt: Date.now(),
  };
  if (idToken) payload.idToken = idToken;
  return payload;
}

export function writeExtensionSyncPayload(
  user: UserProfile,
  notifyBridge = false,
  idToken?: string | null
) {
  const payload = buildExtensionSyncPayload(user, idToken);
  if (!payload) {
    localStorage.removeItem(EXTENSION_SYNC_KEY);
    return;
  }
  localStorage.setItem(EXTENSION_SYNC_KEY, JSON.stringify(payload));
  if (notifyBridge) {
    window.dispatchEvent(new CustomEvent("snowbear-sync-ready"));
  }
}

export function publishExtensionSync(user: UserProfile, idToken?: string | null) {
  writeExtensionSyncPayload(user, true, idToken);
}

export function readExtensionSyncPayload(): ExtensionSyncPayload | null {
  try {
    const raw = localStorage.getItem(EXTENSION_SYNC_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}