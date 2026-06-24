const appUrl = (process.env.DOBLY_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const workerSecret = process.env.WORKER_SECRET;
const schedulerSecret = process.env.SCHEDULER_SECRET;
const mode = process.env.DOBLY_SERVICE_MODE || "runtime";
const intervalMs = Number(process.env.DOBLY_SERVICE_INTERVAL_MS || (mode === "scheduler" ? 60_000 : 15_000));
let stopping = false;

if ((mode === "scheduler" && !schedulerSecret) || (mode !== "scheduler" && !workerSecret)) {
  console.error(mode === "scheduler" ? "SCHEDULER_SECRET is required." : "WORKER_SECRET is required.");
  process.exit(1);
}

const targets = {
  runtime: { path: "/api/internal/worker", header: "x-dobly-worker", secret: workerSecret, body: { limit: 10, workerId: `runtime-${process.pid}` } },
  office: { path: "/api/internal/office-worker", header: "x-dobly-worker", secret: workerSecret, body: { limit: 10, workerId: `office-${process.pid}` } },
  scheduler: { path: "/api/internal/scheduler", header: "x-dobly-scheduler", secret: schedulerSecret, body: {} },
};
const target = targets[mode];
if (!target) throw new Error(`Unknown DOBLY_SERVICE_MODE: ${mode}`);

async function tick() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const response = await fetch(`${appUrl}${target.path}`, {
      method: "POST",
      headers: { "content-type": "application/json", [target.header]: target.secret },
      body: JSON.stringify(target.body),
      signal: controller.signal,
    });
    const text = await response.text();
    const log = response.ok ? console.log : console.error;
    log(`[${new Date().toISOString()}] ${mode} ${response.status}: ${text.slice(0, 2000)}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${mode} request failed`, error);
  } finally {
    clearTimeout(timeout);
  }
}

process.on("SIGTERM", () => { stopping = true; });
process.on("SIGINT", () => { stopping = true; });
console.log(`Dobly ${mode} service started against ${appUrl}.`);
while (!stopping) {
  const started = Date.now();
  await tick();
  const wait = Math.max(1000, intervalMs - (Date.now() - started));
  await new Promise((resolve) => setTimeout(resolve, wait));
}
