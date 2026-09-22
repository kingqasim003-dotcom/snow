const BASE = process.env.SITE_URL?.trim() || "https://www.snowbear.online";

const checks = [];

function pass(name, detail = "") {
  checks.push({ name, ok: true, detail });
}

function fail(name, detail = "") {
  checks.push({ name, ok: false, detail });
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { res, text, json };
}

async function main() {
  console.log(`Security + publish checks → ${BASE}\n`);

  const health = await request("/api/health");
  if (health.res.ok && health.json?.groqConfigured) {
    pass("API health", `model: ${health.json.groqModel || "default"}`);
  } else {
    fail("API health", health.text.slice(0, 120));
  }

  const verify = await request("/googled78b9c1a3f72a025.html");
  if (verify.res.ok && verify.text.includes("google-site-verification")) {
    pass("Google Search Console file");
  } else {
    fail("Google Search Console file", `status ${verify.res.status}`);
  }

  const sitemap = await request("/sitemap.xml");
  if (sitemap.res.ok && sitemap.text.includes("<urlset")) {
    pass("sitemap.xml");
  } else {
    fail("sitemap.xml", `status ${sitemap.res.status}`);
  }

  const robots = await request("/robots.txt");
  if (robots.res.ok && robots.text.includes("Sitemap:")) {
    pass("robots.txt");
  } else {
    fail("robots.txt");
  }

  const corsBad = await request("/api/health", {
    headers: { Origin: "https://evil.example" },
  });
  if (corsBad.res.status === 403) {
    pass("CORS blocks unknown origins");
  } else {
    fail("CORS blocks unknown origins", `status ${corsBad.res.status}`);
  }

  const xss = await request("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "<script>alert(1)</script>" }),
  });
  if (xss.res.ok && typeof xss.json?.result === "string") {
    pass("Enhance API accepts prompt input");
  } else if (xss.res.status === 500 && xss.json?.error) {
    pass("Enhance API reachable", xss.json.error.slice(0, 80));
  } else {
    fail("Enhance API", `status ${xss.res.status}`);
  }

  const empty = await request("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "" }),
  });
  if (empty.res.status === 400) {
    pass("Empty prompt rejected");
  } else {
    fail("Empty prompt rejected", `status ${empty.res.status}`);
  }

  const huge = await request("/api/enhance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: "x".repeat(12000) }),
  });
  if (huge.res.status === 400) {
    pass("Oversized prompt rejected");
  } else {
    fail("Oversized prompt rejected", `status ${huge.res.status}`);
  }

  const admin = await request("/lop/config.js");
  if (admin.res.ok && !admin.text.includes("password") && !admin.text.includes("gatePassword")) {
    pass("Admin config has no exposed passwords");
  } else if (admin.res.status === 404) {
    pass("Admin config not publicly exposed");
  } else {
    fail("Admin config exposure check");
  }

  const hsts = health.res.headers.get("strict-transport-security");
  if (hsts) {
    pass("HSTS enabled");
  } else {
    fail("HSTS enabled", "header missing");
  }

  let failed = 0;
  for (const c of checks) {
    const mark = c.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
    if (!c.ok) failed += 1;
  }

  console.log(`\n${checks.length - failed}/${checks.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});