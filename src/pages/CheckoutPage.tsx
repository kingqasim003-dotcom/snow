import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Building2,
  Bitcoin,
  Smartphone,
  Loader2,
  ArrowLeft,
  Upload,
  Clock,
  ImageIcon,
  Lock,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { resolveCheckoutItem, type CheckoutItem } from "../lib/checkout";
import { createCheckoutOrder } from "../lib/rtdbOrders";
import { listenPaymentInstructions, DEFAULT_PAYMENT_INSTRUCTIONS } from "../lib/rtdbConfig";
import { readReceiptFile, uploadReceiptImage } from "../lib/uploadReceipt";
import type { PaymentInstructions, PaymentMethod, UserProfile } from "../types";

interface CheckoutPageProps {
  user: UserProfile;
}

const METHODS: Array<{
  id: PaymentMethod;
  label: string;
  icon: typeof Building2;
  color: string;
}> = [
  { id: "bank", label: "Bank", icon: Building2, color: "text-blue-600" },
  { id: "crypto", label: "Crypto", icon: Bitcoin, color: "text-amber-600" },
  { id: "jazzcash", label: "JazzCash", icon: Smartphone, color: "text-red-600" },
];

const PLAN_FEATURES: Record<string, string[]> = {
  pro: [
    "100 credits every month",
    "Premium template collections",
    "Priority AI routing",
    "Polar Score audits",
    "Custom instructions in extension",
    "Cloud account sync",
  ],
  unlimited: [
    "Unlimited credits per month",
    "Everything in Polar Pro",
    "Fastest Groq API priority",
    "Advanced prompt templates",
    "Team-ready cloud sync",
    "Early access to new tools",
  ],
};

function needsPhone(method: PaymentMethod) {
  return method === "bank" || method === "jazzcash";
}

function billingLabel(item: CheckoutItem) {
  if (item.orderType === "credits") return "One-time purchase";
  if (item.billingCycle === "yearly") return "Billed yearly";
  return "Billed monthly";
}

function priceLabel(item: CheckoutItem) {
  if (item.orderType === "credits") return `$${item.amountUsd}`;
  if (item.billingCycle === "yearly") return `$${item.amountUsd}/yr`;
  return `$${item.amountUsd}/mo`;
}

function summaryFeatures(item: CheckoutItem): string[] {
  if (item.orderType === "plan" && item.plan) {
    return PLAN_FEATURES[item.plan] || [];
  }
  return [
    `${item.credits} bonus credits added to your account`,
    "Works on website and Chrome extension",
    "Never expires — stacks with monthly allowance",
    "Manual verification within 72 hours",
  ];
}

function checkoutHeadline(item: CheckoutItem) {
  if (item.orderType === "plan") {
    return (
      <>
        Complete your upgrade to <span className="text-[#2980b9]">{item.label}</span>
      </>
    );
  }
  return (
    <>
      Complete your purchase of <span className="text-[#2980b9]">{item.label}</span>
    </>
  );
}

