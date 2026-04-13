import { NextRequest, NextResponse } from "next/server";
import { logWorkflowRunEvent } from "@/lib/run-events";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { WorkflowRunEvent } from "@/types";

function extractCallback(body: Record<string, unknown>) {
  const stkCallback = ((body.Body as Record<string, unknown> | undefined)?.stkCallback ??
    (body.body as Record<string, unknown> | undefined)?.stkCallback ??
    null) as Record<string, unknown> | null;

  return stkCallback;
}

function extractMetadataItems(callback: Record<string, unknown> | null) {
  const items =
    ((callback?.CallbackMetadata as Record<string, unknown> | undefined)?.Item ??
      (callback?.CallbackMetadata as Record<string, unknown> | undefined)?.item ??
      []) as Array<Record<string, unknown>>;

  return items.reduce<Record<string, unknown>>((acc, item) => {
    const name = typeof item.Name === "string" ? item.Name : typeof item.name === "string" ? item.name : null;
    if (!name) return acc;
    acc[name] = item.Value ?? item.value ?? null;
    return acc;
  }, {});
}

async function findMatchingRunEvent(checkoutRequestId: string) {
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("workflow_run_events")
    .select("*")
    .eq("event_type", "mpesa.stk_push_requested")
    .order("created_at", { ascending: false })
    .limit(200);

  return ((data ?? []) as WorkflowRunEvent[]).find(
    (event) => event.event_data?.checkoutRequestId === checkoutRequestId
  );
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "dobly-mpesa-webhook" });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) {
    return NextResponse.json({ error: "Invalid callback payload" }, { status: 400 });
  }

  const callback = extractCallback(body);
  const checkoutRequestId = String(callback?.CheckoutRequestID ?? "").trim();
  const metadata = extractMetadataItems(callback);
  const resultCode =
    typeof callback?.ResultCode === "number"
      ? callback.ResultCode
      : Number(callback?.ResultCode ?? 9999);
  const resultDesc = String(callback?.ResultDesc ?? "");

  if (checkoutRequestId) {
    const matchingEvent = await findMatchingRunEvent(checkoutRequestId);

    if (matchingEvent) {
      await logWorkflowRunEvent({
        workflowId: matchingEvent.workflow_id,
        runId: matchingEvent.run_id,
        userId: matchingEvent.user_id,
        eventType: resultCode === 0 ? "mpesa.stk_push_callback" : "mpesa.stk_push_failed",
        eventData: {
          checkoutRequestId,
          merchantRequestId: callback?.MerchantRequestID ?? null,
          resultCode,
          resultDesc,
          metadata,
        },
      });
    }
  }

  return NextResponse.json({
    ResultCode: 0,
    ResultDesc: "Accepted",
  });
}
