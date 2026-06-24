import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEPARTMENT_BUNDLES, type LaunchDepartmentId } from "@/lib/department-bundles";
import { resolveDepartmentCapabilityPlan } from "@/lib/department-capability-map";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError, Connection } from "@/types";

const querySchema = z.object({
  departmentId: z
    .enum([
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
    ])
    .optional(),
});

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const validation = querySchema.safeParse({
    departmentId: req.nextUrl.searchParams.get("departmentId") ?? undefined,
  });
  if (!validation.success) {
    return NextResponse.json<ApiError>({ error: "Invalid department id." }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("connections")
    .select("*")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(100);

  if (error) {
    return NextResponse.json<ApiError>({ error: "Failed to load connections." }, { status: 500 });
  }

  const connections = (data ?? []) as Connection[];
  const departmentIds = validation.data.departmentId
    ? [validation.data.departmentId]
    : DEPARTMENT_BUNDLES.map((department) => department.id);

  return NextResponse.json({
    departments: departmentIds.map((departmentId) =>
      resolveDepartmentCapabilityPlan({
        departmentId: departmentId as LaunchDepartmentId,
        connections,
      }),
    ),
  });
}
