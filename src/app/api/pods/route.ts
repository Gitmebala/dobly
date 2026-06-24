import { NextRequest, NextResponse } from "next/server";
import { buildAndStorePodDraft, listPods } from "@/lib/pods/service";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const pods = await listPods(supabase as any, user.id);
    return NextResponse.json({ pods });
  } catch (error) {
    return NextResponse.json<ApiError>(
      { error: error instanceof Error ? error.message : "Failed to load Pods." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as { prompt?: string } | null;
  const prompt = body?.prompt?.trim();

  if (!prompt || prompt.length < 10) {
    return NextResponse.json<ApiError>(
      { error: "Describe the Pod in at least 10 characters." },
      { status: 400 },
    );
  }

  const [{ data: businessProfile }, { data: connections }] = await Promise.all([
    supabase.from("business_profiles").select("*").eq("user_id", user.id).single(),
    supabase.from("connections").select("provider,status,label").eq("user_id", user.id),
  ]);

  const result = await buildAndStorePodDraft(supabase as any, {
    userId: user.id,
    prompt,
    businessProfile: businessProfile ?? null,
    connections: connections ?? [],
  });

  if (!result.pod) {
    return NextResponse.json(
      {
        pod: null,
        pod_spec: result.spec,
        warning: result.error,
      },
      { status: 202 },
    );
  }

  return NextResponse.json({
    pod: result.pod,
    pod_spec: result.spec,
    next_url: `/dashboard/pods/${result.pod.id}`,
  });
}
