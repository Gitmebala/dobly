import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import crypto from "crypto";

/**
 * POST /api/connections/send-verify-link
 * Send verification email for connection setup (Yahoo, email-based flows)
 */
export async function POST(request: NextRequest) {
  try {
    const { provider, accountIdentifier } = await request.json();

    if (!provider || !accountIdentifier) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const admin = createAdminSupabaseClient();

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL}/api/connections/verify/${provider}/${verificationToken}`;

    // Store verification token (with 24h expiry)
    const { error } = await admin.from("connection_verifications").insert({
      provider,
      account_identifier: accountIdentifier,
      verification_token: verificationToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      throw error;
    }

    // Send verification email
    console.log(`[DEMO] Verification link for ${provider} (${accountIdentifier}):`, verificationLink);

    // In production, use SendGrid, Resend, or similar
    // await sendEmail({
    //   to: accountIdentifier,
    //   subject: `Verify your ${provider} connection with Dobly`,
    //   html: `Click here to verify: <a href="${verificationLink}">${verificationLink}</a>`,
    // });

    return NextResponse.json(
      {
        message: "Verification link sent successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to send verification link:", error);
    return NextResponse.json({ message: "Failed to send verification link" }, { status: 500 });
  }
}
