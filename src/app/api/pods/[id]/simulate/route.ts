import { NextRequest, NextResponse } from "next/server";
import { getPod, logPodActivity, simulatePod } from "@/lib/pods/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function POST(
  req: NextRequest,
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
  const body = (await req.json().catch(() => null)) as { scenario_id?: string } | null;

  try {
    const pod = await getPod(supabase as any, user.id, id);
    const simulation = simulatePod(pod.spec, body?.scenario_id);

    await logPodActivity(supabase as any, {
      podId: id,
      userId: user.id,
      eventType: "pod.simulated",
      eventData: {
        scenario_id: body?.scenario_id ?? null,
        scenario_count: simulation.length,
      },
    }).catch(() => undefined);

    return NextResponse.json({ pod_id: id, simulation });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Failed to simulate Pod." },
      { status: 500 },
    );
  }
}
