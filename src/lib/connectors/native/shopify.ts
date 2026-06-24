import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

function shopifyOrigin(value: string) {
  const host = value.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(host)) throw new Error("Shopify shopDomain must be the store's myshopify.com hostname.");
  return `https://${host}`;
}

export const shopifyTagCustomerExecutor: ConnectorExecutor = {
  id: "native.shopify.tag-customer",
  async execute(context) {
    const connection =
      typeof context.config.connectionId === "string"
        ? await getConnectionById(context.config.connectionId, context.workflow.user_id)
        : await getActiveConnectionForProvider(context.workflow.user_id, "shopify");
    const secrets = await getDecryptedConnectionSecrets(connection.id);
    const shopDomain =
      String(connection.metadata?.shopDomain ?? context.config.shopDomain ?? "").trim();
    const customerId = String(context.config.customerId ?? context.config.customer ?? "").trim();
    const tag = String(context.config.tag ?? "").trim();

    if (!secrets.accessToken || !shopDomain || !customerId || !tag) {
      throw new Error("Shopify tag customer requires token, shopDomain, customerId, and tag.");
    }

    const response = await fetch(`${shopifyOrigin(shopDomain)}/admin/api/2024-10/customers/${encodeURIComponent(customerId)}.json`, {
      method: "PUT",
      headers: {
        "X-Shopify-Access-Token": secrets.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customer: {
          id: customerId,
          tags: tag,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Shopify customer tag failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "shopify",
      customerId,
      tag,
    };
  },
};

export const shopifyCreateDraftOrderExecutor: ConnectorExecutor = {
  id: "native.shopify.create-draft-order",
  async execute(context) {
    const connection =
      typeof context.config.connectionId === "string"
        ? await getConnectionById(context.config.connectionId, context.workflow.user_id)
        : await getActiveConnectionForProvider(context.workflow.user_id, "shopify");
    const secrets = await getDecryptedConnectionSecrets(connection.id);
    const shopDomain =
      String(connection.metadata?.shopDomain ?? context.config.shopDomain ?? "").trim();
    const lineItems = Array.isArray(context.config.lineItems) ? context.config.lineItems.slice(0, 100) : [];

    if (!secrets.accessToken || !shopDomain || lineItems.length === 0) {
      throw new Error("Shopify draft order requires token, shopDomain, and lineItems.");
    }

    const response = await fetch(`${shopifyOrigin(shopDomain)}/admin/api/2024-10/draft_orders.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": secrets.accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        draft_order: {
          note: typeof context.config.note === "string" ? context.config.note : undefined,
          email: typeof context.config.email === "string" ? context.config.email : undefined,
          line_items: lineItems,
          tags: typeof context.config.tags === "string" ? context.config.tags : undefined,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Shopify draft order failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "shopify",
      draftOrderId: data.draft_order?.id ?? null,
      invoiceUrl: data.draft_order?.invoice_url ?? null,
      status: data.draft_order?.status ?? null,
    };
  },
};
