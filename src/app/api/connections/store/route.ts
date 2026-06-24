import { NextRequest, NextResponse } from "next/server";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { logConnectionAudit } from "@/lib/connection-audit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { isConnectionProviderLaunchReady } from "@/lib/connection-catalog";
import { secureConnectionSetupSchema } from "@/lib/validations";

/**
 * POST /api/connections/store
 * Store connection credentials securely (called by SetupAssistant onComplete)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const parsed = secureConnectionSetupSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid connection setup." },
        { status: 400 }
      );
    }
    const { provider, label, accountIdentifier, accessToken, refreshToken, secret, metadata } = parsed.data;
    if (!isConnectionProviderLaunchReady(provider)) {
      return NextResponse.json({ error: "This provider is not available in the current Dobly release." }, { status: 404 });
    }

    // Create or update connection
    const connection = await upsertConnection({
      userId: user.id,
      provider,
      label,
      status: "pending",
      accountIdentifier,
      metadata,
    });

    // Store encrypted credentials
    if (accessToken || refreshToken || secret) {
      await storeConnectionSecrets({
        connectionId: connection.id,
        accessToken,
        refreshToken,
        secret,
      });
    }

    // Log audit
    await logConnectionAudit({
      userId: user.id,
      connectionId: connection.id,
      action: "connection_created",
      status: "success",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      connectionId: connection.id,
      status: "pending",
      provider,
    });
  } catch (error) {
    console.error("Failed to store connection:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to store connection" },
      { status: 500 }
    );
  }
}
