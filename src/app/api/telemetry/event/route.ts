import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { captureServerEvent } from "@/lib/telemetry/server";
import { rateLimits } from "@/lib/rate-limit";
import { TELEMETRY_EVENTS } from "@/lib/telemetry/events";

const eventSchema = z.object({
  event: z.enum(TELEMETRY_EVENTS),
  properties: z.record(z.union([z.string().max(500), z.number(), z.boolean(), z.null()])).optional(),
});

const SENSITIVE_KEY = /email|phone|name|token|secret|password|authorization|cookie|content|prompt/i;

export async function POST(req: Request) {
  const parsed = eventSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Invalid telemetry event." }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const distinctId = user?.id ?? req.headers.get("x-dobly-anonymous-id") ?? "anonymous";
  if (!rateLimits.api(distinctId).allowed) return NextResponse.json({ error: "Too many events." }, { status: 429 });
  const result = await captureServerEvent({
    event: parsed.data.event,
    distinctId,
    properties: {
      ...Object.fromEntries(Object.entries(parsed.data.properties ?? {}).filter(([key]) => !SENSITIVE_KEY.test(key)).slice(0, 30)),
      authenticated: Boolean(user),
    },
  });

  return NextResponse.json(result);
}
