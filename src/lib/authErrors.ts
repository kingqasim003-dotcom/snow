import { FirebaseError } from "firebase/app";

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/unauthorized-domain":
    "This website domain is not authorized. In Firebase Console go to Authentication → Settings → Authorized domains and add 127.0.0.1 and localhost.",
  "auth/operation-not-allowed":
    "Google sign-in is not enabled. In Firebase Console go to Authentication → Sign-in method and enable Google.",
  "auth/popup-blocked":
    "Popup was blocked by your browser. Trying redirect sign-in...",
  "auth/popup-closed-by-user": "Sign-in cancelled. Please try again.",
  "auth/cancelled-popup-request": "Sign-in cancelled. Please try again.",
  "auth/network-request-failed": "Network error. Check your internet connection and try again.",
  "auth/internal-error":
    "Firebase configuration error. Enable Google sign-in in Firebase Console and add this site's domain to Authorized domains.",
  "auth/web-storage-unsupported":
    "Browser storage is disabled. Allow cookies/storage for this site and try again.",
  "auth/invalid-api-key": "Invalid Firebase API key. Check your .env.local VITE_FIREBASE_* values.",
};

export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof FirebaseError && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error instanceof Error) {
    return error.message.replace("Firebase: ", "").replace(/\(auth\/[^)]+\)\.?/g, "").trim();
  }
  return "Google sign-in failed. Please try again.";
}