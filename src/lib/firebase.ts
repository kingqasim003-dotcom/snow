import { initializeApp, getApps } from "firebase/app";
import {
  browserLocalPersistence,
  browserPopupRedirectResolver,
  getAuth,
  initializeAuth,
  type Auth,
} from "firebase/auth";
import { getDatabase, type Database } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
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

export const rtdb: Database = getDatabase(app);

export function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}