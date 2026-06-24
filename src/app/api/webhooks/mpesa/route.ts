import { NextRequest, NextResponse } from "next/server";
import { logWorkflowRunEvent } from "@/lib/run-events";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { WorkflowRunEvent } from "@/types";
import { verifyManagedMpesaPayment } from "@/lib/billing/mpesa";
import { activatePaidPlanPeriod } from "@/lib/billing/economy";
import type { DoblyPlanId } from "@/lib/billing/plans";

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
    const admin = createAdminSupabaseClient();
    const { data: billingCheckout } = await admin
      .from("billing_checkout_sessions")
      .select("*")
      .eq("provider", "mpesa")
      .eq("provider_checkout_id", checkoutRequestId)
      .maybeSingle();

    if (billingCheckout && resultCode === 0) {
      try {
        const verified = await verifyManagedMpesaPayment(checkoutRequestId);
        if (verified.successful) {
          const planId = String(billingCheckout.plan_id) as DoblyPlanId;
          if ((["starter", "operator", "command"] as string[]).includes(planId)) {
            const receipt = String(metadata.MpesaReceiptNumber ?? checkoutRequestId);
            await activatePaidPlanPeriod({
              provider: "mpesa",
              providerEventId: `receipt:${receipt}`,
              fundingPeriodKey: `receipt:${receipt}`,
              eventType: "stk.payment.completed",
              userId: String(billingCheckout.user_id),
              workspaceId: billingCheckout.workspace_id ?? null,
              planId: planId as Exclude<DoblyPlanId, "free">,
              market: "KE",
              phoneNumber: String(metadata.PhoneNumber ?? billingCheckout.metadata?.phoneNumber ?? "") || null,
              amountMinor: Math.round(Number(metadata.Amount ?? 0) * 100),
              currency: "KES",
              payload: { callback: body, verified: verified.payload },
            });
            await admin
              .from("billing_checkout_sessions")
              .update({ status: "paid", updated_at: new Date().toISOString() })
              .eq("id", billingCheckout.id);
          }
        }
      } catch (error) {
        console.error("Managed M-Pesa payment verification failed:", error);
        return NextResponse.json({ ResultCode: 1, ResultDesc: "Verification unavailable" }, { status: 503 });
      }
    } else if (billingCheckout && resultCode !== 0) {
      await admin
        .from("billing_checkout_sessions")
        .update({ status: "failed", metadata: { ...(billingCheckout.metadata ?? {}), resultCode, resultDesc } })
        .eq("id", billingCheckout.id);
    }

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
