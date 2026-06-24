import { createAdminSupabaseClient } from "@/lib/supabase/server";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const token = new URL(request.url).searchParams.get("token");
  const form = await request.formData();
  const speechResult = String(form.get("SpeechResult") ?? "").trim();
  const caller = String(form.get("From") ?? "").trim();

  const supabase = createAdminSupabaseClient();
  const { data: workflow, error } = await supabase
    .from("workflows")
    .select("id, title, blueprint")
    .eq("id", params.id)
    .single();

  if (error || !workflow) {
    return new Response("Not found", { status: 404 });
  }

  const agentConfig = workflow.blueprint?.definition?.operator?.agentConfig;
  const expectedToken = agentConfig?.deployment?.apiConfig?.webhookSecret;
  if (!agentConfig || !expectedToken || token !== expectedToken) {
    return new Response("Not found", { status: 404 });
  }

  const handoffMessage =
    agentConfig.escalation?.handoffMessage ||
    "Thanks. We have your details and a human teammate will follow up shortly.";

  const payload = {
    source: "voice_reception_status",
    workflow_id: params.id,
    caller,
    transcript: speechResult,
    created_at: new Date().toISOString(),
  };

  const webhookUrl = agentConfig.callActions?.afterCall?.webhookUrl;
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(() => undefined);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${escapeXml(handoffMessage)}</Say>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}
