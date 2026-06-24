const baseUrl = process.env.DOBLY_APP_URL || "http://localhost:3000";
const secret = process.env.WORKER_SECRET;
const intervalMs = Number(process.env.OFFICE_WORKER_INTERVAL_MS || 30000);
const limit = Number(process.env.OFFICE_WORKER_LIMIT || 10);

if (!secret) {
  console.error("WORKER_SECRET is required.");
  process.exit(1);
}

async function tick() {
  const startedAt = new Date().toISOString();
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/office-worker`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-dobly-worker": secret,
      },
      body: JSON.stringify({
        limit,
        workerId: `office-daemon-${process.pid}`,
      }),
    });

    const body = await response.text();
    if (!response.ok) {
      console.error(`[${startedAt}] office worker failed ${response.status}: ${body}`);
      return;
    }

    console.log(`[${startedAt}] office worker tick: ${body}`);
  } catch (error) {
    console.error(`[${startedAt}] office worker error`, error);
  }
}

console.log(`Dobly office worker running against ${baseUrl} every ${intervalMs}ms.`);
await tick();
setInterval(tick, intervalMs);
