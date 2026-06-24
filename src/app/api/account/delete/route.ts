import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { rateLimits } from "@/lib/rate-limit";
import { cancelStripeSubscription } from "@/lib/stripe";
import { createAdminSupabaseClient, createServerSupabaseClient } from "@/lib/supabase/server";
import type { ApiError } from "@/types";
import { cancelPaystackSubscription } from "@/lib/paystack";

function normalizeReason(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 1000) : null;
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.write(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json<ApiError>({ error: "Too many delete attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => ({}));
  if ((body as Record<string, unknown>)?.confirmation !== "DELETE") {
    return NextResponse.json<ApiError>({ error: "Type DELETE to confirm account deletion." }, { status: 400 });
  }
  const reason = normalizeReason((body as Record<string, unknown>)?.reason);
  const admin = createAdminSupabaseClient();

  const { data: ownedWorkspaces } = await admin
    .from("workspaces")
    .select("id, name")
    .eq("owner_user_id", user.id)
    .neq("status", "archived");
  const ownedIds = (ownedWorkspaces ?? []).map((workspace: any) => String(workspace.id));
  if (ownedIds.length) {
    const { count: otherMembers } = await admin
      .from("workspace_members")
      .select("id", { head: true, count: "exact" })
      .in("workspace_id", ownedIds)
      .eq("status", "active")
      .neq("user_id", user.id);
    if ((otherMembers ?? 0) > 0) {
      return NextResponse.json<ApiError>(
        { error: "Transfer or remove the other active workspace members before deleting this owner account." },
        { status: 409 },
      );
    }
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("email, stripe_subscription_id")
    .eq("id", user.id)
    .single();
  const { data: activeSubscriptions } = await admin
    .from("billing_subscriptions")
    .select("provider,provider_subscription_id,metadata")
    .eq("user_id", user.id)
    .in("status", ["active", "grace", "past_due"]);

  try {
    const { data: deletionRequest, error: deletionRequestError } = await admin.from("account_deletion_requests").insert({
      user_id: user.id,
      email: profile?.email ?? user.email ?? "",
      reason: reason ?? "",
      requested_at: new Date().toISOString(),
    }).select("id").single();
    if (deletionRequestError || !deletionRequest) throw deletionRequestError ?? new Error("Could not record deletion request.");

    const cancelledStripeIds = new Set<string>();
    if (profile?.stripe_subscription_id) {
      await cancelStripeSubscription(profile.stripe_subscription_id);
      cancelledStripeIds.add(profile.stripe_subscription_id);
    }
    for (const subscription of activeSubscriptions ?? []) {
      if (subscription.provider === "stripe" && subscription.provider_subscription_id && !cancelledStripeIds.has(subscription.provider_subscription_id)) {
        await cancelStripeSubscription(subscription.provider_subscription_id);
        cancelledStripeIds.add(subscription.provider_subscription_id);
        continue;
      }
      if (subscription.provider !== "paystack" || !subscription.provider_subscription_id) continue;
      const emailToken = typeof subscription.metadata?.cancellationEmailToken === "string"
        ? subscription.metadata.cancellationEmailToken
        : null;
      if (!emailToken) throw new Error("The Paystack subscription is missing its cancellation token. Contact billing support before deleting the account.");
      await cancelPaystackSubscription(subscription.provider_subscription_id, emailToken);
    }

    // Stop all local renewals before deleting identity-owned rows. Provider
    // webhooks that arrive later are then idempotent and cannot revive access.
    await admin
      .from("billing_subscriptions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .in("status", ["trialing", "active", "past_due", "paused"]);
    await admin
      .from("billing_checkout_sessions")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("status", "pending");

    const { error } = await admin.auth.admin.deleteUser(user.id);
    if (error) {
      throw error;
    }

    await admin
      .from("account_deletion_requests")
      .update({ user_id: null, processed_at: new Date().toISOString(), notes: "Completed by authenticated self-service deletion." })
      .eq("id", deletionRequest.id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Account deletion failed:", error);
    return NextResponse.json<ApiError>(
      { error: "Failed to delete account. Please contact support." },
      { status: 500 },
    );
  }
}
