import { sendDarajaStkPush } from "@/lib/mpesa/daraja";
import { logWorkflowRunEvent } from "@/lib/run-events";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

export const mpesaStkPushExecutor: ConnectorExecutor = {
  id: "native.mpesa.stk-push",
  async execute(context) {
    const phoneNumber = String(
      context.config.phoneNumber ?? context.config.phone ?? context.triggerPayload.phone ?? ""
    ).trim();
    const amount = Number(context.config.amount ?? context.triggerPayload.amount ?? 0);
    const accountReference = String(
      context.config.accountReference ?? context.workflow.title
    ).trim();
    const transactionDesc = String(
      context.config.transactionDesc ?? context.step.description
    ).trim();

    if (!phoneNumber || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("M-PESA STK push requires a phone number and amount.");
    }

    const result = await sendDarajaStkPush({
      userId: context.workflow.user_id,
      connectionId:
        typeof context.config.connectionId === "string"
          ? context.config.connectionId
          : undefined,
      phoneNumber,
      amount,
      accountReference,
      transactionDesc,
      callbackUrl:
        typeof context.config.callbackUrl === "string"
          ? context.config.callbackUrl
          : undefined,
    });

    if (context.runId) {
      await logWorkflowRunEvent({
        workflowId: context.workflow.id,
        runId: context.runId,
        userId: context.workflow.user_id,
        eventType: "mpesa.stk_push_requested",
        eventData: {
          stepId: context.step.id,
          phoneNumber,
          amount,
          checkoutRequestId: result.CheckoutRequestID ?? null,
          merchantRequestId: result.MerchantRequestID ?? null,
          responseCode: result.ResponseCode ?? null,
        },
      });
    }

    return {
      provider: "mpesa",
      action: "stk_push",
      phoneNumber,
      amount,
      checkoutRequestId: result.CheckoutRequestID ?? null,
      merchantRequestId: result.MerchantRequestID ?? null,
      responseCode: result.ResponseCode ?? null,
      responseDescription: result.ResponseDescription ?? null,
      customerMessage: result.CustomerMessage ?? null,
    };
  },
};
