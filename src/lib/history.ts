import type { PromptItem } from "../types";

type HistoryStore = Record<string, PromptItem[]>;

function readStore(): HistoryStore {
  try {
    const raw = localStorage.getItem("snowbear_history");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { __legacy__: parsed };
    }
    return parsed as HistoryStore;
  } catch {
    return {};
  }
}

function writeStore(store: HistoryStore) {
  localStorage.setItem("snowbear_history", JSON.stringify(store));
}

export function getUserHistory(uid: string | null): PromptItem[] {
  if (!uid) return [];
  const store = readStore();
  return store[uid] || store.__legacy__ || [];
}

export function saveUserHistory(uid: string, items: PromptItem[]) {
  const store = readStore();
  if (store.__legacy__) delete store.__legacy__;
  store[uid] = items;
  writeStore(store);
}

export function appendHistoryItem(uid: string, item: PromptItem): PromptItem[] {
  const current = getUserHistory(uid);
  const next = [item, ...current].slice(0, 200);
  saveUserHistory(uid, next);
  return next;
}

export function clearUserHistory(uid: string): PromptItem[] {
  saveUserHistory(uid, []);
  return [];
}

export function deleteHistoryItem(uid: string, id: string): PromptItem[] {
  const next = getUserHistory(uid).filter((item) => item.id !== id);
  saveUserHistory(uid, next);
  return next;
}

export function mergeHistoryLists(a: PromptItem[], b: PromptItem[]): PromptItem[] {
  const map = new Map<string, PromptItem>();
  for (const item of [...a, ...b]) map.set(item.id, item);
  return [...map.values()].sort((x, y) => Number(y.id) - Number(x.id)).slice(0, 200);
}