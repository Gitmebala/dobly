import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

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

    const response = await fetch(`https://${shopDomain}/admin/api/2024-10/customers/${customerId}.json`, {
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
