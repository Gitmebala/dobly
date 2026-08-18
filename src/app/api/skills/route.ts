import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createLearnedSkill, listLearnedSkills } from "@/lib/learned-skills";
import { rateLimits } from "@/lib/rate-limit";
import { logRuntimeAuditEvent } from "@/lib/runtime/audit";

export async function GET(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const operatorId = req.nextUrl.searchParams.get("operatorId");
    const skills = await listLearnedSkills({ userId: user.id, operatorId });
    return NextResponse.json({ skills });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load skills." }, { status: 500 });
  }
}

const browserActionSchema = z.union([
  z.object({ type: z.literal("click"), selector: z.string().min(1) }),
  z.object({ type: z.literal("type"), selector: z.string().min(1), text: z.string() }),
  z.object({ type: z.literal("wait"), ms: z.number().min(0).max(5000) }),
  z.object({ type: z.literal("wait_for"), selector: z.string().min(1) }),
  z.object({ type: z.literal("extract_text"), selector: z.string().optional() }),
  z.object({ type: z.literal("screenshot") }),
]);

const createSchema = z.object({
  name: z.string().trim().min(1, "Give this skill a name.").max(120),
  description: z.string().trim().max(500).optional().default(""),
  operatorId: z.string().uuid().nullable().optional(),
  procedureKind: z.enum(["instructions", "browser"]),
  instructions: z.string().trim().max(4000).optional(),
  url: z.string().url().optional(),
  actions: z.array(browserActionSchema).max(8).optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = rateLimits.write(user.id);
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Try again shortly." }, { status: 429 });

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid skill." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.procedureKind === "instructions" && !data.instructions?.trim()) {
    return NextResponse.json({ error: "Describe the steps for this skill." }, { status: 400 });
  }
  if (data.procedureKind === "browser" && (!data.url || !data.actions?.length)) {
    return NextResponse.json({ error: "A browser skill needs a starting URL and at least one action." }, { status: 400 });
  }

  try {
    const skill = await createLearnedSkill({
      userId: user.id,
      workspaceId: null,
      operatorId: data.operatorId ?? null,
      name: data.name,
      description: data.description ?? "",
      source: "manual",
      procedureKind: data.procedureKind,
      procedure:
        data.procedureKind === "instructions"
          ? { text: data.instructions }
          : { url: data.url, actions: data.actions },
    });

    await logRuntimeAuditEvent({
      userId: user.id,
      workspaceId: null,
      eventType: "skill.created",
      riskLevel: "low",
      summary: `Learned a new skill: ${skill.name}.`,
      metadata: { skillId: skill.id, source: "manual", procedureKind: data.procedureKind },
    }).catch(() => undefined);

    return NextResponse.json({ skill }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save this skill." }, { status: 500 });
  }
}
