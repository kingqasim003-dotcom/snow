import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { useExtensionSync } from "../hooks/useExtensionSync";
import type { PromptItem, UserProfile } from "../types";

type SyncStatus = "idle" | "syncing" | "connected" | "offline";

interface ExtensionSyncContextValue {
  syncStatus: SyncStatus;
  lastSyncAt: number | null;
  forceSync: () => void;
}

const ExtensionSyncContext = createContext<ExtensionSyncContextValue>({
  syncStatus: "idle",
  lastSyncAt: null,
  forceSync: () => {},
});

interface ExtensionSyncProviderProps {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  setHistoryList: Dispatch<SetStateAction<PromptItem[]>>;
  getIdToken?: () => Promise<string | null>;
  children: ReactNode;
}

export function ExtensionSyncProvider({
  user,
  setUser,
  setHistoryList,
  getIdToken,
  children,
}: ExtensionSyncProviderProps) {
  const value = useExtensionSync(user, setUser, setHistoryList, getIdToken);
  return <ExtensionSyncContext.Provider value={value}>{children}</ExtensionSyncContext.Provider>;
}

export function useExtensionSyncState() {
  return useContext(ExtensionSyncContext);
}