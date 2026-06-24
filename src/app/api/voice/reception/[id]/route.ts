import { createAdminSupabaseClient } from "@/lib/supabase/server";

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

async function resolveWorkflowConfig(workflowId: string, token: string | null) {
  const supabase = createAdminSupabaseClient();
  const { data: workflow, error } = await supabase
    .from("workflows")
    .select("id, title, blueprint")
    .eq("id", workflowId)
    .single();

  if (error || !workflow) return null;

  const agentConfig = workflow.blueprint?.definition?.operator?.agentConfig;
  if (!agentConfig) return null;

  const expectedToken = agentConfig.deployment?.apiConfig?.webhookSecret;
  if (!expectedToken || token !== expectedToken) return null;

  return { workflow, agentConfig };
}

async function handleVoiceEntry(request: Request, workflowId: string) {
  const token = new URL(request.url).searchParams.get("token");
  const resolved = await resolveWorkflowConfig(workflowId, token);

  if (!resolved) {
    return new Response("Not found", { status: 404 });
  }

  const { agentConfig } = resolved;
  const intro =
    agentConfig.profile?.firstMessage ||
    agentConfig.conversationFlow?.find((node: { id: string; text: string }) => node.id === "greeting")?.text ||
    "Thanks for calling. How can I help you today?";

  const gatherAction = agentConfig.deployment?.voiceChannelConfig?.statusWebhookPath || "";
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather input="speech" method="POST" speechTimeout="auto" action="${escapeXml(gatherAction)}">
    <Say>${escapeXml(intro)}</Say>
  </Gather>
  <Say>${escapeXml(
    "I did not catch that. We will follow up shortly, or you can call again in a moment."
  )}</Say>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  return handleVoiceEntry(request, params.id);
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  return handleVoiceEntry(request, params.id);
}
