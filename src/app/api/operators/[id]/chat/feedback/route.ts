import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { recordOperatorChatFeedback } from "@/lib/operator-chat";

const feedbackSchema = z.object({
  messageId: z.string().uuid().nullable().optional(),
  feedbackType: z.enum(["good", "bad", "correction", "preference", "bug", "handoff"]),
  body: z.string().trim().max(4000).optional(),
  workspaceId: z.string().uuid().nullable().optional(),
  artifactId: z.string().uuid().nullable().optional(),
  promoteAsExample: z.boolean().optional(),
  qualityLevel: z.enum(["gold", "acceptable", "rejected"]).optional(),
  laneId: z.string().trim().max(120).optional(),
  preferenceKey: z.string().trim().max(120).optional(),
  selectedOptionId: z.string().trim().max(120).optional(),
  taskType: z.string().trim().max(120).optional(),
  customValue: z.string().trim().max(1000).optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = feedbackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid feedback." }, { status: 400 });
  }

  try {
    const { id } = await params;
    const result = await recordOperatorChatFeedback({
      userId: user.id,
      operatorId: id,
      messageId: parsed.data.messageId ?? null,
      feedbackType: parsed.data.feedbackType,
      body: parsed.data.body,
      workspaceId: parsed.data.workspaceId ?? null,
      metadata: {
        artifactId: parsed.data.artifactId ?? null,
        promoteAsExample: parsed.data.promoteAsExample ?? false,
        qualityLevel: parsed.data.qualityLevel ?? null,
        laneId: parsed.data.laneId ?? null,
        preferenceKey: parsed.data.preferenceKey ?? null,
        selectedOptionId: parsed.data.selectedOptionId ?? null,
        taskType: parsed.data.taskType ?? null,
        customValue: parsed.data.customValue ?? null,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not save feedback.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
