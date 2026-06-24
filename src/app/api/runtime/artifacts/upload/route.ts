import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { storeRuntimeArtifactFile } from "@/lib/runtime/artifact-storage";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { validateUpload } from "@/lib/security/uploads";
import { rateLimits } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/api-security";

const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimits.artifact(user.id || getRequestIp(req)).allowed) {
    return NextResponse.json({ error: "Too many uploads. Please wait and try again." }, { status: 429 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid upload." }, { status: 400 });

  const file = form.get("file");
  const runId = String(form.get("runId") ?? "");
  const workspaceIdRaw = form.get("workspaceId");
  const workspaceId = typeof workspaceIdRaw === "string" && workspaceIdRaw ? workspaceIdRaw : null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required." }, { status: 400 });
  }
  if (!runId) {
    return NextResponse.json({ error: "runId is required." }, { status: 400 });
  }

  try {
    validateUpload(file, { maxBytes: MAX_ARTIFACT_BYTES, kind: "artifact" });
    const admin = createAdminSupabaseClient();
    const { data: run } = await admin
      .from("software_execution_runs")
      .select("id, workspace_id")
      .eq("id", runId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!run || (workspaceId && run.workspace_id !== workspaceId)) {
      return NextResponse.json({ error: "Run not found." }, { status: 404 });
    }
    const artifact = await storeRuntimeArtifactFile({
      userId: user.id,
      workspaceId: run.workspace_id,
      runId,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
      bytes: await file.arrayBuffer(),
      title: String(form.get("title") ?? file.name),
      metadata: {
        uploadedBy: "user",
        size: file.size,
      },
    });

    return NextResponse.json({ artifact }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Artifact upload failed.";
    const status = /limit|type|name|empty|executable/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
