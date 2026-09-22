import { getAdminToken, rtdbRequest } from "./firebaseAdmin";
import {
  callGroqChatCompletion,
  loadGroqApiKeys,
  maskKey,
  testGroqApiKey,
} from "./groq";
import { grammarSystemInstructionFast, grammarUserPrompt, guardGrammarOutput } from "./prompts";

export type HealthSlot = "morning" | "midday" | "night";

export interface KeyHealthRow {
  id: string;
  masked: string;
  status: "active" | "inactive";
  latencyMs: number;
  error: string | null;
  sample: string | null;
  testedAt: number;
}

export interface ServiceHealthRow {
  status: "active" | "inactive";
  latencyMs: number;
  error: string | null;
  endpoint: string;
  testedAt: number;
}

export interface ApiHealthSnapshot {
  lastRunAt: number;
  slot: HealthSlot;
  website: ServiceHealthRow;
  extension: ServiceHealthRow;
  keys: KeyHealthRow[];
  summary: {
    totalKeys: number;
    activeKeys: number;
    allActive: boolean;
  };
}

export function resolveHealthSlot(date = new Date()): HealthSlot {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "midday";
  return "night";
}

export function slotLabel(slot: HealthSlot): string {
  if (slot === "morning") return "Morning (start of day)";
  if (slot === "midday") return "Midday";
  return "Night";
}

async function testWebsiteGrammarPipeline(): Promise<ServiceHealthRow> {
  const started = Date.now();
  const endpoint = "/api/grammar";
  const prompt = "hello wrld test";
  try {
    const result = await callGroqChatCompletion({
      systemInstruction: grammarSystemInstructionFast(),
      userPrompt: grammarUserPrompt(prompt),
      temperature: 0,
      maxTokens: 32,
    });
    const cleaned = guardGrammarOutput(prompt, result);
    if (!cleaned || cleaned.length < 2) {
      return {
        status: "inactive",
        latencyMs: Date.now() - started,
        error: "Grammar pipeline returned empty output.",
        endpoint,
        testedAt: Date.now(),
      };
    }
    return {
      status: "active",
      latencyMs: Date.now() - started,
      error: null,
      endpoint,
      testedAt: Date.now(),
    };
  } catch (err) {
    return {
      status: "inactive",
      latencyMs: Date.now() - started,
      error: err instanceof Error ? err.message : "Website grammar test failed.",
      endpoint,
      testedAt: Date.now(),
    };
  }
}

export async function runApiHealthCheck(slot?: HealthSlot): Promise<ApiHealthSnapshot> {
  const resolvedSlot = slot || resolveHealthSlot();
  const keys = loadGroqApiKeys();
  const keyRows: KeyHealthRow[] = [];

  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    const result = await testGroqApiKey(key);
    keyRows.push({
      id: `key-${i}`,
      masked: maskKey(key),
      status: result.ok ? "active" : "inactive",
      latencyMs: result.latencyMs,
      error: result.error || null,
      sample: result.sample || null,
      testedAt: Date.now(),
    });
  }

  const website = await testWebsiteGrammarPipeline();
  const extension: ServiceHealthRow = {
    ...website,
    endpoint: "extension → website API (/api/grammar)",
    testedAt: Date.now(),
  };

  const activeKeys = keyRows.filter((k) => k.status === "active").length;
  const snapshot: ApiHealthSnapshot = {
    lastRunAt: Date.now(),
    slot: resolvedSlot,
    website,
    extension,
    keys: keyRows,
    summary: {
      totalKeys: keyRows.length,
      activeKeys,
      allActive:
        activeKeys === keyRows.length &&
        website.status === "active" &&
        extension.status === "active",
    },
  };

  return snapshot;
}

export async function saveApiHealthSnapshot(snapshot: ApiHealthSnapshot): Promise<void> {
  const token = await getAdminToken();
  await rtdbRequest("PUT", "config/apiHealth", token, snapshot);
  await rtdbRequest("PUT", `config/apiHealthHistory/${snapshot.lastRunAt}`, token, {
    slot: snapshot.slot,
    summary: snapshot.summary,
    inactiveKeys: snapshot.keys.filter((k) => k.status === "inactive").map((k) => k.masked),
    websiteStatus: snapshot.website.status,
    extensionStatus: snapshot.extension.status,
    ranAt: snapshot.lastRunAt,
  });
}

export async function runAndPersistHealthCheck(slot?: HealthSlot): Promise<ApiHealthSnapshot> {
  const snapshot = await runApiHealthCheck(slot);
  await saveApiHealthSnapshot(snapshot);
  return snapshot;
}