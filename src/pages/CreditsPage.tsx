import { type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import CreditsPanel from "../components/CreditsPanel";
import BuyCreditsSection from "../components/BuyCreditsSection";
import PromoCodeRedeem from "../components/PromoCodeRedeem";
import { useExtensionSyncState } from "../context/ExtensionSyncContext";
import type { UserProfile } from "../types";

interface CreditsPageProps {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
}

function SyncBadge({ status, lastSyncAt }: { status: string; lastSyncAt: number | null }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-full">
        <CheckCircle2 className="w-3.5 h-3.5" />
        Extension connected
        {lastSyncAt && (
          <span className="text-emerald-500/80 font-normal">
            · {new Date(lastSyncAt).toLocaleTimeString()}
          </span>
        )}
      </span>
    );
  }
  if (status === "syncing") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#2980b9] bg-[#BFE7FF]/30 border border-[#BFE7FF] px-3 py-1.5 rounded-full">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        Syncing with extension…
      </span>
    );
  }
  if (status === "offline") {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-full">
        <AlertCircle className="w-3.5 h-3.5" />
        Extension not detected — install & sign in
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full">
      Sign in to sync credits
    </span>
  );
}

export default function CreditsPage({ user, setUser }: CreditsPageProps) {
  const { syncStatus, lastSyncAt, forceSync } = useExtensionSyncState();

  return (
    <section className="max-w-3xl mx-auto px-6 py-16 relative z-10">
      <div className="text-center mb-8 space-y-3">
        <span className="text-xs font-bold uppercase tracking-widest text-[#6EC6FF] font-mono">Account</span>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900">Your Credits</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Same monthly credits on the website and Chrome extension. Changes sync automatically in both directions.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <SyncBadge status={user.id ? syncStatus : "idle"} lastSyncAt={lastSyncAt} />
          {user.id && (
            <button
              type="button"
              onClick={forceSync}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6EC6FF] hover:text-[#2980b9] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync now
            </button>
          )}
        </div>
      </div>

      <CreditsPanel user={user} setUser={setUser} showPlanButtons />

      <div className="mt-6 space-y-6">
        {user.id && <BuyCreditsSection />}
        <PromoCodeRedeem user={user} />
      </div>

      {user.id && syncStatus !== "connected" && (
        <div className="mt-6 bg-[#BFE7FF]/20 border border-[#BFE7FF]/50 rounded-2xl p-5 text-center space-y-3">
          <p className="text-sm text-slate-600">
            Install the SnowBear extension and open any page on this site while signed in — credits will sync automatically.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                const origin = window.location.origin;
                window.location.href = `/api/download-extension?origin=${encodeURIComponent(origin)}`;
              }}
              className="bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              Get Extension
            </button>
            <Link
              to="/extension-bridge?ext=1"
              className="bg-white border border-slate-200 hover:border-[#6EC6FF]/40 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
            >
              Connect extension
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}