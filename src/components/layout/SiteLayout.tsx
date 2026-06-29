import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import { captureReferralFromUrl } from "../../lib/referral";
import { UserProfile } from "../../types";

interface SiteLayoutProps {
  user: UserProfile;
}

export default function SiteLayout({ user }: SiteLayoutProps) {
  const location = useLocation();

  useEffect(() => {
    captureReferralFromUrl(location.search);
  }, [location.search]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E293B] relative overflow-hidden selection:bg-[#BFE7FF] selection:text-slate-900">
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#BFE7FF]/40 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#6EC6FF]/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-[40%] right-[20%] w-[40%] h-[40%] bg-[#BFE7FF]/30 rounded-full blur-[100px] pointer-events-none" />

      <SiteHeader user={user} />
      <Outlet />
      <SiteFooter />
    </div>
  );
}