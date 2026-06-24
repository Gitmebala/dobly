/**
 * WhatsApp Template Manager
 * Handles CRUD operations for WhatsApp message templates via Meta API
 */

export interface WhatsAppTemplate {
  id: string;
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "DISABLED";
  components: TemplateComponent[];
  createdAt: string;
  lastUpdated: string;
}

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS";
  text?: string;
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION";
  buttons?: TemplateButton[];
  example?: TemplateExample;
}

export interface TemplateButton {
  type: "QUICK_REPLY" | "URL" | "CALL";
  text: string;
  url?: string;
  phoneNumber?: string;
}

export interface TemplateExample {
  header_text?: string[];
  body_text?: string[][];
}

export interface CreateTemplateParams {
  name: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  language: string;
  components: TemplateComponent[];
  allowCategoryChange?: boolean;
}

export interface TemplateListResponse {
  data: WhatsAppTemplate[];
  paging?: {
    cursors?: {
      before?: string;
      after?: string;
    };
    next?: string;
  };
}

/**
 * Get Meta API access token for WhatsApp
 */
function getWhatsAppAccessToken(): string {
  const accessToken = process.env.META_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("META_ACCESS_TOKEN or WHATSAPP_ACCESS_TOKEN is not configured");
  }
  return accessToken;
}

/**
 * Get WhatsApp Business Account ID
 */
function getWhatsAppBusinessId(): string {
  const businessId = process.env.WHATSAPP_BUSINESS_ID;
  if (!businessId) {
    throw new Error("WHATSAPP_BUSINESS_ID is not configured");
  }
  return businessId;
}

/**
 * Get WhatsApp Phone Number ID
 */
function getWhatsAppPhoneNumberId(): string {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw new Error("WHATSAPP_PHONE_NUMBER_ID is not configured");
  }
  return phoneNumberId;
}

/**
 * List all WhatsApp templates for the business
 */
export async function listWhatsAppTemplates(limit: number = 25): Promise<TemplateListResponse> {
  const accessToken = getWhatsAppAccessToken();
  const businessId = getWhatsAppBusinessId();

  const url = `https://graph.facebook.com/v19.0/${businessId}/message_templates?limit=${limit}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Failed to list templates: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Get a specific template by name
 */
export async function getWhatsAppTemplate(templateName: string): Promise<WhatsAppTemplate | null> {
  const accessToken = getWhatsAppAccessToken();
  const businessId = getWhatsAppBusinessId();

  const url = `https://graph.facebook.com/v19.0/${businessId}/message_templates?name=${encodeURIComponent(templateName)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Failed to get template: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data.data?.[0] || null;
}

/**
 * Create a new WhatsApp template
 */
export async function createWhatsAppTemplate(params: CreateTemplateParams): Promise<WhatsAppTemplate> {
  const accessToken = getWhatsAppAccessToken();
  const businessId = getWhatsAppBusinessId();

  const url = `https://graph.facebook.com/v19.0/${businessId}/message_templates`;

  const body = {
    name: params.name,
    category: params.category,
    language: params.language,
    components: params.components,
    allow_category_change: params.allowCategoryChange || false,
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Failed to create template: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Delete a WhatsApp template
 */
export async function deleteWhatsAppTemplate(templateName: string): Promise<{ success: boolean }> {
  const accessToken = getWhatsAppAccessToken();
  const businessId = getWhatsAppBusinessId();

  const url = `https://graph.facebook.com/v19.0/${businessId}/message_templates?name=${encodeURIComponent(templateName)}`;

  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Failed to delete template: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return { success: data.success || false };
}

/**
 * Update an existing WhatsApp template
 * Note: WhatsApp doesn't support direct updates. You must delete and recreate.
 */
export async function updateWhatsAppTemplate(
  templateName: string,
  params: CreateTemplateParams
): Promise<WhatsAppTemplate> {
  // Delete the old template
  await deleteWhatsAppTemplate(templateName);

  // Create the new template with the same name
  return createWhatsAppTemplate(params);
}

/**
 * Send a message using a template
 */
export async function sendTemplateMessage(
  to: string,
  templateName: string,
  components?: Record<string, unknown>[]
): Promise<{ success: boolean; messageId?: string }> {
  const accessToken = getWhatsAppAccessToken();
  const phoneNumberId = getWhatsAppPhoneNumberId();

  const url = `https://graph.facebook.com/v19.0/${phoneNumberId}/messages`;

  const body = {
    messaging_product: "whatsapp",
    to: to,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en_US" },
      components: components || [],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
    throw new Error(`Failed to send template message: ${error.error?.message || response.statusText}`);
  }

  const data = await response.json();
  return {
    success: true,
    messageId: data.messages?.[0]?.id,
  };
}

/**
 * Validate template structure before submission
 */
export function validateTemplate(params: CreateTemplateParams): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate name
  if (!params.name || params.name.length < 1 || params.name.length > 512) {
    errors.push("Template name must be between 1 and 512 characters");
  }

  if (!/^[a-z0-9_]+$/.test(params.name)) {
    errors.push("Template name can only contain lowercase letters, numbers, and underscores");
  }

  // Validate category
  if (!["MARKETING", "UTILITY", "AUTHENTICATION"].includes(params.category)) {
    errors.push("Template category must be MARKETING, UTILITY, or AUTHENTICATION");
  }

  // Validate language
  if (!params.language || params.language.length !== 5) {
    errors.push("Language must be a valid locale code (e.g., en_US)");
  }

  // Validate components
  if (!params.components || params.components.length === 0) {
    errors.push("Template must have at least one component");
  }

  const hasBody = params.components.some((c) => c.type === "BODY");
  if (!hasBody) {
    errors.push("Template must have a BODY component");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
