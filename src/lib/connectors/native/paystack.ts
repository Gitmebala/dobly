import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getPaystackConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "paystack");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  const secret = secrets.secret || process.env.PAYSTACK_SECRET_KEY;
  if (!secret) throw new Error("Paystack connection is missing a secret key.");
  return { connection, secret };
}

export const paystackPaymentLinkExecutor: ConnectorExecutor = {
  id: "native.paystack.payment-link",
  async execute(context) {
    const { secret } = await getPaystackConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined,
    );

    const email = String(context.config.email ?? "").trim();
    const amount = Number(context.config.amount ?? 0);
    const currency = String(context.config.currency ?? "KES").trim().toUpperCase();
    const callbackUrl = typeof context.config.callbackUrl === "string" ? context.config.callbackUrl : undefined;

    if (!email || !Number.isFinite(amount) || amount <= 0) {
      throw new Error("Paystack payment link requires customer email and amount.");
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount: String(Math.round(amount * 100)),
        currency,
        callback_url: callbackUrl,
        metadata: context.config.metadata ?? {},
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.data?.authorization_url) {
      throw new Error(`Paystack payment link failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "paystack",
      service: "payment_link",
      reference: data.data.reference ?? null,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code ?? null,
    };
  },
};
