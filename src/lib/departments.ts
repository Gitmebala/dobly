import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { DEPARTMENT_BUNDLES, type DepartmentBundle, type LaunchDepartmentId } from "@/lib/department-bundles";

type JsonRecord = Record<string, unknown>;

export type DepartmentStatus = "draft" | "active" | "paused" | "archived";
export type DepartmentTrustLevel = "observe_only" | "approval_required" | "supervised" | "trusted";

export interface DepartmentRecord {
  id: string;
  workspace_id: string;
  user_id: string;
  slug: string;
  template_key: LaunchDepartmentId | null;
  name: string;
  outcome: string;
  description: string;
  status: DepartmentStatus;
  trust_level: DepartmentTrustLevel;
  autonomy_boundary: string;
  work_type_ids: string[];
  output_type_ids: string[];
  standards: string[];
  recommended_channel_ids: string[];
  canvas_x: number | null;
  canvas_y: number | null;
  accent_color: string | null;
  metrics: JsonRecord;
  metadata: JsonRecord;
  created_at: string;
  updated_at: string;
}

/**
 * A coworker inside a department, normalised across the two tables that
 * currently hold them: dobly_operators (the custom-hire flow, linked by FK) and
 * office_workers (stamped by the department launcher, linked by slug).
 */
export interface DepartmentCoworker {
  id: string;
  name: string;
  kind: string;
  status: string;
  mission: string;
  outcome: string;
  approval_mode: string;
  last_run_at: string | null;
  /** Which table this came from, so callers can route to the right detail page. */
  source: "operator" | "office_worker";
}

/** A department plus every coworker filed inside it. */
export interface DepartmentWithOperators extends DepartmentRecord {
  operators: DepartmentCoworker[];
}

const OPERATOR_COLUMNS = "id, name, kind, status, mission, outcome, approval_mode, last_run_at";
const OFFICE_WORKER_COLUMNS =
  "id, name, department_id, runtime_kind, status, mission, autonomy_mode, last_active_at";

function operatorAsCoworker(row: any): DepartmentCoworker {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.kind ?? "custom"),
    status: String(row.status ?? "draft"),
    mission: String(row.mission ?? ""),
    outcome: String(row.outcome ?? ""),
    approval_mode: String(row.approval_mode ?? "approve_risky"),
    last_run_at: row.last_run_at ? String(row.last_run_at) : null,
    source: "operator",
  };
}

function officeWorkerAsCoworker(row: any): DepartmentCoworker {
  return {
    id: String(row.id),
    name: String(row.name),
    kind: String(row.runtime_kind ?? "agent"),
    status: String(row.status ?? "draft"),
    mission: String(row.mission ?? ""),
    outcome: "",
    // autonomy_mode is the office-worker analogue of approval_mode.
    approval_mode: String(row.autonomy_mode ?? "supervised"),
    last_run_at: row.last_active_at ? String(row.last_active_at) : null,
    source: "office_worker",
  };
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
}

/** Shape a catalog bundle into the row we stamp from it. */
function rowFromBundle(bundle: DepartmentBundle, workspaceId: string, userId: string) {
  return {
    workspace_id: workspaceId,
    user_id: userId,
    slug: bundle.id,
    template_key: bundle.id,
    name: bundle.name,
    outcome: bundle.outcome,
    description: bundle.description,
    trust_level: bundle.trustLevel as DepartmentTrustLevel,
    autonomy_boundary: bundle.autonomyBoundary,
    work_type_ids: bundle.workTypeIds,
    output_type_ids: bundle.outputTypeIds,
    standards: bundle.starterStandards,
    recommended_channel_ids: bundle.recommendedChannels,
  };
}

