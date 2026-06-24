import { NextResponse } from "next/server";
import { createLaunchTaskForPod, recordPodOfficeEvent, upsertOfficeWorkerForPod } from "@/lib/office/pod-bridge";
import { getPod, logPodActivity } from "@/lib/pods/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const pod = await getPod(supabase as any, user.id, id);
    const launchMode = pod.spec.launch.safestFirstMode === "active" ? "active" : "supervised";

    const { data, error } = await supabase
      .from("pods")
      .update({
        mode: launchMode,
        status: launchMode,
        spec: {
          ...pod.spec,
          mode: launchMode,
        },
      })
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? "Failed to launch Pod.");
    }

    await Promise.all([
      upsertOfficeWorkerForPod(supabase as any, {
        pod: data as any,
        status: launchMode === "active" ? "active" : "shadow",
      }).then((worker) =>
        Promise.all([
          createLaunchTaskForPod(supabase as any, {
            pod: data as any,
            workerId: typeof worker.id === "string" ? worker.id : null,
          }),
          recordPodOfficeEvent(supabase as any, {
            pod: data as any,
            workerId: typeof worker.id === "string" ? worker.id : null,
            eventType: "worker.action_executed",
            title: `${data.name} joined the office floor`,
            summary: `Launched in ${launchMode} mode with approval boundaries and a first-run task.`,
          }),
        ]),
      ),
      supabase.from("job_queue").insert({
        type: "pod.health_check",
        user_id: user.id,
        payload: { pod_id: id },
        priority: 80,
      }),
      logPodActivity(supabase as any, {
        podId: id,
        userId: user.id,
        eventType: "pod.launched",
        eventData: { mode: launchMode },
      }),
    ]).catch(() => undefined);

    return NextResponse.json({ pod: data });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Failed to launch Pod." },
      { status: 500 },
    );
  }
}
