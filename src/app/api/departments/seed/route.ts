import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resolveActiveWorkspace } from "@/lib/active-workspace";
import { STARTER_DEPARTMENT_IDS, seedDepartmentsFromBundles } from "@/lib/departments";
import { DEPARTMENT_BUNDLES, type LaunchDepartmentId } from "@/lib/department-bundles";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

const CATALOG_IDS = new Set<string>(DEPARTMENT_BUNDLES.map((bundle) => bundle.id));

const bodySchema = z.object({
  // Omitted means "the starter set".
  departmentIds: z.array(z.string()).max(CATALOG_IDS.size).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json<ApiError>({ error: "Invalid department selection." }, { status: 400 });
  }

  const requested = parsed.data.departmentIds;
  const departmentIds: LaunchDepartmentId[] = requested?.length
    ? requested.filter((id): id is LaunchDepartmentId => CATALOG_IDS.has(id))
    : STARTER_DEPARTMENT_IDS;

  if (!departmentIds.length) {
    return NextResponse.json<ApiError>({ error: "No known departments requested." }, { status: 400 });
  }

  const { activeWorkspace } = await resolveActiveWorkspace(user.id);
  if (!activeWorkspace) {
    return NextResponse.json<ApiError>({ error: "No active workspace." }, { status: 400 });
  }

  // Idempotent: departments already present are skipped, so a double-submit
  // does not duplicate or error.
  const created = await seedDepartmentsFromBundles({
    workspaceId: activeWorkspace.id,
    userId: user.id,
    departmentIds,
  });

  return NextResponse.json({ created, createdCount: created.length });
}
