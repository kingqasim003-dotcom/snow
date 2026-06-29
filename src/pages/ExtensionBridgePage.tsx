import { useCallback, useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import BrandLogo from "../components/BrandLogo";
import { useAuth } from "../context/AuthContext";
import { getCreditsRecord, mergeCreditsRecords, setCreditsRecord } from "../lib/credits";
import { getUserHistory, mergeHistoryLists, saveUserHistory } from "../lib/history";
import { publishExtensionSync } from "../lib/extensionSync";
import type { PromptItem, UserProfile } from "../types";

interface ExtensionBridgePageProps {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  setHistoryList: Dispatch<SetStateAction<PromptItem[]>>;
}

export default function ExtensionBridgePage({ user, setUser, setHistoryList }: ExtensionBridgePageProps) {
  const { firebaseUser, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExtensionFlow = searchParams.get("ext") === "1";
  const [status, setStatus] = useState("Connecting extension…");
  const [connected, setConnected] = useState(false);

  const publishSync = useCallback(
    async (profile: UserProfile) => {
      const token = firebaseUser ? await firebaseUser.getIdToken().catch(() => null) : null;
      publishExtensionSync(profile, token);
    },
    [firebaseUser]
  );

  useEffect(() => {
    if (loading) return;

    if (!firebaseUser) {
      navigate(
        isExtensionFlow
          ? "/auth?redirect=/extension-bridge&ext=1"
          : "/auth?redirect=/extension-bridge",
        { replace: true }
      );
      return;
    }

    const profile: UserProfile = {
      id: firebaseUser.uid,
      email: firebaseUser.email || "",
      plan: user.id === firebaseUser.uid ? user.plan : "free",
    };

    void publishSync(profile);
    setStatus(isExtensionFlow ? "Syncing your extension…" : "Syncing account with extension…");

    const onExtensionState = (event: Event) => {
      const detail = (event as CustomEvent).detail as {
        uid?: string;
        email?: string;
        plan?: UserProfile["plan"];
        credits?: { month: string; used: number; purchased: number };
        history?: PromptItem[];
      } | null;

      if (!detail?.uid || detail.uid !== firebaseUser.uid) return;

      if (detail.credits) {
        const merged = mergeCreditsRecords(detail.credits, getCreditsRecord(firebaseUser.uid));
        setCreditsRecord(firebaseUser.uid, merged);
      }

      if (detail.history?.length) {
        const mergedHistory = mergeHistoryLists(detail.history, getUserHistory(firebaseUser.uid));
        saveUserHistory(firebaseUser.uid, mergedHistory);
        setHistoryList(mergedHistory);
      }

      void publishSync(profile);
    };

    const onExtensionSynced = () => {
      setConnected(true);
      setStatus("Extension connected! You're signed in.");
      if (isExtensionFlow) {
        window.setTimeout(() => window.close(), 900);
      }
    };

    window.addEventListener("snowbear-extension-state", onExtensionState);
    window.addEventListener("snowbear-extension-synced", onExtensionSynced);

    const republish = window.setInterval(() => {
      void publishSync(profile);
    }, 1500);
    const republishTimeout = window.setTimeout(() => window.clearInterval(republish), 20000);

    return () => {
      window.removeEventListener("snowbear-extension-state", onExtensionState);
      window.removeEventListener("snowbear-extension-synced", onExtensionSynced);
      window.clearInterval(republish);
      window.clearTimeout(republishTimeout);
    };
  }, [
    firebaseUser,
    isExtensionFlow,
    loading,
    navigate,
    publishSync,
    setHistoryList,
    setUser,
    user.id,
    user.plan,
  ]);

  return (
    <section className="max-w-md mx-auto px-6 py-16 relative z-10">
      <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-[28px] p-8 shadow-lg text-center">
        <BrandLogo size="lg" />
        <h1 className="text-xl font-black text-slate-900 mt-4">Connect SnowBear Extension</h1>
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{status}</p>
        {connected && (
          <p className="text-xs font-bold text-emerald-600 mt-3">
            {isExtensionFlow ? "Returning to extension…" : "Sync complete."}
          </p>
        )}
        <p className="text-[11px] text-slate-400 mt-4">
          Signed in as <strong>{firebaseUser?.email || user.email}</strong>
        </p>
        {!isExtensionFlow && (
          <Link to="/" className="inline-block mt-6 text-xs font-bold text-[#6EC6FF] hover:underline">
            Back to website
          </Link>
        )}
      </div>
    </section>
  );
}