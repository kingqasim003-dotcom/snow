import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { isDisposableEmail } from "../lib/disposableEmails";
import { getAuthErrorMessage } from "../lib/authErrors";
import { getPendingReferralCode, clearPendingReferralCode } from "../lib/referral";
import { claimReferralSignup } from "../lib/rtdbReferral";
import { ensureUserRecord } from "../lib/rtdbUsers";
interface AuthContextValue {
  firebaseUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const REDIRECT_ERROR_KEY = "snowbear_auth_error";
const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({ prompt: "select_account" });

function shouldUseRedirect(): boolean {
  const host = window.location.hostname;
  return host === "127.0.0.1" || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function storeAuthError(message: string) {
  sessionStorage.setItem(REDIRECT_ERROR_KEY, message);
}

export function consumeStoredAuthError(): string | null {
  const message = sessionStorage.getItem(REDIRECT_ERROR_KEY);
  if (message) sessionStorage.removeItem(REDIRECT_ERROR_KEY);
  return message;
}

async function validateGoogleUser(user: User): Promise<void> {
  const email = user.email;
  if (!email || isDisposableEmail(email)) {
    await firebaseSignOut(auth);
    throw new Error("Please sign in with a real Google account. Temporary emails are not allowed.");
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRedirectResult(auth)
      .then(async (result) => {
        if (result?.user) {
          await validateGoogleUser(result.user);
        }
      })
      .catch((error) => {
        const message = getAuthErrorMessage(error);
        console.error("Google redirect sign-in failed:", message);
        storeAuthError(message);
      });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setLoading(false);
      if (user?.uid && user.email && !isDisposableEmail(user.email)) {
        ensureUserRecord({ id: user.uid, email: user.email, plan: "free" })
          .then(async () => {
            const refCode = getPendingReferralCode();
            if (!refCode) return;
            try {
              const idToken = await user.getIdToken();
              await claimReferralSignup(idToken, refCode);
              clearPendingReferralCode();
            } catch (err) {
              console.error("Referral claim on login:", err);
            }
          })
          .catch((err) => console.error("ensureUserRecord on login:", err));
      }
    });
    return unsubscribe;
  }, []);

  const signInWithGoogle = async () => {
    if (shouldUseRedirect()) {
      await signInWithRedirect(auth, googleProvider);
      return;
    }

    try {
      const result = await signInWithPopup(auth, googleProvider);
      await validateGoogleUser(result.user);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;

      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
          throw new Error(getAuthErrorMessage(error));
        }
        await signInWithRedirect(auth, googleProvider);
        return;
      }

      throw new Error(getAuthErrorMessage(error));
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}