export function serverConfig() {
  return {
    apiKey:
      process.env.FIREBASE_API_KEY ||
      process.env.VITE_FIREBASE_API_KEY ||
      "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
    databaseUrl: (
      process.env.FIREBASE_DATABASE_URL ||
      process.env.VITE_FIREBASE_DATABASE_URL ||
      ""
    ).replace(/\/$/, ""),
    adminEmail:
      process.env.ADMIN_EMAIL ||
      process.env.FIREBASE_ADMIN_EMAIL ||
      "snowqasimbear@gmail.com",
    adminPassword:
      process.env.ADMIN_PASSWORD ||
      process.env.FIREBASE_ADMIN_PASSWORD ||
      "",
  };
}

let adminTokenCache: { token: string; expiresAt: number } | null = null;

export async function verifyUserToken(idToken: string): Promise<{ uid: string; email: string }> {
  const { apiKey } = serverConfig();
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Invalid or expired session. Sign in again.");
  }
  const user = data.users?.[0];
  if (!user?.localId) throw new Error("Could not verify your account.");
  return { uid: user.localId, email: user.email || "" };
}

export async function getAdminToken(): Promise<string> {
  const { apiKey, adminEmail, adminPassword } = serverConfig();
  if (!adminPassword) {
    throw new Error("Server admin credentials missing (ADMIN_PASSWORD).");
  }
  if (adminTokenCache && adminTokenCache.expiresAt > Date.now() + 60_000) {
    return adminTokenCache.token;
  }
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: adminEmail,
        password: adminPassword,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Server admin auth failed.");
  adminTokenCache = {
    token: data.idToken,
    expiresAt: Date.now() + (parseInt(data.expiresIn, 10) || 3600) * 1000,
  };
  return adminTokenCache.token;
}

export async function rtdbRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<T> {
  const { databaseUrl } = serverConfig();
  const res = await fetch(`${databaseUrl}/${path}.json?auth=${encodeURIComponent(token)}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: T | null = null;
  try {
    data = (await res.json()) as T;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = (data as { error?: string } | null)?.error || `HTTP ${res.status}`;
    throw new Error(String(err));
  }
  return data as T;
}