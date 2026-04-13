import crypto from "crypto";
import { Resend } from "resend";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { upsertConnection } from "@/lib/connections";
import type { Connection, ConnectionVerification } from "@/types";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

function hashValue(value: string) {
  const key = process.env.ENCRYPTION_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "dobly";
  return crypto.createHmac("sha256", key).update(value).digest("hex");
}

function randomCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function randomToken() {
  return crypto.randomBytes(24).toString("base64url");
}

async function insertVerification(input: Omit<ConnectionVerification, "id" | "created_at" | "updated_at" | "attempts" | "verified_at" | "status" | "code_hash" | "token_hash"> & {
  code?: string | null;
  token?: string | null;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connection_verifications")
    .insert({
      user_id: input.user_id,
      connection_id: input.connection_id,
      provider: input.provider,
      channel: input.channel,
      verification_type: input.verification_type,
      destination: input.destination,
      code_hash: input.code ? hashValue(input.code) : null,
      token_hash: input.token ? hashValue(input.token) : null,
      status: "pending",
      attempts: 0,
      expires_at: input.expires_at,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error("Failed to create verification record.");
  }

  return data as ConnectionVerification;
}

export async function requestWhatsappOtp(input: {
  userId: string;
  provider: string;
  label: string;
  destination: string;
  metadata?: Record<string, unknown>;
}) {
  const connection = await upsertConnection({
    userId: input.userId,
    provider: input.provider,
    label: input.label,
    status: "pending",
    accountIdentifier: input.destination,
    metadata: { ...(input.metadata ?? {}), verification_channel: "whatsapp" },
  });

  const code = randomCode();
  const verification = await insertVerification({
    user_id: input.userId,
    connection_id: connection.id,
    provider: input.provider,
    channel: "whatsapp",
    verification_type: "otp",
    destination: input.destination,
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    metadata: input.metadata ?? {},
    code,
  });

  await sendWhatsappOtp({
    destination: input.destination,
    code,
    label: input.label,
  });

  return {
    connection,
    verification,
    developmentCodePreview: process.env.NODE_ENV !== "production" ? code : null,
  };
}

export async function verifyWhatsappOtp(input: {
  userId: string;
  verificationId: string;
  code: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connection_verifications")
    .select("*")
    .eq("id", input.verificationId)
    .eq("user_id", input.userId)
    .single();

  if (error || !data) {
    throw new Error("Verification not found.");
  }

  const verification = data as ConnectionVerification;
  if (verification.status !== "pending") {
    throw new Error("This verification is no longer active.");
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    await admin.from("connection_verifications").update({ status: "expired" }).eq("id", verification.id);
    throw new Error("This verification code has expired.");
  }
  if ((verification.attempts ?? 0) >= 5) {
    await admin
      .from("connection_verifications")
      .update({ status: "cancelled" })
      .eq("id", verification.id);
    throw new Error("Too many incorrect attempts. Request a new code.");
  }
  if (hashValue(input.code) !== verification.code_hash) {
    await admin
      .from("connection_verifications")
      .update({ attempts: (verification.attempts ?? 0) + 1 })
      .eq("id", verification.id);
    throw new Error("That code is not valid.");
  }

  await admin
    .from("connection_verifications")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", verification.id);

  const { data: connectionData, error: connectionError } = await admin
    .from("connections")
    .update({
      status: "pending",
      metadata: {
        ...(verification.metadata ?? {}),
        verification_channel: "whatsapp",
        verified_at: new Date().toISOString(),
        setup_state: "number_verified",
        requires_messaging_setup: true,
      },
    })
    .eq("id", verification.connection_id)
    .eq("user_id", input.userId)
    .select("*")
    .single();

  if (connectionError || !connectionData) {
    throw new Error("Failed to activate WhatsApp connection.");
  }

  return connectionData as Connection;
}

export async function requestEmailVerificationLink(input: {
  userId: string;
  provider: string;
  label: string;
  destination: string;
  metadata?: Record<string, unknown>;
  appUrl: string;
}) {
  const connection = await upsertConnection({
    userId: input.userId,
    provider: input.provider,
    label: input.label,
    status: "pending",
    accountIdentifier: input.destination,
    metadata: { ...(input.metadata ?? {}), verification_channel: "email" },
  });

  const token = randomToken();
  const verification = await insertVerification({
    user_id: input.userId,
    connection_id: connection.id,
    provider: input.provider,
    channel: "email",
    verification_type: "email_link",
    destination: input.destination,
    expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    metadata: input.metadata ?? {},
    token,
  });

  const verifyUrl = `${input.appUrl.replace(/\/$/, "")}/api/connections/verify-link?token=${encodeURIComponent(token)}&verificationId=${verification.id}`;
  await sendVerificationEmail({
    to: input.destination,
    verifyUrl,
    label: input.label,
  });

  return {
    connection,
    verification,
    developmentVerifyUrl: process.env.NODE_ENV !== "production" ? verifyUrl : null,
  };
}

export async function verifyEmailLink(input: { verificationId: string; token: string }) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("connection_verifications")
    .select("*")
    .eq("id", input.verificationId)
    .single();

  if (error || !data) {
    throw new Error("Verification not found.");
  }

  const verification = data as ConnectionVerification;
  if (verification.status !== "pending") {
    throw new Error("This link is no longer active.");
  }
  if (new Date(verification.expires_at).getTime() < Date.now()) {
    await admin.from("connection_verifications").update({ status: "expired" }).eq("id", verification.id);
    throw new Error("This verification link has expired.");
  }
  if (hashValue(input.token) !== verification.token_hash) {
    throw new Error("This verification link is invalid.");
  }

  await admin
    .from("connection_verifications")
    .update({ status: "verified", verified_at: new Date().toISOString() })
    .eq("id", verification.id);

  const { data: connectionData, error: connectionError } = await admin
    .from("connections")
    .update({
      status: "active",
      metadata: {
        ...(verification.metadata ?? {}),
        verification_channel: "email",
        verified_at: new Date().toISOString(),
      },
    })
    .eq("id", verification.connection_id)
    .select("*")
    .single();

  if (connectionError || !connectionData) {
    throw new Error("Failed to activate email connection.");
  }

  return connectionData as Connection;
}

async function sendVerificationEmail(input: { to: string; verifyUrl: string; label: string }) {
  if (!resend) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email verification is not configured yet.");
    }
    return;
  }

  await resend.emails.send({
    from: process.env.EMAIL_FROM ?? "Dobly <hello@dobly.io>",
    to: input.to,
    subject: `Verify your ${input.label} connection`,
    html: `
      <div style="font-family: 'DM Sans', Arial, sans-serif; background:#080810; color:#E6E4F8; padding:24px;">
        <h2 style="margin:0 0 12px; color:#4F46E5;">Verify your connection</h2>
        <p style="margin:0 0 16px;">Click the button below to finish connecting your account to Dobly.</p>
        <a href="${input.verifyUrl}" style="display:inline-block; background:#4F46E5; color:#F5F4FF; padding:12px 18px; border-radius:999px; text-decoration:none; font-weight:700;">Verify email</a>
        <p style="margin:16px 0 0; color:#6E6C90;">If you did not request this, you can ignore this email.</p>
      </div>
    `,
  });
}

async function sendWhatsappOtp(input: { destination: string; code: string; label: string }) {
  if (!process.env.DOBLY_WHATSAPP_OTP_WEBHOOK_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("WhatsApp verification delivery is not configured yet.");
    }
    return;
  }

  const response = await fetch(process.env.DOBLY_WHATSAPP_OTP_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      to: input.destination,
      type: "otp",
      message: `Your Dobly verification code is ${input.code}. It expires in 10 minutes.`,
      label: input.label,
    }),
  }).catch(() => null);

  if (!response?.ok && process.env.NODE_ENV === "production") {
    throw new Error("WhatsApp verification delivery failed.");
  }
}
