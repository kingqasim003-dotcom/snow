import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import { consumeStoredAuthError, useAuth } from "../context/AuthContext";
import { captureReferralFromUrl } from "../lib/referral";

export default function AuthPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectParam = searchParams.get("redirect") || "/";
  const refParam = searchParams.get("ref");
  const isExtensionFlow = searchParams.get("ext") === "1" || redirectParam.includes("extension-bridge");
  const redirectTo =
    isExtensionFlow && redirectParam.includes("extension-bridge")
      ? "/extension-bridge?ext=1"
      : redirectParam;

  useEffect(() => {
    const storedError = consumeStoredAuthError();
    if (storedError) setError(storedError);
    if (refParam) captureReferralFromUrl(`?ref=${encodeURIComponent(refParam)}`);
  }, [refParam]);

  useEffect(() => {
    if (firebaseUser) {
      setLoading(false);
      navigate(redirectTo, { replace: true });
    }
  }, [firebaseUser, navigate, redirectTo]);

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-in failed.");
      setLoading(false);
    }
  };

  return (
    <section className="max-w-md mx-auto px-6 py-16 relative z-10">
      <div className="bg-white/60 backdrop-blur-md border border-[#BFE7FF]/70 rounded-[28px] p-8 shadow-lg">
        <div className="flex flex-col items-center text-center mb-8">
          <BrandLogo size="lg" />
          <h1 className="text-2xl font-black text-slate-900 mt-4">Welcome to SnowBear</h1>
          <p className="text-sm text-slate-500 mt-1">
            {isExtensionFlow
              ? "Sign in with Google to connect your SnowBear extension"
              : "Sign in or create an account with your Google account"}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-white hover:bg-slate-50 disabled:opacity-60 border border-slate-200 text-slate-800 font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 transition-all shadow-sm"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? "Connecting..." : "Continue with Google"}
        </button>

        <p className="text-[10px] text-slate-400 text-center mt-6 leading-relaxed">
          By continuing you agree to our{" "}
          <Link to="/privacy" className="text-[#6EC6FF] font-semibold hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </section>
  );
}