import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { WhatsAppTemplate } from "./templates";

/**
 * Template Status Tracking
 * Tracks template approval status, usage analytics, and compliance metrics
 */

export interface TemplateTrackingRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  template_name: string;
  template_id: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";
  submitted_at: string;
  approved_at?: string;
  rejected_at?: string;
  rejection_reason?: string;
  last_used_at?: string;
  usage_count: number;
  quality_score?: number;
  metadata: Record<string, unknown>;
}

export interface TemplateUsageEvent {
  id: string;
  template_tracking_id: string;
  recipient: string;
  sent_at: string;
  delivered: boolean;
  read: boolean;
  failed: boolean;
  failure_reason?: string;
}

/**
 * Record a template submission for tracking
 */
export async function trackTemplateSubmission(params: {
  userId: string;
  workspaceId: string | null;
  templateName: string;
  templateId: string;
  category: string;
}): Promise<TemplateTrackingRecord> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("whatsapp_template_tracking")
    .insert({
      user_id: params.userId,
      workspace_id: params.workspaceId,
      template_name: params.templateName,
      template_id: params.templateId,
      category: params.category,
      status: "PENDING",
      submitted_at: new Date().toISOString(),
      usage_count: 0,
      metadata: {},
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to track template submission: ${error.message}`);
  }

  return data as TemplateTrackingRecord;
}

/**
 * Update template status (approval/rejection)
 */
export async function updateTemplateStatus(params: {
  templateName: string;
  userId: string;
  status: "APPROVED" | "REJECTED" | "DISABLED";
  rejectionReason?: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();

  const updateData: Record<string, unknown> = {
    status: params.status,
  };

  if (params.status === "APPROVED") {
    updateData.approved_at = new Date().toISOString();
  } else if (params.status === "REJECTED") {
    updateData.rejected_at = new Date().toISOString();
    updateData.rejection_reason = params.rejectionReason;
  }

  const { error } = await admin
    .from("whatsapp_template_tracking")
    .update(updateData)
    .eq("template_name", params.templateName)
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(`Failed to update template status: ${error.message}`);
  }
}

/**
 * Record template usage
 */
export async function recordTemplateUsage(params: {
  templateName: string;
  userId: string;
  recipient: string;
}): Promise<void> {
  const admin = createAdminSupabaseClient();

  // Update usage count
  const { error: updateError } = await admin
    .from("whatsapp_template_tracking")
    .update({
      usage_count: admin.raw("usage_count + 1"),
      last_used_at: new Date().toISOString(),
    })
    .eq("template_name", params.templateName)
    .eq("user_id", params.userId);

  if (updateError) {
    console.error("Failed to update usage count:", updateError);
  }

  // Record usage event
  const { error: insertError } = await admin
    .from("whatsapp_template_usage_events")
    .insert({
      template_name: params.templateName,
      user_id: params.userId,
      recipient: params.recipient,
      sent_at: new Date().toISOString(),
      delivered: false,
      read: false,
      failed: false,
    });

  if (insertError) {
    console.error("Failed to record usage event:", insertError);
  }
}

/**
 * Get template tracking record
 */
export async function getTemplateTracking(
  templateName: string,
  userId: string
): Promise<TemplateTrackingRecord | null> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("whatsapp_template_tracking")
    .select("*")
    .eq("template_name", templateName)
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data as TemplateTrackingRecord;
}

/**
 * Get all templates for a user with tracking data
 */
export async function getUserTemplates(userId: string): Promise<TemplateTrackingRecord[]> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("whatsapp_template_tracking")
    .select("*")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to get user templates: ${error.message}`);
  }

  return (data || []) as TemplateTrackingRecord[];
}

/**
 * Get template usage analytics
 */
export async function getTemplateAnalytics(
  templateName: string,
  userId: string
): Promise<{
  totalSent: number;
  delivered: number;
  read: number;
  failed: number;
  deliveryRate: number;
  readRate: number;
}> {
  const admin = createAdminSupabaseClient();

  const { data, error } = await admin
    .from("whatsapp_template_usage_events")
    .select("*")
    .eq("template_name", templateName)
    .eq("user_id", userId);

  if (error) {
    throw new Error(`Failed to get template analytics: ${error.message}`);
  }

  const events = data || [];
  const totalSent = events.length;
  const delivered = events.filter((e) => e.delivered).length;
  const read = events.filter((e) => e.read).length;
  const failed = events.filter((e) => e.failed).length;

  return {
    totalSent,
    delivered,
    read,
    failed,
    deliveryRate: totalSent > 0 ? delivered / totalSent : 0,
    readRate: delivered > 0 ? read / delivered : 0,
  };
}

/**
 * Sync template status from Meta API
 * Call this periodically to update local tracking with Meta's current status
 */
export async function syncTemplateStatusFromMeta(templateName: string, userId: string): Promise<void> {
  const { getWhatsAppTemplate } = await import("./templates");
  
  const metaTemplate = await getWhatsAppTemplate(templateName);
  if (!metaTemplate) {
    return;
  }

  await updateTemplateStatus({
    templateName,
    userId,
    status: metaTemplate.status,
  });
}

/**
 * Calculate template quality score based on usage metrics
 */
export async function calculateTemplateQualityScore(
  templateName: string,
  userId: string
): Promise<number> {
  const analytics = await getTemplateAnalytics(templateName, userId);
  
  if (analytics.totalSent === 0) {
    return 0.5; // Neutral score for unused templates
  }

  const deliveryScore = analytics.deliveryRate;
  const readScore = analytics.readRate;
  const failurePenalty = analytics.failed / analytics.totalSent * 0.5;

  const qualityScore = (deliveryScore * 0.4) + (readScore * 0.4) + (0.2 - failurePenalty);
  
  return Math.max(0, Math.min(1, qualityScore));
}
