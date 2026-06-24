import { createAdminSupabaseClient } from "@/lib/supabase/server";
import { syncMemoryToPinecone } from "./sync";
import { generateEmbedding } from "./embeddings";

/**
 * Synthesis layer: Converts raw events into structured memory items
 * and stores them in Pinecone for semantic retrieval
 */

export interface EventToSynthesize {
  eventType: string;
  eventData: Record<string, unknown>;
  userId: string;
  workspaceId?: string | null;
  timestamp: string;
}

export interface SynthesisResult {
  memoryId: string | null;
  synthesized: boolean;
  reason: string;
}

/**
 * Synthesize an event into a memory item
 * This converts raw events (task completions, decisions, outcomes) into
 * structured knowledge that can be retrieved later
 */
export async function synthesizeEvent(event: EventToSynthesize): Promise<SynthesisResult> {
  const admin = createAdminSupabaseClient();
  
  // Determine what kind of memory to create based on event type
  const memoryKind = inferMemoryKind(event.eventType, event.eventData);
  const memoryScope = inferMemoryScope(event.eventType, event.eventData);
  
  // Generate a title and body from the event
  const { title, body, tags } = extractMemoryContent(event);
  
  // Create the memory item in Supabase
  const { data: memoryItem, error } = await admin
    .from("memory_items")
    .insert({
      user_id: event.userId,
      workspace_id: event.workspaceId || null,
      kind: memoryKind,
      scope: memoryScope,
      title,
      body,
      tags,
      source: `event:${event.eventType}`,
      confidence: 0.8, // Default confidence for synthesized memories
      metadata: {
        original_event: event.eventType,
        original_timestamp: event.timestamp,
        original_data: event.eventData,
      },
    })
    .select("id")
    .single();

  if (error || !memoryItem) {
    return {
      memoryId: null,
      synthesized: false,
      reason: `Failed to create memory item: ${error?.message || "unknown error"}`,
    };
  }

  // Sync to Pinecone
  try {
    await syncMemoryToPinecone(memoryItem.id);
    return {
      memoryId: memoryItem.id,
      synthesized: true,
      reason: "Successfully synthesized and synced to Pinecone",
    };
  } catch (error) {
    console.error("Failed to sync to Pinecone:", error);
    return {
      memoryId: memoryItem.id,
      synthesized: false,
      reason: "Memory created but failed to sync to Pinecone",
    };
  }
}

/**
 * Batch synthesize multiple events
 */
export async function synthesizeBatchEvents(events: EventToSynthesize[]): Promise<SynthesisResult[]> {
  const results: SynthesisResult[] = [];
  
  for (const event of events) {
    const result = await synthesizeEvent(event);
    results.push(result);
  }
  
  return results;
}

/**
 * Infer the memory kind from an event
 */
function inferMemoryKind(eventType: string, eventData: Record<string, unknown>): string {
  if (eventType === "task_completed" || eventType === "workflow_run_completed") {
    return "decision";
  }
  
  if (eventType === "rule_learned" || eventType === "pattern_detected") {
    return "learned_rule";
  }
  
  if (eventType === "escalation" || eventType === "approval_requested") {
    return "escalation_rule";
  }
  
  if (eventType === "customer_feedback" || eventType === "support_case_resolved") {
    return "customer_note";
  }
  
  if (eventType === "policy_violation" || eventType === "compliance_check") {
    return "policy";
  }
  
  // Default to decision for most events
  return "decision";
}

/**
 * Infer the memory scope from an event
 */
