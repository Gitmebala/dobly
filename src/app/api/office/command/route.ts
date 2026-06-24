import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildAgentCognitionCycle, type RichContextItem } from "@/lib/agents/cognition";
import { buildDoblyOSHomeData } from "@/lib/dobly-os";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { createBoardroomReport, createGeneralManagerBriefing } from "@/lib/office/intelligence";
import { ensureLeadershipCoordination } from "@/lib/office/leadership-runtime";
import { ingestAndDispatchOfficeEvent } from "@/lib/office/runtime";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { OfficeEventType, OfficeRiskLevel } from "@/lib/office/types";
import type { ApiError } from "@/types";

const commandSchema = z.object({
  command: z.string().min(2).max(1200),
  workspaceId: z.string().uuid().optional().nullable(),
  richContext: z
    .array(
      z.object({
        kind: z.enum(["text", "image", "file", "record", "connection", "memory", "tool_result"]),
        title: z.string().min(1).max(160),
        summary: z.string().min(1).max(1200),
        confidence: z.enum(["low", "medium", "high"]).optional(),
        source: z.string().max(160).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .max(12)
    .optional(),
  availableTools: z.array(z.string().min(1).max(80)).max(30).optional(),
});

function classifyCommand(command: string): {
  mode: "briefing" | "boardroom" | "office_event";
  eventType: OfficeEventType;
  source: string;
  title: string;
  riskLevel: OfficeRiskLevel;
  response: string;
} {
  const lower = command.toLowerCase();

  if (/board|strategy|strategic|what should we do|biggest risk|healthy/.test(lower)) {
    return {
      mode: "boardroom",
      eventType: "briefing.created",
      source: "office.command",
      title: "Boardroom strategy request",
      riskLevel: "medium",
      response: "I asked the Boardroom to look across the business and produce a strategic view.",
    };
  }

  if (/brief|summary|today|what happened|what matters|gm|general manager/.test(lower)) {
    return {
      mode: "briefing",
      eventType: "briefing.created",
      source: "office.command",
      title: "General Manager briefing request",
      riskLevel: "low",
      response: "I asked the General Manager for a fresh operating brief.",
    };
  }

  if (/lead|prospect|pipeline|customer list|outreach/.test(lower)) {
    return {
      mode: "office_event",
      eventType: "lead.created",
      source: "office.command.sales",
      title: "Sales opportunity from owner command",
      riskLevel: "medium",
      response: "I routed this to Sales so a lead workflow can qualify, enrich, and follow up from here.",
    };
  }

  if (/post|content|campaign|social|newsletter|linkedin|instagram|tiktok|twitter|x /.test(lower)) {
    return {
      mode: "office_event",
      eventType: "content.idea_received",
      source: "office.command.content",
      title: "Content request from owner command",
      riskLevel: "low",
      response: "I routed this to Content Studio so the marketing coworkers can draft and prepare it.",
    };
  }

  if (/invoice|payment|mpesa|m-pesa|cash|expense|money|finance/.test(lower)) {
    return {
      mode: "office_event",
      eventType: "invoice.overdue",
      source: "office.command.finance",
      title: "Finance request from owner command",
      riskLevel: "medium",
      response: "I routed this to Finance with approval guardrails, because money actions need care.",
    };
  }

  if (/support|complaint|refund|ticket|customer issue/.test(lower)) {
    return {
      mode: "office_event",
      eventType: "support.ticket_created",
      source: "office.command.support",
      title: "Support request from owner command",
      riskLevel: "medium",
      response: "I routed this to Support so the customer context and resolution path stay visible.",
    };
  }

  if (/whatsapp|email|dm|message|reply|inbox|call/.test(lower)) {
    return {
      mode: "office_event",
      eventType: "message.received",
      source: "office.command.reception",
      title: "Reception request from owner command",
      riskLevel: "low",
      response: "I routed this to Reception so the front desk can draft, route, or escalate.",
    };
  }

  return {
    mode: "office_event",
    eventType: "signal.detected",
    source: "office.command.general",
    title: "Owner command captured",
    riskLevel: "low",
    response: "I captured this as an operating signal for the General Manager to coordinate.",
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const validation = commandSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid command." },
      { status: 400 },
    );
  }

  const classification = classifyCommand(validation.data.command);
  const workspaceId = validation.data.workspaceId ?? null;
  const cognition = buildAgentCognitionCycle({
    command: validation.data.command,
    eventType: classification.eventType,
    riskLevel: classification.riskLevel,
    runtimeKind: "agent",
    title: classification.title,
    source: classification.source,
    richContext: validation.data.richContext as RichContextItem[] | undefined,
    availableTools: validation.data.availableTools,
  });

  if (classification.mode === "briefing") {
    const briefing = await createGeneralManagerBriefing({ userId: user.id, workspaceId });
    const office = await buildHomebaseDashboardData({ userId: user.id, workspaceId }).catch(() => null);
    let coordination: Awaited<ReturnType<typeof ensureLeadershipCoordination>> | null = null;
    if (office) {
      const os = await buildDoblyOSHomeData({
        userId: user.id,
        office,
        connections: [],
      }).catch(() => null);
      if (os) {
        coordination = await ensureLeadershipCoordination({
          userId: user.id,
          workspaceId,
          office,
          leadership: os.leadership,
        }).catch(() => null);
      }
    }
    return NextResponse.json({
      mode: classification.mode,
      response: classification.response,
      cognition,
      briefing,
      coordination,
    });
  }

  if (classification.mode === "boardroom") {
    const report = await createBoardroomReport({
      userId: user.id,
      workspaceId,
      strategicQuestion: validation.data.command,
    });
    const office = await buildHomebaseDashboardData({ userId: user.id, workspaceId }).catch(() => null);
    let coordination: Awaited<ReturnType<typeof ensureLeadershipCoordination>> | null = null;
    if (office) {
      const os = await buildDoblyOSHomeData({
        userId: user.id,
        office,
        connections: [],
      }).catch(() => null);
      if (os) {
        coordination = await ensureLeadershipCoordination({
          userId: user.id,
          workspaceId,
          office,
          leadership: os.leadership,
        }).catch(() => null);
      }
    }
    return NextResponse.json({
      mode: classification.mode,
      response: classification.response,
      cognition,
      report,
      coordination,
    });
  }

  const dispatch = await ingestAndDispatchOfficeEvent({
    workspaceId,
    userId: user.id,
    eventType: classification.eventType,
    source: classification.source,
    title: classification.title,
    summary: validation.data.command,
    payload: {
      command: validation.data.command,
      capturedFrom: "homebase_command_center",
      cognition,
    },
    riskLevel: classification.riskLevel,
  });

  return NextResponse.json({
    mode: classification.mode,
    response: cognition.decision.ownerVisibleSummary,
    cognition,
    event: dispatch.event,
    tasks: dispatch.tasks,
    intents: dispatch.intents,
  });
}
