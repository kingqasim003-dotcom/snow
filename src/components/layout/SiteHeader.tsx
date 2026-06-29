import { Link, NavLink } from "react-router-dom";
import { Download, LogOut, User, Zap } from "lucide-react";
import BrandLogo from "../BrandLogo";
import { useAuth } from "../../context/AuthContext";
import { UserProfile } from "../../types";

interface SiteHeaderProps {
  user: UserProfile;
}

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `hover:text-slate-900 transition-colors ${isActive ? "text-slate-900" : ""}`;

export default function SiteHeader({ user }: SiteHeaderProps) {
  const { firebaseUser, signOut } = useAuth();

  return (
    <header className="max-w-7xl mx-auto my-2 px-4 py-2 flex items-center justify-between relative z-10 bg-white/50 backdrop-blur-md border border-[#BFE7FF]/60 rounded-2xl shadow-xs">
      <Link to="/" className="flex items-center gap-2.5">
        <BrandLogo size="header" />
        <div className="leading-tight">
          <h2 className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            SnowBear
            <span className="text-[9px] bg-[#BFE7FF] text-[#2980b9] font-bold px-1.5 py-0.5 rounded-full">v1.0.4</span>
          </h2>
          <p className="text-[9px] text-slate-500 font-medium tracking-wide uppercase hidden sm:block">
            AI Prompt Companion
          </p>
        </div>
      </Link>

      <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
        <NavLink to="/features" className={navLinkClass}>Features</NavLink>
        <NavLink to="/pricing" className={navLinkClass}>Pricing</NavLink>
        <NavLink to="/credits" className={navLinkClass}>Credits</NavLink>
        <NavLink to="/earn" className={navLinkClass}>Earn</NavLink>
        <NavLink to="/privacy" className={navLinkClass}>Privacy</NavLink>
      </nav>

      <div className="flex items-center gap-2.5">
        {user.plan === "free" ? (
          <Link
            to="/pricing"
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 shadow-2xs"
          >
            <Zap className="w-3.5 h-3.5 text-[#6EC6FF]" />
            <span>Get Pro</span>
          </Link>
        ) : user.plan === "unlimited" ? (
          <div className="bg-slate-900 text-[#BFE7FF] text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#6EC6FF]/30 flex items-center gap-1.5 shadow-2xs">
            <span>👑 Unlimited</span>
          </div>
        ) : (
          <div className="bg-[#BFE7FF]/30 text-[#2980b9] text-[11px] font-bold px-3 py-1.5 rounded-full border border-[#6EC6FF]/30 flex items-center gap-1.5 shadow-2xs">
            <Zap className="w-3.5 h-3.5 fill-[#2980b9]" />
            <span>Polar Pro</span>
          </div>
        )}

        {firebaseUser ? (
          <button
            onClick={() => signOut()}
            className="bg-white border border-slate-200 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline max-w-[120px] truncate">{firebaseUser.email}</span>
          </button>
        ) : (
          <Link
            to="/auth"
            className="bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5"
          >
            <User className="w-3.5 h-3.5" />
            <span>Google Sign In</span>
          </Link>
        )}

        <button
          type="button"
          onClick={() => {
            const origin = window.location.origin;
            window.location.href = `/api/download-extension?origin=${encodeURIComponent(origin)}`;
          }}
          className="bg-[#6EC6FF] hover:bg-[#5bb8f0] text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full shadow-md shadow-[#6EC6FF]/20 transition-all flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Get Extension</span>
        </button>
      </div>
    </header>
  );
}