import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const appId = process.env.NEXT_PUBLIC_META_APP_ID;
  const configId = process.env.NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID;
  const redirectUri = process.env.NEXT_PUBLIC_META_WHATSAPP_REDIRECT_URI;

  if (!appId || !configId || !redirectUri) {
    return NextResponse.json<ApiError>(
      {
        error:
          "WhatsApp embedded onboarding is not configured. Set NEXT_PUBLIC_META_APP_ID, NEXT_PUBLIC_META_WHATSAPP_CONFIG_ID, and NEXT_PUBLIC_META_WHATSAPP_REDIRECT_URI.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json({
    appId,
    configId,
    redirectUri,
    state: user.id,
    instructions: [
      "Open Meta embedded signup.",
      "Choose or create the business.",
      "Choose or add the WhatsApp number.",
      "Verify the number.",
      "Return to Dobly to activate the WhatsApp Desk.",
    ],
  });
}
