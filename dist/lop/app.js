(function () {
  const CFG = window.SNOWBEAR_ADMIN_CONFIG;
  const SESSION_KEY = "snowbear_admin_gate_ok";
  const REQUIRED_DB_HOST = "asia-southeast1.firebasedatabase.app";

  if (!CFG) {
    document.body.innerHTML =
      "<div style='padding:2rem;max-width:32rem;margin:0 auto;font-family:system-ui,sans-serif'>" +
      "<h1 style='color:#b91c1c;font-size:1.1rem'>Admin panel not configured</h1>" +
      "<p style='color:#64748b;font-size:.9rem;line-height:1.5'>Start the SnowBear server (<code>npm run dev</code> or <code>npm run start</code>) and set <code>ADMIN_EMAIL</code>, <code>ADMIN_GATE_PASSWORD</code>, and <code>ADMIN_PASSWORD</code> in <code>.env.local</code> or your host environment. See <code>.env.example</code>.</p>" +
      "</div>";
    return;
  }

  if (!CFG?.firebase?.databaseURL?.includes(REQUIRED_DB_HOST)) {
    document.body.innerHTML =
      "<p style='padding:2rem;color:#b91c1c'>Wrong database URL. Use:<br><code>https://snowbear-online-default-rtdb.asia-southeast1.firebasedatabase.app</code></p>";
    return;
  }

  const fbApp = firebase.initializeApp(CFG.firebase);
  const auth = firebase.auth();
  const db = firebase.database(fbApp);

  const gate = document.getElementById("gate");
  const appEl = document.getElementById("app");
  const gatePassword = document.getElementById("gate-password");
  const gateBtn = document.getElementById("gate-btn");
  const gateError = document.getElementById("gate-error");
  const nav = document.getElementById("nav");
  const main = document.getElementById("main");
  const topbar = document.getElementById("topbar");
  const rightPanel = document.getElementById("right-panel");
  const modalRoot = document.getElementById("modal-root");

  const PLAN_ALLOWANCE = { free: 10, pro: 100, unlimited: Infinity };

  const ICONS = {
    overview: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    orders: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>',
    promos: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
    payments: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>',
    users: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>',
    bell: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    notifications: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
    search: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>',
    bag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>',
    gear: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>',
  };

  const PAGE_META = {
    overview: { title: "Overview", subtitle: "Live snapshot of SnowBear right now" },
    orders: { title: "Orders", subtitle: "Approve or reject checkout payments" },
    promos: { title: "Promo Codes", subtitle: "Generate credit coupon codes" },
    payments: { title: "Payment Info", subtitle: "Checkout page payment instructions" },
    users: { title: "Users", subtitle: "Manage plans and credits" },
    notifications: { title: "Notifications", subtitle: "All admin alerts and activity" },
  };

  const NOTIFY_STORAGE_KEY = "snowbear_admin_notifications";

  const state = {
    tab: "overview",
    stats: { total: 0, free: 0, pro: 0, unlimited: 0, extensionOnline: 0 },
    users: [],
    orders: [],
    promos: [],
    instructions: defaultPayments(),
    unsubs: [],
    notifications: [],
    notifyReady: false,
    seenOrderIds: {},
    seenUserUids: {},
    ordersError: "",
    usersError: "",
    usersBooted: false,
    ordersBooted: false,
    bulkActivateDone: false,
    userSearchQuery: "",
    notificationFilter: "",
  };

  const TABS = [
    { id: "overview", label: "Overview", icon: "overview", section: "general" },
    { id: "orders", label: "Orders", icon: "orders", section: "general" },
    { id: "notifications", label: "Notifications", icon: "notifications", section: "general" },
    { id: "promos", label: "Promo Codes", icon: "promos", section: "general" },
    { id: "payments", label: "Payment Info", icon: "payments", section: "general" },
    { id: "users", label: "Users", icon: "users", section: "management" },
  ];

  function defaultPayments() {
    return {
      bank: { title: "Pay with Bank", details: "Bank transfer details…" },
      crypto: { title: "Pay with Crypto", details: "USDT TRC20 wallet…" },
      jazzcash: { title: "Pay with JazzCash", details: "JazzCash number…" },
    };
  }

  function emailKey(email) {
    return email.trim().toLowerCase().replace(/\./g, ",");
  }

  function monthKey() {
    return new Date().toISOString().slice(0, 7);
  }

  function planAllowance(plan) {
    if (plan === "unlimited") return PLAN_ALLOWANCE.unlimited;
    if (plan === "pro") return PLAN_ALLOWANCE.pro;
    return PLAN_ALLOWANCE.free;
  }

  function planAllowanceLabel(plan) {
    if (plan === "unlimited") return "Unlimited credits / month";
    return `${planAllowance(plan)} credits / month`;
  }

  function effectivePlan(plan, planExpiresAt) {
    if (!plan || plan === "free") return "free";
    if (typeof planExpiresAt === "number" && Date.now() >= planExpiresAt) return "free";
    return plan;
  }

  function planDurationMs(cycle) {
    return cycle === "yearly" ? 365 * 24 * 60 * 60 * 1000 : 30 * 24 * 60 * 60 * 1000;
  }

  function planCycleLabel(cycle) {
    return cycle === "yearly" ? "1 year" : "30 days";
  }

  function planExpiryMeta(user) {
    const plan = effectivePlan(user.plan, user.planExpiresAt);
    if (plan === "free" || typeof user.planExpiresAt !== "number") return "";
    return ` · until ${new Date(user.planExpiresAt).toLocaleString()} (${planCycleLabel(user.planBillingCycle || "monthly")})`;
  }

  function userCreditsRemaining(user) {
    const plan = effectivePlan(user.plan, user.planExpiresAt);
    if (plan === "unlimited") return "∞";
    const allowance = planAllowance(plan);
    const used = user.credits?.used || 0;
    const purchased = user.credits?.purchased || 0;
    return Math.max(0, allowance + purchased - used);
  }

  function isOrphanUser(user) {
    const email = (user.email || "").trim();
    return !email || !email.includes("@");
  }

  function userDisplayEmail(user) {
    if (!isOrphanUser(user)) return user.email;
    return `No email (${String(user.uid || "").slice(0, 8)}…)`;
  }

  function userCreditsDetail(user) {
    const rem = userCreditsRemaining(user);
    const purchased = user.credits?.purchased || 0;
    if (purchased > 0 && rem !== "∞") return `${rem} (+${purchased} bonus)`;
    return String(rem);
  }

  function adminDisplayName() {
    const email = CFG.adminEmail || "";
    const local = email.split("@")[0] || "Admin";
    return local
      .replace(/[._]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim() || "Admin";
  }

  function userInitials(user) {
    const email = userDisplayEmail(user);
    if (!email || !email.includes("@")) return "?";
    const parts = email.split("@")[0].replace(/[._-]/g, " ").split(" ").filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return email.slice(0, 2).toUpperCase();
  }

  function avatarColor(seed) {
    const colors = ["#6EC6FF", "#34d399", "#a78bfa", "#f472b6", "#fb923c", "#38bdf8", "#1e4a7a"];
    let h = 0;
    const s = String(seed || "");
    for (let i = 0; i < s.length; i++) h = (h + s.charCodeAt(i) * (i + 1)) % colors.length;
    return colors[h];
  }

  function userActivityTs(user) {
    return (
      user.extensionSyncAt ||
      user.websiteSyncAt ||
      user.planUpdatedAt ||
      user.createdAt ||
      0
    );
  }

  function formatRelativeTime(ts) {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return new Date(ts).toLocaleDateString();
  }

  function usersWeekGrowth(users) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = users.filter((u) => (u.createdAt || 0) > weekAgo).length;
    if (!recent || !users.length) return "";
    const pct = Math.round((recent / users.length) * 100);
    return `+${pct}%`;
  }

  function planBadgeForUser(user) {
    const plan = effectivePlan(user.plan, user.planExpiresAt);
    if (plan === "unlimited") return '<span class="badge badge-unlimited">Unlimited</span>';
    if (plan === "pro") return '<span class="badge badge-pro">Pro</span>';
    return '<span class="badge badge-free">Free</span>';
  }

  function orderStatusBadge(status) {
    if (status === "approved") return '<span class="badge badge-approved">Approved</span>';
    if (status === "rejected") return '<span class="badge badge-rejected">Rejected</span>';
    return '<span class="badge badge-pending">Pending</span>';
  }

  function orderProductLabel(order) {
    if (order.label) return order.label;
    if (order.orderType === "plan") {
      if (order.plan === "unlimited") return "Unlimited";
      return "Polar Pro";
    }
    return `${order.credits || 0} Credits`;
  }

  function formatMoney(amount) {
    const n = Number(amount);
    if (!Number.isFinite(n)) return "$0";
    return n % 1 === 0 ? `$${n}` : `$${n.toFixed(2)}`;
  }

  function playNotifySound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const playTone = (freq, start, dur) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur);
      };
      const t = ctx.currentTime;
      playTone(880, t, 0.18);
      playTone(1175, t + 0.2, 0.22);
      window.setTimeout(() => ctx.close().catch(() => {}), 600);
    } catch (_) { /* ignore */ }
  }

  function loadStoredNotifications() {
    try {
      const raw = localStorage.getItem(NOTIFY_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveStoredNotifications() {
    try {
      localStorage.setItem(NOTIFY_STORAGE_KEY, JSON.stringify(state.notifications.slice(0, 100)));
    } catch { /* ignore */ }
  }

  function pushNotification(title, body, kind) {
    const item = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, title, body, kind: kind || "info", at: Date.now() };
    state.notifications.unshift(item);
    if (state.notifications.length > 100) state.notifications.length = 100;
    saveStoredNotifications();
    playNotifySound();
    renderNotificationUi();
  }

  function clearAllNotifications() {
    state.notifications = [];
    saveStoredNotifications();
    renderNotificationUi();
    renderTopbar();
    if (state.tab === "notifications") renderMain();
  }

  function filterUsersBySearch(users, query) {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const display = userDisplayEmail(u).toLowerCase();
      const uid = (u.uid || "").toLowerCase();
      return email.includes(q) || display.includes(q) || uid.includes(q);
    });
  }

  function renderNotificationUi() {
    renderTopbar();
    if (state.tab === "overview") renderRightPanel();
  }

  function maybeEnableNotifications() {
    if (state.usersBooted && state.ordersBooted && !state.notifyReady) {
      state.notifyReady = true;
    }
  }

  function handleNewUsers(users) {
    users.forEach((u) => {
      if (!state.seenUserUids[u.uid]) {
        if (state.notifyReady) {
          pushNotification("New user", `${u.email || u.uid} signed up`, "user");
        }
        state.seenUserUids[u.uid] = true;
      }
    });
    if (!state.usersBooted) {
      users.forEach((u) => { state.seenUserUids[u.uid] = true; });
      state.usersBooted = true;
      maybeEnableNotifications();
    }
  }

  function handleNewOrders(orders) {
    orders.forEach((o) => {
      if (!state.seenOrderIds[o.id]) {
        if (state.notifyReady && o.status === "pending") {
          const kind = o.orderType === "plan" ? "plan upgrade" : "credit pack";
          pushNotification("New order", `${o.email} · ${o.label || kind} · ${formatMoney(o.amountUsd || 0)}`, "order");
        }
        state.seenOrderIds[o.id] = true;
      }
    });
    if (!state.ordersBooted) {
      orders.forEach((o) => { state.seenOrderIds[o.id] = true; });
      state.ordersBooted = true;
      maybeEnableNotifications();
    }
  }

  function closeAllMenus() {
    document.querySelectorAll(".menu-drop").forEach((m) => m.classList.add("hidden"));
  }

  function promoPathKey(code) {
    return code.trim().toUpperCase().replace(/\s+/g, "").replace(/[.#$[\]/]/g, "");
  }

  function generatePromoCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let seg = "";
    for (let i = 0; i < 3; i++) seg += chars[Math.floor(Math.random() * chars.length)];
    return `SNOW-${Date.now().toString(36).toUpperCase().slice(-5)}-${seg}`;
  }

  function esc(s) {
    return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function dbError(err) {
    const msg = err?.message || String(err || "");
    if (msg.includes("different region") || msg.includes("correctUrl")) {
      return "Database URL wrong. Hard-refresh this page (Ctrl+Shift+R).";
    }
    if (err?.code === "PERMISSION_DENIED" || msg.includes("PERMISSION_DENIED")) {
      const who = auth.currentUser?.email;
      if (who && who.trim().toLowerCase() !== CFG.adminEmail.trim().toLowerCase()) {
        return `Signed in as ${who}, not admin. Click “Leave admin”, hard-refresh (Ctrl+Shift+R), then sign in again.`;
      }
      return "Permission denied. Hard-refresh (Ctrl+Shift+R) and enter the admin gate password again.";
    }
    return msg || "Database error";
  }

  function showGate(msg) {
    gate.classList.remove("hidden");
    appEl.classList.add("hidden");
    gateError.textContent = msg || "";
  }

  function showApp() {
    gate.classList.add("hidden");
    appEl.classList.remove("hidden");
    if (!state.notifications.length) {
      state.notifications = loadStoredNotifications();
    }
    renderNav();
    renderMain();
    subscribe();
  }

  function clearSubs() {
    state.unsubs.forEach((u) => u && u());
    state.unsubs = [];
  }

  function isAdminSignedIn() {
    const email = auth.currentUser?.email?.trim().toLowerCase();
    return email === CFG.adminEmail.trim().toLowerCase();
  }

  async function ensureAdminInRtdb() {
    await db.ref(`config/adminEmails/${emailKey(CFG.adminEmail)}`).set(true);
    const snap = await db.ref(`config/adminEmails/${emailKey(CFG.adminEmail)}`).get();
    if (!snap.val()) {
      const err = new Error("Could not register admin in database.");
      err.code = "PERMISSION_DENIED";
      throw err;
    }
  }

  async function firebaseBoot() {
    if (auth.currentUser && !isAdminSignedIn()) {
      await auth.signOut();
    }
    if (!isAdminSignedIn()) {
      await auth.signInWithEmailAndPassword(CFG.adminEmail, CFG.adminPassword);
    }
    await ensureAdminInRtdb();
    await db.ref("users").limitToFirst(1).get();
  }

  function gateOk() {
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  }

  function setGateOk() {
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  }

  function clearGate() {
    try { sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
  }

  gateBtn.addEventListener("click", tryGate);
  gatePassword.addEventListener("keydown", (e) => e.key === "Enter" && tryGate());

  async function tryGate() {
    gateError.textContent = "";
    if (gatePassword.value !== CFG.gatePassword) {
      gateError.textContent = "Wrong password.";
      return;
    }
    gateBtn.disabled = true;
    gateBtn.textContent = "Connecting…";
    try {
      setGateOk();
      await firebaseBoot();
      showApp();
    } catch (e) {
      clearGate();
      gateError.textContent = dbError(e);
    } finally {
      gateBtn.disabled = false;
      gateBtn.textContent = "Access";
    }
  }

  document.getElementById("leave-btn").addEventListener("click", async () => {
    clearSubs();
    clearGate();
    await auth.signOut();
    gatePassword.value = "";
    showGate("");
  });

  document.addEventListener("click", () => closeAllMenus());

  async function init() {
    if (!gateOk()) { showGate(""); return; }
    try {
      await firebaseBoot();
      showApp();
    } catch (e) {
      clearGate();
      showGate(dbError(e));
    }
  }

  function scanUsers(snap) {
    const stats = { total: 0, free: 0, pro: 0, unlimited: 0, extensionOnline: 0 };
    const users = [];
    const fiveMin = Date.now() - 5 * 60 * 1000;
    if (!snap.exists()) return { stats, users };
    snap.forEach((child) => {
      const u = child.val();
      stats.total++;
      const plan = effectivePlan(u.plan, u.planExpiresAt);
      if (plan === "unlimited") stats.unlimited++;
      else if (plan === "pro") stats.pro++;
      else stats.free++;
      if (u.extensionConnected && u.extensionSyncAt > fiveMin) stats.extensionOnline++;
      users.push({ uid: child.key, ...u });
    });
    users.sort((a, b) => (b.planUpdatedAt || b.createdAt || 0) - (a.planUpdatedAt || a.createdAt || 0));
    return { stats, users };
  }

  async function repairIncompleteUsers() {
    if (!state.users.length) return;
    const month = monthKey();
    const now = Date.now();
    let fixed = 0;
    try {
      for (const u of state.users) {
        if (isOrphanUser(u)) continue;
        const patch = {};
        if (!u.plan) patch.plan = "free";
        if (!u.createdAt) patch.createdAt = now;
        if (Object.keys(patch).length) {
          await db.ref(`users/${u.uid}`).update(patch);
          fixed += 1;
        }
        if (!u.credits) {
          await db.ref(`users/${u.uid}/credits`).set({ month, used: 0, purchased: 0 });
          fixed += 1;
        }
      }
      const orphans = state.users.filter(isOrphanUser).length;
      const msg = fixed
        ? `Repaired ${fixed} user record(s).`
        : "All signed-in user records look complete.";
      alert(orphans ? `${msg}\n\n${orphans} incomplete record(s) without email — use Remove incomplete.` : msg);
    } catch (e) {
      alert(dbError(e));
    }
  }

  async function removeOrphanUsers(users) {
    if (!users.length) return;
    if (!confirm(`Delete ${users.length} incomplete user record(s) with no email?\n\nThese are not real Google sign-ins (usually test/sync leftovers).`)) return;
    try {
      const updates = {};
      users.forEach((u) => {
        updates[`users/${u.uid}`] = null;
      });
      await db.ref().update(updates);
      pushNotification("Incomplete users removed", `Deleted ${users.length} orphan record(s)`, "info");
    } catch (e) {
      alert(dbError(e));
    }
  }

  async function activateAllUsers(users, silent) {
    if (!users.length) return { ok: false, message: "No users to activate." };
    const month = monthKey();
    const now = Date.now();
    const updates = {};
    users.forEach((u) => {
      updates[`users/${u.uid}/plan`] = "free";
      updates[`users/${u.uid}/planUpdatedAt`] = now;
      updates[`users/${u.uid}/planExpiresAt`] = null;
      updates[`users/${u.uid}/planBillingCycle`] = null;
      updates[`users/${u.uid}/credits`] = { month, used: 0, purchased: 0 };
    });
    await db.ref().update(updates);
    try {
      await db.ref("config/bulkActivateV1").set(now);
    } catch (_) { /* optional marker — do not fail the reset */ }
    if (!silent) {
      pushNotification("All users activated", `${users.length} users now have Free plan with 10 credits`, "info");
    }
    return { ok: true, count: users.length };
  }

  async function runBulkActivateOnce(users) {
    if (!users.length || state.bulkActivateDone) return;
    try {
      const flag = await db.ref("config/bulkActivateV1").get();
      if (flag.exists()) {
        state.bulkActivateDone = true;
        return;
      }
      await activateAllUsers(users, true);
      state.bulkActivateDone = true;
      pushNotification("All users activated", `${users.length} registered users set to Free with 10 credits`, "info");
    } catch (e) {
      console.error("Bulk activate failed:", dbError(e));
    }
  }

  function subscribe() {
    clearSubs();
    state.unsubs.push(db.ref("users").on("value", (snap) => {
      state.usersError = "";
      const pack = scanUsers(snap);
      state.stats = pack.stats;
      state.users = pack.users;
      pack.users.forEach((u) => {
        if (u.plan && u.plan !== "free" && typeof u.planExpiresAt === "number" && Date.now() >= u.planExpiresAt) {
          expireUserPlanIfNeeded(u.uid, u);
        }
      });
      handleNewUsers(pack.users);
      renderNav();
      renderMain();
    }, (e) => {
      state.usersError = dbError(e);
      state.users = [];
      console.error(state.usersError);
      renderNav();
      renderMain();
    }));
    state.unsubs.push(db.ref("orders").on("value", (snap) => {
      state.ordersError = "";
      const orders = [];
      if (snap.exists()) {
        snap.forEach((c) => {
          const val = c.val() || {};
          orders.push({
            id: c.key,
            ...val,
            orderType: val.orderType || "credits",
            status: val.status || "pending",
            createdAt: val.createdAt || 0,
          });
        });
      }
      orders.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      state.orders = orders;
      handleNewOrders(orders);
      renderNav();
      renderMain();
    }, (e) => {
      state.ordersError = dbError(e);
      state.orders = [];
      console.error(state.ordersError);
      renderNav();
      renderMain();
    }));
    state.unsubs.push(db.ref("promoCodes").on("value", (snap) => {
      const promos = [];
      snap.forEach((c) => {
        const v = c.val();
        promos.push(v?.code ? v : { ...v, code: c.key });
      });
      promos.sort((a, b) => b.createdAt - a.createdAt);
      state.promos = promos;
      renderMain();
    }));
    state.unsubs.push(db.ref("config/paymentInstructions").on("value", (snap) => {
      state.instructions = snap.val() || defaultPayments();
      renderMain();
    }));
  }

  function renderNav() {
    const pending = state.orders.filter((o) => o.status === "pending").length;
    const sections = ["general", "management"];
    nav.innerHTML = sections.map((section) => {
      const tabs = TABS.filter((t) => t.section === section);
      const label = section === "general" ? "General" : "Management";
      const buttons = tabs.map((t) => {
        const badge =
          t.id === "orders" && pending
            ? `<span class="nav-badge">${pending}</span>`
            : t.id === "notifications" && state.notifications.length
              ? `<span class="nav-badge">${state.notifications.length}</span>`
            : t.id === "users" && state.stats.total
              ? `<span class="nav-badge">${state.stats.total}</span>`
              : "";
        return `<button type="button" class="nav-btn ${state.tab === t.id ? "active" : ""}" data-tab="${t.id}">${ICONS[t.icon] || ""}<span>${t.label}</span>${badge}</button>`;
      }).join("");
      return `<div class="nav-section">${label}</div>${buttons}`;
    }).join("");
    nav.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.onclick = () => {
        state.tab = btn.dataset.tab;
        renderNav();
        renderMain();
      };
    });
  }

  function renderTopbar() {
    if (!topbar) return;
    const meta = PAGE_META[state.tab] || PAGE_META.overview;
    const unread = state.notifications.length;
    const adminName = adminDisplayName();
    const adminInitials = adminName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    topbar.innerHTML = `
      <div class="topbar-title">
        <h1>${meta.title}</h1>
        <p class="subtitle">${meta.subtitle}</p>
      </div>
      <div class="topbar-actions">
        <button type="button" class="topbar-bell ${unread ? "has-unread" : ""}" id="topbar-bell" title="Notifications">
          ${ICONS.bell}
          <span class="topbar-bell-badge ${unread ? "" : "hidden"}" id="topbar-bell-badge">${unread}</span>
        </button>
        <div class="topbar-user">
          <div class="topbar-user-text">
            <p class="topbar-user-name">${esc(adminName)}</p>
            <p class="topbar-user-email">${esc(CFG.adminEmail)}</p>
          </div>
          <div class="avatar" style="background:${avatarColor(CFG.adminEmail)}">${esc(adminInitials)}</div>
        </div>
      </div>`;
    const bell = document.getElementById("topbar-bell");
    if (bell) {
      bell.onclick = () => {
        state.tab = "notifications";
        renderNav();
        renderMain();
      };
    }
  }

  function renderRightPanel() {
    if (!rightPanel) return;
    if (state.tab !== "overview") {
      rightPanel.classList.add("hidden");
      return;
    }
    rightPanel.classList.remove("hidden");
    const unread = state.notifications.length;
    const items = state.notifications.slice(0, 5).map((n) => {
      const icon = n.kind === "order" ? ICONS.bag : ICONS.gear;
      return `<div class="notify-item">
        <div class="notify-icon">${icon}</div>
        <div class="notify-body">
          <strong>${esc(n.title)}</strong>
          <p>${esc(n.body)}</p>
          <div class="notify-time">${formatRelativeTime(n.at)}</div>
        </div>
      </div>`;
    }).join("");
    rightPanel.innerHTML = `
      <div class="notify-card">
        <div class="notify-card-head">
          <h3>Notifications</h3>
          ${unread ? `<span class="notify-count">${unread}</span>` : ""}
        </div>
        <div class="notify-list">
          ${items || '<div class="notify-empty">No notifications yet</div>'}
        </div>
        ${unread ? '<button type="button" class="notify-clear" id="notify-view-all">View all notifications</button>' : ""}
        ${unread ? '<button type="button" class="notify-clear" id="notify-clear">Clear all</button>' : ""}
      </div>
      <div class="support-card">
        <p>Need help with an order or account migration? Our team is available 24/7.</p>
        <a class="btn" href="mailto:${esc(CFG.adminEmail)}">Open Tickets ↗</a>
      </div>`;
    const viewAllBtn = document.getElementById("notify-view-all");
    if (viewAllBtn) {
      viewAllBtn.onclick = () => {
        state.tab = "notifications";
        renderNav();
        renderMain();
      };
    }
    const clearBtn = document.getElementById("notify-clear");
    if (clearBtn) clearBtn.onclick = () => clearAllNotifications();
  }

  function renderMain() {
    renderTopbar();
    if (state.tab === "overview") main.innerHTML = renderOverview();
    else if (state.tab === "orders") main.innerHTML = renderOrders();
    else if (state.tab === "promos") main.innerHTML = renderPromos();
    else if (state.tab === "payments") main.innerHTML = renderPayments();
    else if (state.tab === "users") main.innerHTML = renderUsers();
    else if (state.tab === "notifications") main.innerHTML = renderNotifications();
    renderRightPanel();
    bindEvents();
  }

  function orderMenuHtml(order) {
    const items = [];
    if (order.receiptUrl) {
      items.push(`<a href="${esc(order.receiptUrl)}" target="_blank" rel="noopener">View receipt</a>`);
    }
    if (order.status === "pending") {
      items.push(`<button type="button" data-approve="${esc(order.id)}">Approve</button>`);
      items.push(`<button type="button" class="danger" data-reject="${esc(order.id)}">Reject</button>`);
    }
    items.push(`<button type="button" class="danger" data-delete-order="${esc(order.id)}">Delete order</button>`);
    return `<div class="menu-wrap">
      <button type="button" class="menu-btn" data-toggle-menu="${esc(order.id)}">⋮</button>
      <div class="menu-drop hidden" id="menu-${esc(order.id)}">${items.join("")}</div>
    </div>`;
  }

  function notificationIcon(kind) {
    if (kind === "order") return ICONS.bag;
    if (kind === "user") return ICONS.users;
    if (kind === "plan" || kind === "ok") return ICONS.promos;
    return ICONS.bell;
  }

  function renderNotifications() {
    const filter = state.notificationFilter.trim().toLowerCase();
    const items = state.notifications.filter((n) => {
      if (!filter) return true;
      return `${n.title} ${n.body}`.toLowerCase().includes(filter);
    });
    const list = items.length
      ? items.map((n) => `<div class="notify-item notify-item-full">
          <div class="notify-icon">${notificationIcon(n.kind)}</div>
          <div class="notify-body">
            <strong>${esc(n.title)}</strong>
            <p>${esc(n.body)}</p>
            <div class="notify-time">${new Date(n.at).toLocaleString()} · ${formatRelativeTime(n.at)}</div>
          </div>
          <span class="notify-kind-pill">${esc(n.kind || "info")}</span>
        </div>`).join("")
      : `<div class="notify-empty">${filter ? "No notifications match your search." : "No notifications yet. New orders and sign-ups will appear here."}</div>`;
    return `
      <div class="toolbar panel-card" style="margin-bottom:.85rem">
        <div class="search-field">
          ${ICONS.search}
          <input id="notification-search" type="search" placeholder="Search notifications…" value="${esc(state.notificationFilter)}" />
        </div>
        <button type="button" id="clear-notifications" class="btn btn-outline" style="width:auto" ${state.notifications.length ? "" : "disabled"}>Clear all</button>
      </div>
      <div class="panel-card">
        <div class="panel-head">
          <h2>All notifications</h2>
          <span class="meta">${items.length} of ${state.notifications.length}</span>
        </div>
        <div class="notify-list notify-list-full">${list}</div>
      </div>`;
  }

  function renderOverview() {
    const s = state.stats;
    const pending = state.orders.filter((o) => o.status === "pending").length;
    const growth = usersWeekGrowth(state.users);
    const recentUsers = [...state.users]
      .sort((a, b) => userActivityTs(b) - userActivityTs(a))
      .slice(0, 8);
    const recentOrders = state.orders.slice(0, 5);

    const ordersTable = recentOrders.length
      ? `<table class="data-table">
        <thead><tr><th>Product</th><th>Customer</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>${recentOrders.map((o) => `<tr>
          <td><div class="cell-product"><span class="product-dot"></span>${esc(orderProductLabel(o))}</div></td>
          <td>${esc(o.email || "—")}</td>
          <td>${formatMoney(o.amountUsd)}</td>
          <td>${orderStatusBadge(o.status)}</td>
          <td>${orderMenuHtml(o)}</td>
        </tr>`).join("")}</tbody></table>`
      : '<p class="empty">No orders yet.</p>';

    const usersTable = recentUsers.length
      ? `<table class="data-table">
        <thead><tr><th>Email</th><th>Plan</th><th>Remaining Credits</th><th>Activity</th></tr></thead>
        <tbody>${recentUsers.map((u) => {
          const rem = userCreditsRemaining(u);
          const creditsCell = rem === "∞"
            ? '<span class="cell-credits">∞</span>'
            : `<span class="cell-credits"><span class="credit-icon">★</span>${esc(String(rem))}</span>`;
          return `<tr>
            <td><div class="cell-user">
              <div class="avatar avatar-sm" style="background:${avatarColor(u.email || u.uid)}">${esc(userInitials(u))}</div>
              <span>${esc(userDisplayEmail(u))}</span>
            </div></td>
            <td>${planBadgeForUser(u)}</td>
            <td>${creditsCell}</td>
            <td class="meta">${formatRelativeTime(userActivityTs(u))}</td>
          </tr>`;
        }).join("")}</tbody></table>`
      : '<div class="empty">No users yet.</div>';

    return `
    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">${s.total}</div>
        ${growth ? `<div class="stat-trend">${growth}</div>` : ""}
      </div>
      <div class="stat-card"><div class="stat-label">Free Plan</div><div class="stat-value">${s.free}</div></div>
      <div class="stat-card"><div class="stat-label">Pro Plan</div><div class="stat-value">${s.pro}</div></div>
      <div class="stat-card"><div class="stat-label">Unlimited</div><div class="stat-value">${s.unlimited}</div></div>
      <div class="stat-card">
        <div class="stat-label">Online</div>
        <div class="stat-value stat-online"><span class="stat-dot"></span>${s.extensionOnline}</div>
      </div>
      <div class="stat-card ${pending ? "warn" : ""}">
        <div class="stat-label">Pending</div>
        <div class="stat-value">${pending}</div>
        ${pending ? '<div class="stat-hint review">needs review</div>' : ""}
      </div>
    </div>
    <div class="panel-card">
      <div class="panel-head">
        <h2>Recent Orders</h2>
        <button type="button" class="panel-link" data-tab-link="orders">View All</button>
      </div>
      ${ordersTable}
    </div>
    <div class="panel-card">
      <div class="panel-head"><h2>Recently Active Users</h2></div>
      ${usersTable}
    </div>`;
  }

  function renderOrders() {
    const err = state.ordersError
      ? `<div class="orders-error"><strong>Could not load orders:</strong> ${esc(state.ordersError)}<br><span class="meta">Publish database.rules.json and ensure you are signed in as admin.</span></div>`
      : "";
    if (!state.orders.length) {
      return err + `<div class="panel-card"><p class="empty">No orders yet. Orders appear here when users complete checkout on the website.</p></div>`;
    }
    return err + `<div class="panel-card"><table class="data-table">
      <thead><tr><th>Product</th><th>Customer</th><th>Details</th><th>Amount</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>${state.orders.map((o) => {
        const cycle = o.billingCycle === "yearly" ? " · 1 year" : o.billingCycle === "monthly" ? " · 30 days" : "";
        const typeLabel = o.orderType === "plan" ? `Plan · ${esc(o.plan || "pro")}${cycle}` : `${o.credits || 0} credits`;
        const when = o.createdAt ? new Date(o.createdAt).toLocaleString() : "—";
        const pay = o.paymentMethod ? ` · ${esc(o.paymentMethod)}` : "";
        const payer = o.payerName ? `Payer: ${esc(o.payerName)}${o.payerPhone ? " · " + esc(o.payerPhone) : ""} · ` : "";
        const receipt = o.receiptUrl
          ? `<a href="${esc(o.receiptUrl)}" target="_blank" rel="noopener">Receipt ↗</a> · `
          : "";
        return `<tr>
          <td><div class="cell-product"><span class="product-dot"></span>${esc(orderProductLabel(o))}</div></td>
          <td>${esc(o.email || "—")}</td>
          <td class="meta">${payer}${receipt}${typeLabel}${pay}<br>${when}${o.paymentNote ? " · ref: " + esc(o.paymentNote) : ""}</td>
          <td>${formatMoney(o.amountUsd)}</td>
          <td>${orderStatusBadge(o.status)}</td>
          <td class="cell-actions">
            ${o.status === "pending"
              ? `<button class="icon-btn ok" data-approve="${o.id}" title="Approve">✓</button>
                 <button class="icon-btn bad" data-reject="${o.id}" title="Reject">✕</button>`
              : ""}
            ${orderMenuHtml(o)}
          </td>
        </tr>`;
      }).join("")}</tbody>
    </table></div>`;
  }

  function renderPromos() {
    const list = state.promos.length ? state.promos.map((p) => {
      const used = !!p.usedByUid;
      const key = promoPathKey(p.code || "");
      return `<div class="row-item">
        <div><strong style="font-family:monospace">${esc(p.code)}</strong>
        <div class="meta">${p.credits} credits${used && p.usedByEmail ? " · used by " + esc(p.usedByEmail) : ""}</div></div>
        <div style="display:flex;align-items:center;gap:.5rem">
          <span class="pill ${used ? "pill-bad" : "pill-ok"}">${used ? "Redeemed" : "Active"}</span>
          <button type="button" class="icon-btn bad" data-delete-promo="${esc(key)}" data-promo-label="${esc(p.code)}" title="Delete code">🗑</button>
        </div>
      </div>`;
    }).join("") : `<p class="empty">No promo codes yet.</p>`;
    return `<div class="toolbar panel-card"><div><label class="meta">Credits</label><input id="promo-credits" type="number" min="1" value="100" style="width:6rem"/></div>
    <button id="gen-promo" class="btn btn-primary btn-sm">Generate code</button><span id="promo-msg" class="ok-msg"></span></div><div class="panel-card"><div class="list">${list}</div></div>`;
  }

  function renderPayments() {
    const keys = ["bank", "crypto", "jazzcash"];
    return `<div class="panel-card">${keys.map((k) => `
      <div style="margin-bottom:1rem"><label class="meta">${k} title</label><input data-pay-title="${k}" value="${esc(state.instructions[k]?.title)}"/>
      <label class="meta" style="display:block;margin-top:.5rem">Details (large text on checkout)</label><textarea rows="8" data-pay-details="${k}" style="font-size:.95rem;line-height:1.5">${esc(state.instructions[k]?.details)}</textarea></div>`).join("")}
      <button id="save-payments" class="btn btn-primary btn-sm">Save</button></div>`;
  }

  function renderUsers() {
    const orphans = state.users.filter(isOrphanUser);
    const filteredUsers = filterUsersBySearch(state.users, state.userSearchQuery);
    const toolbar = `<div class="toolbar panel-card" style="margin-bottom:.85rem">
      <div class="search-field search-field-grow">
        ${ICONS.search}
        <input id="user-search" type="search" placeholder="Search by email or UID…" value="${esc(state.userSearchQuery)}" />
      </div>
      <div><p class="meta" style="margin:0">Free=10 · Polar=100 · Unlimited=∞${orphans.length ? ` · <span style="color:#b45309">${orphans.length} incomplete</span>` : ""}</p></div>
      <button type="button" id="repair-users" class="btn btn-outline" style="width:auto" ${state.users.length ? "" : "disabled"}>Repair records</button>
      <button type="button" id="remove-orphans" class="btn btn-outline" style="width:auto" ${orphans.length ? "" : "disabled"}>Remove incomplete</button>
      <button type="button" id="activate-all" class="btn btn-primary" style="width:auto" ${state.users.length ? "" : "disabled"}>Reset all → 10 credits</button>
    </div>`;
    const countMeta = state.userSearchQuery.trim()
      ? `<p class="meta" style="margin:0 0 .75rem">Showing ${filteredUsers.length} of ${state.users.length} users</p>`
      : "";
    const body = filteredUsers.length ? `<table class="data-table"><thead><tr><th>Email</th><th>Plan</th><th>Remaining</th><th>Used</th><th>Activity</th><th></th></tr></thead><tbody>${filteredUsers.map((u) => {
      const used = u.credits?.used || 0;
      const orphan = isOrphanUser(u);
      const expiry = planExpiryMeta(u);
      return `<tr${orphan ? ' style="background:#fffbeb"' : ""}>
        <td><div class="cell-user">
          <div class="avatar avatar-sm" style="background:${avatarColor(u.email || u.uid)}">${esc(userInitials(u))}</div>
          <span>${esc(userDisplayEmail(u))}${orphan ? ' <span class="badge badge-pending">incomplete</span>' : ""}</span>
        </div></td>
        <td>${planBadgeForUser(u)}${expiry ? `<div class="meta">${esc(expiry.replace(/^ · /, ""))}</div>` : ""}</td>
        <td><span class="cell-credits"><span class="credit-icon">★</span>${esc(userCreditsDetail(u))}</span></td>
        <td>${used}</td>
        <td class="meta">${formatRelativeTime(userActivityTs(u))}</td>
        <td>
          <button class="btn btn-outline btn-sm" data-manage="${u.uid}">Manage</button>
          ${orphan ? `<button class="btn btn-outline btn-sm" data-delete-orphan="${u.uid}" style="color:#dc2626;margin-left:.25rem">Delete</button>` : ""}
        </td>
      </tr>`;
    }).join("")}</tbody></table>` : `<div class="empty">${state.userSearchQuery.trim() ? "No users match that email." : "No users yet."}</div>`;
    const err = state.usersError
      ? `<div class="orders-error"><strong>Could not load users:</strong> ${esc(state.usersError)}</div>`
      : "";
    return err + toolbar + `<div class="panel-card">${countMeta}${body}</div>`;
  }

  function bindEvents() {
    main.querySelectorAll("[data-tab-link]").forEach((b) => {
      b.onclick = () => {
        state.tab = b.dataset.tabLink;
        renderNav();
        renderMain();
      };
    });
    main.querySelectorAll("[data-toggle-menu]").forEach((b) => {
      b.onclick = (e) => {
        e.stopPropagation();
        const id = b.dataset.toggleMenu;
        const menu = document.getElementById(`menu-${id}`);
        if (!menu) return;
        const wasOpen = !menu.classList.contains("hidden");
        closeAllMenus();
        if (!wasOpen) menu.classList.remove("hidden");
      };
    });
    main.querySelectorAll(".menu-wrap").forEach((w) => {
      w.onclick = (e) => e.stopPropagation();
    });
    main.querySelectorAll("[data-approve]").forEach((b) => (b.onclick = () => {
      closeAllMenus();
      const order = state.orders.find((o) => o.id === b.dataset.approve);
      if (order?.orderType === "plan") openApproveOrderModal(b.dataset.approve);
      else reviewOrder(b.dataset.approve, "approved");
    }));
    main.querySelectorAll("[data-reject]").forEach((b) => (b.onclick = () => {
      closeAllMenus();
      reviewOrder(b.dataset.reject, "rejected");
    }));
    main.querySelectorAll("[data-delete-order]").forEach((b) => (b.onclick = () => {
      closeAllMenus();
      deleteOrder(b.dataset.deleteOrder);
    }));
    const userSearch = document.getElementById("user-search");
    if (userSearch) {
      userSearch.oninput = () => {
        state.userSearchQuery = userSearch.value;
        const mainEl = document.getElementById("main");
        if (mainEl && state.tab === "users") {
          mainEl.innerHTML = renderUsers();
          bindEvents();
        }
      };
    }
    const notificationSearch = document.getElementById("notification-search");
    if (notificationSearch) {
      notificationSearch.oninput = () => {
        state.notificationFilter = notificationSearch.value;
        const mainEl = document.getElementById("main");
        if (mainEl && state.tab === "notifications") {
          mainEl.innerHTML = renderNotifications();
          bindEvents();
        }
      };
    }
    const clearNotifications = document.getElementById("clear-notifications");
    if (clearNotifications) clearNotifications.onclick = () => clearAllNotifications();
    const gen = document.getElementById("gen-promo");
    if (gen) gen.onclick = createPromo;
    const save = document.getElementById("save-payments");
    if (save) save.onclick = savePayments;
    main.querySelectorAll("[data-manage]").forEach((b) => (b.onclick = () => openUserModal(b.dataset.manage)));
    main.querySelectorAll("[data-delete-promo]").forEach((b) => (b.onclick = () => deletePromo(b.dataset.deletePromo, b.dataset.promoLabel)));
    const repairUsers = document.getElementById("repair-users");
    if (repairUsers) repairUsers.onclick = () => repairIncompleteUsers();
    const removeOrphans = document.getElementById("remove-orphans");
    if (removeOrphans) removeOrphans.onclick = () => removeOrphanUsers(state.users.filter(isOrphanUser));
    main.querySelectorAll("[data-delete-orphan]").forEach((b) => {
      b.onclick = () => {
        const u = state.users.find((x) => x.uid === b.dataset.deleteOrphan);
        if (u) removeOrphanUsers([u]);
      };
    });

    const activateAll = document.getElementById("activate-all");
    if (activateAll) activateAll.onclick = async () => {
      if (!confirm(`Reset ALL ${state.users.length} users to Free plan with exactly 10 credits?\n\nClears purchased bonus credits and sets used to 0.`)) return;
      try {
        activateAll.disabled = true;
        activateAll.textContent = "Activating…";
        await activateAllUsers(state.users, false);
        alert(`Activated ${state.users.length} users.`);
      } catch (e) {
        alert(dbError(e));
      } finally {
        activateAll.disabled = false;
        activateAll.textContent = "Reset all → 10 credits";
      }
    };
  }

  async function deleteOrder(id) {
    const order = state.orders.find((o) => o.id === id);
    if (!order) return alert("Order not found");
    const label = `${order.email || "User"} · ${orderProductLabel(order)} · ${formatMoney(order.amountUsd || 0)}`;
    if (!confirm(`Delete this order permanently?\n\n${label}\n\nThis cannot be undone.`)) return;
    try {
      await db.ref(`orders/${id}`).remove();
      pushNotification("Order deleted", label, "order");
    } catch (e) {
      alert(dbError(e));
    }
  }

  async function reviewOrder(id, status, planApproval) {
    const ref = db.ref(`orders/${id}`);
    const snap = await ref.get();
    if (!snap.exists()) return alert("Order not found");
    const order = snap.val();
    if (order.status !== "pending") return alert("Already reviewed");
    const orderPatch = {
      status,
      reviewedAt: Date.now(),
      reviewedBy: CFG.adminEmail,
    };
    if (status === "approved" && planApproval) {
      orderPatch.approvedPlan = planApproval.plan;
      orderPatch.approvedBillingCycle = planApproval.billingCycle;
    }
    await ref.update(orderPatch);
    if (status === "approved") {
      if (order.orderType === "plan" && planApproval) {
        await applyUserPlan(order.uid, planApproval.plan, planApproval.billingCycle);
        pushNotification(
          "Plan activated",
          `${planApproval.plan === "unlimited" ? "Unlimited" : "Polar Pro"} plan enabled for ${order.email || "user"} · ${planCycleLabel(planApproval.billingCycle)}`,
          "plan"
        );
      } else if (order.credits) {
        await grantCredits(order.uid, order.credits);
        pushNotification("Credits granted", `${order.email || "User"} +${order.credits} credits`, "ok");
      }
      await grantReferralPurchaseReward(order.uid, id);
    }
  }

  async function grantReferralPurchaseReward(referredUid, orderId) {
    try {
      const res = await fetch("/api/referral/purchase-reward", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ referredUid, orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (data.granted) {
        pushNotification(
          "Referral reward",
          `+20 credits to referrer · order ${String(orderId).slice(0, 8)}…`,
          "plan"
        );
      }
    } catch (e) {
      console.warn("Referral purchase reward failed:", e);
    }
  }

  async function expireUserPlanIfNeeded(uid, user) {
    const plan = user?.plan || "free";
    if (plan === "free" || typeof user?.planExpiresAt !== "number" || Date.now() < user.planExpiresAt) return;
    await applyUserPlan(uid, "free");
  }

  async function applyUserPlan(uid, plan, billingCycle) {
    const month = monthKey();
    const cref = db.ref(`users/${uid}/credits`);
    const csnap = await cref.get();
    const cur = csnap.val() || { month, used: 0, purchased: 0 };
    await cref.set({ month, used: 0, purchased: cur.purchased || 0 });
    const now = Date.now();
    const patch = { plan, planUpdatedAt: now };
    if (plan === "free") {
      patch.planExpiresAt = null;
      patch.planBillingCycle = null;
    } else if (billingCycle === "monthly" || billingCycle === "yearly") {
      patch.planExpiresAt = now + planDurationMs(billingCycle);
      patch.planBillingCycle = billingCycle;
    } else {
      patch.planExpiresAt = null;
      patch.planBillingCycle = null;
    }
    await db.ref(`users/${uid}`).update(patch);
  }

  function openApproveOrderModal(orderId) {
    const order = state.orders.find((o) => o.id === orderId);
    if (!order) return alert("Order not found");
    const defaultPlan = order.plan === "unlimited" ? "unlimited" : "pro";
    const defaultCycle = order.billingCycle === "yearly" ? "yearly" : "monthly";
    modalRoot.innerHTML = `<div class="modal-bg" id="modal-x"><div class="modal" onclick="event.stopPropagation()">
      <h2>Approve plan order</h2>
      <p class="meta">${esc(order.email || "User")} · ${esc(order.label || "Plan")} · $${order.amountUsd ?? 0}</p>
      <label class="meta" style="display:block;margin-top:.75rem">Activate plan</label>
      <select id="a-plan">
        <option value="pro">Polar Pro — 100 credits / month</option>
        <option value="unlimited">Unlimited — ∞ credits / month</option>
      </select>
      <label class="meta" style="display:block;margin-top:.75rem">Subscription length</label>
      <select id="a-cycle">
        <option value="monthly">30 days (monthly)</option>
        <option value="yearly">1 year (yearly)</option>
      </select>
      <p id="a-hint" class="meta" style="margin-top:.5rem"></p>
      <p id="a-msg" class="meta"></p>
      <div style="display:flex;gap:.5rem;margin-top:.75rem">
        <button class="btn btn-primary" id="a-confirm" style="width:auto">Approve &amp; activate</button>
        <button class="btn btn-outline" id="a-cancel" style="width:auto">Cancel</button>
      </div>
    </div></div>`;
    const planSel = document.getElementById("a-plan");
    const cycleSel = document.getElementById("a-cycle");
    const hint = document.getElementById("a-hint");
    const syncHint = () => {
      if (!hint || !planSel || !cycleSel) return;
      const ends = new Date(Date.now() + planDurationMs(cycleSel.value)).toLocaleString();
      hint.textContent = `${planAllowanceLabel(planSel.value)} · active for ${planCycleLabel(cycleSel.value)} · ends ${ends}`;
    };
    planSel.value = defaultPlan;
    cycleSel.value = defaultCycle;
    planSel.onchange = syncHint;
    cycleSel.onchange = syncHint;
    syncHint();
    const close = () => (modalRoot.innerHTML = "");
    document.getElementById("modal-x").onclick = close;
    document.getElementById("a-cancel").onclick = close;
    document.getElementById("a-confirm").onclick = async () => {
      const msg = document.getElementById("a-msg");
      const btn = document.getElementById("a-confirm");
      try {
        if (btn) { btn.disabled = true; btn.textContent = "Activating…"; }
        await reviewOrder(orderId, "approved", {
          plan: planSel.value,
          billingCycle: cycleSel.value,
        });
        close();
      } catch (e) {
        if (msg) { msg.className = "err"; msg.textContent = dbError(e); }
      } finally {
        if (btn) { btn.disabled = false; btn.textContent = "Approve & activate"; }
      }
    };
  }

  async function grantCredits(uid, amount) {
    const ref = db.ref(`users/${uid}/credits`);
    const snap = await ref.get();
    const month = monthKey();
    const cur = snap.val() || { month, used: 0, purchased: 0 };
    await ref.set({
      month: cur.month === month ? cur.month : month,
      used: cur.month === month ? cur.used || 0 : 0,
      purchased: (cur.month === month ? cur.purchased || 0 : cur.purchased || 0) + amount,
    });
  }

  async function deletePromo(key, label) {
    if (!key) return;
    const name = label || key;
    if (!confirm(`Delete promo code "${name}"?\n\nThis cannot be undone.`)) return;
    try {
      await db.ref(`promoCodes/${key}`).remove();
      const msg = document.getElementById("promo-msg");
      if (msg) {
        msg.className = "ok-msg";
        msg.textContent = `Deleted ${name}`;
      }
    } catch (e) {
      alert(dbError(e));
    }
  }

  async function createPromo() {
    const input = document.getElementById("promo-credits");
    const msg = document.getElementById("promo-msg");
    const credits = parseInt(input.value, 10);
    if (!credits || credits < 1) { msg.className = "err"; msg.textContent = "Enter valid credits."; return; }
    const code = generatePromoCode();
    try {
      await db.ref(`promoCodes/${promoPathKey(code)}`).set({
        code, credits, active: true, createdAt: Date.now(), createdBy: CFG.adminEmail,
      });
      await navigator.clipboard.writeText(code);
      msg.className = "ok-msg";
      msg.textContent = `Saved & copied: ${code}`;
    } catch (e) {
      msg.className = "err";
      msg.textContent = dbError(e);
    }
  }

  async function savePayments() {
    const next = { ...state.instructions };
    ["bank", "crypto", "jazzcash"].forEach((k) => {
      const t = main.querySelector(`[data-pay-title="${k}"]`);
      const d = main.querySelector(`[data-pay-details="${k}"]`);
      if (t && d) next[k] = { title: t.value, details: d.value };
    });
    try {
      await db.ref("config/paymentInstructions").set(next);
      alert("Saved.");
    } catch (e) {
      alert(dbError(e));
    }
  }

  function openUserModal(uid) {
    const user = state.users.find((u) => u.uid === uid);
    if (!user) return;
    modalRoot.innerHTML = `<div class="modal-bg" id="modal-x"><div class="modal" onclick="event.stopPropagation()">
      <h2>Manage ${esc(userDisplayEmail(user))}</h2>
      <label class="meta">Plan (resets monthly used on change)</label>
      <select id="m-plan"><option value="free">Free — 10/mo</option><option value="pro">Polar Pro — 100/mo</option><option value="unlimited">Unlimited — ∞</option></select>
      <p id="m-plan-hint" class="meta" style="margin-top:.35rem"></p>
      ${user.planExpiresAt ? `<p class="meta">Subscription ends ${new Date(user.planExpiresAt).toLocaleString()}${user.planBillingCycle ? " (" + planCycleLabel(user.planBillingCycle) + ")" : ""}</p>` : ""}
      <label class="meta" style="display:block;margin-top:.75rem">Grant bonus credits (purchased)</label><input id="m-grant" type="number" value="0" min="0"/>
      <label class="meta" style="display:block;margin-top:.75rem">Monthly used (only if plan unchanged)</label><input id="m-used" type="number" value="${user.credits?.used || 0}" min="0"/>
      <p id="m-msg" class="meta"></p>
      <button class="btn btn-primary" id="m-save" style="width:auto;margin-top:.75rem">Save</button>
    </div></div>`;
    const planSel = document.getElementById("m-plan");
    const planHint = document.getElementById("m-plan-hint");
    const syncHint = () => {
      if (planHint && planSel) planHint.textContent = planAllowanceLabel(planSel.value);
    };
    planSel.onchange = syncHint;
    planSel.value = user.plan || "free";
    syncHint();
    const close = () => (modalRoot.innerHTML = "");
    document.getElementById("modal-x").onclick = close;
    document.getElementById("m-save").onclick = async () => {
      const plan = document.getElementById("m-plan").value;
      const grant = parseInt(document.getElementById("m-grant").value, 10) || 0;
      const used = parseInt(document.getElementById("m-used").value, 10) || 0;
      const msg = document.getElementById("m-msg");
      try {
        const saveBtn = document.getElementById("m-save");
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.textContent = "Saving…";
        }
        const planChanged = plan !== (user.plan || "free");
        if (planChanged) {
          await applyUserPlan(uid, plan);
        }
        if (grant > 0) await grantCredits(uid, grant);
        if (!planChanged) {
          const cref = db.ref(`users/${uid}/credits`);
          const csnap = await cref.get();
          const month = monthKey();
          const cur = csnap.val() || { month, used: 0, purchased: 0 };
          await cref.set({
            month: cur.month === month ? cur.month : month,
            used,
            purchased: cur.month === month ? cur.purchased || 0 : cur.purchased || 0,
          });
        }
        const rem = plan === "unlimited" ? "∞" : planAllowance(plan);
        msg.className = "ok-msg";
        msg.textContent = planChanged
          ? `Saved — ${plan} plan active with ${rem === "∞" ? "unlimited" : rem + " monthly"} credits.`
          : "Saved.";
        setTimeout(close, 900);
      } catch (e) {
        msg.className = "err"; msg.textContent = dbError(e);
      } finally {
        const saveBtn = document.getElementById("m-save");
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = "Save";
        }
      }
    };
  }

  init();
})();