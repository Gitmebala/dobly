import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function resolveSafeArtifactPath(input: string) {
  const cwd = process.cwd();
  const resolved = path.resolve(cwd, input);
  const reportsRoot = path.resolve(cwd, "outputs", "reports");

  if (!resolved.startsWith(reportsRoot)) {
    throw new Error("Artifact path must stay inside Dobly report outputs.");
  }

  return resolved;
}

function contentTypeForExtension(filePath: string) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".md")) return "text/markdown; charset=utf-8";
  if (filePath.endsWith(".pdf")) return "application/pdf";
  return "application/octet-stream";
}

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.artifact(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many artifact requests. Please wait and try again." },
      { status: 429 }
    );
  }

  const inputPath = req.nextUrl.searchParams.get("path");
  if (!inputPath) {
    return NextResponse.json({ error: "Missing artifact path." }, { status: 400 });
  }

  try {
    const resolved = resolveSafeArtifactPath(inputPath);
    const file = await fs.readFile(resolved);

    return new NextResponse(file, {
      headers: {
        "Content-Type": contentTypeForExtension(resolved),
        "Content-Disposition": `inline; filename="${path.basename(resolved)}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Artifact not found." }, { status: 404 });
  }
}
