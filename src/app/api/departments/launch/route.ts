import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  DEPARTMENT_BUNDLES,
  asOfficeDepartmentId,
  getDepartmentBundle,
  type LaunchDepartmentId,
} from "@/lib/department-bundles";
import { checkDepartmentEntitlement, checkUsageEntitlement } from "@/lib/billing/entitlements";
import { hireOfficeWorkerFromTemplate } from "@/lib/office/runtime";
import { recordOfficeEvent } from "@/lib/office/events";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/telemetry/server";
import type { ApiError } from "@/types";

const launchDepartmentSchema = z.object({
  departmentId: z.enum([
    "reception",
    "sales",
    "marketing",
    "creative",
    "support",
    "finance",
    "engineering",
    "operations",
    "admin",
    "projects",
    "hr",
    "growth",
    "analytics",
    "compliance",
  ]),
  workspaceId: z.string().uuid().optional().nullable(),
});

async function getConnectedChannelIds(params: {
  userId: string;
  workspaceId?: string | null;
}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("business_channel_connections")
    .select("channel_id,status")
    .eq("user_id", params.userId)
    .in("status", ["ready_to_test", "live", "approval_pending"]);

  query = params.workspaceId ? query.eq("workspace_id", params.workspaceId) : query.is("workspace_id", null);

  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => String((row as any).channel_id));
}

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ departments: DEPARTMENT_BUNDLES });
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
  const validation = launchDepartmentSchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json<ApiError>(
      { error: validation.error.errors[0]?.message ?? "Invalid department launch request." },
      { status: 400 },
    );
  }

  const departmentId = validation.data.departmentId as LaunchDepartmentId;
  const bundle = getDepartmentBundle(departmentId);
  if (!bundle) {
    return NextResponse.json<ApiError>({ error: "Unknown department." }, { status: 400 });
  }

  const departmentAllowed = await checkDepartmentEntitlement({
    userId: user.id,
    departmentId,
  });
  if (!departmentAllowed.allowed) {
    return NextResponse.json<ApiError>(
      { error: departmentAllowed.reason ?? "Upgrade required for this department." },
      { status: 402 },
    );
  }

  const workerAllowed = await checkUsageEntitlement({
    userId: user.id,
    workspaceId: validation.data.workspaceId ?? null,
    metric: "workers",
    quantity: bundle.workerTemplateKeys.length,
  });
  if (!workerAllowed.allowed) {
    return NextResponse.json<ApiError>(
      { error: workerAllowed.reason ?? "Worker limit reached for this plan." },
      { status: 402 },
    );
  }

  const connectedChannelIds = await getConnectedChannelIds({
    userId: user.id,
    workspaceId: validation.data.workspaceId ?? null,
  });
  const missingChannels = bundle.recommendedChannels.filter(
    (channelId) => !connectedChannelIds.includes(channelId),
  );

  const workers: Record<string, unknown>[] = [];
  for (const templateKey of bundle.workerTemplateKeys) {
    const worker = await hireOfficeWorkerFromTemplate({
      userId: user.id,
      workspaceId: validation.data.workspaceId ?? null,
      templateKey,
    });
    workers.push(worker);
  }

  await recordOfficeEvent({
    workspaceId: validation.data.workspaceId ?? null,
    userId: user.id,
    departmentId: asOfficeDepartmentId(departmentId),
    workerKind: "system",
    eventType: "worker.action_executed",
    source: "department.launcher",
    entityType: "department",
    entityId: departmentId,
    title: `${bundle.name} launched`,
    summary: `${bundle.name} launched with ${workers.length} workers. ${bundle.activationPromise}`,
    payload: {
      bundle,
      workerIds: workers.map((worker) => (worker as any).id),
      missingChannels,
    },
    riskLevel: "low",
  });

  await captureServerEvent({
    event: "department_launched",
    distinctId: user.id,
    properties: {
      department_id: departmentId,
      department_name: bundle.name,
      workspace_id: validation.data.workspaceId ?? null,
      workers_created: workers.length,
      missing_channels: missingChannels,
      recommended_channels: bundle.recommendedChannels,
    },
  }).catch(() => null);

  return NextResponse.json({
    department: bundle,
    workers,
    missingChannels,
    status:
      missingChannels.length > 0
        ? "launched_in_shadow_needs_channels"
        : "launched_ready_to_test",
    nextStep:
      missingChannels.length > 0
        ? "Connect the recommended channels, then test this department."
        : "Test the department workers, then activate guarded execution.",
  });
}
