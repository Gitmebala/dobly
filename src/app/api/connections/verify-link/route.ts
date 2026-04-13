import { NextRequest, NextResponse } from "next/server";
import { verifyEmailLink } from "@/lib/verifications";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const verificationId = req.nextUrl.searchParams.get("verificationId");

  if (!token || !verificationId) {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=verification_link", req.url));
  }

  try {
    await verifyEmailLink({ verificationId, token });
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&success=email_verified", req.url));
  } catch {
    return NextResponse.redirect(new URL("/dashboard/settings?tab=connections&error=verification_link", req.url));
  }
}
