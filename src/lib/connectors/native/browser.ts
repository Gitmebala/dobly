import { existsSync } from "node:fs";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

// The real executor behind the "operate_browser" capability, which existed
// as a recognized DoblyCapability tag (runtime/capabilities.ts) with an
// explicit high-risk alias list ("portal", "browser", "log into", "website
// admin", "dashboard") but had ZERO executor wired to it anywhere -
// confirmed by comparing connection-capabilities.ts's "webhook.browser"
// entry (no executorId at all) against "webhook.request" right next to it
// (which has executorId: "generic.http"). This is that missing executor,
// registered the same way every other native.* connector is
// (connectors/registry.ts), not a parallel system.
//
// Real headless Chromium, not a fake/simulated browser. Two important,
// deliberate constraints:
//
// 1. Deployment target is Vercel Hobby (confirmed by an existing code
//    comment in api/cron/process-queue/route.ts). Hobby has both a function
//    duration ceiling and a bundle-size ceiling. @sparticuz/chromium +
//    puppeteer-core are dynamically imported inside execute(), never at
//    module top-level, specifically so routes that don't invoke this
//    capability aren't forced to bundle a Chromium binary. This has NOT
//    been verified against Vercel's actual deployed bundle-size limit from
//    this sandbox - that can only be confirmed by a real `vercel --prod`
//    deploy, which is the founder's action. If it turns out to blow the
//    bundle budget, the fallback is a managed browser-automation API
//    (Browserbase/Anchor/Steel) instead of self-hosting Chromium - a
//    provider swap behind this same ConnectorExecutor interface, not a
//    redesign.
// 2. @sparticuz/chromium's binary is Linux-only (built for Lambda's Amazon
//    Linux) and will not run on this Windows dev sandbox. Locally it falls
//    back to whatever real Chrome/Edge is actually installed, which is
//    what makes it possible to test this executor for real, not just
//    typecheck it.

export type BrowserAction =
  | { type: "click"; selector: string }
  | { type: "type"; selector: string; text: string }
  | { type: "wait"; ms: number }
  | { type: "wait_for"; selector: string }
  | { type: "extract_text"; selector?: string }
  | { type: "screenshot" };

const MAX_ACTIONS = 8;
const NAV_TIMEOUT_MS = 12000;
const ACTION_TIMEOUT_MS = 6000;
// Conservative on purpose - the invoking route (api/internal/worker) sets
// maxDuration = 60 on a Hobby plan; this leaves real margin for auth,
// queue bookkeeping, and (if a future change ever batches multiple jobs
// per invocation) other work sharing that same 60s budget.
const MAX_TOTAL_MS = 25000;

function isServerlessEnvironment() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

function findLocalChromePath(): string | null {
  if (process.env.DOBLY_LOCAL_CHROME_PATH && existsSync(process.env.DOBLY_LOCAL_CHROME_PATH)) {
    return process.env.DOBLY_LOCAL_CHROME_PATH;
  }
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((candidate) => { try { return existsSync(candidate); } catch { return false; } }) ?? null;
}

