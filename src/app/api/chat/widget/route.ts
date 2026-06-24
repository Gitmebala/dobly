import { NextRequest, NextResponse } from "next/server";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import { ingestInboundCommunication } from "@/lib/communications/runtime";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { requireWorkspacePermission } from "@/lib/workspaces";

function allowedOrigins() {
  return new Set((process.env.DOBLY_WIDGET_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || "")
    .split(",").map((origin) => origin.trim()).filter(Boolean));
}

function corsHeaders(origin: string | null) {
  const allowed = origin && allowedOrigins().has(origin) ? origin : null;
  return {
    ...(allowed ? { "Access-Control-Allow-Origin": allowed, Vary: "Origin" } : {}),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Dobly-Widget-Key",
  };
}

function secretsMatch(expected: string, provided: string | null) {
  if (!provided) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(provided);
  return left.length === right.length && timingSafeEqual(left, right);
}

function widgetKey(workspaceId: string) {
  const secret = process.env.DOBLY_WIDGET_SHARED_SECRET;
  if (!secret) throw new Error("Website chat widget is not configured.");
  return createHmac("sha256", secret).update(`workspace:${workspaceId}`).digest("base64url");
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  if (!workspaceId) return NextResponse.json({ error: "workspaceId is required." }, { status: 400 });
  await requireWorkspacePermission({ userId: user.id, workspaceId, permission: "channels:manage" });
  const key = widgetKey(workspaceId);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return NextResponse.json({
    workspaceId,
    key,
    script: `<script src="${appUrl}/dobly-widget.js" data-api-base="${appUrl}" data-workspace-id="${workspaceId}" data-widget-key="${key}" defer></script>`,
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin");
  if (origin && !allowedOrigins().has(origin)) return new NextResponse(null, { status: 403 });
  return new NextResponse(null, { headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  const providedKey = req.headers.get("x-dobly-widget-key");
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (origin && !allowedOrigins().has(origin)) {
    return NextResponse.json({ error: "Origin is not allowed." }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const workspaceId = typeof body?.workspaceId === "string" ? body.workspaceId : null;
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 4000) : "";
  const visitorId = typeof body?.visitorId === "string" ? body.visitorId.slice(0, 120) : "website_visitor";
  const customerName = typeof body?.name === "string" ? body.name.slice(0, 160) : null;

  if (!workspaceId || !message) {
    return NextResponse.json({ error: "workspaceId and message are required." }, { status: 400, headers });
  }
  let expectedKey: string;
  try {
    expectedKey = widgetKey(workspaceId);
  } catch {
    return NextResponse.json({ error: "Website chat widget is not configured." }, { status: 503, headers });
  }
  if (!secretsMatch(expectedKey, providedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  if (!rateLimits.business(`${workspaceId}:${getRequestIp(req)}`).allowed) {
    return NextResponse.json({ error: "Too many messages. Please wait and try again." }, { status: 429, headers });
  }

  const admin = createAdminSupabaseClient();
  const { data: channel } = await admin
    .from("business_channel_connections")
    .select("user_id,workspace_id,id")
    .eq("workspace_id", workspaceId)
    .eq("channel_id", "website_chat")
    .limit(1)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "This workspace is not connected for website chat." }, { status: 404, headers });
  }

  const result = await ingestInboundCommunication({
    userId: String((channel as any).user_id),
    workspaceId,
    channel: "website_chat",
    from: visitorId,
    to: workspaceId,
    body: message,
    customerName,
    metadata: {
      provider: "dobly_widget",
      url: req.headers.get("referer"),
      connectionId: (channel as any).id,
    },
  });

  return NextResponse.json(
    {
      reply: result.draft.requiresApproval
        ? "Thanks. I’m sending this to the team so they can respond carefully."
        : result.draft.suggestedReply,
      requiresApproval: result.draft.requiresApproval,
      eventId: result.event.id,
      taskId: (result.replyTask as any)?.id ?? null,
    },
    { headers },
  );
}
