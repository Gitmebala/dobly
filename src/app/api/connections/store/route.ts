import { NextRequest, NextResponse } from "next/server";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { logConnectionAudit } from "@/lib/connection-audit";

/**
 * POST /api/connections/store
 * Store connection credentials securely (called by SetupAssistant onComplete)
 */
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      provider,
      label,
      accountIdentifier,
      accessToken,
      refreshToken,
      secret,
      metadata,
    } = await request.json();

    if (!userId || !provider) {
      return NextResponse.json(
        { error: "Missing userId or provider" },
        { status: 400 }
      );
    }

    // Create or update connection
    const connection = await upsertConnection({
      userId,
      provider,
      label: label || `${provider} Connection`,
      status: "active",
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
      userId,
      connectionId: connection.id,
      action: "connection_created",
      status: "success",
      ipAddress: request.headers.get("x-forwarded-for") || undefined,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      connectionId: connection.id,
      status: "active",
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
