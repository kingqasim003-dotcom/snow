import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { applyExtensionStateToWebsite } from "../lib/syncEngine";
import { publishExtensionSync } from "../lib/extensionSync";
import type { PromptItem, UserProfile } from "../types";

export function useExtensionSync(
  user: UserProfile,
  setUser: Dispatch<SetStateAction<UserProfile>>,
  setHistoryList: Dispatch<SetStateAction<PromptItem[]>>,
  getIdToken?: () => Promise<string | null>
) {
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "connected" | "offline">("idle");
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);

  useEffect(() => {
    if (!user.id) {
      setSyncStatus("idle");
      setLastSyncAt(null);
      return;
    }

    const push = async () => {
      const token = getIdToken ? await getIdToken().catch(() => null) : null;
      publishExtensionSync(user, token);
    };
    void push();
    setSyncStatus("syncing");

    const onExtensionState = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.uid) return;

      const result = applyExtensionStateToWebsite(detail, user);
      if (result.changed) {
        setUser(result.user);
        setHistoryList(result.history);
        setLastSyncAt(Date.now());
      } else {
        setLastSyncAt(Date.now());
      }
      setSyncStatus("connected");
    };

    const onExtensionSynced = () => {
      setSyncStatus("connected");
      setLastSyncAt(Date.now());
    };

    const onExtensionOffline = () => {
      setSyncStatus("offline");
    };

    window.addEventListener("snowbear-extension-state", onExtensionState);
    window.addEventListener("snowbear-extension-synced", onExtensionSynced);
    window.addEventListener("snowbear-extension-offline", onExtensionOffline);

    const republish = window.setInterval(() => {
      void push();
    }, 3000);
    const offlineCheck = window.setTimeout(() => {
      setSyncStatus((prev) => (prev === "syncing" ? "offline" : prev));
    }, 8000);

    return () => {
      window.removeEventListener("snowbear-extension-state", onExtensionState);
      window.removeEventListener("snowbear-extension-synced", onExtensionSynced);
      window.removeEventListener("snowbear-extension-offline", onExtensionOffline);
      window.clearInterval(republish);
      window.clearTimeout(offlineCheck);
    };
  }, [user.id, user.plan, user.email, setUser, setHistoryList, user, getIdToken]);

  const forceSync = useCallback(() => {
    if (!user.id) return;
    const run = async () => {
      const token = getIdToken ? await getIdToken().catch(() => null) : null;
      publishExtensionSync(user, token);
    };
    void run();
    setSyncStatus("syncing");
  }, [user, getIdToken]);

  return { syncStatus, lastSyncAt, forceSync };
}