import { useState, useEffect, useCallback, type Dispatch, type SetStateAction } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import SiteLayout from "./components/layout/SiteLayout";
import HomePage from "./pages/HomePage";
import FeaturesPage from "./pages/FeaturesPage";
import PricingPage from "./pages/PricingPage";
import PrivacyPage from "./pages/PrivacyPage";
import AuthPage from "./pages/AuthPage";
import ExtensionBridgePage from "./pages/ExtensionBridgePage";
import CreditsPage from "./pages/CreditsPage";
import CheckoutPage from "./pages/CheckoutPage";
import CheckoutSuccessPage from "./pages/CheckoutSuccessPage";
import EarnPage from "./pages/EarnPage";
import { appendHistoryItem, clearUserHistory, deleteHistoryItem, getUserHistory } from "./lib/history";
import { publishExtensionSync } from "./lib/extensionSync";
import { ExtensionSyncProvider } from "./context/ExtensionSyncContext";
import {
  listenUserCredits,
  applyRemoteCreditsToLocal,
  listenUserPlan,
  fetchUserPlan,
} from "./lib/rtdbUsers";
import { loadSavedProfile, saveProfile } from "./lib/authSession";
import { UserProfile, PromptItem } from "./types";
import { listenPricing } from "./lib/rtdbConfig";
import { updatePlanPacksPrices } from "./data/planPacks";

