import { Sparkles, Download, ArrowUpRight } from "lucide-react";
import ExtensionMockup from "../components/ExtensionMockup";
import BrandLogo from "../components/BrandLogo";
import HomeFeatures from "../components/HomeFeatures";
import { PromptItem, UserProfile } from "../types";

interface HomePageProps {
  user: UserProfile;
  onSaveHistory: (item: PromptItem) => void;
  historyList: PromptItem[];
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export default function HomePage({
  user,
  onSaveHistory,
  historyList,
  onClearHistory,
  onDeleteHistoryItem,
}: HomePageProps) {
  const handleDownloadZip = () => {
    const origin = window.location.origin;
    window.location.href = `/api/download-extension?origin=${encodeURIComponent(origin)}`;
  };

  return (
    <>
      <section className="max-w-7xl mx-auto px-6 pt-10 pb-20 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        <div className="lg:col-span-7 space-y-8">
          <div className="inline-flex items-center gap-2 bg-[#BFE7FF]/40 border border-[#6EC6FF]/20 text-[#2c3e50] text-xs font-bold px-4 py-1.5 rounded-full shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-[#6EC6FF]" />
            <span>The Grammarly for AI Prompts</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 leading-[1.08]">
            Write better <span className="text-[#6EC6FF] underline decoration-[#BFE7FF] decoration-8 underline-offset-4">prompts</span>.<br />
            Save thousands of <span className="text-slate-800 italic">tokens</span>.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-xl leading-relaxed">
            SnowBear is a friendly browser extension helper that turns short, fuzzy prompts into detailed, context-rich masterpieces. Save up to 50% on token fees, fix spelling, and benchmark prompt quality.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-md">
            <a
              href="#extension-mockup"
              className="bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white font-bold py-3.5 px-7 rounded-[20px] shadow-lg shadow-[#6EC6FF]/25 transition-all flex items-center justify-center gap-2"
            >
              <span>Test Browser Extension</span>
              <ArrowUpRight className="w-4 h-4" />
            </a>
            <button
              onClick={handleDownloadZip}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold py-3.5 px-6 rounded-[20px] transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              <span>Get Extension ZIP</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-6 pt-4 max-w-lg border-t border-slate-200">
            <div><p className="text-2xl sm:text-3xl font-black text-slate-900">1 Click</p><p className="text-xs text-slate-500 font-medium">Prompt Enhancement</p></div>
            <div><p className="text-2xl sm:text-3xl font-black text-slate-900">-50%</p><p className="text-xs text-slate-500 font-medium">Tokens Saved</p></div>
            <div><p className="text-2xl sm:text-3xl font-black text-slate-900">0 ms</p><p className="text-xs text-slate-500 font-medium">Setup Required</p></div>
          </div>
        </div>

        <div id="extension-mockup" className="lg:col-span-5 flex justify-center relative">
          <div className="absolute inset-0 bg-[#6EC6FF]/10 rounded-[40px] blur-[30px] rotate-6 scale-95 pointer-events-none" />
          <ExtensionMockup
            user={user}
            onSaveHistory={onSaveHistory}
            historyList={historyList}
            onClearHistory={onClearHistory}
            onDeleteHistoryItem={onDeleteHistoryItem}
          />
        </div>
      </section>

      <HomeFeatures />

      <section className="max-w-4xl mx-auto px-6 py-12 relative z-10 border-t border-slate-200">
        <div className="bg-[#BFE7FF]/30 backdrop-blur-md border border-[#BFE7FF] rounded-[32px] p-8 flex flex-col md:flex-row items-center gap-8">
          <BrandLogo size="xl" alt="Snowy the Bear" />
          <div className="space-y-3 text-center md:text-left">
            <h3 className="text-xl font-bold text-slate-900">Meet Snowy the Polar Prompt Engineer</h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Snowy lives inside your browser extension and helps you craft sharper prompts with secure server-side Groq inference.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}