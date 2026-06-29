import React from "react";
import { motion } from "motion/react";
import {
  Sparkles,
  Cpu,
  FileText,
  CheckCircle2,
  Layers,
  ShieldCheck,
  ArrowRight,
  TrendingDown,
  AlertTriangle,
  BookOpen,
  History,
  Zap,
} from "lucide-react";
import { STARTER_TEMPLATES } from "../data/templates";

import { POLAR_BEAR_LOGO_URL } from "../constants/brand";
import BrandLogo from "./BrandLogo";

function SectionBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-bold uppercase tracking-widest text-[#6EC6FF] block font-mono">
      {children}
    </span>
  );
}

function CompareCard({
  label,
  tone,
  logoSize = "sm",
  children,
}: {
  label: string;
  tone: "before" | "after";
  logoSize?: "sm" | "lg";
  children: React.ReactNode;
}) {
  const isAfter = tone === "after";
  return (
    <div
      className={`rounded-[24px] p-5 border flex flex-col gap-3 h-full ${
        isAfter
          ? "bg-[#BFE7FF]/20 border-[#6EC6FF]/40 shadow-md shadow-[#6EC6FF]/10"
          : "bg-slate-50/80 border-slate-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
            isAfter
              ? "bg-[#6EC6FF] text-white"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {label}
        </span>
        {isAfter && (
          <img
            src={POLAR_BEAR_LOGO_URL}
            alt=""
            className={`object-contain bg-transparent ${
              logoSize === "lg" ? "w-16 h-16 sm:w-20 sm:h-20" : "w-8 h-8"
            }`}
          />
        )}
      </div>
      {children}
    </div>
  );
}

export default function FeatureShowcase() {
  return (
    <section id="features" className="max-w-7xl mx-auto px-6 py-20 relative z-10 border-t border-slate-200 space-y-24">
      <div className="text-center max-w-2xl mx-auto space-y-3">
        <SectionBadge>Core Capabilities</SectionBadge>
        <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
          What SnowBear can do in your browser sidebar
        </h2>
        <p className="text-slate-600 text-sm">
          Six powerful tools — each built to save tokens, sharpen instructions, and get better AI results.
        </p>
      </div>

      {/* 1. Prompt Enhancer */}
      <motion.div
        id="feature-enhancer"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center"
      >
        <div className="lg:col-span-4 space-y-4">
          <BrandLogo size="lg" />
          <h3 className="text-2xl font-black text-slate-900">Prompt Enhancer</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Turn vague one-liners into structured, model-ready instructions with persona, format rules, and constraints — in one click.
          </p>
          <div className="flex flex-wrap gap-2">
            {["Persona", "Format", "Constraints", "Edge Cases"].map((tag) => (
              <span key={tag} className="text-[10px] font-bold bg-white border border-[#BFE7FF] text-[#2980b9] px-2.5 py-1 rounded-full">
                + {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 items-stretch">
          <CompareCard label="Normal Prompt" tone="before">
            <p className="text-sm text-slate-500 italic leading-relaxed">
              "make a react button component"
            </p>
            <div className="mt-auto pt-3 border-t border-slate-200 flex items-center gap-2 text-[10px] text-rose-500 font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" />
              Vague · No structure · Weak output
            </div>
          </CompareCard>

          <div className="hidden md:flex items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-[#6EC6FF] flex items-center justify-center shadow-lg shadow-[#6EC6FF]/30">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </div>

          <CompareCard label="SnowBear Enhanced" tone="after" logoSize="lg">
            <p className="text-xs text-slate-800 leading-relaxed font-mono">
              Create a modern, responsive React button component in TypeScript with Tailwind styling. Support variants (primary, secondary, danger, outline), loading states, disabled state, and full WAI-ARIA accessibility. Export as a reusable component with typed props.
            </p>
            <div className="mt-auto pt-3 border-t border-[#6EC6FF]/20 flex items-center gap-2 text-[10px] text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Structured · Model-ready · 4× better results
            </div>
          </CompareCard>
        </div>
      </motion.div>

      {/* 2. Token Saver */}
      <motion.div
        id="feature-compress"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="bg-gradient-to-br from-emerald-50/80 to-white/60 backdrop-blur-md border border-emerald-100 rounded-[32px] p-8 lg:p-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Cpu className="w-7 h-7 text-emerald-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Token Saver</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Compress wordy prompts without losing meaning. Perfect for long system prompts eating your context window.
            </p>
          </div>

          <div className="space-y-5">
            <div className="bg-white/80 rounded-2xl p-4 border border-slate-200">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                <span>Before — 847 tokens</span>
                <span className="text-rose-400">Heavy</span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full w-[85%] bg-rose-300 rounded-full" />
              </div>
              <p className="text-[11px] text-slate-500 mt-3 italic line-clamp-2">
                "I would really appreciate it if you could please carefully analyze the attached list of business problems and provide detailed, comprehensive financial solutions for each and every one of them..."
              </p>
            </div>

            <div className="flex justify-center">
              <div className="flex items-center gap-2 bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md">
                <TrendingDown className="w-4 h-4" />
                -63% tokens saved
              </div>
            </div>

            <div className="bg-emerald-50/80 rounded-2xl p-4 border border-emerald-200">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-2">
                <span>After — 312 tokens</span>
                <span>Ice-Cold</span>
              </div>
              <div className="h-3 bg-emerald-100 rounded-full overflow-hidden">
                <div className="h-full w-[31%] bg-emerald-500 rounded-full" />
              </div>
              <p className="text-[11px] text-slate-700 mt-3 font-mono">
                "Analyze list: [business problems]. Output: concise financial solutions per item. Format: bullet points under headings. Keep direct."
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 3. Grammar Fix */}
      <motion.div
        id="feature-grammar"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-8"
      >
        <div className="space-y-4">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center">
            <FileText className="w-7 h-7 text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-slate-900">Grammar & Clarity Fix</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Fix typos, awkward phrasing, and ambiguous sentences so AI models parse your intent perfectly the first time.
          </p>
        </div>

        <div className="space-y-3">
          <div className="rounded-2xl p-4 bg-rose-50/60 border border-rose-100 relative">
            <span className="absolute -top-2.5 left-4 text-[9px] font-bold bg-rose-200 text-rose-700 px-2 py-0.5 rounded-full uppercase">Messy Draft</span>
            <p className="text-sm text-slate-600 mt-1">
              Write me code for button React that look good and work on mobile phone also make it blue color pls
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["typos", "no punctuation", "vague"].map((issue) => (
                <span key={issue} className="text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-md font-semibold line-through decoration-rose-400">
                  {issue}
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-center py-1">
            <Sparkles className="w-5 h-5 text-[#6EC6FF]" />
          </div>

          <div className="rounded-2xl p-4 bg-white border-2 border-[#6EC6FF]/30 shadow-sm relative">
            <span className="absolute -top-2.5 left-4 text-[9px] font-bold bg-[#6EC6FF] text-white px-2 py-0.5 rounded-full uppercase">SnowBear Polished</span>
            <p className="text-sm text-slate-800 mt-1 font-medium">
              Write React code for a responsive button component with a blue color scheme that works well on mobile devices.
            </p>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {["clear", "professional", "actionable"].map((tag) => (
                <span key={tag} className="text-[9px] bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md font-semibold">
                  ✓ {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* 4. Polar Score */}
      <motion.div
        id="feature-score"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="bg-gradient-to-r from-purple-50/70 via-white/50 to-[#BFE7FF]/30 border border-purple-100 rounded-[32px] p-8 lg:p-10"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-purple-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Polar Prompt Score</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Get a 0–100 quality audit with actionable fixes. Know exactly what's missing before you waste tokens on a bad prompt.
            </p>
          </div>

          <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 border border-purple-100 shadow-sm">
            <div className="flex items-center gap-5 mb-6">
              <div className="relative w-20 h-20 rounded-full border-4 border-purple-100 flex items-center justify-center">
                <div
                  className="absolute inset-[-4px] rounded-full border-4 border-purple-400"
                  style={{ clipPath: "polygon(0 0, 100% 0, 100% 72%, 0 72%)" }}
                />
                <span className="text-2xl font-black text-slate-900 z-10">72</span>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Good — minor tweaks needed</p>
                <p className="text-[10px] text-slate-500">SnowBear Quality Index</p>
              </div>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Recommendations</p>
            <ul className="space-y-2">
              {[
                "Add a target persona for the AI to adopt",
                "Specify desired output format (JSON, markdown, etc.)",
                "Include constraints or word count limits",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-xs text-slate-700 bg-purple-50/50 p-2.5 rounded-xl border-l-4 border-purple-400">
                  <Zap className="w-3.5 h-3.5 text-purple-500 shrink-0 mt-0.5" />
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </motion.div>

      {/* 5. Templates */}
      <motion.div
        id="feature-templates"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="space-y-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-3">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center">
              <Layers className="w-7 h-7 text-rose-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Starter Templates</h3>
            <p className="text-sm text-slate-600 max-w-lg">
              Curated prompt structures for coding, marketing, writing, and more. One click to load — then enhance.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#2980b9] bg-[#BFE7FF]/30 px-4 py-2 rounded-full border border-[#6EC6FF]/20">
            <BookOpen className="w-4 h-4" />
            {STARTER_TEMPLATES.length} templates ready
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {STARTER_TEMPLATES.slice(0, 6).map((tpl) => (
            <div
              key={tpl.id}
              className="group bg-white/60 backdrop-blur-md border border-[#BFE7FF]/60 hover:border-[#6EC6FF] rounded-2xl p-4 transition-all hover:shadow-md hover:-translate-y-0.5"
            >
              <span className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md group-hover:bg-[#6EC6FF]/20 transition-colors">
                {tpl.category}
              </span>
              <h4 className="text-sm font-bold text-slate-900 mt-2">{tpl.title}</h4>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">{tpl.description}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 6. Secure History */}
      <motion.div
        id="feature-history"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        className="bg-slate-900 rounded-[32px] p-8 lg:p-10 text-white overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#6EC6FF]/10 rounded-full blur-[80px] pointer-events-none" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center relative z-10">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <ShieldCheck className="w-7 h-7 text-[#6EC6FF]" />
            </div>
            <h3 className="text-2xl font-black">Secure History Vault</h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              Every optimized prompt auto-saves locally. Sign in to sync across devices with encrypted cloud storage.
            </p>
            <div className="flex items-center gap-3 text-xs text-slate-400">
              <History className="w-4 h-4 text-[#6EC6FF]" />
              <span>Unlimited local history · Cloud sync on Pro</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {[
              { type: "enhance", input: "write landing page copy", date: "Today" },
              { type: "compress", input: "long system prompt for...", date: "Yesterday" },
              { type: "score", input: "analyze customer feedback", date: "2 days ago" },
            ].map((entry, i) => (
              <div
                key={i}
                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-3 flex items-center gap-3 hover:bg-white/10 transition-colors"
              >
                <span className="text-[9px] font-bold uppercase bg-[#6EC6FF]/20 text-[#6EC6FF] px-2 py-0.5 rounded-md shrink-0">
                  {entry.type}
                </span>
                <p className="text-xs text-slate-300 truncate flex-1">{entry.input}</p>
                <span className="text-[9px] text-slate-500 font-mono shrink-0">{entry.date}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </section>
  );
}