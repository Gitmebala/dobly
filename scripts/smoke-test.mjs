const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [
  ...[
    ["homepage", "/"],
    ["pricing", "/pricing"],
    ["signup", "/auth/signup"],
    ["login", "/auth/login"],
    ["forgot password", "/auth/forgot-password"],
    ["terms", "/terms"],
    ["privacy", "/privacy"],
    ["cookies", "/cookies"],
    ["security", "/security"],
    ["subprocessors", "/subprocessors"],
    ["security disclosure", "/.well-known/security.txt"],
  ].map(([name, path]) => ({ name, path, expected: [200] })),
  { name: "dashboard requires auth", path: "/dashboard", expected: [307, 308], location: "/auth/login" },
  { name: "admin requires auth", path: "/admin", expected: [307, 308], location: "/auth/login" },
  { name: "search API requires auth", path: "/api/search?q=launch", expected: [401] },
  { name: "notifications API requires auth", path: "/api/notifications", expected: [401] },
  { name: "internal status requires secret", path: "/api/internal/services/status", expected: [401] },
  { name: "WhatsApp webhook health", path: "/api/webhooks/whatsapp", expected: [200] },
  { name: "M-PESA webhook health", path: "/api/webhooks/mpesa", expected: [200] },
  { name: "unsigned Paystack webhook", path: "/api/webhooks/paystack", method: "POST", body: "{}", expected: [400, 401, 503] },
  {
    name: "cross-origin mutation blocked",
    path: "/api/auth/login",
    method: "POST",
    body: JSON.stringify({ email: "smoke@example.com", password: "NotARealPassword1!" }),
    headers: { Origin: "https://attacker.invalid" },
    expected: [403],
  },
];

let failed = false;

async function runCheck(check) {
  try {
    const response = await fetch(`${baseUrl}${check.path}`, {
      method: check.method || "GET",
      headers: { "Content-Type": "application/json", ...(check.headers || {}) },
      body: check.body,
      redirect: "manual",
      signal: AbortSignal.timeout(15_000),
    });
    const location = response.headers.get("location") || "";
    const statusOk = check.expected.includes(response.status);
    const locationOk = !check.location || location.includes(check.location);
    const ok = statusOk && locationOk;
    console.log(`${ok ? "OK" : "FAIL"} ${check.name}: ${response.status}${location ? ` -> ${location}` : ""}`);
    return ok;
  } catch (error) {
    console.log(`FAIL ${check.name}: ${error instanceof Error ? error.message : "request failed"}`);
    return false;
  }
}

for (const check of checks) {
  if (!(await runCheck(check))) failed = true;
}

try {
  const response = await fetch(`${baseUrl}/`, { redirect: "manual", signal: AbortSignal.timeout(15_000) });
  const requiredHeaders = {
    "content-security-policy": Boolean(response.headers.get("content-security-policy")),
    "x-content-type-options": response.headers.get("x-content-type-options") === "nosniff",
    "referrer-policy": Boolean(response.headers.get("referrer-policy")),
    "x-request-id": Boolean(response.headers.get("x-request-id")),
  };
  for (const [header, ok] of Object.entries(requiredHeaders)) {
    console.log(`${ok ? "OK" : "FAIL"} security header ${header}`);
    if (!ok) failed = true;
  }
} catch (error) {
  console.log(`FAIL security headers: ${error instanceof Error ? error.message : "request failed"}`);
  failed = true;
}

if (failed) process.exit(1);
console.log(`PASS ${checks.length} route checks plus security headers against ${baseUrl}`);
