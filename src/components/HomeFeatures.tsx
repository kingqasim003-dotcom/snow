import { Link } from "react-router-dom";
import {
  Sparkles,
  Cpu,
  FileText,
  CheckCircle2,
  Layers,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

const features = [
  {
    icon: Sparkles,
    color: "text-[#2980b9]",
    bg: "bg-[#BFE7FF]/40",
    title: "Prompt Enhancer",
    desc: "Turn vague ideas into structured, model-ready instructions.",
  },
  {
    icon: Cpu,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    title: "Token Saver",
    desc: "Compress prompts up to 63% without losing meaning.",
  },
  {
    icon: FileText,
    color: "text-amber-500",
    bg: "bg-amber-50",
    title: "Grammar Fix",
    desc: "Polish spelling, typos, and unclear phrasing instantly.",
  },
  {
    icon: CheckCircle2,
    color: "text-purple-600",
    bg: "bg-purple-50",
    title: "Polar Score",
    desc: "0–100 quality audit with actionable improvement tips.",
  },
  {
    icon: Layers,
    color: "text-rose-500",
    bg: "bg-rose-50",
    title: "Starter Templates",
    desc: "Curated prompt structures for coding, marketing & more.",
  },
  {
    icon: ShieldCheck,
    color: "text-blue-500",
    bg: "bg-blue-50",
    title: "Secure History",
    desc: "Save and sync prompts with Firebase cloud storage.",
  },
];

export default function HomeFeatures() {
  return (
    <section className="max-w-7xl mx-auto px-6 py-16 relative z-10 border-t border-slate-200">
      <div className="text-center max-w-xl mx-auto space-y-3 mb-12">
        <span className="text-xs font-bold uppercase tracking-widest text-[#6EC6FF] block font-mono">Core Capabilities</span>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          Everything SnowBear can do
        </h2>
        <p className="text-slate-600 text-sm">
          Six powerful tools inside your browser sidebar — free to try, unlimited on Pro & Unlimited plans.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {features.map((f) => (
          <div
            key={f.title}
            className="bg-white/50 backdrop-blur-md border border-[#BFE7FF]/60 rounded-[24px] p-6 hover:border-[#6EC6FF]/50 hover:shadow-md transition-all group"
          >
            <div className={`w-12 h-12 ${f.bg} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
              <f.icon className={`w-6 h-6 ${f.color}`} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">{f.title}</h3>
            <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="text-center mt-10">
        <Link
          to="/features"
          className="inline-flex items-center gap-2 bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white text-sm font-bold px-6 py-3 rounded-full shadow-md transition-all"
        >
          Explore All Features
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}