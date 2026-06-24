import { NextRequest, NextResponse } from "next/server";
import { resetLocalPassword } from "@/lib/local-runtime/auth";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  if (!rateLimits.auth(getRequestIp(request)).allowed) {
    return NextResponse.json({ error: "Too many reset attempts. Wait before trying again." }, { status: 429 });
  }
  if (process.env.DOBLY_LOCAL_MODE !== "true") {
    return NextResponse.json(
      { error: "Use the recovery session from your reset email." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!token || password.length < 10 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.json(
      { error: "Use a valid reset link and a 10+ character password with upper and lowercase letters, a number, and a symbol." },
      { status: 400 },
    );
  }

  const changed = await resetLocalPassword(token, password);
  if (!changed) return NextResponse.json({ error: "This reset link is invalid or expired." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
