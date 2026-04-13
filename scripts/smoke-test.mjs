const baseUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const checks = [
  { name: "homepage", url: `${baseUrl}/`, expected: [200] },
  { name: "pricing", url: `${baseUrl}/pricing`, expected: [200] },
  { name: "signup", url: `${baseUrl}/auth/signup`, expected: [200] },
  { name: "login", url: `${baseUrl}/auth/login`, expected: [200] },
  { name: "terms", url: `${baseUrl}/terms`, expected: [200] },
  { name: "privacy", url: `${baseUrl}/privacy`, expected: [200] },
  { name: "cookies", url: `${baseUrl}/cookies`, expected: [200] },
  { name: "whatsapp webhook", url: `${baseUrl}/api/webhooks/whatsapp`, method: "GET", expected: [200] },
  { name: "mpesa webhook", url: `${baseUrl}/api/webhooks/mpesa`, method: "GET", expected: [200] },
  { name: "stripe webhook", url: `${baseUrl}/api/webhooks/stripe`, method: "POST", body: "{}", expected: [400, 503] },
];

let failed = false;

for (const check of checks) {
  try {
    const response = await fetch(check.url, {
      method: check.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: check.body,
      redirect: "manual",
    });
    const ok = check.expected.includes(response.status);
    console.log(`${ok ? "OK" : "FAIL"} ${check.name}: ${response.status}`);
    if (!ok) failed = true;
  } catch (error) {
    console.log(`FAIL ${check.name}: ${error instanceof Error ? error.message : "request failed"}`);
    failed = true;
  }
}

if (failed) process.exit(1);
