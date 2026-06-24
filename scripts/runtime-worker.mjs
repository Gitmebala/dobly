const baseUrl = process.env.DOBLY_APP_URL || "http://localhost:3000";
const secret = process.env.WORKER_SECRET;
const intervalMs = Number(process.env.RUNTIME_WORKER_INTERVAL_MS || 15000);
const limit = Number(process.env.RUNTIME_WORKER_LIMIT || 10);

if (!secret) {
  console.error("WORKER_SECRET is required.");
  process.exit(1);
}

async function tick() {
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/worker`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dobly-worker": secret,
      },
      body: JSON.stringify({
        limit,
        workerId: `runtime-daemon-${process.pid}`,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      console.error(`[${startedAt}] runtime worker failed ${response.status}: ${body}`);
      return;
    }

    console.log(`[${startedAt}] runtime worker tick: ${body}`);
  } catch (error) {
    console.error(`[${startedAt}] runtime worker error`, error);
  }
}

console.log(`Dobly runtime worker running against ${baseUrl} every ${intervalMs}ms.`);
await tick();
setInterval(tick, intervalMs);