export async function listDepartments(input: {
  workspaceId: string;
  includeArchived?: boolean;
  withOperators?: boolean;
}): Promise<DepartmentWithOperators[]> {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("departments")
    .select(input.withOperators === false ? "*" : `*, dobly_operators(${OPERATOR_COLUMNS})`)
    .eq("workspace_id", input.workspaceId)
    .order("created_at", { ascending: true });

  if (!input.includeArchived) query = query.neq("status", "archived");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as any[];
  if (input.withOperators === false) {
    return rows.map((row) => ({ ...row, operators: [] })) as DepartmentWithOperators[];
  }

  // office_workers predate the departments table and still link by slug, so they
  // are fetched separately and bucketed rather than joined.
  const { data: workerRows } = await admin
    .from("office_workers")
    .select(OFFICE_WORKER_COLUMNS)
    .eq("workspace_id", input.workspaceId)
    .neq("status", "archived");

  const workersBySlug = new Map<string, any[]>();
  for (const worker of (workerRows ?? []) as any[]) {
    const slug = String(worker.department_id ?? "");
    const bucket = workersBySlug.get(slug);
    if (bucket) bucket.push(worker);
    else workersBySlug.set(slug, [worker]);
  }

  return rows.map((row) => ({
    ...row,
    operators: [
      ...((row.dobly_operators ?? []) as any[]).map(operatorAsCoworker),
      ...(workersBySlug.get(String(row.slug)) ?? []).map(officeWorkerAsCoworker),
    ],
  })) as DepartmentWithOperators[];
}

export async function getDepartment(input: {
  workspaceId: string;
  departmentId: string;
}): Promise<DepartmentWithOperators> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("departments")
    .select(`*, dobly_operators(${OPERATOR_COLUMNS})`)
    .eq("id", input.departmentId)
    .eq("workspace_id", input.workspaceId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Department not found.");

  const { data: workerRows } = await admin
    .from("office_workers")
    .select(OFFICE_WORKER_COLUMNS)
    .eq("workspace_id", input.workspaceId)
    .eq("department_id", (data as any).slug)
    .neq("status", "archived");

  return {
    ...(data as any),
    operators: [
      ...(((data as any).dobly_operators ?? []) as any[]).map(operatorAsCoworker),
      ...((workerRows ?? []) as any[]).map(officeWorkerAsCoworker),
    ],
  } as DepartmentWithOperators;
}

/** Resolve the legacy `department_id text` slug carried by office_* tables. */
export async function getDepartmentBySlug(input: {
  workspaceId: string;
  slug: string;
}): Promise<DepartmentRecord | null> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("departments")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("slug", input.slug)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return (data as DepartmentRecord) ?? null;
}

