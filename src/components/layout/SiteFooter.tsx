import { Link } from "react-router-dom";

export default function SiteFooter() {
  return (
    <footer className="max-w-7xl mx-auto px-6 py-10 relative z-10 text-center text-xs text-slate-400 border-t border-slate-100 mt-10">
      <div className="flex flex-wrap justify-center gap-4 mb-4 text-[11px] font-semibold">
        <Link to="/features" className="hover:text-slate-600">Features</Link>
        <Link to="/pricing" className="hover:text-slate-600">Pricing</Link>
        <Link to="/credits" className="hover:text-slate-600">Credits</Link>
        <Link to="/earn" className="hover:text-slate-600">Earn</Link>
        <Link to="/privacy" className="hover:text-slate-600">Privacy Policy</Link>
        <Link to="/auth" className="hover:text-slate-600">Google Sign In</Link>
      </div>
      <p>© 2026 SnowBear AI. All rights reserved. Your tokens are protected by absolute Arctic logic.</p>
      <p className="mt-1 text-[10px]">Powered securely by server-side Groq Llama inference. API keys never leave the server.</p>
    </footer>
  );
}