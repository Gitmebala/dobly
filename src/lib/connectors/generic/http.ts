import type { ConnectorExecutor } from "@/lib/connectors/sdk";

export const httpConnectorExecutor: ConnectorExecutor = {
  id: "generic.http",
  async execute(context) {
    const url = String(context.config.url ?? "").trim();
    if (!url) {
      throw new Error("HTTP connector requires a URL.");
    }

    const response = await fetch(url, {
      method: String(context.config.method ?? "POST"),
      headers: (context.config.headers as HeadersInit | undefined) ?? {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(context.config.body ?? {}),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP connector failed with ${response.status}: ${text}`);
    }

    return {
      status: response.status,
      body: text,
      url,
    };
  },
};