export default function CheckoutPage({ user }: CheckoutPageProps) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const item = useMemo(
    () =>
      resolveCheckoutItem(
        searchParams.get("pack"),
        searchParams.get("plan"),
        searchParams.get("cycle")
      ),
    [searchParams]
  );
  const [method, setMethod] = useState<PaymentMethod>("bank");
  const [payerName, setPayerName] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<PaymentInstructions>(DEFAULT_PAYMENT_INSTRUCTIONS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return listenPaymentInstructions(setInstructions);
  }, []);

  const onReceiptPick = async (file: File | null) => {
    setReceiptFile(file);
    setReceiptPreview(null);
    if (!file) return;
    try {
      const preview = await readReceiptFile(file);
      setReceiptPreview(preview);
      setError("");
    } catch (err) {
      setReceiptFile(null);
      setError(err instanceof Error ? err.message : "Invalid image.");
    }
  };

  if (!user.id) {
    const redirect = item?.backPath || "/credits";
    return (
      <section className="max-w-lg mx-auto px-6 py-16 text-center">
        <p className="text-sm text-slate-600 mb-4">Sign in to complete checkout.</p>
        <Link
          to={`/auth?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`}
          className="text-sm font-bold text-[#6EC6FF] hover:underline"
        >
          Continue with Google
        </Link>
        <p className="mt-4">
          <Link to={redirect} className="text-xs text-slate-500 hover:underline">
            Go back
          </Link>
        </p>
      </section>
    );
  }

  if (!item) {
    return (
      <section className="max-w-lg mx-auto px-6 py-16 text-center">
        <p className="text-sm text-slate-600 mb-4">Invalid checkout item.</p>
        <Link to="/credits" className="text-sm font-bold text-[#6EC6FF] hover:underline mr-4">
          Buy credits
        </Link>
        <Link to="/pricing" className="text-sm font-bold text-[#6EC6FF] hover:underline">
          View plans
        </Link>
      </section>
    );
  }

  const activeInstructions = instructions[method];
  const features = summaryFeatures(item);

  const handleConfirm = async () => {
    if (!payerName.trim()) {
      setError("Enter your full name as shown on the payment.");
      return;
    }
    if (needsPhone(method) && !payerPhone.trim()) {
      setError("Enter your phone number — required for Bank and JazzCash.");
      return;
    }
    if (!paymentNote.trim()) {
      setError("Enter your payment reference / transaction ID.");
      return;
    }
    if (!receiptFile || !receiptPreview) {
      setError("Upload a screenshot or photo of your payment receipt.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const receiptUrl = await uploadReceiptImage(receiptPreview, `order-${user.id}-${Date.now()}`);
      const orderId = await createCheckoutOrder({
        user,
        orderType: item.orderType,
        packId: item.packId,
        label: item.label,
        amountUsd: item.amountUsd,
        paymentMethod: method,
        paymentNote: paymentNote.trim(),
        payerName: payerName.trim(),
        payerPhone: payerPhone.trim() || undefined,
        receiptUrl,
        credits: item.credits,
        plan: item.plan,
        billingCycle: item.billingCycle,
      });
      navigate(`/checkout/success?order=${orderId}&type=${item.orderType}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit order. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 py-10 md:py-14 relative z-10">
      <Link
        to={item.backPath}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#2980b9] mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-start">
        {/* Left — order summary (reference layout) */}
        <div className="space-y-6 lg:sticky lg:top-8">
          <div className="inline-flex items-center gap-2 bg-[#BFE7FF]/40 border border-[#6EC6FF]/30 text-[#2980b9] text-[11px] font-bold uppercase tracking-widest px-4 py-2 rounded-full">
            <Lock className="w-3.5 h-3.5" />
            Secure checkout
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight tracking-tight">
              {checkoutHeadline(item)}
            </h1>
            <p className="text-sm md:text-base text-slate-500 leading-relaxed max-w-md">
              Pay via Bank, Crypto, or JazzCash. Upload your receipt and we activate your{" "}
              {item.orderType === "plan" ? "plan" : "credits"} on the website and SnowBear extension.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div>
                <p className="text-base font-black text-slate-900">{item.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{billingLabel(item)}</p>
              </div>
              <p className="text-2xl font-black text-slate-900 shrink-0">{priceLabel(item)}</p>
            </div>

            <ul className="px-6 py-5 space-y-3">
              {features.map((feat) => (
                <li key={feat} className="flex items-start gap-2.5 text-sm text-slate-700">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>{feat}</span>
                </li>
              ))}
            </ul>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-700">Total due</span>
              <span className="text-xl font-black text-slate-900">${item.amountUsd.toFixed(2)}</span>
            </div>
          </div>

          <div className="bg-white/80 border border-slate-200 rounded-2xl px-5 py-4">
            <p className="text-sm text-slate-600 italic leading-relaxed">
              &ldquo;SnowBear saves me hours on prompts — the Polar plan pays for itself in the first week.&rdquo;
            </p>
            <p className="text-xs font-semibold text-slate-500 mt-2">— SnowBear user</p>
          </div>
        </div>

        {/* Right — payment details */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-lg p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-black text-slate-900">Payment details</h2>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Payment method</p>
            <div className="grid grid-cols-3 gap-2">
              {METHODS.map((m) => {
                const Icon = m.icon;
                const active = method === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`rounded-xl border-2 py-4 px-2 flex flex-col items-center gap-2 transition-all ${
                      active
                        ? "border-[#6EC6FF] bg-[#BFE7FF]/20 shadow-sm"
                        : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
                    }`}
                  >
                    <Icon className={`w-6 h-6 ${m.color}`} />
                    <span className="text-[11px] font-bold text-slate-800">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-5 md:p-6">
            <p className="text-base font-black text-slate-900 mb-3">{activeInstructions.title}</p>
            <pre className="text-sm md:text-[15px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed">
              {activeInstructions.details}
            </pre>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Your full name *</label>
              <input
                type="text"
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                placeholder="e.g. Qasim Sialvi"
                className="w-full text-sm border border-slate-200 rounded-lg px-4 py-3 bg-white focus:outline-none focus:border-[#6EC6FF] focus:ring-2 focus:ring-[#6EC6FF]/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Phone number {needsPhone(method) ? "*" : "(optional)"}
              </label>
              <input
                type="tel"
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full text-sm border border-slate-200 rounded-lg px-4 py-3 bg-white focus:outline-none focus:border-[#6EC6FF] focus:ring-2 focus:ring-[#6EC6FF]/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">
                Transaction ID / reference *
              </label>
              <input
                type="text"
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="Bank ref, crypto hash, or JazzCash ID"
                className="w-full text-sm border border-slate-200 rounded-lg px-4 py-3 bg-white focus:outline-none focus:border-[#6EC6FF] focus:ring-2 focus:ring-[#6EC6FF]/20"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-600 block mb-1.5">Payment proof screenshot *</label>
              <label className="flex flex-col items-center justify-center gap-2 w-full min-h-[140px] border-2 border-dashed border-slate-300 rounded-xl p-5 cursor-pointer hover:border-[#6EC6FF] hover:bg-[#BFE7FF]/5 transition-all bg-white">
                {receiptPreview ? (
                  <img
                    src={receiptPreview}
                    alt="Receipt preview"
                    className="max-h-36 rounded-lg border border-slate-200 object-contain"
                  />
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-[#6EC6FF]" />
                    <span className="text-xs font-semibold text-slate-600">Upload receipt screenshot</span>
                    <span className="text-[10px] text-slate-400">JPG, PNG, WebP · max 5 MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => onReceiptPick(e.target.files?.[0] || null)}
                />
              </label>
              {receiptFile && (
                <p className="text-[11px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                  <ImageIcon className="w-3 h-3" />
                  {receiptFile.name}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <Clock className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              <strong>Your order will be completed within 72 hours.</strong> We verify your payment and receipt,
              then activate your account.
            </p>
          </div>

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-sm font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-md"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading & submitting…
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Complete purchase — ${item.amountUsd.toFixed(2)}
              </>
            )}
          </button>

          <p className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Manual verification · Receipt stored securely
          </p>
        </div>
      </div>
    </section>
  );
}