import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Copy, Gift, Link2, Share2, Sparkles, Users } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import {
  REFERRAL_PURCHASE_CREDITS,
  REFERRAL_SIGNUP_CREDITS,
  buildReferralLink,
} from "../lib/referral";
import { fetchReferralDashboard, type ReferralDashboard } from "../lib/rtdbReferral";
import type { UserProfile } from "../types";

interface EarnPageProps {
  user: UserProfile;
}

export default function EarnPage({ user }: EarnPageProps) {
  const { firebaseUser } = useAuth();
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!firebaseUser) return;
    setLoading(true);
    setError("");
    try {
      const token = await firebaseUser.getIdToken();
      const data = await fetchReferralDashboard(token);
      setDashboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load earn page.");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  useEffect(() => {
    if (firebaseUser) load();
  }, [firebaseUser, load]);

  const referralLink = dashboard?.link || (dashboard?.code ? buildReferralLink(dashboard.code) : "");

  const copyLink = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy — select the link and copy manually.");
    }
  };

  if (!user.id) {
    return (
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 relative z-10 text-center">
        <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-[28px] p-10">
          <Gift className="w-10 h-10 text-[#6EC6FF] mx-auto mb-4" />
          <h1 className="text-2xl font-black text-slate-900">Earn credits</h1>
          <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
            Sign in to get your unique referral link and earn bonus credits when friends join SnowBear.
          </p>
          <Link
            to="/auth?redirect=/earn"
            className="inline-block mt-6 bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white text-sm font-bold px-6 py-3 rounded-full"
          >
            Continue with Google
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative z-10">
      <div className="text-center mb-10">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#6EC6FF] mb-2">Refer &amp; earn</p>
        <h1 className="text-3xl md:text-4xl font-black text-slate-900">Earn credits</h1>
        <p className="text-sm text-slate-500 mt-2 max-w-lg mx-auto">
          Share your link. When someone signs up you earn {REFERRAL_SIGNUP_CREDITS} credits. When they buy a plan or
          credit pack you earn {REFERRAL_PURCHASE_CREDITS} more.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-8">
        {[
          { label: "Friends joined", value: dashboard?.stats.signups ?? 0, icon: Users },
          { label: "Paid referrals", value: dashboard?.stats.purchases ?? 0, icon: Sparkles },
          { label: "Credits earned", value: dashboard?.stats.creditsEarned ?? 0, icon: Gift },
        ].map((item) => (
          <div
            key={item.label}
            className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-2xl p-5 text-center"
          >
            <item.icon className="w-5 h-5 text-[#6EC6FF] mx-auto mb-2" />
            <p className="text-2xl font-black text-slate-900">{loading ? "…" : item.value}</p>
            <p className="text-[10px] font-bold uppercase text-slate-400 mt-1">{item.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-[28px] p-6 md:p-8 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Link2 className="w-4 h-4 text-[#2980b9]" />
          <h2 className="text-sm font-black text-slate-900">Your referral link</h2>
        </div>

        {error ? (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 mb-4">{error}</p>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            readOnly
            value={loading ? "Loading…" : referralLink}
            className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700"
          />
          <button
            type="button"
            onClick={copyLink}
            disabled={!referralLink || loading}
            className="bg-[#6EC6FF] hover:bg-[#5bb8f0] disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center justify-center gap-2 shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>

        {dashboard?.code ? (
          <p className="text-[10px] text-slate-400 mt-3">
            Code: <span className="font-mono font-bold text-slate-600">{dashboard.code}</span>
          </p>
        ) : null}
      </div>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <div className="bg-[#BFE7FF]/20 border border-[#BFE7FF]/50 rounded-2xl p-5">
          <p className="text-xs font-black text-slate-900 mb-1">Free sign-up</p>
          <p className="text-2xl font-black text-[#2980b9]">+{REFERRAL_SIGNUP_CREDITS} credits</p>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            When a friend opens your link and creates a free SnowBear account with Google.
          </p>
        </div>
        <div className="bg-[#BFE7FF]/20 border border-[#BFE7FF]/50 rounded-2xl p-5">
          <p className="text-xs font-black text-slate-900 mb-1">Plan or credit purchase</p>
          <p className="text-2xl font-black text-[#2980b9]">+{REFERRAL_PURCHASE_CREDITS} credits</p>
          <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
            When they upgrade a plan or buy a credit pack and the payment is approved.
          </p>
        </div>
      </div>

      <div className="mt-8 bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Share2 className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-500 leading-relaxed">
            Credits are added to your purchased balance and sync to the SnowBear extension automatically.
          </p>
        </div>
        <Link to="/credits" className="text-xs font-bold text-[#2980b9] hover:underline shrink-0">
          View my credits →
        </Link>
      </div>
    </section>
  );
}