export async function createDepartment(input: {
  workspaceId: string;
  userId: string;
  name: string;
  outcome?: string;
  description?: string;
  templateKey?: LaunchDepartmentId | null;
  trustLevel?: DepartmentTrustLevel;
  autonomyBoundary?: string;
  standards?: string[];
  accentColor?: string | null;
  canvasX?: number | null;
  canvasY?: number | null;
  metadata?: JsonRecord;
}): Promise<DepartmentRecord> {
  const admin = createAdminSupabaseClient();

  // A named template seeds the row; anything passed explicitly still wins.
  const bundle = input.templateKey
    ? DEPARTMENT_BUNDLES.find((entry) => entry.id === input.templateKey)
    : undefined;
  const base = bundle
    ? rowFromBundle(bundle, input.workspaceId, input.userId)
    : {
        workspace_id: input.workspaceId,
        user_id: input.userId,
        slug: slugify(input.name),
        template_key: null,
      };

  const { data, error } = await admin
    .from("departments")
    .insert({
      ...base,
      name: input.name,
      ...(input.outcome !== undefined ? { outcome: input.outcome } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.trustLevel ? { trust_level: input.trustLevel } : {}),
      ...(input.autonomyBoundary !== undefined ? { autonomy_boundary: input.autonomyBoundary } : {}),
      ...(input.standards ? { standards: input.standards } : {}),
      accent_color: input.accentColor ?? null,
      canvas_x: input.canvasX ?? null,
      canvas_y: input.canvasY ?? null,
      metadata: input.metadata ?? {},
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create department.");
  return data as DepartmentRecord;
}

export async function updateDepartment(input: {
  workspaceId: string;
  departmentId: string;
  patch: Partial<
    Pick<
      DepartmentRecord,
      | "name"
      | "outcome"
      | "description"
      | "status"
      | "trust_level"
      | "autonomy_boundary"
      | "standards"
      | "accent_color"
      | "canvas_x"
      | "canvas_y"
      | "metrics"
      | "metadata"
    >
  >;
}): Promise<DepartmentRecord> {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("departments")
    .update(input.patch)
    .eq("id", input.departmentId)
    .eq("workspace_id", input.workspaceId)
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not update department.");
  return data as DepartmentRecord;
}

/** Persist canvas positions after a drag on the departments view. */
export async function saveDepartmentPositions(input: {
  workspaceId: string;
  positions: Array<{ id: string; x: number; y: number }>;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  await Promise.all(
    input.positions.map((position) =>
      admin
        .from("departments")
        .update({ canvas_x: position.x, canvas_y: position.y })
        .eq("id", position.id)
        .eq("workspace_id", input.workspaceId),
    ),
  );
}

export async function archiveDepartment(input: { workspaceId: string; departmentId: string }) {
  return updateDepartment({ ...input, patch: { status: "archived" } });
}

/** File an operator into a department, or out of one with null. */
export async function assignOperatorToDepartment(input: {
  userId: string;
  operatorId: string;
  departmentId: string | null;
}): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("dobly_operators")
    .update({ department_id: input.departmentId })
    .eq("id", input.operatorId)
    .eq("user_id", input.userId);

  if (error) throw new Error(error.message);
}

/**
 * The default set stamped when a workspace sets up its first departments. Kept
 * deliberately small: the point is a canvas that is legible on day one, not the
 * whole catalog. Everything else stays one click away in the catalog.
 */
export const STARTER_DEPARTMENT_IDS: LaunchDepartmentId[] = [
  "reception",
  "sales",
  "support",
  "finance",
  "operations",
];

/**
 * Ensure a single catalog department exists for a workspace, returning the row
 * either way. Used by the launch flow, which may be run repeatedly for the same
 * department as the user adds workers to it.
 */
export async function ensureDepartmentFromBundle(input: {
  workspaceId: string;
  userId: string;
  departmentId: LaunchDepartmentId;
}): Promise<DepartmentRecord> {
  const existing = await getDepartmentBySlug({
    workspaceId: input.workspaceId,
    slug: input.departmentId,
  });
  if (existing) return existing;

  const bundle = DEPARTMENT_BUNDLES.find((entry) => entry.id === input.departmentId);
  if (!bundle) throw new Error(`Unknown department: ${input.departmentId}`);

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("departments")
    .upsert(rowFromBundle(bundle, input.workspaceId, input.userId), {
      onConflict: "workspace_id,slug",
      ignoreDuplicates: false,
    })
    .select("*")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Could not create department.");
  return data as DepartmentRecord;
}

/**
 * Stamp the chosen catalog bundles into real rows for a workspace.
 * Idempotent: departments already present (by slug) are left untouched, so this
 * is safe to call again when a workspace activates more of the catalog.
 */
export async function seedDepartmentsFromBundles(input: {
  workspaceId: string;
  userId: string;
  departmentIds: LaunchDepartmentId[];
}): Promise<DepartmentRecord[]> {
  const admin = createAdminSupabaseClient();

  const { data: existing, error: existingError } = await admin
    .from("departments")
    .select("slug")
    .eq("workspace_id", input.workspaceId);
  if (existingError) throw new Error(existingError.message);

  const taken = new Set((existing ?? []).map((row: any) => String(row.slug)));
  const pending = DEPARTMENT_BUNDLES.filter(
    (bundle) => input.departmentIds.includes(bundle.id) && !taken.has(bundle.id),
  );
  if (!pending.length) return [];

  const { data, error } = await admin
    .from("departments")
    .insert(pending.map((bundle) => rowFromBundle(bundle, input.workspaceId, input.userId)))
    .select("*");

  if (error) throw new Error(error.message);
  return (data ?? []) as DepartmentRecord[];
}
