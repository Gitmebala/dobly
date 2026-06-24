import type { ConnectorExecutor } from "@/lib/connectors/sdk";
import { safeOutboundFetch } from "@/lib/security/safe-fetch";

export const httpConnectorExecutor: ConnectorExecutor = {
  id: "generic.http",
  async execute(context) {
    const url = String(context.config.url ?? "").trim();
    if (!url) {
      throw new Error("HTTP connector requires a URL.");
    }

    const { response, text, finalUrl } = await safeOutboundFetch(url, {
      method: String(context.config.method ?? "POST"),
      headers: (context.config.headers as HeadersInit | undefined) ?? {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(context.config.body ?? {}),
    });

    if (!response.ok) {
      throw new Error(`HTTP connector failed with ${response.status}: ${text.slice(0, 1000)}`);
    }

    return {
      status: response.status,
      body: text,
      url: finalUrl,
    };
  },
};
