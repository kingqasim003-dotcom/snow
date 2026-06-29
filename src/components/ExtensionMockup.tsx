import { useMemo, useState } from "react";
import {
  Sparkles,
  Cpu,
  FileText,
  CheckCircle2,
  History,
  BookOpen,
  Lock,
  User,
  Copy,
  Trash2,
  AlertCircle,
  Check,
  Zap,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PromptItem, TemplateItem, UserProfile } from "../types";
import { STARTER_TEMPLATES } from "../data/templates";
import { Link } from "react-router-dom";
import BrandLogo from "./BrandLogo";
import { consumeCredits, getCreditStatus } from "../lib/credits";
import CreditsPanel from "./CreditsPanel";
import { publishExtensionSync } from "../lib/extensionSync";

interface ExtensionMockupProps {
  user: UserProfile;
  onSaveHistory: (item: PromptItem) => void;
  historyList: PromptItem[];
  onClearHistory: () => void;
  onDeleteHistoryItem: (id: string) => void;
}

export default function ExtensionMockup({
  user,
  onSaveHistory,
  historyList,
  onClearHistory,
  onDeleteHistoryItem,
}: ExtensionMockupProps) {
  const [activeTab, setActiveTab] = useState<"welcome" | "dashboard" | "templates" | "history" | "credits">("dashboard");
  const [subTab, setSubTab] = useState<"enhance" | "compress" | "grammar" | "score">("enhance");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [creditTick, setCreditTick] = useState(0);
  const [scoreData, setScoreData] = useState<{ score: number; suggestions: string[] } | null>(null);

  const creditStatus = useMemo(
    () => getCreditStatus(user.id || null, user.plan),
    [user.id, user.plan, creditTick]
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(outputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setErrorMsg("Please enter a prompt first.");
      return;
    }

    if (inputText.length > 10000) {
      setErrorMsg("Prompt is too long. Maximum 10,000 characters.");
      return;
    }

    if (!user.id) {
      setErrorMsg("Please sign in to use SnowBear.");
      setActiveTab("welcome");
      return;
    }

    const preCheck = getCreditStatus(user.id, user.plan, subTab);
    if (!preCheck.allowed) {
      setErrorMsg(preCheck.message || "Not enough credits for this action.");
      setActiveTab("credits");
      return;
    }

    setIsLoading(true);
    setErrorMsg("");
    setOutputText("");
    setScoreData(null);

    const apiPath = `/api/${subTab}`;

    try {
      const response = await fetch(apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: inputText }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();
      const consumed = consumeCredits(user.id, user.plan, subTab);
      if (!consumed.consumed) {
        throw new Error(consumed.message || "Could not apply credit charge.");
      }
      setCreditTick((v) => v + 1);

      if (subTab === "score") {
        setScoreData({
          score: data.score,
          suggestions: data.suggestions || [],
        });
        setOutputText(
          `Prompt Quality Score: ${data.score}/100\n\nSuggestions to Improve:\n${(data.suggestions || [])
            .map((s: string) => `• ${s}`)
            .join("\n")}`
        );
        onSaveHistory({
          id: Date.now().toString(),
          original: inputText,
          improved: JSON.stringify(data),
          type: "score",
          score: data.score,
          suggestions: data.suggestions,
          date: new Date().toLocaleDateString(),
        });
      } else {
        setOutputText(data.result);
        onSaveHistory({
          id: Date.now().toString(),
          original: inputText,
          improved: data.result,
          type: subTab,
          date: new Date().toLocaleDateString(),
        });
      }

      publishExtensionSync(user);
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg(err instanceof Error ? err.message : "An error occurred while connecting to the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectTemplate = (template: TemplateItem) => {
    setInputText(template.promptText);
    setSubTab("enhance");
    setActiveTab("dashboard");
  };

  const guestLocked = !user.email;

  return (
    <div className="w-full max-w-[420px] h-[640px] bg-white/45 backdrop-blur-xl border border-white/60 shadow-2xl rounded-[32px] overflow-hidden flex flex-col relative text-slate-800 font-sans border-t-8 border-t-[#6EC6FF] ring-4 ring-[#6EC6FF]/15">
      <div className="bg-slate-200/45 backdrop-blur-md px-4 py-2 flex items-center justify-between text-[11px] font-medium text-slate-500 border-b border-[#BFE7FF]/40">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
        </div>
        <div className="bg-white/70 backdrop-blur-xs rounded-md px-3 py-0.5 text-[10px] text-slate-400 font-mono shadow-inner border border-white/40 flex items-center gap-1 max-w-[200px] truncate">
          <Lock className="w-3 h-3 text-emerald-500 inline" /> extension://snowbear-popup
        </div>
        <span className="text-[10px] bg-[#6EC6FF]/20 text-[#2980b9] px-1.5 py-0.5 rounded-md font-semibold">v2.4.1</span>
      </div>

      <div className="bg-white/40 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-[#BFE7FF]/30 shadow-xs">
        <div className="flex items-center gap-2">
          <BrandLogo size="header" />
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1">
              SnowBear
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h1>
            <p className="text-[10px] text-slate-500 font-medium font-mono">AI Prompt Companion</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setActiveTab("credits")}
          className="flex items-center gap-1 bg-white/50 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/60 hover:border-[#6EC6FF]/40 transition-colors"
        >
          <span className="text-[10px] font-semibold text-slate-600">
            {user.email ? (creditStatus.plan === "unlimited" ? "∞" : `${creditStatus.remaining} cr`) : "GUEST"}
          </span>
          <div
            className={`w-2 h-2 rounded-full ${
              user.plan === "unlimited" ? "bg-violet-400" : user.plan === "pro" ? "bg-[#6EC6FF]" : "bg-amber-400"
            }`}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/20 backdrop-blur-sm relative">
        <AnimatePresence mode="wait">
          {activeTab === "welcome" && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="text-center py-4">
                <div className="flex justify-center mb-2">
                  <BrandLogo size="lg" alt="Mascot" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Welcome to SnowBear</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Sign in with Google to use credits, save history, and sync with the Chrome extension.
                </p>
              </div>

              <Link
                to="/auth?redirect=/extension-bridge&ext=1"
                className="block w-full bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs py-2.5 rounded-xl shadow-sm text-center transition-all"
              >
                Continue with Google
              </Link>
              <p className="text-[10px] text-slate-400 text-center">10 free credits every month</p>
            </motion.div>
          )}

          {activeTab === "dashboard" && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="bg-white/60 backdrop-blur-md p-1 rounded-2xl border border-white/60 grid grid-cols-4 gap-0.5 shadow-2xs">
                {(
                  [
                    ["enhance", Sparkles, "Enhance"],
                    ["compress", Cpu, "Compress"],
                    ["grammar", FileText, "Grammar"],
                    ["score", CheckCircle2, "Score"],
                  ] as const
                ).map(([tab, Icon, label]) => (
                  <button
                    key={tab}
                    onClick={() => {
                      setSubTab(tab);
                      setErrorMsg("");
                    }}
                    className={`py-1.5 text-[10px] font-bold rounded-xl transition-all flex flex-col items-center gap-0.5 ${
                      subTab === tab ? "bg-[#BFE7FF] text-slate-900" : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Your Original Prompt
                  </label>
                  <button onClick={() => setInputText("")} className="text-[10px] text-[#6EC6FF] font-bold hover:underline">
                    Clear
                  </button>
                </div>
                <div className="bg-white/65 backdrop-blur-md rounded-2xl border border-white/70 p-2.5 shadow-sm relative focus-within:ring-2 focus-within:ring-[#6EC6FF]/40 transition-all">
                  <textarea
                    rows={4}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Write a blog post about AI..."
                    className="w-full text-xs bg-transparent border-0 resize-none outline-hidden focus:ring-0 text-slate-700 leading-relaxed placeholder:text-slate-400"
                  />
                  <div className="absolute right-2.5 bottom-2 text-[9px] font-mono text-slate-400">{inputText.length} chars</div>
                </div>
              </div>

              <button
                onClick={handleProcess}
                disabled={isLoading}
                className="w-full bg-[#6EC6FF] hover:bg-[#5bb8f0] disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-2xl shadow-md shadow-[#6EC6FF]/15 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span className="text-xs font-bold tracking-wide">SnowBear is thinking...</span>
                  </>
                ) : (
                  <span className="text-xs font-bold tracking-wide">Run {subTab}</span>
                )}
              </button>

              {errorMsg && (
                <div className="bg-rose-50 border border-rose-100 p-3 rounded-2xl text-[11px] text-rose-600 font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="leading-normal">{errorMsg}</p>
                </div>
              )}

              {outputText && !isLoading && (
                <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Result</label>
                    <button onClick={handleCopy} className="text-[10px] text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1">
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="bg-white/70 backdrop-blur-md border border-white/60 rounded-2xl p-3 shadow-xs">
                    {subTab === "score" && scoreData && (
                      <p className="text-[11px] font-bold text-slate-800 mb-2">Score: {scoreData.score}/100</p>
                    )}
                    <div className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-[160px] overflow-y-auto">
                      {outputText}
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

          {activeTab === "templates" && (
            <motion.div key="templates" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Templates</h3>
              <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                {STARTER_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => handleSelectTemplate(tpl)}
                    className="w-full text-left bg-white/70 backdrop-blur-md hover:bg-[#BFE7FF]/20 border border-[#BFE7FF]/50 rounded-2xl p-3 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-md">{tpl.category}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 mt-1.5">{tpl.title}</h4>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">History</h3>
                {historyList.length > 0 && (
                  <button onClick={onClearHistory} className="text-[10px] text-rose-500 font-bold hover:underline flex items-center gap-1">
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              {historyList.length === 0 ? (
                <p className="text-center text-[10px] text-slate-400 py-8">No saved prompts yet.</p>
              ) : (
                <div className="space-y-2 max-h-[440px] overflow-y-auto pr-1">
                  {historyList.map((item) => (
                    <div key={item.id} className="bg-white/70 border border-[#BFE7FF]/50 rounded-2xl p-3 relative group">
                      <button
                        onClick={() => onDeleteHistoryItem(item.id)}
                        className="absolute right-3 top-3 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[9px] bg-slate-100 text-slate-500 uppercase font-bold px-1.5 py-0.5 rounded-sm">{item.type}</span>
                      <p className="text-[10px] text-slate-600 line-clamp-2 mt-1">{item.original}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === "credits" && (
            <motion.div key="credits" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Credits</h3>
              <CreditsPanel user={user} compact />
              <Link to="/pricing" className="block text-center text-[10px] font-bold text-[#6EC6FF] hover:underline">
                View plans & upgrade
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        className={`bg-white/60 backdrop-blur-md border-t border-[#BFE7FF]/40 px-2 py-3 grid gap-1 text-center shadow-md ${
          guestLocked ? "grid-cols-5" : "grid-cols-4"
        }`}
      >
        {(
          [
            ["dashboard", Sparkles, "Optimize"],
            ["templates", BookOpen, "Templates"],
            ["history", History, "History"],
            ["credits", Zap, "Credits"],
          ] as const
        ).map(([tab, Icon, label]) => (
          <button
            key={tab}
            onClick={() => {
              if (guestLocked && tab !== "credits") {
                setActiveTab("welcome");
                return;
              }
              setActiveTab(tab);
            }}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === tab ? "text-[#6EC6FF]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[9px] font-bold">{label}</span>
          </button>
        ))}

        {guestLocked && (
          <button
            onClick={() => setActiveTab("welcome")}
            className={`flex flex-col items-center gap-0.5 transition-colors ${
              activeTab === "welcome" ? "text-[#6EC6FF]" : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <User className="w-5 h-5" />
            <span className="text-[9px] font-bold">Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
}