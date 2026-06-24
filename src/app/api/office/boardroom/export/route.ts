import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildExecutiveDashboardData, boardroomReportToMarkdown } from "@/lib/executive-reporting";
import type { ApiError } from "@/types";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const format = req.nextUrl.searchParams.get("format") === "json" ? "json" : "md";
  const workspaceId = req.nextUrl.searchParams.get("workspaceId");
  const data = await buildExecutiveDashboardData({
    userId: user.id,
    workspaceId: workspaceId || null,
  });

  if (format === "json") {
    return new NextResponse(JSON.stringify(data.boardroom, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="dobly-boardroom-report.json"',
      },
    });
  }

  return new NextResponse(boardroomReportToMarkdown(data.boardroom), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": 'attachment; filename="dobly-boardroom-report.md"',
    },
  });
}
