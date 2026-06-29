import { useState } from "react";
import { Gift, Loader2, CheckCircle2 } from "lucide-react";
import { redeemPromoCode } from "../lib/rtdbPromo";
import { publishExtensionSync } from "../lib/extensionSync";
import { useAuth } from "../context/AuthContext";
import { useExtensionSyncState } from "../context/ExtensionSyncContext";
import type { UserProfile } from "../types";

interface PromoCodeRedeemProps {
  user: UserProfile;
  onRedeemed?: () => void;
}

export default function PromoCodeRedeem({ user, onRedeemed }: PromoCodeRedeemProps) {
  const { firebaseUser } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const { forceSync } = useExtensionSyncState();

  const handleRedeem = async () => {
    if (!user.id) return;
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const result = await redeemPromoCode(user.id, user.email, code);
      setSuccess(`+${result.credits} credits added with code ${result.code}!`);
      setCode("");
      const token = firebaseUser ? await firebaseUser.getIdToken().catch(() => null) : null;
      publishExtensionSync(user, token);
      forceSync();
      onRedeemed?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not redeem code.");
    } finally {
      setLoading(false);
    }
  };

  if (!user.id) {
    return (
      <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-2xl p-5 text-center">
        <p className="text-xs text-slate-500">Sign in to redeem a promo code.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-2xl p-6 space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="w-4 h-4 text-[#6EC6FF]" />
        <h2 className="text-sm font-black text-slate-900">Redeem Promo Code</h2>
      </div>
      <p className="text-xs text-slate-500">Each code works once for one user. Credits sync to the extension automatically.</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SNOW-XXXX-XXXX"
          className="flex-1 text-sm font-mono border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-[#6EC6FF]"
        />
        <button
          type="button"
          onClick={handleRedeem}
          disabled={loading || !code.trim()}
          className="bg-[#6EC6FF] hover:bg-[#5bb8f0] disabled:opacity-50 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      {success && (
        <p className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {success}
        </p>
      )}
    </div>
  );
}