import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { BrowserAction } from "@/lib/connectors/native/browser";

export type SkillSource = "manual" | "learned";
export type SkillProcedureKind = "instructions" | "browser";

export interface BrowserProcedure {
  url: string;
  actions: BrowserAction[];
}

export interface LearnedSkillRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  operator_id: string | null;
  name: string;
  description: string;
  source: SkillSource;
  procedure_kind: SkillProcedureKind;
  procedure: Record<string, unknown>;
  status: "active" | "archived";
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export async function createLearnedSkill(input: {
  userId: string;
  workspaceId: string | null;
  operatorId: string | null;
  name: string;
  description: string;
  source: SkillSource;
  procedureKind: SkillProcedureKind;
  procedure: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_learned_skills")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId,
      operator_id: input.operatorId,
      name: input.name,
      description: input.description,
      source: input.source,
      procedure_kind: input.procedureKind,
      procedure: input.procedure,
      status: "active",
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as LearnedSkillRecord;
}

/**
 * The "learned" creation path: after a browser-automation run has actually
 * succeeded (verified by the caller, not assumed here), capture the exact
 * URL + action sequence that worked as a literal, replayable procedure -
 * not re-derived or summarized, the real sequence.
 */
export async function learnSkillFromBrowserRun(input: {
  userId: string;
  workspaceId: string | null;
  operatorId: string | null;
  name: string;
  description: string;
  url: string;
  actions: BrowserAction[];
}) {
  return createLearnedSkill({
    userId: input.userId,
    workspaceId: input.workspaceId,
    operatorId: input.operatorId,
    name: input.name,
    description: input.description,
    source: "learned",
    procedureKind: "browser",
    procedure: { url: input.url, actions: input.actions } satisfies BrowserProcedure,
  });
}

export async function listLearnedSkills(input: { userId: string; operatorId?: string | null }) {
  const admin = createAdminSupabaseClient();
  let query = admin
    .from("dobly_learned_skills")
    .select("*")
    .eq("user_id", input.userId)
    .eq("status", "active")
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  if (input.operatorId) query = query.eq("operator_id", input.operatorId);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as LearnedSkillRecord[];
}

export async function getLearnedSkill(input: { userId: string; skillId: string }) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("dobly_learned_skills")
    .select("*")
    .eq("id", input.skillId)
    .eq("user_id", input.userId)
    .single();
  if (error || !data) throw new Error("Skill not found.");
  return data as LearnedSkillRecord;
}

export async function recordSkillUsage(input: { userId: string; skillId: string }) {
  const admin = createAdminSupabaseClient();
  const { data: current } = await admin
    .from("dobly_learned_skills")
    .select("usage_count")
    .eq("id", input.skillId)
    .eq("user_id", input.userId)
    .single();
  await admin
    .from("dobly_learned_skills")
    .update({ usage_count: (current?.usage_count ?? 0) + 1, last_used_at: new Date().toISOString() })
    .eq("id", input.skillId)
    .eq("user_id", input.userId);
}

export async function archiveLearnedSkill(input: { userId: string; skillId: string }) {
  const admin = createAdminSupabaseClient();
  const { error } = await admin
    .from("dobly_learned_skills")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", input.skillId)
    .eq("user_id", input.userId);
  if (error) throw new Error(error.message);
}

/**
 * Actually replays a "browser" procedure kind for real - runs the exact
 * captured action sequence again via the same browserOperateExecutor used
 * for a live coworker browser action, not a re-planned/re-decided version.
 * This is what makes a learned skill genuinely reusable rather than just a
 * saved description.
 */
export async function replayBrowserSkill(input: { userId: string; skillId: string }) {
  const skill = await getLearnedSkill(input);
  if (skill.procedure_kind !== "browser") {
    throw new Error("This skill isn't a replayable browser procedure.");
  }
  const procedure = skill.procedure as unknown as BrowserProcedure;
  const { browserOperateExecutor } = await import("@/lib/connectors/native/browser");

  const result = await browserOperateExecutor.execute({
    workflow: { id: `skill-${skill.id}`, user_id: input.userId } as any,
    definition: { version: 1, trigger: { type: "manual" }, steps: [] } as any,
    trigger: { type: "manual" } as any,
    triggerPayload: {},
    step: { id: `skill-${skill.id}`, type: "action", name: skill.name, description: skill.description, app: "browser", config: {} } as any,
    config: { url: procedure.url, actions: procedure.actions },
    stepOutputs: {},
  });

  await recordSkillUsage(input).catch(() => undefined);

  // Turn the raw base64 screenshot into a real, persisted, viewable
  // artifact - the same createDurableRuntimeRun -> storeRuntimeArtifactFile
  // sequence operator-chat.ts's file-attachment flow already uses, not a
  // new/parallel pattern. Best-effort: a storage failure shouldn't hide the
  // fact that the replay itself genuinely succeeded, so this never throws.
  let screenshotUrl: string | null = null;
  const screenshotDataUrl = typeof result.screenshotDataUrl === "string" ? result.screenshotDataUrl : null;
  if (screenshotDataUrl?.startsWith("data:image/")) {
    try {
      const [, base64] = screenshotDataUrl.split(",");
      const { createDurableRuntimeRun, completeDurableRuntimeRun } = await import("@/lib/runtime/durable-runtime");
      const { storeRuntimeArtifactFile } = await import("@/lib/runtime/artifact-storage");

      const run = await createDurableRuntimeRun({
        userId: input.userId,
        workspaceId: skill.workspace_id,
        toolId: "skill_replay",
        toolLabel: "Skill Replay",
        toolFamily: "browser_automation",
        task: `Replay skill: ${skill.name}`,
        riskLevel: "low",
        context: { skillId: skill.id, url: procedure.url },
      });

      const artifact = await storeRuntimeArtifactFile({
        userId: input.userId,
        workspaceId: skill.workspace_id,
        runId: run.id,
        fileName: `${skill.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "skill"}-screenshot.jpg`,
        contentType: "image/jpeg",
        bytes: Buffer.from(base64, "base64"),
        title: `${skill.name} — screenshot`,
        metadata: { source: "skill_replay", skillId: skill.id },
      });

      await completeDurableRuntimeRun({
        userId: input.userId,
        runId: run.id,
        status: "completed",
        summary: `Replayed "${skill.name}" and captured a real screenshot.`,
        result: { artifactId: artifact.id, finalUrl: result.finalUrl },
      });

      screenshotUrl = artifact.external_url;
    } catch {
      // Storage/artifact wiring failing doesn't mean the replay failed -
      // the caller still gets the real result object either way.
    }
  }

  return { ...result, screenshotUrl };
}
