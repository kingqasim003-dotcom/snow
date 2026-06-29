/**
 * Create a test promo and verify a user can redeem it.
 * Run: node scripts/test-promo-redeem.mjs
 */
const CFG = {
  apiKey: "AIzaSyCSlC-QUUXIdqk-E--83KdX84-1AKtOJiA",
  databaseURL: "https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app",
  adminEmail: "snowqasimbear@gmail.com",
  adminPassword: "Snowbear0io",
};

function promoPathKey(code) {
  return code.trim().toUpperCase().replace(/\s+/g, "").replace(/[.#$[\]/]/g, "");
}

async function signUp(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${CFG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Sign-up failed");
  return data;
}

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CFG.apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Sign-in failed");
  return data;
}

async function rtdb(method, path, token, body) {
  const res = await fetch(`${CFG.databaseURL}/${path}.json?auth=${encodeURIComponent(token)}`, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function main() {
  const admin = await signIn(CFG.adminEmail, CFG.adminPassword);
  const code = `SNOW-TEST-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  const key = promoPathKey(code);
  console.log("Promo:", code);

  let r = await rtdb("PUT", `promoCodes/${key}`, admin.idToken, {
    code,
    credits: 25,
    active: true,
    createdAt: Date.now(),
    createdBy: CFG.adminEmail,
  });
  console.log("create promo", r.status, r.text.slice(0, 120));

  const email = `promotest_${Date.now()}@gmail.com`;
  const user = await signUp(email, "TestPass123!");
  console.log("test user", user.localId);

  r = await rtdb("PATCH", `promoCodes/${key}`, user.idToken, {
    usedByUid: user.localId,
    usedByEmail: email,
    usedAt: Date.now(),
    active: false,
  });
  console.log("redeem promo", r.status, r.text.slice(0, 120));
  if (!r.ok) {
    console.error("FAIL — publish database.rules.json first (node scripts/publish-database-rules.mjs)");
    await rtdb("DELETE", `promoCodes/${key}`, admin.idToken);
    process.exit(1);
  }

  const month = new Date().toISOString().slice(0, 7);
  r = await rtdb("PUT", `users/${user.localId}/credits`, user.idToken, {
    month,
    used: 0,
    purchased: 25,
  });
  console.log("grant credits", r.status);

  await rtdb("DELETE", `promoCodes/${key}`, admin.idToken);
  console.log("OK — promo redeem permissions work.");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});