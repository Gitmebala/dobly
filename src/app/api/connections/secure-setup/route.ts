import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { rateLimits } from "@/lib/rate-limit";
import { secureConnectionSetupSchema } from "@/lib/validations";
import { validateDarajaCredentials } from "@/lib/mpesa/daraja";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many secure setup requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = secureConnectionSetupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Missing provider or label" }, { status: 400 });
  }

  try {
    const metadata = { ...(parsed.data.metadata ?? {}) };

    if (parsed.data.provider === "mpesa") {
      const environment =
        metadata.environment === "production" ? "production" : "sandbox";
      const callbackUrl =
        typeof metadata.callbackUrl === "string" && metadata.callbackUrl.trim().length > 0
          ? metadata.callbackUrl.trim()
          : process.env.MPESA_CALLBACK_URL ?? "";

      if (!parsed.data.accessToken || !parsed.data.secret || !parsed.data.refreshToken) {
        return NextResponse.json(
          {
            error:
              "M-PESA setup requires your Daraja consumer key, consumer secret, and passkey.",
          },
          { status: 400 }
        );
      }

      if (!callbackUrl) {
        return NextResponse.json(
          {
            error:
              "M-PESA setup requires a callback URL. Add one in the form or set MPESA_CALLBACK_URL.",
          },
          { status: 400 }
        );
      }

      await validateDarajaCredentials({
        consumerKey: parsed.data.accessToken,
        consumerSecret: parsed.data.secret,
        environment,
      });

      metadata.environment = environment;
      metadata.provider = "daraja";
      metadata.callbackUrl = callbackUrl;
    }

    if (parsed.data.provider === "whatsapp") {
      if (!parsed.data.accessToken || typeof metadata.phoneNumberId !== "string" || !metadata.phoneNumberId.trim()) {
        return NextResponse.json(
          {
            error:
              "WhatsApp messaging setup requires a Meta access token and phone number ID.",
          },
          { status: 400 }
        );
      }

      metadata.phoneNumberId = metadata.phoneNumberId.trim();
      metadata.verified_at =
        typeof metadata.verified_at === "string" && metadata.verified_at.trim()
          ? metadata.verified_at
          : new Date().toISOString();
      metadata.setup_state = "messaging_ready";
      metadata.requires_messaging_setup = false;
    }

    const connection = await upsertConnection({
      userId: user.id,
      provider: parsed.data.provider,
      label: parsed.data.label,
      status: "active",
      accountIdentifier: parsed.data.accountIdentifier ?? null,
      metadata,
      scopes: parsed.data.scopes ?? [],
    });

    await storeConnectionSecrets({
      connectionId: connection.id,
      accessToken: parsed.data.accessToken ?? null,
      refreshToken: parsed.data.refreshToken ?? null,
      secret: parsed.data.secret ?? null,
      expiresAt: parsed.data.expiresAt ?? null,
    });

    return NextResponse.json({ connection });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create secure connection" },
      { status: 500 }
    );
  }
}
