import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { Connection } from "@/types";

type MpesaEnvironment = "sandbox" | "production";

function isEnvironment(value: unknown): value is MpesaEnvironment {
  return value === "sandbox" || value === "production";
}

export function getDarajaBaseUrl(environment: MpesaEnvironment) {
  return environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

export async function getMpesaConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "mpesa");

  const secrets = await getDecryptedConnectionSecrets(connection.id);
  const environment = isEnvironment(connection.metadata?.environment)
    ? connection.metadata.environment
    : "sandbox";

  return {
    connection,
    environment,
    consumerKey: secrets.accessToken,
    passkey: secrets.refreshToken,
    consumerSecret: secrets.secret,
  };
}

export async function fetchDarajaAccessToken(input: {
  consumerKey: string;
  consumerSecret: string;
  environment: MpesaEnvironment;
}) {
  const credentials = Buffer.from(`${input.consumerKey}:${input.consumerSecret}`).toString(
    "base64"
  );

  const response = await fetch(
    `${getDarajaBaseUrl(input.environment)}/oauth/v1/generate?grant_type=client_credentials`,
    {
      headers: {
        Authorization: `Basic ${credentials}`,
      },
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.access_token !== "string") {
    throw new Error("Daraja credential validation failed.");
  }

  return {
    token: data.access_token as string,
    expiresIn: Number(data.expires_in ?? 0) || null,
  };
}

export async function validateDarajaCredentials(input: {
  consumerKey: string;
  consumerSecret: string;
  environment: MpesaEnvironment;
}) {
  return fetchDarajaAccessToken(input);
}

function resolveTimestamp(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function buildStkPassword(shortcode: string, passkey: string, timestamp: string) {
  return Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");
}

function resolveShortcode(connection: Connection, config: Record<string, unknown>) {
  const raw = String(
    config.shortcode ??
      connection.metadata?.shortcode ??
      connection.account_identifier ??
      ""
  ).trim();

  if (!raw) {
    throw new Error("M-PESA shortcode is required.");
  }

  return raw;
}

export async function sendDarajaStkPush(input: {
  userId: string;
  connectionId?: string;
  phoneNumber: string;
  amount: number;
  accountReference: string;
  transactionDesc: string;
  callbackUrl?: string;
}) {
  const { connection, environment, consumerKey, consumerSecret, passkey } =
    await getMpesaConnection(input.userId, input.connectionId);

  if (!consumerKey || !consumerSecret || !passkey) {
    throw new Error("M-PESA connection is missing Daraja credentials.");
  }

  const shortcode = resolveShortcode(connection, {});
  const callbackUrl = String(
    input.callbackUrl ??
      connection.metadata?.callbackUrl ??
      process.env.MPESA_CALLBACK_URL ??
      ""
  ).trim();

  if (!callbackUrl) {
    throw new Error("M-PESA callback URL is required.");
  }

  const token = await fetchDarajaAccessToken({
    consumerKey,
    consumerSecret,
    environment,
  });
  const timestamp = resolveTimestamp();
  const password = buildStkPassword(shortcode, passkey, timestamp);

  const response = await fetch(
    `${getDarajaBaseUrl(environment)}/mpesa/stkpush/v1/processrequest`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: Math.max(1, Math.round(input.amount)),
        PartyA: input.phoneNumber,
        PartyB: shortcode,
        PhoneNumber: input.phoneNumber,
        CallBackURL: callbackUrl,
        AccountReference: input.accountReference,
        TransactionDesc: input.transactionDesc,
      }),
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`M-PESA STK push failed: ${JSON.stringify(data)}`);
  }

  return data as Record<string, unknown>;
}
