import { useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, Zap, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { UserProfile } from "../types";
import { publishExtensionSync } from "../lib/extensionSync";
import { setUserPlan } from "../lib/rtdbUsers";

interface PricingSectionProps {
  user: UserProfile;
  setUser: Dispatch<SetStateAction<UserProfile>>;
  showTitle?: boolean;
}

const FREE_FEATURES = [
  "10 credits per month",
  "Enhance, compress, grammar & score",
  "Local prompt history",
  "Chrome extension sync",
];

const POLAR_FEATURES = [
  "100 credits per month",
  "Premium template collections",
  "Priority AI routing",
  "Polar Score audits",
  "Custom instructions (extension)",
  "Cloud account sync",
];

const UNLIMITED_FEATURES = [
  "Unlimited credits per month",
  "Everything in Free + Polar Pro",
  "Fastest Groq API priority queue",
  "Advanced prompt templates library",
  "Team-ready cloud sync",
  "Dedicated Arctic support lane",
  "Early access to new Polar tools",
];

export default function PricingSection({ user, setUser, showTitle = true }: PricingSectionProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const polarPrice = billingCycle === "monthly" ? "$0.99" : "$9.50";
  const unlimitedPrice = billingCycle === "monthly" ? "$9.99" : "$95.88";

  const applyFreePlan = () => {
    if (!user.id) return;
    const next = { ...user, plan: "free" as const };
    setUser(next);
    publishExtensionSync(next);
    setUserPlan(user.id, "free").catch(console.error);
  };

  return (
    <section className="max-w-7xl mx-auto px-6 py-20 relative z-10">
      {showTitle && (
        <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
          <span className="text-xs font-bold uppercase tracking-widest text-[#6EC6FF] block font-mono">Simple Billing</span>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Choose your Arctic power level</h2>
          <p className="text-slate-600 text-sm">Start free, upgrade to Polar Pro, or go full Unlimited.</p>
          <div className="inline-flex items-center bg-slate-200/50 p-1 rounded-full border border-slate-100 mt-4">
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billingCycle === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${billingCycle === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Yearly <span className="text-[#6EC6FF] text-[9px] font-bold">(-20%)</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto items-stretch">
        <div className="bg-white/40 backdrop-blur-md border border-[#BFE7FF]/80 rounded-[28px] p-7 flex flex-col justify-between shadow-xs">
          <div className="space-y-5">
            <div>
              <span className="text-[10px] bg-slate-100 text-slate-500 font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono">Starter</span>
              <h3 className="text-xl font-bold text-slate-900 mt-3">Free</h3>
              <p className="text-xs text-slate-500 mt-1">Perfect for testing and casual users.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">$0</span>
              <span className="text-xs text-slate-400">/ forever</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-600 border-t border-slate-100 pt-5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#6EC6FF] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          {user.plan === "free" ? (
            <button disabled className="w-full bg-slate-100 text-slate-500 font-bold py-3 px-4 rounded-[20px] text-xs mt-8 cursor-default">
              Current Plan
            </button>
          ) : user.id ? (
            <button onClick={applyFreePlan} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-[20px] text-xs mt-8">
              Switch to Free
            </button>
          ) : (
            <Link to="/auth?redirect=/pricing" className="w-full block text-center bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-4 rounded-[20px] text-xs mt-8">
              Sign in for Free
            </Link>
          )}
        </div>

        <div className="bg-white/55 backdrop-blur-md border-2 border-[#6EC6FF] rounded-[28px] p-7 flex flex-col justify-between shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[#6EC6FF] text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl font-mono uppercase">Popular</div>
          <div className="space-y-5">
            <div>
              <span className="text-[10px] bg-[#6EC6FF]/20 text-[#2980b9] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono flex items-center gap-1 w-fit">
                <Zap className="w-3 h-3" /> Polar Pro
              </span>
              <h3 className="text-xl font-bold text-slate-900 mt-3">Pro</h3>
              <p className="text-xs text-slate-500 mt-1">For creators and power users.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-900">{polarPrice}</span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-700 border-t border-[#6EC6FF]/20 pt-5">
              {POLAR_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          {user.plan === "pro" ? (
            <button disabled className="w-full bg-[#6EC6FF]/60 text-white font-bold py-3.5 px-4 rounded-[20px] text-xs mt-8 cursor-default">
              Current Plan
            </button>
          ) : (
            <Link
              to={
                user.id
                  ? `/checkout?plan=pro&cycle=${billingCycle}`
                  : `/auth?redirect=${encodeURIComponent(`/checkout?plan=pro&cycle=${billingCycle}`)}`
              }
              className="w-full block text-center bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white font-bold py-3.5 px-4 rounded-[20px] shadow-md text-xs mt-8"
            >
              {user.id ? `Get Polar Pro — ${polarPrice}/mo` : `Sign in to upgrade — ${polarPrice}/mo`}
            </Link>
          )}
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 border-2 border-[#6EC6FF]/50 rounded-[28px] p-7 flex flex-col justify-between shadow-xl relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 bg-gradient-to-r from-[#6EC6FF] to-[#2980b9] text-white text-[10px] font-bold px-4 py-1 rounded-bl-xl font-mono uppercase">Best Value</div>
          <div className="space-y-5">
            <div>
              <span className="text-[10px] bg-white/10 text-[#BFE7FF] font-bold px-3 py-1 rounded-full uppercase tracking-wider font-mono flex items-center gap-1 w-fit border border-white/10">
                <Crown className="w-3 h-3" /> Unlimited
              </span>
              <h3 className="text-xl font-bold mt-3">Unlimited</h3>
              <p className="text-xs text-slate-300 mt-1">All Polar Pro + Free features. No limits.</p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">{unlimitedPrice}</span>
              <span className="text-xs text-slate-400">/ month</span>
            </div>
            <ul className="space-y-3 text-xs text-slate-200 border-t border-white/10 pt-5">
              {UNLIMITED_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#6EC6FF] shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
          {user.plan === "unlimited" ? (
            <button disabled className="w-full bg-[#6EC6FF]/60 text-white font-bold py-3.5 px-4 rounded-[20px] text-xs mt-8 cursor-default">
              Current Plan
            </button>
          ) : (
            <Link
              to={
                user.id
                  ? `/checkout?plan=unlimited&cycle=${billingCycle}`
                  : `/auth?redirect=${encodeURIComponent(`/checkout?plan=unlimited&cycle=${billingCycle}`)}`
              }
              className="w-full block text-center bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white font-bold py-3.5 px-4 rounded-[20px] shadow-lg text-xs mt-8"
            >
              {user.id ? `Get Unlimited — ${unlimitedPrice}/mo` : `Sign in to upgrade — ${unlimitedPrice}/mo`}
            </Link>
          )}
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-8 max-w-lg mx-auto">
        Upgrades use the same manual checkout as credit packs (Bank, Crypto, or JazzCash).{" "}
        <Link to="/auth" className="text-[#6EC6FF] font-bold hover:underline">Sign in with Google</Link> first.
      </p>
    </section>
  );
}