import { normalizeMemoryTags, type BusinessMemoryItem, type BusinessMemoryScope } from "@/lib/business-memory";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

export interface CapabilityProfileRecord {
  id: string;
  userId: string;
  workspaceId: string | null;
  title: string;
  summary: string;
  scope: BusinessMemoryScope;
  tags: string[];
  profileType: "private" | "marketplace";
  provider: string | null;
  preferredModel: string | null;
  tools: string[];
  examples: string[];
  instructions: string;
  status: "draft" | "published";
  installCount: number;
  rating: number;
  monthlyPriceUsd: number | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

function toProfile(item: BusinessMemoryItem): CapabilityProfileRecord {
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;
  return {
    id: item.id,
    userId: item.user_id,
    workspaceId: item.workspace_id,
    title: item.title,
    summary: String(metadata.summary ?? item.body.slice(0, 220)),
    scope: item.scope,
    tags: item.tags ?? [],
    profileType: item.kind === "worker_marketplace_item" ? "marketplace" : "private",
    provider: typeof metadata.provider === "string" ? metadata.provider : null,
    preferredModel: typeof metadata.preferredModel === "string" ? metadata.preferredModel : null,
    tools: Array.isArray(metadata.tools) ? metadata.tools.map((tool) => String(tool)) : [],
    examples: Array.isArray(metadata.examples) ? metadata.examples.map((example) => String(example)) : [],
    instructions: item.body,
    status: metadata.status === "published" ? "published" : "draft",
    installCount: Number(metadata.installCount ?? 0),
    rating: Number(metadata.rating ?? 0),
    monthlyPriceUsd:
      metadata.monthlyPriceUsd === null || metadata.monthlyPriceUsd === undefined
        ? null
        : Number(metadata.monthlyPriceUsd),
    metadata,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

export async function listCapabilityProfiles(params: {
  userId: string;
  marketplaceOnly?: boolean;
  publishedOnly?: boolean;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  const query = admin
    .from("business_memory_items")
    .select("*")
    .eq("user_id", params.userId)
    .in("kind", params.marketplaceOnly ? ["worker_marketplace_item"] : ["capability_profile", "worker_marketplace_item"])
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(params.limit ?? 40, 100)));

  const { data, error } = await query;
  if (error) throw new Error(`Failed to load capability profiles: ${error.message}`);

  const profiles = ((data ?? []) as BusinessMemoryItem[]).map(toProfile);
  return params.publishedOnly ? profiles.filter((profile) => profile.status === "published") : profiles;
}

export async function createCapabilityProfile(params: {
  userId: string;
  workspaceId?: string | null;
  title: string;
  instructions: string;
  summary?: string;
  scope?: BusinessMemoryScope;
  tags?: string[];
  provider?: string | null;
  preferredModel?: string | null;
  tools?: string[];
  examples?: string[];
}) {
  const admin = createAdminSupabaseClient();
  const payload = {
    user_id: params.userId,
    workspace_id: params.workspaceId ?? null,
    kind: "capability_profile",
    scope: params.scope ?? "global",
    title: params.title.trim(),
    body: params.instructions.trim(),
    tags: normalizeMemoryTags(params.tags ?? []),
    source: "capability_profile",
    confidence: 1,
    metadata: {
      summary: params.summary ?? "",
      provider: params.provider ?? null,
      preferredModel: params.preferredModel ?? null,
      tools: params.tools ?? [],
      examples: params.examples ?? [],
      status: "draft",
      installCount: 0,
      rating: 0,
    },
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin.from("business_memory_items").insert(payload).select("*").single();
  if (error || !data) throw new Error(`Failed to create capability profile: ${error?.message ?? "unknown error"}`);
  return toProfile(data as BusinessMemoryItem);
}

export async function publishCapabilityProfile(params: {
  profileId: string;
  userId: string;
  monthlyPriceUsd?: number | null;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: loadError } = await admin
    .from("business_memory_items")
    .select("*")
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .single();

  if (loadError || !existing) throw new Error(`Failed to load capability profile: ${loadError?.message ?? "not found"}`);
  const item = existing as BusinessMemoryItem;
  const metadata = (item.metadata ?? {}) as Record<string, unknown>;

  const { data, error } = await admin
    .from("business_memory_items")
    .update({
      kind: "worker_marketplace_item",
      metadata: {
        ...metadata,
        status: "published",
        publishedAt: new Date().toISOString(),
        monthlyPriceUsd: params.monthlyPriceUsd ?? null,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.profileId)
    .eq("user_id", params.userId)
    .select("*")
    .single();

  if (error || !data) throw new Error(`Failed to publish capability profile: ${error?.message ?? "unknown error"}`);
  return toProfile(data as BusinessMemoryItem);
}

export async function searchMarketplaceWorkers(params: {
  query?: string;
  limit?: number;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("business_memory_items")
    .select("*")
    .eq("kind", "worker_marketplace_item")
    .order("updated_at", { ascending: false })
    .limit(Math.max(1, Math.min(params.limit ?? 30, 100)));

  if (error) throw new Error(`Failed to search marketplace workers: ${error.message}`);

  let profiles = ((data ?? []) as BusinessMemoryItem[]).map(toProfile).filter((profile) => profile.status === "published");
  const q = params.query?.trim().toLowerCase();
  if (q) {
    profiles = profiles.filter((profile) =>
      [profile.title, profile.summary, profile.instructions, ...profile.tags, ...profile.tools].join(" ").toLowerCase().includes(q),
    );
  }

  return profiles;
}

export async function installMarketplaceWorker(params: {
  profileId: string;
  installerUserId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data: existing, error: loadError } = await admin
    .from("business_memory_items")
    .select("*")
    .eq("id", params.profileId)
    .eq("kind", "worker_marketplace_item")
    .single();

  if (loadError || !existing) throw new Error(`Failed to load marketplace worker: ${loadError?.message ?? "not found"}`);
  const source = existing as BusinessMemoryItem;
  const metadata = (source.metadata ?? {}) as Record<string, unknown>;

  const { data: clone, error } = await admin
    .from("business_memory_items")
    .insert({
      user_id: params.installerUserId,
      workspace_id: null,
      kind: "capability_profile",
      scope: source.scope,
      title: source.title,
      body: source.body,
      tags: source.tags,
      source: "marketplace_install",
      confidence: source.confidence,
      metadata: {
        ...metadata,
        status: "draft",
        installedFromProfileId: source.id,
      },
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error || !clone) throw new Error(`Failed to install marketplace worker: ${error?.message ?? "unknown error"}`);

  await admin
    .from("business_memory_items")
    .update({
      metadata: {
        ...metadata,
        installCount: Number(metadata.installCount ?? 0) + 1,
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", source.id);

  return toProfile(clone as BusinessMemoryItem);
}
