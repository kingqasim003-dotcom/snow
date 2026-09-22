import { mergeHistoryLists, saveUserHistory, getUserHistory } from "./history";
import { publishExtensionSync, writeExtensionSyncPayload, type ExtensionSyncPayload } from "./extensionSync";
import type { PromptItem, UserProfile } from "../types";

export interface ExtensionStatePayload {
  uid: string;
  email?: string;
  plan?: UserProfile["plan"];
  credits?: { month: string; used: number; purchased: number };
  history?: PromptItem[];
}

export function mapExtensionPlanToWebsite(plan?: string | null): UserProfile["plan"] {
  if (plan === "pro" || plan === "polar") return "pro";
  if (plan === "unlimited") return "unlimited";
  return "free";
}

export function applyExtensionStateToWebsite(
  state: ExtensionStatePayload,
  currentUser: UserProfile
): { user: UserProfile; history: PromptItem[]; changed: boolean } {
  if (!state.uid || state.uid !== currentUser.id) {
    return { user: currentUser, history: getUserHistory(currentUser.id), changed: false };
  }

  let changed = false;
  let nextUser = { ...currentUser };

  // Plan and credits come from RTDB listeners — extension only syncs history/email here.

  let history = getUserHistory(currentUser.id);
  if (state.history?.length) {
    const mergedHistory = mergeHistoryLists(state.history, history);
    if (mergedHistory.length !== history.length || mergedHistory.some((h, i) => h.id !== history[i]?.id)) {
      saveUserHistory(currentUser.id, mergedHistory);
      history = mergedHistory;
      changed = true;
    }
  }

  if (state.email && state.email !== currentUser.email) {
    nextUser = { ...nextUser, email: state.email };
    changed = true;
  }

  if (changed) {
    publishExtensionSync(nextUser);
  }

  return { user: nextUser, history, changed };
}

export function publishWebsiteSync(user: UserProfile) {
  publishExtensionSync(user);
}

export function buildPayloadFromUser(user: UserProfile): ExtensionSyncPayload | null {
  if (!user.id) return null;
  writeExtensionSyncPayload(user);
  return JSON.parse(localStorage.getItem("snowbear_extension_sync") || "null");
}