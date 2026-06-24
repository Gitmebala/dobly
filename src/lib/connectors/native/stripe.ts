import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getStripeConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "stripe");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.secret) {
    throw new Error("Stripe connection is missing a secret key.");
  }
  return { connection, secret: secrets.secret };
}

/**
 * Create a customer in Stripe
 */
export const stripeCreateCustomerExecutor: ConnectorExecutor = {
  id: "native.stripe.create-customer",
  async execute(context) {
    const { secret } = await getStripeConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const email = String(context.config.email ?? "").trim();
    const name = String(context.config.name ?? "").trim();

    if (!email) {
      throw new Error("Stripe create customer requires email.");
    }

    const response = await fetch("https://api.stripe.com/v1/customers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        email,
        name,
        description: String(context.config.description ?? ""),
      }).toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Stripe create customer failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "stripe",
      service: "customer",
      customerId: data.id ?? null,
      email: data.email ?? null,
    };
  },
};

/**
 * Create a payment invoice in Stripe
 */
export const stripeCreateInvoiceExecutor: ConnectorExecutor = {
  id: "native.stripe.create-invoice",
  async execute(context) {
    const { secret } = await getStripeConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const customerId = String(context.config.customerId ?? "").trim();
    const amount = Number(context.config.amount ?? 0);
    const currency = String(context.config.currency ?? "usd").toLowerCase();
    const description = String(context.config.description ?? "Dobly invoice").trim();

    if (!customerId || !amount) {
      throw new Error("Stripe create invoice requires customerId and amount.");
    }

    const invoiceItemResponse = await fetch("https://api.stripe.com/v1/invoiceitems", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        currency,
        amount: String(Math.round(amount)),
        description,
      }).toString(),
    });

    const invoiceItemData = await invoiceItemResponse.json().catch(() => ({}));
    if (!invoiceItemResponse.ok) {
      throw new Error(`Stripe create invoice item failed: ${JSON.stringify(invoiceItemData)}`);
    }

    const response = await fetch("https://api.stripe.com/v1/invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        customer: customerId,
        auto_advance: String(context.config.autoAdvance ?? true),
        collection_method:
          typeof context.config.collectionMethod === "string"
            ? context.config.collectionMethod
            : "send_invoice",
        description,
      }).toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Stripe create invoice failed: ${JSON.stringify(data)}`);
    }

    let finalized = data;
    if (context.config.finalize !== false && data.id) {
      const finalizeResponse = await fetch(`https://api.stripe.com/v1/invoices/${data.id}/finalize`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secret}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      finalized = await finalizeResponse.json().catch(() => data);
    }

    return {
      provider: "stripe",
      service: "invoice",
      invoiceId: finalized.id ?? data.id ?? null,
      status: finalized.status ?? data.status ?? null,
      amount: finalized.amount_due ?? data.amount_due ?? null,
      hostedInvoiceUrl: finalized.hosted_invoice_url ?? null,
      invoiceItemId: invoiceItemData.id ?? null,
    };
  },
};

/**
 * Refund a Stripe charge
 */
export const stripeRefundChargeExecutor: ConnectorExecutor = {
  id: "native.stripe.refund-charge",
  async execute(context) {
    const { secret } = await getStripeConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );

    const chargeId = String(context.config.chargeId ?? "").trim();
    const amount = context.config.amount ? Number(context.config.amount) : undefined;

    if (!chargeId) {
      throw new Error("Stripe refund requires chargeId.");
    }

    const params = new URLSearchParams({
      charge: chargeId,
    });

    if (amount) {
      params.append("amount", String(amount));
    }

    const response = await fetch("https://api.stripe.com/v1/refunds", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Stripe refund failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "stripe",
      service: "refund",
      refundId: data.id ?? null,
      status: data.status ?? null,
      amount: data.amount ?? null,
    };
  },
};
