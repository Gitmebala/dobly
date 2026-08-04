import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { executeNativeConnectorTool } from "@/lib/office/native-tool-bridge";

// TEMPORARY, one-off verification route: sends a real email through the
// connected Google account, bypassing the AI/Claude planning layer entirely,
// to prove the actual send-side plumbing works while Anthropic credits are
// unavailable. Delete this file after use - it is not meant to ship.
export async function POST() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await executeNativeConnectorTool({
    userId: user.id,
    taskId: `debug-verify-${Date.now()}`,
    toolName: "gmail",
    toolPayload: {
      to: user.email,
      subject: "Dobly: real send verification",
      text: [
        "This email was sent by calling the real Gmail connector directly,",
        "bypassing the AI planning layer entirely (no Anthropic credits used).",
        "",
        "If you're reading this, the actual send-side execution engine works:",
        "your connected Google account, the OAuth token, and the Gmail API",
        "call all completed for real.",
      ].join("\n"),
    },
  });

  return NextResponse.json(result);
}
