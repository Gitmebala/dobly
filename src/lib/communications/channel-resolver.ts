import { createAdminSupabaseClient } from "@/lib/supabase/server";

export async function resolveUserByChannelIdentifier(params: {
  channelId: "business_phone" | "business_sms" | "whatsapp_business" | "business_email";
  identifier: string;
}) {
  const admin = createAdminSupabaseClient();
  const normalized = params.identifier.trim();
  const { data, error } = await admin
    .from("business_channel_connections")
    .select("user_id,workspace_id,id,display_name,status,operator_id")
    .eq("channel_id", params.channelId)
    .eq("external_identifier", normalized)
    .in("status", ["verification_required", "approval_pending", "ready_to_test", "live"])
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error || !data?.[0]) return null;

  return {
    userId: String((data[0] as any).user_id),
    workspaceId: ((data[0] as any).workspace_id as string | null) ?? null,
    connectionId: String((data[0] as any).id),
    displayName: String((data[0] as any).display_name ?? params.identifier),
    status: String((data[0] as any).status ?? "verification_required"),
    // Which hired coworker this number belongs to, if any - lets the call
    // greet as, and show up in the chat of, that specific coworker instead
    // of a generic account-wide inbox.
    operatorId: ((data[0] as any).operator_id as string | null) ?? null,
  };
}

export function normalizePhoneIdentifier(value: string | null | undefined) {
  return String(value ?? "").trim().replace(/[^\d+]/g, "");
}
