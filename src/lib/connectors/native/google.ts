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

function stringifyDocumentContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (value == null) return "";
  if (Array.isArray(value)) return value.map(stringifyDocumentContent).filter(Boolean).join("\n\n");
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.markdown === "string") return record.markdown;
    if (typeof record.body === "string") return record.body;
    if (typeof record.text === "string") return record.text;
    if (typeof record.summary === "string") return record.summary;
    return JSON.stringify(record, null, 2);
  }
  return String(value);
}

function latestStepOutputText(stepOutputs: Record<string, Record<string, unknown>>) {
  const latest = Object.values(stepOutputs).at(-1);
  return stringifyDocumentContent(latest);
}

export const googleDocsCreateExecutor: ConnectorExecutor = {
  id: "native.google.docs.create",
  async execute(context) {
    const { accessToken } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const title = String(context.config.title ?? context.step.name ?? context.workflow.title).trim();
    const content =
      stringifyDocumentContent(context.config.content ?? context.config.body ?? context.config.text ?? context.config.markdown) ||
      latestStepOutputText(context.stepOutputs) ||
      context.step.description;

    if (!title) {
      throw new Error("Google Docs create requires a title.");
    }
    if (!content.trim()) {
      throw new Error("Google Docs create requires document content.");
    }

    const createResponse = await fetch("https://docs.googleapis.com/v1/documents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title }),
    });

    const created = await createResponse.json().catch(() => ({}));
    if (!createResponse.ok) {
      throw new Error(`Google Docs create failed: ${JSON.stringify(created)}`);
    }

    const documentId = String(created.documentId ?? "").trim();
    if (!documentId) {
      throw new Error("Google Docs create did not return a document id.");
    }

    const updateResponse = await fetch(`https://docs.googleapis.com/v1/documents/${documentId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: content,
            },
          },
        ],
      }),
    });

    const updated = await updateResponse.json().catch(() => ({}));
    if (!updateResponse.ok) {
      throw new Error(`Google Docs write failed: ${JSON.stringify(updated)}`);
    }

    const documentUrl = `https://docs.google.com/document/d/${documentId}/edit`;
    return {
      provider: "google",
      service: "docs",
      documentId,
      documentUrl,
      url: documentUrl,
      title,
      summary: `Created Google Doc "${title}".`,
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

export const googleCalendarCreateEventExecutor: ConnectorExecutor = {
  id: "native.google.calendar.create-event",
  async execute(context) {
    const { accessToken, connection } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const calendarId = String(
      context.config.calendarId ??
        (connection.metadata as Record<string, unknown>)?.calendarId ??
        "primary"
    ).trim();
    const summary = String(context.config.summary ?? context.step.name).trim();
    const description = String(context.config.description ?? context.step.description).trim();
    const start = String(context.config.start ?? "").trim();
    const end = String(context.config.end ?? "").trim();

    if (!summary || !start || !end) {
      throw new Error("Google Calendar create event requires summary, start, and end.");
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary,
          description,
          start: { dateTime: start },
          end: { dateTime: end },
          attendees: Array.isArray(context.config.attendees)
            ? (context.config.attendees as unknown[]).map((email) => ({ email: String(email) }))
            : undefined,
          location: typeof context.config.location === "string" ? context.config.location : undefined,
        }),
      }
    );

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Google Calendar create event failed: ${JSON.stringify(data)}`);
    }

    return {
      provider: "google",
      service: "calendar",
      calendarId,
      eventId: data.id ?? null,
      htmlLink: data.htmlLink ?? null,
      status: data.status ?? null,
    };
  },
};
