import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Link } from "react-router-dom";
import { Check, Crown, Zap } from "lucide-react";
import {
  CREDIT_COSTS,
  getCreditStatus,
  PLAN_ALLOWANCE,
  PLAN_LABELS,
  fromWebsitePlan,
} from "../lib/credits";
import { publishExtensionSync } from "../lib/extensionSync";
import { formatPlanExpiry } from "../lib/planExpiry";
import { setUserPlan } from "../lib/rtdbUsers";
import { useExtensionSyncState } from "../context/ExtensionSyncContext";
import type { UserProfile } from "../types";

interface CreditsPanelProps {
  user: UserProfile;
  setUser?: Dispatch<SetStateAction<UserProfile>>;
  compact?: boolean;
  showPlanButtons?: boolean;
}

const PLAN_OPTIONS: Array<{
  id: UserProfile["plan"];
  name: string;
  credits: string;
  price: string;
  icon: typeof Zap;
}> = [
  { id: "free", name: "Free", credits: `${PLAN_ALLOWANCE.free}/mo`, price: "$0", icon: Zap },
  { id: "pro", name: "Polar Pro", credits: `${PLAN_ALLOWANCE.polar}/mo`, price: "$4.99", icon: Zap },
  { id: "unlimited", name: "Unlimited", credits: "∞", price: "$19.99", icon: Crown },
];

export default function CreditsPanel({
  user,
  setUser,
  compact = false,
  showPlanButtons = false,
}: CreditsPanelProps) {
  const [tick, setTick] = useState(0);
  const { lastSyncAt } = useExtensionSyncState();

  useEffect(() => {
    const bump = () => setTick((v) => v + 1);
    window.addEventListener("snowbear-credits-updated", bump);
    return () => window.removeEventListener("snowbear-credits-updated", bump);
  }, []);
  const status = useMemo(
    () => getCreditStatus(user.id || null, user.plan),
    [user.id, user.plan, tick, lastSyncAt]
  );

  const isUnlimited = status.plan === "unlimited";
  const totalPool = status.totalPool === "∞" ? null : Number(status.totalPool);
  const progress = isUnlimited || !totalPool ? 0 : Math.min(100, (status.used / totalPool) * 100);

  const planExpiryText = formatPlanExpiry(user.planExpiresAt);

  const applyFreePlan = () => {
    if (!setUser || !user.id || user.plan === "free") return;
    const next = {
      ...user,
      plan: "free" as const,
      planExpiresAt: null,
      planBillingCycle: null,
    };
    setUser(next);
    publishExtensionSync(next);
    setUserPlan(user.id, "free").catch(console.error);
    setTick((v) => v + 1);
  };

  if (!user.id) {
    return (
      <div className={`bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-2xl ${compact ? "p-4" : "p-6"} text-center`}>
        <p className="text-xs text-slate-500">Sign in to view your monthly credits.</p>
        <Link to="/auth" className="inline-block mt-3 text-xs font-bold text-[#6EC6FF] hover:underline">
          Continue with Google
        </Link>
      </div>
    );
  }

  return (
    <div className={`bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-2xl ${compact ? "p-4 space-y-3" : "p-6 space-y-4"}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Current Plan</p>
          <p className="text-sm font-black text-slate-900">{status.planLabel}</p>
          {planExpiryText && user.plan !== "free" ? (
            <p className="text-[10px] text-slate-500 mt-0.5">
              Active until {planExpiryText}
              {user.planBillingCycle === "yearly" ? " (yearly)" : user.planBillingCycle === "monthly" ? " (30 days)" : ""}
            </p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Billing Month</p>
          <p className="text-xs font-bold text-slate-700">{status.month}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="bg-[#BFE7FF]/25 rounded-xl p-3 text-center border border-[#BFE7FF]/40">
          <p className="text-lg font-black text-slate-900">{isUnlimited ? "—" : status.used}</p>
          <p className="text-[9px] font-bold uppercase text-slate-500">Used</p>
        </div>
        <div className="bg-[#6EC6FF]/10 rounded-xl p-3 text-center border border-[#6EC6FF]/20">
          <p className="text-lg font-black text-[#2980b9]">{isUnlimited ? "∞" : status.remaining}</p>
          <p className="text-[9px] font-bold uppercase text-slate-500">Remaining</p>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
          <p className="text-lg font-black text-slate-900">{isUnlimited ? "∞" : totalPool}</p>
          <p className="text-[9px] font-bold uppercase text-slate-500">Total Pool</p>
        </div>
      </div>

      {!isUnlimited && (
        <div>
          <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
            <span>Monthly usage</span>
            <span>{status.used} / {totalPool}</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#6EC6FF] transition-all" style={{ width: `${progress}%` }} />
          </div>
          {status.purchased > 0 && (
            <p className="text-[10px] text-slate-500 mt-2">Includes {status.purchased} purchased bonus credits.</p>
          )}
        </div>
      )}

      {(showPlanButtons || !compact) && (
        <div className="border-t border-slate-100 pt-3 space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Plans</p>
          <div className={`grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-3"}`}>
            {PLAN_OPTIONS.map((plan) => {
              const active = user.plan === plan.id;
              const Icon = plan.icon;
              return (
                <div
                  key={plan.id}
                  className={`rounded-xl border p-3 ${active ? "border-[#6EC6FF] bg-[#BFE7FF]/20" : "border-slate-200 bg-white/50"}`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className={`w-3.5 h-3.5 ${active ? "text-[#2980b9]" : "text-slate-400"}`} />
                    <span className="text-xs font-bold text-slate-900">{plan.name}</span>
                    {active && <Check className="w-3 h-3 text-emerald-500 ml-auto" />}
                  </div>
                  <p className="text-[10px] text-slate-500">{plan.credits} credits · {plan.price}</p>
                  {active ? (
                    <p className="text-[10px] font-bold text-[#2980b9] mt-2">Current plan</p>
                  ) : plan.id === "free" ? (
                    <button
                      type="button"
                      onClick={applyFreePlan}
                      className="mt-2 w-full text-[10px] font-bold text-slate-600 hover:text-slate-900 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      Switch to Free
                    </button>
                  ) : (
                    <Link
                      to="/pricing"
                      className="mt-2 block w-full text-center text-[10px] font-bold text-white bg-[#6EC6FF] hover:bg-[#5bb8f0] py-1.5 rounded-lg transition-all"
                    >
                      Upgrade
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!compact && (
        <div className="border-t border-slate-100 pt-3 space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Credit Costs</p>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600">
            <span>Enhance → {CREDIT_COSTS.enhance} credits</span>
            <span>Compress → {CREDIT_COSTS.compress} credit</span>
            <span>Grammar → {CREDIT_COSTS.grammar} credit</span>
            <span>Score → Free</span>
          </div>
          <p className="text-[10px] text-slate-400 pt-1">
            {PLAN_LABELS[fromWebsitePlan(user.plan)]} · allowance resets each calendar month.
          </p>
        </div>
      )}
    </div>
  );
}