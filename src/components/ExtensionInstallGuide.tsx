import {
  Download,
  FolderArchive,
  Puzzle,
  ToggleRight,
  Upload,
  Pin,
  LogIn,
  CheckCircle2,
  Chrome,
} from "lucide-react";
import { downloadExtensionZip, EXTENSION_VERSION } from "../lib/extensionDownload";

const steps = [
  {
    step: 1,
    icon: Download,
    title: "Download the extension ZIP",
    desc: `Click the button below to download SnowBear extension v${EXTENSION_VERSION} (snowbear-chrome-extension.zip).`,
    action: "download",
  },
  {
    step: 2,
    icon: FolderArchive,
    title: "Unzip the folder",
    desc: "Extract the ZIP to a permanent folder (e.g. Documents\\SnowBear). Keep this folder — Chrome loads it from disk.",
  },
  {
    step: 3,
    icon: Chrome,
    title: "Open Chrome extensions",
    desc: "In Chrome, go to chrome://extensions or Menu → Extensions → Manage Extensions.",
  },
  {
    step: 4,
    icon: ToggleRight,
    title: "Turn on Developer mode",
    desc: "Enable the Developer mode toggle in the top-right corner of the extensions page.",
  },
  {
    step: 5,
    icon: Upload,
    title: "Load unpacked",
    desc: 'Click "Load unpacked" and select the extracted SnowBear folder (the one containing manifest.json).',
  },
  {
    step: 6,
    icon: Pin,
    title: "Pin SnowBear to your toolbar",
    desc: "Click the puzzle icon in Chrome, then pin SnowBear so it is always one click away.",
  },
  {
    step: 7,
    icon: LogIn,
    title: "Sign in with Google",
    desc: 'Open SnowBear, click "Continue with Google". You will be redirected to snowbear.online to sign in — same account as the website.',
  },
  {
    step: 8,
    icon: CheckCircle2,
    title: "Start enhancing prompts",
    desc: "Visit ChatGPT, Claude, Grok, or Gemini. SnowBear appears on supported sites with enhance, compress, grammar, and score tools.",
  },
];

export default function ExtensionInstallGuide() {
  return (
    <section id="install-extension" className="max-w-6xl mx-auto px-6 py-16 relative z-10">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 bg-[#BFE7FF]/40 border border-[#6EC6FF]/20 text-[#2c3e50] text-xs font-bold px-4 py-1.5 rounded-full mb-4">
          <Puzzle className="w-3.5 h-3.5 text-[#6EC6FF]" />
          <span>Chrome Extension Setup</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
          Install SnowBear in 8 easy steps
        </h2>
        <p className="text-slate-600 mt-3 max-w-2xl mx-auto text-sm sm:text-base">
          From download to your first enhanced prompt — follow this guide to load the extension in Chrome and connect your Google account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {steps.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.step}
              className="group bg-white/70 backdrop-blur-md border border-[#BFE7FF]/60 rounded-[24px] p-6 shadow-sm hover:shadow-md hover:border-[#6EC6FF]/30 transition-all flex gap-4"
            >
              <div className="shrink-0 flex flex-col items-center gap-2">
                <span className="w-9 h-9 rounded-full bg-[#6EC6FF] text-white text-sm font-black flex items-center justify-center shadow-md shadow-[#6EC6FF]/25">
                  {item.step}
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#BFE7FF]/40 flex items-center justify-center text-[#6EC6FF]">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-slate-900 text-base mb-1.5">{item.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{item.desc}</p>
                {item.action === "download" && (
                  <button
                    type="button"
                    onClick={downloadExtensionZip}
                    className="mt-4 inline-flex items-center gap-2 bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download Extension ZIP
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-10 bg-gradient-to-r from-[#BFE7FF]/30 to-[#6EC6FF]/10 border border-[#BFE7FF] rounded-[28px] p-6 sm:p-8 text-center">
        <p className="text-sm text-slate-700 font-medium">
          After sign-in, your credits, plan, and prompt history sync automatically between{" "}
          <strong className="text-slate-900">snowbear.online</strong> and the extension.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Need help? Make sure you selected the folder with <code className="bg-white/80 px-1.5 py-0.5 rounded">manifest.json</code> when loading unpacked.
        </p>
      </div>
    </section>
  );
}