/**
 * One-shot: reset every RTDB user to Free plan with exactly 10 credits
 * (used=0, purchased=0 → free allowance = 10).
 */
const CFG = {
  apiKey: "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
  databaseURL: "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  adminEmail: "snowqasimbear@gmail.com",
  adminPassword: "Snowbear0io",
};

const month = new Date().toISOString().slice(0, 7);

async function signIn() {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CFG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: CFG.adminEmail,
        password: CFG.adminPassword,
        returnSecureToken: true,
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Sign-in failed");
  return data.idToken;
}

async function rtdbRequest(method, path, token, body) {
  const url = `${CFG.databaseURL}/${path}.json?auth=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}`;
    throw new Error(`${method} ${path}: ${msg}`);
  }
  return data;
}

function emailKey(email) {
  return email.trim().toLowerCase().replace(/\./g, ",");
}

async function main() {
  console.log("Signing in as admin…");
  const token = await signIn();
  const ek = emailKey(CFG.adminEmail);

  console.log("Ensuring admin access…");
  await rtdbRequest("PUT", `config/adminEmails/${ek}`, token, true);

  console.log("Fetching users…");
  const users = (await rtdbRequest("GET", "users", token)) || {};
  const uids = Object.keys(users);
  if (!uids.length) {
    console.log("No users in database.");
    return;
  }

  const now = Date.now();
  const credits = { month, used: 0, purchased: 0 };

  console.log(`Resetting ${uids.length} user(s) to Free · 10 credits…`);
  for (const uid of uids) {
    const u = users[uid];
    const email = u?.email || uid;
    await rtdbRequest("PUT", `users/${uid}/credits`, token, credits);
    await rtdbRequest("PATCH", `users/${uid}`, token, { plan: "free", planUpdatedAt: now });
    console.log(`  ✓ ${email}`);
  }

  try {
    await rtdbRequest("PUT", "config/bulkActivateV1", token, now);
  } catch (_) { /* optional flag */ }

  console.log(`Done. ${uids.length} accounts now have 10 credits (used=0, purchased=0, plan=free).`);
}

main().catch((err) => {
  console.error("FAILED:", err.message || err);
  process.exit(1);
});