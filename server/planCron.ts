import { getAdminToken, rtdbRequest } from "./firebaseAdmin";

interface RtdbCredits {
  month?: string;
  used?: number;
  purchased?: number;
}

interface RtdbUserRow {
  plan?: string;
  planExpiresAt?: number | null;
  planBillingCycle?: string | null;
  credits?: RtdbCredits;
}

function monthKey(): string {
  return new Date().toISOString().slice(0, 7);
}

export async function runPlanMaintenance(): Promise<{
  expired: number;
  creditsReset: number;
  touched: number;
}> {
  const token = await getAdminToken();
  const users = await rtdbRequest<Record<string, RtdbUserRow> | null>("GET", "users", token);
  if (!users || typeof users !== "object") {
    return { expired: 0, creditsReset: 0, touched: 0 };
  }

  const month = monthKey();
  const now = Date.now();
  const updates: Record<string, unknown> = {};
  let expired = 0;
  let creditsReset = 0;

  for (const [uid, user] of Object.entries(users)) {
    if (!user || typeof user !== "object") continue;

    const plan = user.plan || "free";
    const purchased = user.credits?.purchased || 0;

    if (
      plan !== "free" &&
      typeof user.planExpiresAt === "number" &&
      now >= user.planExpiresAt
    ) {
      updates[`users/${uid}/plan`] = "free";
      updates[`users/${uid}/planUpdatedAt`] = now;
      updates[`users/${uid}/planExpiresAt`] = null;
      updates[`users/${uid}/planBillingCycle`] = null;
      updates[`users/${uid}/planActivatedAt`] = null;
      updates[`users/${uid}/credits`] = { month, used: 0, purchased };
      expired += 1;
      continue;
    }

    const credits = user.credits;
    if (credits?.month && credits.month !== month) {
      updates[`users/${uid}/credits`] = { month, used: 0, purchased };
      creditsReset += 1;
    }
  }

  const touched = Object.keys(updates).length;
  if (touched) {
    await rtdbRequest("PATCH", "", token, updates);
  }

  return { expired, creditsReset, touched };
}