function inferMemoryScope(eventType: string, eventData: Record<string, unknown>): string {
  const department = String(eventData.department_id || eventData.department || eventData.desk || "");
  
  if (department.includes("sales") || eventType.includes("lead") || eventType.includes("revenue")) {
    return "sales";
  }
  
  if (department.includes("support") || eventType.includes("customer") || eventType.includes("ticket")) {
    return "support";
  }
  
  if (department.includes("finance") || eventType.includes("payment") || eventType.includes("invoice")) {
    return "finance";
  }
  
  if (department.includes("operations") || eventType.includes("delivery") || eventType.includes("fulfillment")) {
    return "operations";
  }
  
  if (department.includes("marketing") || eventType.includes("content") || eventType.includes("campaign")) {
    return "marketing";
  }
  
  if (department.includes("reception") || eventType.includes("inbound") || eventType.includes("message")) {
    return "reception";
  }
  
  // Default to global for cross-department events
  return "global";
}

/**
 * Extract title, body, and tags from an event
 */
function extractMemoryContent(event: EventToSynthesize): {
  title: string;
  body: string;
  tags: string[];
} {
  const { eventType, eventData } = event;
  const tags: string[] = [eventType];
  
  let title = "";
  let body = "";
  
  // Extract relevant fields based on event type
  if (eventType === "task_completed") {
    title = String(eventData.title || eventData.task_name || "Task completed");
    body = String(
      eventData.result || eventData.outcome || eventData.summary || 
      `Task ${title} was completed successfully.`
    );
    tags.push("completed", "outcome");
  } else if (eventType === "rule_learned") {
    title = String(eventData.rule_name || "New rule learned");
    body = String(
      eventData.rule_description || eventData.pattern || 
      "A new pattern was detected and converted into a rule."
    );
    tags.push("rule", "learned", "automation");
  } else if (eventType === "escalation") {
    title = String(eventData.escalation_reason || "Escalation occurred");
    body = String(
      eventData.context || eventData.details || 
      "An event required escalation to a human."
    );
    tags.push("escalation", "human-intervention");
  } else if (eventType === "customer_feedback") {
    title = String(eventData.feedback_type || "Customer feedback received");
    body = String(
      eventData.feedback || eventData.message || eventData.comment || 
      "A customer provided feedback."
    );
    tags.push("feedback", "customer");
  } else {
    // Generic extraction
    title = String(eventData.title || eventData.name || eventType);
    body = String(
      eventData.description || eventData.summary || eventData.message || 
      JSON.stringify(eventData)
    );
  }
  
  // Add additional tags from event data
  if (eventData.department) tags.push(String(eventData.department));
  if (eventData.priority) tags.push(String(eventData.priority));
  if (eventData.severity) tags.push(String(eventData.severity));
  
  return { title, body, tags: tags.slice(0, 10) }; // Limit to 10 tags
}

/**
 * Nightly synthesis job: Convert recent events into memory
 * This should be run as a scheduled job (e.g., via Trigger.dev or cron)
 */
export async function runNightlySynthesis(userId: string, hoursBack: number = 24): Promise<{
  processed: number;
  synthesized: number;
  failed: number;
}> {
  const admin = createAdminSupabaseClient();
  
  const cutoffTime = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();
  
  // Fetch recent events that haven't been synthesized
  // This assumes you have an events table - adjust as needed
  const { data: events, error } = await admin
    .from("operation_feed_events")
    .select("*")
    .eq("user_id", userId)
    .gte("created_at", cutoffTime)
    .is("synthesized", false)
    .limit(100);

  if (error) {
    console.error("Failed to fetch events for synthesis:", error);
    return { processed: 0, synthesized: 0, failed: 0 };
  }

  if (!events || events.length === 0) {
    return { processed: 0, synthesized: 0, failed: 0 };
  }

  let synthesized = 0;
  let failed = 0;

  for (const event of events) {
    const result = await synthesizeEvent({
      eventType: event.event_type,
      eventData: event.event_data as Record<string, unknown>,
      userId: event.user_id,
      workspaceId: event.workspace_id,
      timestamp: event.created_at,
    });

    if (result.synthesized) {
      synthesized++;
      // Mark event as synthesized
      await admin
        .from("operation_feed_events")
        .update({ synthesized: true })
        .eq("id", event.id);
    } else {
      failed++;
    }
  }

  return {
    processed: events.length,
    synthesized,
    failed,
  };
}
