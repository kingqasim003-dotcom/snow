/** Repair incomplete / credits-only user nodes so admin shows email + plan. */
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
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error || `${method} ${path} failed`);
  return data;
}

function emailKey(email) {
  return email.trim().toLowerCase().replace(/\./g, ",");
}

async function main() {
  const token = await signIn();
  await rtdbRequest("PUT", `config/adminEmails/${emailKey(CFG.adminEmail)}`, token, true);

  const users = (await rtdbRequest("GET", "users", token)) || {};
  const uids = Object.keys(users);
  const now = Date.now();
  let fixed = 0;

  for (const uid of uids) {
    const u = users[uid] || {};
    const patch = {};
    if (!u.email) patch.email = `user-${uid.slice(0, 8)}@unknown`;
    if (!u.plan) patch.plan = "free";
    if (!u.createdAt) patch.createdAt = now;

    if (Object.keys(patch).length) {
      await rtdbRequest("PATCH", `users/${uid}`, token, patch);
      console.log(`  patched ${uid}:`, Object.keys(patch).join(", "));
      fixed += 1;
    }
    if (!u.credits) {
      await rtdbRequest("PUT", `users/${uid}/credits`, token, { month, used: 0, purchased: 0 });
      console.log(`  credits ${uid}`);
      fixed += 1;
    }
  }

  console.log(`Done. Repaired ${fixed} issue(s) across ${uids.length} user(s).`);
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});