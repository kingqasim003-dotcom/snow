const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";
const REQUEST_TIMEOUT_MS = 30_000;
const GROQ_RATE_LIMIT_PER_KEY = 30;
const GROQ_RATE_WINDOW_MS = 60_000;

interface KeyUsage {
  count: number;
  resetAt: number;
  cooldownUntil?: number;
}

const keyUsageStore = new Map<string, KeyUsage>();
let roundRobinIndex = 0;

function loadGroqApiKeys(): string[] {
  const multi = process.env.GROQ_API_KEYS
    ?.split(/[,\n]/)
    .map((key) => key.trim())
    .filter(Boolean);

  if (multi?.length) {
    return multi;
  }

  const single = process.env.GROQ_API_KEY?.trim();
  if (single) {
    return [single];
  }

  throw new Error("No Groq API keys configured.");
}

function maskKey(key: string): string {
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function isKeyAvailable(key: string, now: number): boolean {
  const usage = keyUsageStore.get(key);
  if (!usage) return true;
  if (usage.cooldownUntil && now < usage.cooldownUntil) return false;
  if (now >= usage.resetAt) return true;
  return usage.count < GROQ_RATE_LIMIT_PER_KEY;
}

function recordKeyUsage(key: string, now: number): void {
  const usage = keyUsageStore.get(key);

  if (!usage || now >= usage.resetAt) {
    keyUsageStore.set(key, { count: 1, resetAt: now + GROQ_RATE_WINDOW_MS });
    return;
  }

  usage.count += 1;
}

function markKeyRateLimited(key: string, now: number): void {
  const usage = keyUsageStore.get(key);
  if (!usage || now >= usage.resetAt) {
    keyUsageStore.set(key, {
      count: GROQ_RATE_LIMIT_PER_KEY,
      resetAt: now + GROQ_RATE_WINDOW_MS,
      cooldownUntil: now + GROQ_RATE_WINDOW_MS,
    });
    return;
  }

  usage.count = GROQ_RATE_LIMIT_PER_KEY;
  usage.cooldownUntil = now + GROQ_RATE_WINDOW_MS;
}

function selectNextKey(keys: string[], tried: Set<string>, now: number): string | null {
  const available = keys.filter((key) => !tried.has(key) && isKeyAvailable(key, now));
  if (!available.length) return null;

  const offset = roundRobinIndex % available.length;
  const selected = available[offset];
  roundRobinIndex = (roundRobinIndex + 1) % keys.length;
  return selected;
}

async function requestGroq(
  apiKey: string,
  systemInstruction: string,
  userPrompt: string,
  temperature: number,
  jsonMode: boolean,
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      temperature,
    };

    if (jsonMode) {
      body.response_format = { type: "json_object" };
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (response.status === 429) {
      throw Object.assign(new Error("Groq rate limit reached."), { status: 429 });
    }

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Groq API error [${maskKey(apiKey)}]:`, response.status, errText.slice(0, 200));
      throw new Error("AI service temporarily unavailable.");
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content || typeof content !== "string") {
      throw new Error("AI service returned an empty response.");
    }

    return content;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("AI request timed out.");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callGroqChatCompletion({
  systemInstruction,
  userPrompt,
  temperature = 0.7,
  jsonMode = false,
}: {
  systemInstruction: string;
  userPrompt: string;
  temperature?: number;
  jsonMode?: boolean;
}): Promise<string> {
  const keys = loadGroqApiKeys();
  const tried = new Set<string>();
  let lastError: Error | null = null;

  while (tried.size < keys.length) {
    const now = Date.now();
    const apiKey = selectNextKey(keys, tried, now);

    if (!apiKey) {
      break;
    }

    tried.add(apiKey);
    recordKeyUsage(apiKey, now);

    try {
      return await requestGroq(apiKey, systemInstruction, userPrompt, temperature, jsonMode);
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown Groq error.");
      lastError = error;

      if ((err as { status?: number }).status === 429) {
        markKeyRateLimited(apiKey, now);
        console.warn(`Groq key ${maskKey(apiKey)} hit rate limit, switching to next key...`);
        continue;
      }

      throw error;
    }
  }

  throw lastError ?? new Error("All Groq API keys are at the 30 requests/minute limit. Please wait and try again.");
}