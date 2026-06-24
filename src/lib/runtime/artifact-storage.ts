import "server-only";
import { randomUUID } from "node:crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { createDurableArtifact } from "@/lib/runtime/durable-runtime";

const DEFAULT_BUCKET = "dobly-artifacts";

function safeFileName(fileName: string) {
  return fileName
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 160);
}

export async function storeRuntimeArtifactFile(input: {
  userId: string;
  workspaceId?: string | null;
  runId: string;
  fileName: string;
  contentType: string;
  bytes: ArrayBuffer | Buffer;
  title?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();
  const { data: run, error: runError } = await admin
    .from("software_execution_runs")
    .select("id, user_id, workspace_id")
    .eq("id", input.runId)
    .eq("user_id", input.userId)
    .maybeSingle();
  if (runError || !run || (input.workspaceId && run.workspace_id !== input.workspaceId)) {
    throw new Error("Runtime run not found or access denied.");
  }
  const bucket = process.env.DOBLY_ARTIFACT_BUCKET || DEFAULT_BUCKET;
  const storagePath = [
    input.userId,
    run.workspace_id ?? "personal",
    input.runId,
    `${Date.now()}-${randomUUID()}-${safeFileName(input.fileName)}`,
  ].join("/");

  const { error } = await admin.storage
    .from(bucket)
    .upload(storagePath, input.bytes, {
      contentType: input.contentType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Artifact upload failed: ${error.message}`);
  }

  return createDurableArtifact({
    runId: input.runId,
    userId: input.userId,
    workspaceId: run.workspace_id ?? null,
    kind: "file",
    title: input.title ?? input.fileName,
    content: {
      fileName: input.fileName,
      contentType: input.contentType,
      bucket,
      storagePath,
    },
    storagePath: `${bucket}/${storagePath}`,
    metadata: input.metadata ?? {},
  });
}
