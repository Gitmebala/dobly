import { NextRequest, NextResponse } from "next/server";
import { decideApproval } from "@/lib/approvals";
import { verifyWhatsappOtp } from "@/lib/verifications";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

function normalizeIncomingMessage(body: any) {
  const message = body?.messages?.[0];
  const from = body?.from ?? body?.phone ?? message?.from ?? null;
  const text = body?.text ?? body?.message ?? message?.text?.body ?? null;
  return {
    from: typeof from === "string" ? from.trim() : null,
    text: typeof text === "string" ? text.trim() : null,
  };
}

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, "");
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "dobly-whatsapp-webhook" });
}

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.DOBLY_WHATSAPP_WEBHOOK_SECRET;
  const providedSecret = req.headers.get("x-dobly-webhook-secret");

  if (!expectedSecret) {
    return NextResponse.json({ error: "WhatsApp webhook is not configured." }, { status: 503 });
  }

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const { from, text } = normalizeIncomingMessage(body);

  if (!from || !text) {
    return NextResponse.json({ error: "Missing sender or message text" }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();
  const normalizedFrom = normalizePhone(from);
  const normalizedText = text.toUpperCase();

  if (/^\d{4,8}$/.test(text)) {
    const { data: verifications } = await admin
      .from("connection_verifications")
      .select("*")
      .eq("channel", "whatsapp")
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(25);

    const match = (verifications ?? []).find((item: { destination: string; user_id: string; id: string }) => normalizePhone(item.destination) === normalizedFrom);
    if (match) {
      try {
        await verifyWhatsappOtp({
          userId: match.user_id,
          verificationId: match.id,
          code: text,
        });
      } catch {
        return NextResponse.json({ ok: true, handled: "ignored" });
      }

      return NextResponse.json({ ok: true, handled: "verification" });
    }
  }

  if (normalizedText.startsWith("YES") || normalizedText.startsWith("NO")) {
    const decision = normalizedText.startsWith("YES") ? "approved" : "rejected";
    const parts = text.split(/\s+/);
    const explicitId = parts[1];

    if (explicitId) {
      const { data: approval } = await admin
        .from("approvals")
        .select("*")
        .eq("id", explicitId)
        .eq("status", "pending")
        .single();

      if (approval) {
        try {
          await decideApproval({
            approvalId: approval.id,
            userId: approval.user_id,
            decision,
            note: `WhatsApp reply from ${from}`,
          });
        } catch {
          return NextResponse.json({ ok: true, handled: "ignored" });
        }

        return NextResponse.json({ ok: true, handled: "approval" });
      }
    }

    const { data: approvals } = await admin
      .from("approvals")
      .select("*")
      .eq("channel", "whatsapp")
      .eq("status", "pending")
      .order("requested_at", { ascending: false })
      .limit(25);

    const match = (approvals ?? []).find((item: { id: string; user_id: string; metadata: Record<string, unknown> | null }) => {
      const phone = String(item.metadata?.phone ?? item.metadata?.destination ?? item.metadata?.whatsapp_number ?? "");
      return phone ? normalizePhone(phone) === normalizedFrom : false;
    });

    if (match) {
      try {
        await decideApproval({
          approvalId: match.id,
          userId: match.user_id,
          decision,
          note: `WhatsApp reply from ${from}`,
        });
      } catch {
        return NextResponse.json({ ok: true, handled: "ignored" });
      }

      return NextResponse.json({ ok: true, handled: "approval" });
    }
  }

  return NextResponse.json({ ok: true, handled: "ignored" });
}
