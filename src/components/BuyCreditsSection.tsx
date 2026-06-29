import { Link } from "react-router-dom";
import { ShoppingCart, Sparkles } from "lucide-react";
import { CREDIT_PACKS } from "../data/creditPacks";

export default function BuyCreditsSection() {
  return (
    <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-2xl p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ShoppingCart className="w-4 h-4 text-[#6EC6FF]" />
        <h2 className="text-sm font-black text-slate-900">Buy More Credits</h2>
      </div>
      <p className="text-xs text-slate-500">
        One-time credit packs. After checkout, an admin verifies your payment manually and credits are added to your account in real time.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {CREDIT_PACKS.map((pack) => (
          <div
            key={pack.id}
            className={`rounded-xl border p-4 relative ${
              pack.popular ? "border-[#6EC6FF] bg-[#BFE7FF]/15" : "border-slate-200 bg-white/50"
            }`}
          >
            {pack.popular && (
              <span className="absolute -top-2 right-3 text-[9px] font-bold uppercase tracking-wide bg-[#6EC6FF] text-white px-2 py-0.5 rounded-full">
                Popular
              </span>
            )}
            <p className="text-lg font-black text-slate-900">{pack.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">${pack.priceUsd} USD</p>
            <Link
              to={`/checkout?pack=${pack.id}`}
              className="mt-3 block w-full text-center text-[11px] font-bold text-white bg-[#6EC6FF] hover:bg-[#5bb8f0] py-2 rounded-lg transition-all"
            >
              Buy now
            </Link>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Purchased credits never expire and stack with your monthly plan allowance.
      </p>
    </div>
  );
}