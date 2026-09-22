import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
  setPersistence,
  type Auth,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

// Client Firebase config is public by design; fallbacks keep Vercel/static builds working
// when VITE_FIREBASE_* env vars are not injected at build time.
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "snowbear-online.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "snowbear-online",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "snowbear-online.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "420360574036",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:420360574036:web:ed69dd7212199b22ca09c1",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-TXSH91974E",
  databaseURL:
    import.meta.env.VITE_FIREBASE_DATABASE_URL ||
    "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app",
};

function validateFirebaseConfig() {
  const required = ["apiKey", "authDomain", "projectId", "appId", "databaseURL"] as const;
  for (const key of required) {
    if (!firebaseConfig[key]) {
      console.error(`Missing Firebase config: VITE_FIREBASE_${key.toUpperCase()}`);
    }
  }
}

validateFirebaseConfig();

const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApps()[0];

export const auth: Auth = isNewApp
  ? initializeAuth(app, {
      persistence: browserLocalPersistence,
      popupRedirectResolver: browserPopupRedirectResolver,
    })
  : getAuth(app);

if (!isNewApp) {
  void setPersistence(auth, browserLocalPersistence).catch((err) => {
    console.warn("Firebase auth persistence:", err);
  });
}

export const rtdb: Database = getDatabase(app);

export function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}