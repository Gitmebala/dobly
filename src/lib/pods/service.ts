import type { SupabaseClient } from "@supabase/supabase-js";
import { createLaunchTaskForPod, recordPodOfficeEvent, upsertOfficeWorkerForPod } from "@/lib/office/pod-bridge";
import { compilePodSpec } from "@/lib/pods/compiler";
import type { PodBuildContext, PodRecord, PodSpec } from "@/lib/pods/types";

type DbClient = SupabaseClient<any, any, any>;

export async function buildAndStorePodDraft(
  supabase: DbClient,
  context: PodBuildContext,
): Promise<{ pod: PodRecord | null; spec: PodSpec; error?: string }> {
  const spec = compilePodSpec(context);
  const insertPayload = {
    user_id: context.userId,
    name: spec.name,
    label: spec.label,
    purpose: spec.purpose,
    source_prompt: spec.sourcePrompt,
    audience: spec.audience,
    mode: spec.mode,
    status: spec.mode,
    spec,
    readiness_score: spec.launch.readinessScore,
  };

  const { data, error } = await supabase
    .from("pods")
    .insert(insertPayload)
    .select("*")
    .single();

  if (error || !data) {
    return { pod: null, spec, error: error?.message ?? "Pod table is not ready yet." };
  }

  await Promise.all([
    supabase.from("pod_versions").insert({
      pod_id: data.id,
      user_id: context.userId,
      version_number: 1,
      spec,
      change_summary: "Initial Pod generated from user instructions.",
      status: "draft",
    }),
    supabase.from("pod_activity_events").insert({
      pod_id: data.id,
      user_id: context.userId,
      event_type: "pod.generated",
      event_data: {
        label: spec.label,
        capabilities: spec.capabilities.map((capability) => capability.id),
        readiness_score: spec.launch.readinessScore,
      },
    }),
    upsertOfficeWorkerForPod(supabase, {
      pod: data as PodRecord,
      status: "draft",
    }).then((worker) =>
      recordPodOfficeEvent(supabase, {
        pod: data as PodRecord,
        workerId: typeof worker.id === "string" ? worker.id : null,
        eventType: "worker.action_proposed",
        title: `${spec.name} added to Homebase`,
        summary: `${spec.name} is drafted with a ${spec.verticalBaseline?.title ?? "worker"} depth baseline.`,
      }),
    ),
  ]).catch(() => undefined);

  return { pod: data as PodRecord, spec };
}

export async function listPods(supabase: DbClient, userId: string) {
  const { data, error } = await supabase
    .from("pods")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PodRecord[];
}

export async function getPod(supabase: DbClient, userId: string, podId: string) {
  const { data, error } = await supabase
    .from("pods")
    .select("*")
    .eq("user_id", userId)
    .eq("id", podId)
    .single();

  if (error) throw error;
  return data as PodRecord;
}

export function simulatePod(spec: PodSpec, scenarioId?: string) {
  const scenarios = scenarioId
    ? spec.simulations.filter((scenario) => scenario.id === scenarioId)
    : spec.simulations;

  return scenarios.map((scenario) => ({
    scenario,
    trace: [
      {
        step: "understand",
        status: "complete",
        detail: `Interpreted the input against the ${spec.label} Pod duties.`,
      },
      {
        step: "capability_select",
        status: "complete",
        detail: `Selected ${spec.capabilities
          .filter((capability) => capability.required)
          .map((capability) => capability.title)
          .join(", ")}.`,
      },
      {
        step: scenario.needsApproval ? "approval_gate" : "safe_action",
        status: scenario.needsApproval ? "waiting_for_user" : "ready",
        detail: scenario.expectedBehavior,
      },
    ],
    result: {
      wouldProceed: !scenario.needsApproval,
      needsApproval: scenario.needsApproval,
      riskLevel: scenario.riskLevel,
      summary: scenario.expectedBehavior,
    },
  }));
}

export async function logPodActivity(
  supabase: DbClient,
  input: {
    podId: string;
    userId: string;
    eventType: string;
    eventData?: Record<string, unknown>;
  },
) {
  await supabase.from("pod_activity_events").insert({
    pod_id: input.podId,
    user_id: input.userId,
    event_type: input.eventType,
    event_data: input.eventData ?? {},
  });
}
