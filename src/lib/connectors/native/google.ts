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

// "Admin" promised booking that's aware of real conflicts, not blind event
// creation. Uses Calendar's freeBusy API to check for overlap before a
// caller decides to create the event - real conflict-awareness, not a
// simulation.
export const googleCalendarCheckAvailabilityExecutor: ConnectorExecutor = {
  id: "native.google.calendar.check-availability",
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
    const start = String(context.config.start ?? "").trim();
    const end = String(context.config.end ?? "").trim();
    if (!start || !end) {
      throw new Error("Google Calendar availability check requires start and end.");
    }

    const response = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: start,
        timeMax: end,
        items: [{ id: calendarId }],
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Google Calendar availability check failed: ${JSON.stringify(data)}`);
    }

    const busy = (data.calendars?.[calendarId]?.busy ?? []) as Array<{ start: string; end: string }>;
    return {
      provider: "google",
      service: "calendar",
      calendarId,
      available: busy.length === 0,
      conflicts: busy,
    };
  },
};

// Deliberately scoped to files/folders Dobly itself creates (drive.file
// scope - see the scope comment in lib/oauth/google.ts). "Organize a
// document" here means: ensure a named folder exists, then move a
// Dobly-created file into it. It cannot see or move a user's pre-existing
// Drive files - that would need the "drive" restricted scope and Google's
// app-verification review, which isn't a realistic MVP dependency.
async function ensureDriveFolder(accessToken: string, folderName: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
  );
  const searchResponse = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const searchData = await searchResponse.json().catch(() => ({}));
  if (searchResponse.ok && Array.isArray(searchData.files) && searchData.files[0]?.id) {
    return String(searchData.files[0].id);
  }

  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name: folderName, mimeType: "application/vnd.google-apps.folder" }),
  });
  const createData = await createResponse.json().catch(() => ({}));
  if (!createResponse.ok || !createData.id) {
    throw new Error(`Google Drive folder create failed: ${JSON.stringify(createData)}`);
  }
  return String(createData.id);
}

export const googleDriveOrganizeExecutor: ConnectorExecutor = {
  id: "native.google.drive.organize",
  async execute(context) {
    const { accessToken } = await getGoogleConnection(
      context.workflow.user_id,
      typeof context.config.connectionId === "string" ? context.config.connectionId : undefined
    );
    const fileId = String(context.config.fileId ?? "").trim();
    const folderName = String(context.config.folderName ?? context.config.folder ?? "").trim();
    const newName = typeof context.config.rename === "string" ? context.config.rename.trim() : null;

    if (!fileId || !folderName) {
      throw new Error("Google Drive organize requires fileId and folderName.");
    }

    const folderId = await ensureDriveFolder(accessToken, folderName);

    const currentResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const currentData = await currentResponse.json().catch(() => ({}));
    if (!currentResponse.ok) {
      throw new Error(`Google Drive file lookup failed: ${JSON.stringify(currentData)}`);
    }
    const previousParents = Array.isArray(currentData.parents) ? currentData.parents.join(",") : "";

    const updateUrl = new URL(`https://www.googleapis.com/drive/v3/files/${fileId}`);
    updateUrl.searchParams.set("addParents", folderId);
    if (previousParents) updateUrl.searchParams.set("removeParents", previousParents);
    updateUrl.searchParams.set("fields", "id,name,parents");

    const updateResponse = await fetch(updateUrl.toString(), {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newName ? { name: newName } : {}),
    });
    const updateData = await updateResponse.json().catch(() => ({}));
    if (!updateResponse.ok) {
      throw new Error(`Google Drive organize failed: ${JSON.stringify(updateData)}`);
    }

    return {
      provider: "google",
      service: "drive",
      fileId,
      folderId,
      folderName,
      name: updateData.name ?? newName ?? null,
    };
  },
};