function AppContent() {
  const { firebaseUser, loading: authLoading } = useAuth();

  const getIdToken = useCallback(async () => {
    if (!firebaseUser) return null;
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  const [user, setUser] = useState<UserProfile>(() => {
    return loadSavedProfile() || { id: "", email: "", plan: "free" };
  });

  const [historyList, setHistoryList] = useState<PromptItem[]>([]);

  useEffect(() => {
    const unsub = listenPricing((pricing) => {
      updatePlanPacksPrices(pricing);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (firebaseUser) {
      setUser((prev) => {
        const saved = loadSavedProfile();
        const next = {
          ...(saved?.id === firebaseUser.uid ? saved : prev),
          id: firebaseUser.uid,
          email: firebaseUser.email || saved?.email || prev.email || "",
          plan:
            prev.id === firebaseUser.uid
              ? prev.plan
              : saved?.id === firebaseUser.uid
                ? saved.plan
                : "free",
        };
        firebaseUser.getIdToken().then((token) => publishExtensionSync(next, token)).catch(() => publishExtensionSync(next));
        return next;
      });
      return;
    }

    setUser({ id: "", email: "", plan: "free" });
    setHistoryList([]);
  }, [firebaseUser, authLoading]);

  useEffect(() => {
    const onSignedOut = () => {
      setUser({ id: "", email: "", plan: "free" });
      setHistoryList([]);
    };
    window.addEventListener("snowbear-signed-out", onSignedOut);
    return () => window.removeEventListener("snowbear-signed-out", onSignedOut);
  }, []);

  useEffect(() => {
    if (!user.id) {
      setHistoryList([]);
      return;
    }
    setHistoryList(getUserHistory(user.id));
  }, [user.id]);

  useEffect(() => {
    if (!user.id && !user.email) return;
    saveProfile(user);
    if (user.id) {
      if (firebaseUser) {
        firebaseUser.getIdToken().then((token) => publishExtensionSync(user, token)).catch(() => publishExtensionSync(user));
      } else {
        publishExtensionSync(user);
      }
    }
  }, [user, firebaseUser]);

  useEffect(() => {
    if (!user.id) return;
    return listenUserCredits(user.id, (credits) => {
      if (applyRemoteCreditsToLocal(user.id, credits)) {
        window.dispatchEvent(new CustomEvent("snowbear-credits-updated"));
        if (firebaseUser) {
          firebaseUser.getIdToken().then((token) => publishExtensionSync(user, token)).catch(() => publishExtensionSync(user));
        } else {
          publishExtensionSync(user);
        }
      }
    });
  }, [user.id, user.email, user.plan, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    fetchUserPlan(uid)
      .then((planState) => {
        if (!planState) return;
        setUser((prev) => {
          if (
            prev.id !== uid ||
            (prev.plan === planState.plan &&
              prev.planExpiresAt === planState.planExpiresAt &&
              prev.planBillingCycle === planState.planBillingCycle)
          ) {
            return prev;
          }
          const next = {
            ...prev,
            plan: planState.plan,
            planExpiresAt: planState.planExpiresAt,
            planBillingCycle: planState.planBillingCycle,
          };
          firebaseUser
            .getIdToken()
            .then((token) => publishExtensionSync(next, token))
            .catch(() => publishExtensionSync(next));
          return next;
        });
      })
      .catch(console.error);
  }, [firebaseUser]);

  useEffect(() => {
    if (!user.id) return;
    return listenUserPlan(user.id, (planState) => {
      setUser((prev) => {
        if (
          prev.plan === planState.plan &&
          prev.planExpiresAt === planState.planExpiresAt &&
          prev.planBillingCycle === planState.planBillingCycle
        ) {
          return prev;
        }
        const next = {
          ...prev,
          plan: planState.plan,
          planExpiresAt: planState.planExpiresAt,
          planBillingCycle: planState.planBillingCycle,
        };
        window.dispatchEvent(new CustomEvent("snowbear-credits-updated"));
        if (firebaseUser) {
          firebaseUser
            .getIdToken()
            .then((token) => publishExtensionSync(next, token))
            .catch(() => publishExtensionSync(next));
        } else {
          publishExtensionSync(next);
        }
        return next;
      });
    });
  }, [user.id, firebaseUser]);

  useEffect(() => {
    if (!firebaseUser || !user.id) return;

    const pushToken = () => {
      firebaseUser
        .getIdToken()
        .then((token) => publishExtensionSync(user, token))
        .catch(() => publishExtensionSync(user));
    };

    const onTokenRequest = () => {
      void firebaseUser.getIdToken().then((token) => {
        publishExtensionSync(user, token);
        window.dispatchEvent(
          new CustomEvent("snowbear-id-token", {
            detail: {
              idToken: token,
              uid: firebaseUser.uid,
              expiresAt: Date.now() + 55 * 60 * 1000,
            },
          })
        );
      });
    };

    pushToken();
    window.addEventListener("snowbear-request-id-token", onTokenRequest);
    const interval = window.setInterval(pushToken, 5 * 60 * 1000);

    return () => {
      window.removeEventListener("snowbear-request-id-token", onTokenRequest);
      window.clearInterval(interval);
    };
  }, [firebaseUser, user]);

  const onSaveHistory = (item: PromptItem) => {
    if (!user.id) return;
    setHistoryList(appendHistoryItem(user.id, item));
    publishExtensionSync(user);
  };

  const onClearHistory = () => {
    if (!user.id) return;
    setHistoryList(clearUserHistory(user.id));
    publishExtensionSync(user);
  };

  const onDeleteHistoryItem = (id: string) => {
    if (!user.id) return;
    setHistoryList(deleteHistoryItem(user.id, id));
    publishExtensionSync(user);
  };

  const sharedProps = {
    user,
    setUser,
    onSaveHistory,
    onClearHistory,
    onDeleteHistoryItem,
    historyList,
    setHistoryList,
  };

  return (
    <ExtensionSyncProvider
      user={user}
      setUser={setUser}
      setHistoryList={setHistoryList}
      getIdToken={getIdToken}
    >
      <Routes>
        <Route element={<SiteLayout user={user} />}>
          <Route index element={<HomePage {...sharedProps} />} />
          <Route path="features" element={<FeaturesPage />} />
          <Route path="pricing" element={<PricingPage user={user} setUser={setUser} />} />
          <Route path="privacy" element={<PrivacyPage />} />
          <Route path="credits" element={<CreditsPage user={user} setUser={setUser} />} />
          <Route path="earn" element={<EarnPage user={user} />} />
          <Route path="checkout" element={<CheckoutPage user={user} />} />
          <Route path="checkout/success" element={<CheckoutSuccessPage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route
            path="extension-bridge"
            element={
              <ExtensionBridgePage
                user={user}
                setUser={setUser}
                setHistoryList={setHistoryList as Dispatch<SetStateAction<PromptItem[]>>}
              />
            }
          />
        </Route>
      </Routes>
    </ExtensionSyncProvider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}