async function launchBrowser() {
  const puppeteer = await import("puppeteer-core");

  if (isServerlessEnvironment()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const localPath = findLocalChromePath();
  if (!localPath) {
    throw new Error(
      "No local Chrome/Edge found for browser automation. Set DOBLY_LOCAL_CHROME_PATH to a real browser executable to test this locally.",
    );
  }
  return puppeteer.launch({ executablePath: localPath, headless: true });
}

function normalizeActions(raw: unknown): BrowserAction[] {
  if (!Array.isArray(raw)) return [];
  const out: BrowserAction[] = [];
  for (const item of raw.slice(0, MAX_ACTIONS)) {
    if (!item || typeof item !== "object") continue;
    const candidate = item as Record<string, unknown>;
    const type = String(candidate.type ?? "");
    if (type === "click" && typeof candidate.selector === "string") {
      out.push({ type: "click", selector: candidate.selector });
    } else if (type === "type" && typeof candidate.selector === "string" && typeof candidate.text === "string") {
      out.push({ type: "type", selector: candidate.selector, text: candidate.text });
    } else if (type === "wait" && typeof candidate.ms === "number") {
      out.push({ type: "wait", ms: Math.max(0, Math.min(candidate.ms, 5000)) });
    } else if (type === "wait_for" && typeof candidate.selector === "string") {
      out.push({ type: "wait_for", selector: candidate.selector });
    } else if (type === "extract_text") {
      out.push({ type: "extract_text", selector: typeof candidate.selector === "string" ? candidate.selector : undefined });
    } else if (type === "screenshot") {
      out.push({ type: "screenshot" });
    }
  }
  return out;
}

export const browserOperateExecutor: ConnectorExecutor = {
  id: "native.browser.operate",
  async execute(context) {
    const url = String(context.config.url ?? "").trim();
    if (!/^https?:\/\//i.test(url)) {
      throw new Error("Browser operation requires a valid http(s) url in config.url.");
    }
    const actions = normalizeActions(context.config.actions);
    const startedAt = Date.now();

    const browser = await launchBrowser();
    const actionResults: Array<{ action: string; ok: boolean; detail?: string }> = [];
    let extractedText = "";
    let screenshotDataUrl: string | null = null;
    let pageTitle = "";
    let finalUrl = url;

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
      pageTitle = await page.title();
      finalUrl = page.url();

      for (const action of actions) {
        if (Date.now() - startedAt > MAX_TOTAL_MS) {
          actionResults.push({ action: action.type, ok: false, detail: "Skipped - time budget exceeded." });
          continue;
        }
        try {
          if (action.type === "click") {
            await page.waitForSelector(action.selector, { timeout: ACTION_TIMEOUT_MS });
            await page.click(action.selector);
            actionResults.push({ action: `click ${action.selector}`, ok: true });
          } else if (action.type === "type") {
            await page.waitForSelector(action.selector, { timeout: ACTION_TIMEOUT_MS });
            await page.type(action.selector, action.text);
            actionResults.push({ action: `type into ${action.selector}`, ok: true });
          } else if (action.type === "wait") {
            await new Promise((resolve) => setTimeout(resolve, action.ms));
            actionResults.push({ action: `wait ${action.ms}ms`, ok: true });
          } else if (action.type === "wait_for") {
            await page.waitForSelector(action.selector, { timeout: ACTION_TIMEOUT_MS });
            actionResults.push({ action: `wait_for ${action.selector}`, ok: true });
          } else if (action.type === "extract_text") {
            const text = action.selector
              ? await page.$eval(action.selector, (element) => (element as HTMLElement).innerText).catch(() => "")
              : await page.evaluate(() => document.body.innerText);
            extractedText += (extractedText ? "\n---\n" : "") + text.slice(0, 6000);
            actionResults.push({ action: `extract_text ${action.selector ?? "(page)"}`, ok: true });
          } else if (action.type === "screenshot") {
            const buffer = await page.screenshot({ type: "jpeg", quality: 70 });
            screenshotDataUrl = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
            actionResults.push({ action: "screenshot", ok: true });
          }
        } catch (actionError) {
          actionResults.push({
            action: action.type,
            ok: false,
            detail: actionError instanceof Error ? actionError.message : "Action failed.",
          });
        }
      }

      // A final screenshot always gets taken even if none was explicitly
      // requested - real visual proof of what actually happened, for the
      // human reviewing the run, not just a text claim from the model.
      if (!screenshotDataUrl) {
        const buffer = await page.screenshot({ type: "jpeg", quality: 70 });
        screenshotDataUrl = `data:image/jpeg;base64,${Buffer.from(buffer).toString("base64")}`;
      }
      if (!extractedText) {
        extractedText = (await page.evaluate(() => document.body.innerText).catch(() => "")).slice(0, 6000);
      }
    } finally {
      await browser.close().catch(() => undefined);
    }

    return {
      url,
      finalUrl,
      pageTitle,
      extractedText,
      screenshotDataUrl,
      actionsRequested: actions.length,
      actionResults,
      durationMs: Date.now() - startedAt,
    };
  },
};
