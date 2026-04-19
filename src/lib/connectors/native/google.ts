import {
  getActiveConnectionForProvider,
  getConnectionById,
  getDecryptedConnectionSecrets,
} from "@/lib/connections";
import { anthropic } from "@/lib/anthropic";
import type { ConnectorExecutor } from "@/lib/connectors/sdk";

async function getGoogleConnection(userId: string, connectionId?: string) {
  const connection = connectionId
    ? await getConnectionById(connectionId, userId)
    : await getActiveConnectionForProvider(userId, "google");
  const secrets = await getDecryptedConnectionSecrets(connection.id);
  if (!secrets.accessToken) {
    throw new Error("Google connection is missing an access token.");
  }
  return { connection, accessToken: secrets.accessToken };
}

function encodeEmail(raw: string) {
  return Buffer.from(raw).toString("base64url");
}

export const googleGmailSendExecutor: ConnectorExecutor = {
  id: "native.google.gmail.send",
  async execute(context) {
    const { accessToken } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const to = String(context.config.to ?? "").trim();
    if (!to) {
      throw new Error("Gmail action requires a recipient.");
    }

    const subject = String(context.config.subject ?? context.step.name);
    const text = String(context.config.text ?? context.step.description);
    const raw = [`To: ${to}`, `Subject: ${subject}`, "Content-Type: text/plain; charset=utf-8", "", text].join("\n");

    const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: encodeEmail(raw) }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Gmail send failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "google",
      service: "gmail",
      messageId: data.id ?? null,
      threadId: data.threadId ?? null,
    };
  },
};

export const googleSheetsAppendExecutor: ConnectorExecutor = {
  id: "native.google.sheets.append",
  async execute(context) {
    const { accessToken } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const spreadsheetId = String(context.config.spreadsheetId ?? "").trim();
    const range = String(context.config.range ?? "Sheet1!A:Z").trim();
    const values = Array.isArray(context.config.values) ? context.config.values : [];

    if (!spreadsheetId) {
      throw new Error("Google Sheets append requires a spreadsheetId.");
    }

    const url = new URL(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}:append`
    );
    url.searchParams.set("valueInputOption", "USER_ENTERED");

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [values],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Google Sheets append failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "google",
      service: "sheets",
      spreadsheetId,
      updates: data.updates ?? {},
    };
  },
};

export const googleSheetsReadExecutor: ConnectorExecutor = {
  id: "native.google.sheets.read",
  async execute(context) {
    const { accessToken } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const spreadsheetId = String(context.config.spreadsheetId ?? "").trim();
    const range = String(context.config.range ?? "Sheet1!A:Z").trim();

    if (!spreadsheetId) {
      throw new Error("Google Sheets read requires a spreadsheetId.");
    }

    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Google Sheets read failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "google",
      service: "sheets",
      spreadsheetId,
      range,
      values: data.values ?? [],
    };
  },
};

export const googleSheetsAnalyzeExecutor: ConnectorExecutor = {
  id: "native.google.sheets.analyze",
  async execute(context) {
    const { accessToken } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const spreadsheetId = String(context.config.spreadsheetId ?? "").trim();
    const range = String(context.config.range ?? "Sheet1!A:Z").trim();
    const prompt = String(context.config.prompt ?? "Analyze this spreadsheet data and provide insights.");

    if (!spreadsheetId) {
      throw new Error("Google Sheets analyze requires a spreadsheetId.");
    }

    // Read the data
    const readResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const readData = await readResponse.json().catch(() => ({}));
    if (!readResponse.ok) {
      throw new Error(`Google Sheets read failed: ${JSON.stringify(readData)}`);
    }

    const values = readData.values ?? [];
    const dataString = JSON.stringify(values);

    // Send to Claude for analysis
    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      system: "You are an expert data analyst. Analyze the provided spreadsheet data and respond to the user's query.",
      messages: [
        {
          role: "user",
          content: `${prompt}\n\nSpreadsheet data (JSON format):\n${dataString}`,
        },
      ],
    });

    const analysis = message.content[0]?.type === "text" ? message.content[0].text : "Analysis failed";

    return {
      provider: "google",
      service: "sheets",
      spreadsheetId,
      range,
      analysis,
      rawData: values,
    };
  },
};
