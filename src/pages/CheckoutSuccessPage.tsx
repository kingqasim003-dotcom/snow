import { Link, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock } from "lucide-react";

export default function CheckoutSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order");
  const orderType = searchParams.get("type");

  return (
    <section className="max-w-lg mx-auto px-6 py-16 relative z-10 text-center space-y-5">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 mx-auto">
        <CheckCircle2 className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-black text-slate-900">Order submitted</h1>
      <p className="text-sm text-slate-600 leading-relaxed">
        Your payment details and receipt were received.{" "}
        {orderId ? (
          <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">#{orderId.slice(-8)}</span>
        ) : (
          "We"
        )}{" "}
        will verify your {orderType === "plan" ? "plan upgrade" : "credit pack"} manually.
      </p>
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
        <Clock className="w-5 h-5 shrink-0" />
        <span>Your order will be completed within 72 hours.</span>
      </div>
      <p className="text-xs text-slate-500">
        Once approved, your {orderType === "plan" ? "plan" : "credits"} update on the website and SnowBear extension
        automatically.
      </p>
      <Link
        to="/credits"
        className="inline-block bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white text-sm font-bold px-6 py-3 rounded-xl transition-all"
      >
        Back to Credits
      </Link>
    </section>
  );
}