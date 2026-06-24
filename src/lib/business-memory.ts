export type BusinessMemoryKind =
  | "business_profile"
  | "service"
  | "product"
  | "faq"
  | "policy"
  | "tone"
  | "customer_note"
  | "sales_rule"
  | "support_rule"
  | "finance_rule"
  | "content_example"
  | "decision"
  | "escalation_rule"
  | "capability_profile"
  | "worker_marketplace_item";

export type BusinessMemoryScope =
  | "global"
  | "reception"
  | "sales"
  | "marketing"
  | "support"
  | "finance"
  | "operations"
  | "general_manager"
  | "boardroom";

export interface BusinessMemoryItem {
  id: string;
  user_id: string;
  workspace_id: string | null;
  kind: BusinessMemoryKind;
  scope: BusinessMemoryScope;
  title: string;
  body: string;
  tags: string[];
  source: string;
  confidence: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const BUSINESS_MEMORY_KINDS: Array<{
  id: BusinessMemoryKind;
  label: string;
  description: string;
}> = [
  { id: "business_profile", label: "Business Profile", description: "What the business is, who it serves, and how it operates." },
  { id: "service", label: "Service", description: "A service the business sells or delivers." },
  { id: "product", label: "Product", description: "A product, package, offer, or SKU." },
  { id: "faq", label: "FAQ", description: "Approved answers for common customer questions." },
  { id: "policy", label: "Policy", description: "Rules for refunds, booking, privacy, delivery, or customer handling." },
  { id: "tone", label: "Tone", description: "Brand voice, phrases, style, and communication preferences." },
  { id: "customer_note", label: "Customer Note", description: "Important customer context that workers should remember." },
  { id: "sales_rule", label: "Sales Rule", description: "Qualification, follow-up, pricing, or pipeline rules." },
  { id: "support_rule", label: "Support Rule", description: "Support routing, escalation, and resolution rules." },
  { id: "finance_rule", label: "Finance Rule", description: "Invoice, payment, collection, and approval rules." },
  { id: "content_example", label: "Content Example", description: "Approved content, style examples, and reusable campaign material." },
  { id: "decision", label: "Decision", description: "Past owner decision that should guide future worker behavior." },
  { id: "escalation_rule", label: "Escalation Rule", description: "When Dobly must pause and ask a human." },
  { id: "capability_profile", label: "Capability Profile", description: "Reusable worker brain: instructions, examples, tools, and scope for repeated work." },
  { id: "worker_marketplace_item", label: "Marketplace Worker", description: "A publishable worker pack other businesses can activate inside Dobly." },
];

export const BUSINESS_MEMORY_SCOPES: BusinessMemoryScope[] = [
  "global",
  "reception",
  "sales",
  "marketing",
  "support",
  "finance",
  "operations",
  "general_manager",
  "boardroom",
];

export function normalizeMemoryTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((tag) => String(tag).trim().toLowerCase())
        .filter((tag) => tag.length > 0)
        .slice(0, 12),
    ),
  );
}

export function buildMemorySearchText(item: Pick<BusinessMemoryItem, "title" | "body" | "tags" | "kind" | "scope">) {
  return [item.kind, item.scope, item.title, item.body, ...item.tags].join(" ").toLowerCase();
}
