import { DOBLY_SKILL_MANIFESTS } from "@/lib/skills/manifests";
import { anthropic } from "@/lib/anthropic";
import { googleSheetsReadExecutor } from "@/lib/connectors/native/google";
import type { DoblySkill, DoblySkillContext, DoblySkillManifest } from "@/lib/skills/types";

function getString(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function getObject(value: unknown) {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function intelligenceResult(output: Record<string, unknown>) {
  return { success: true, output, usage: { executionType: "intelligence" as const, units: 1 } };
}

function standardResult(output: Record<string, unknown>) {
  return { success: true, output, usage: { executionType: "standard" as const, units: 1 } };
}

function createSkill(manifest: DoblySkillManifest, run: (context: DoblySkillContext) => Promise<ReturnType<typeof standardResult> | ReturnType<typeof intelligenceResult>>): DoblySkill {
  return { manifest, run };
}

const manifestsByKey = new Map(DOBLY_SKILL_MANIFESTS.map((manifest) => [manifest.key, manifest]));

export const DOBLY_SKILLS: DoblySkill[] = [
  createSkill(manifestsByKey.get("send_whatsapp_confirmation")!, async ({ config }) => {
    const details = getObject(config.details);
    const message = `Thanks - your request has been handled. ${getString(details.reference, "")}`.trim();
    return standardResult({ message });
  }),
  createSkill(manifestsByKey.get("log_payment_to_sheet")!, async ({ config }) => {
    const payment = getObject(config.payment);
    return standardResult({
      row: [
        getString(payment.customer_name, "Unknown"),
        getString(payment.reference, "No reference"),
        getNumber(payment.amount, 0),
        getString(payment.created_at, new Date().toISOString()),
      ],
    });
  }),
  createSkill(manifestsByKey.get("compose_daily_summary")!, async ({ config }) => {
    const records = Array.isArray(config.records) ? config.records : [];
    return intelligenceResult({
      summary: `Handled ${records.length} events today. What needed to happen, happened.`,
    });
  }),
  createSkill(manifestsByKey.get("execute_agent_task")!, async ({ workflow, config, trigger, stepOutputs, step }) => {
    const taskDescription = getString(config.task_description, step.description);
    const role = getString(config.role, workflow.title || "Business agent");
    const objective = getString(config.objective, "Complete this task safely and report the next recommended action.");
    const context = config.context && typeof config.context === "object" ? JSON.stringify(config.context) : getString(config.context, "");

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 900,
      system: "You are Dobly's bounded business agent. Provide a concise recommended action and a short explanation based on the task, role, and objective.",
      messages: [
        {
          role: "user",
          content: `Task: ${taskDescription}\nRole: ${role}\nObjective: ${objective}\nContext: ${context}`,
        },
      ],
    });

    const response = message.content[0]?.type === "text" ? message.content[0].text : "Unable to generate an agent response.";
    const summary = response.split("\n").slice(0, 2).join(" ").slice(0, 240);

    return intelligenceResult({ response, summary });
  }),
  createSkill(manifestsByKey.get("classify_customer_message")!, async ({ config }) => {
    const message = getString(config.message).toLowerCase();
    const category = message.includes("refund")
      ? "billing"
      : message.includes("book")
        ? "booking"
        : message.includes("help")
          ? "support"
          : "general";
    return intelligenceResult({ category, confidence: 0.76 });
  }),
  createSkill(
    manifestsByKey.get("analyze_spreadsheet_data")!,
    async ({ workflow, definition, trigger, triggerPayload, step, config, stepOutputs }) => {
      const spreadsheetId = getString(config.spreadsheetId);
      const range = getString(config.range, "Sheet1!A:Z");
      const prompt = getString(
        config.prompt,
        "Analyze this spreadsheet data and summarize the key business insights."
      );

      const sheetResult = await googleSheetsReadExecutor.execute({
        workflow,
        definition,
        trigger,
        triggerPayload,
        step,
        config: { spreadsheetId, range },
        stepOutputs,
      });

    const values = Array.isArray(sheetResult.values) ? sheetResult.values : [];
    const rowsString = JSON.stringify(values.slice(0, 100));

    const analysisMessage = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: "You are an expert data analyst. Analyze the spreadsheet rows and answer the prompt clearly.",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nSpreadsheet rows:\n${rowsString}`,
        },
      ],
    });

    const analysis =
      analysisMessage.content[0]?.type === "text"
        ? analysisMessage.content[0].text
        : "Unable to analyze sheet data.";

    return intelligenceResult({ analysis });
  }),
  createSkill(manifestsByKey.get("detect_payment_anomaly")!, async ({ config }) => {
    const payment = getObject(config.payment);
    const amount = getNumber(payment.amount, 0);
    const anomaly = amount > 100000;
    return intelligenceResult({
      anomaly,
      reason: anomaly ? "Amount is materially above recent payment patterns." : "Payment looks normal.",
    });
  }),
  createSkill(manifestsByKey.get("draft_followup_email")!, async ({ config }) => {
    const name = getString(config.recipient_name, "there");
    const context = getString(config.context, "following up");
    return intelligenceResult({
      subject: `Following up on ${context}`,
      body: `Hi ${name},\n\nJust checking in on ${context}. If you want, reply here and Dobly will keep the next step handled.\n`,
    });
  }),
  createSkill(manifestsByKey.get("route_support_ticket")!, async ({ config }) => {
    const text = getString(config.ticket_text).toLowerCase();
    const urgent = text.includes("urgent") || text.includes("down");
    return intelligenceResult({ queue: urgent ? "priority" : "general", urgent });
  }),
  createSkill(manifestsByKey.get("prepare_approval_request")!, async ({ config }) => {
    const action = getString(config.action, "approve this action");
    const amount = config.amount == null ? null : getNumber(config.amount);
    return standardResult({
      title: "Approval required",
      message: amount ? `Dobly wants to ${action} for ${amount}. Reply YES to approve or NO to cancel.` : `Dobly wants to ${action}. Reply YES to approve or NO to cancel.`,
    });
  }),
  createSkill(manifestsByKey.get("explain_connection_failure")!, async ({ config }) => {
    const provider = getString(config.provider, "service");
    return intelligenceResult({
      explanation: `Your ${provider} connection stopped working.`,
      next_step: `Reconnect ${provider} and Dobly can retry the waiting work.`,
    });
  }),
  createSkill(manifestsByKey.get("sync_shopify_order_to_sheet")!, async ({ config }) => {
    const order = getObject(config.order);
    return standardResult({
      row: [
        getString(order.order_number, "Unknown"),
        getString(order.customer_email, "Unknown"),
        getNumber(order.total_price, 0),
        getString(order.created_at, new Date().toISOString()),
      ],
    });
  }),
  createSkill(manifestsByKey.get("schedule_booking_reminder")!, async ({ config }) => {
    const booking = getObject(config.booking);
    const bookedAt = new Date(getString(booking.starts_at, new Date().toISOString()));
    bookedAt.setHours(bookedAt.getHours() - 24);
    return standardResult({
      send_at: bookedAt.toISOString(),
      message: `Reminder: your booking is coming up tomorrow.`,
    });
  }),
  createSkill(manifestsByKey.get("reconcile_inventory_update")!, async ({ config }) => {
    const inventory = getObject(config.inventory_record);
    const current = getNumber(inventory.quantity, 0);
    const change = getNumber(config.change, 0);
    return standardResult({ new_quantity: Math.max(0, current + change) });
  }),
  createSkill(manifestsByKey.get("generate_weekly_report")!, async ({ config }) => {
    const metrics = Array.isArray(config.metrics) ? config.metrics : [];
    return intelligenceResult({
      report: `Handled ${metrics.length} tracked metrics this week. What needed to happen, happened.`,
    });
  }),
  createSkill(manifestsByKey.get("extract_structured_lead")!, async ({ config }) => {
    const rawText = getString(config.raw_text);
    return intelligenceResult({
      name: rawText.split(" ")[0] ?? null,
      email: rawText.includes("@") ? rawText.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] ?? null : null,
      intent: rawText.slice(0, 140),
    });
  }),
  createSkill(manifestsByKey.get("prepare_whatsapp_approval_reply")!, async ({ config }) => {
    const reply = getString(config.reply).trim().toLowerCase();
    return standardResult({ approved: reply === "yes" || reply === "approve" });
  }),
];

const skillMap = new Map(DOBLY_SKILLS.map((skill) => [skill.manifest.key, skill]));

export function listDoblySkills() {
  return DOBLY_SKILLS.map((skill) => skill.manifest);
}

export function getDoblySkill(key: string) {
  return skillMap.get(key) ?? null;
}
