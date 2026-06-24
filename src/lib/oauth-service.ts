import { encryptSecret } from "@/lib/crypto";
import { upsertConnection, storeConnectionSecrets } from "@/lib/connections";
import { logConnectionAudit } from "@/lib/connection-audit";

/**
 * Comprehensive OAuth handler for all providers
 * Centralized OAuth flow management with automatic credential storage
 */

interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authorizationUrl: string;
  tokenUrl: string;
  scopes: string[];
  dataMapping?: Record<string, string>; // Map token response fields
}

const OAUTH_PROVIDERS: Record<string, OAuthConfig> = {
  google: {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/google/callback`,
    authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scopes: [
      "https://www.googleapis.com/auth/gmail.send",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/drive.file",
    ],
  },
  microsoft: {
    clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/microsoft/callback`,
    authorizationUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    tokenUrl: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    scopes: ["Mail.Send", "Calendars.ReadWrite"],
  },
  stripe: {
    clientId: process.env.STRIPE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.STRIPE_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/stripe/callback`,
    authorizationUrl: "https://connect.stripe.com/oauth/authorize",
    tokenUrl: "https://connect.stripe.com/oauth/token",
    scopes: ["read_write"],
  },
  shopify: {
    clientId: process.env.SHOPIFY_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.SHOPIFY_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/shopify/callback`,
    authorizationUrl: "https://SHOP_NAME.myshopify.com/admin/oauth/authorize",
    tokenUrl: "https://SHOP_NAME.myshopify.com/admin/oauth/access_token",
    scopes: ["write_products", "read_orders"],
  },
  hubspot: {
    clientId: process.env.HUBSPOT_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.HUBSPOT_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/hubspot/callback`,
    authorizationUrl: "https://app.hubspot.com/oauth/authorize",
    tokenUrl: "https://api.hubapi.com/oauth/v1/token",
    scopes: ["crm.objects.contacts.write", "crm.objects.deals.write"],
  },
  salesforce: {
    clientId: process.env.SALESFORCE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.SALESFORCE_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/salesforce/callback`,
    authorizationUrl: "https://login.salesforce.com/services/oauth2/authorize",
    tokenUrl: "https://login.salesforce.com/services/oauth2/token",
    scopes: ["api", "full", "chatter"],
  },
  slack: {
    clientId: process.env.SLACK_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.SLACK_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/slack/callback`,
    authorizationUrl: "https://slack.com/oauth/v2/authorize",
    tokenUrl: "https://slack.com/api/oauth.v2.access",
    scopes: ["chat:write", "users:read"],
  },
  pipedrive: {
    clientId: process.env.PIPEDRIVE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.PIPEDRIVE_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/pipedrive/callback`,
    authorizationUrl: "https://oauth.pipedrive.com/oauth/authorize",
    tokenUrl: "https://oauth.pipedrive.com/oauth/token",
    scopes: ["leads:read", "deals:write"],
  },
  notion: {
    clientId: process.env.NOTION_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.NOTION_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/notion/callback`,
    authorizationUrl: "https://api.notion.com/v1/oauth/authorize",
    tokenUrl: "https://api.notion.com/v1/oauth/token",
    scopes: [],
  },
  mailchimp: {
    clientId: process.env.MAILCHIMP_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.MAILCHIMP_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/mailchimp/callback`,
    authorizationUrl: "https://login.mailchimp.com/oauth/authorize",
    tokenUrl: "https://login.mailchimp.com/oauth/token",
    scopes: ["lists:read:client", "lists:write:client"],
  },
  zendesk: {
    clientId: process.env.ZENDESK_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.ZENDESK_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/zendesk/callback`,
    authorizationUrl: "https://SUBDOMAIN.zendesk.com/oauth/authorizations/new",
    tokenUrl: "https://SUBDOMAIN.zendesk.com/oauth/tokens",
    scopes: ["write"],
  },
  zoom: {
    clientId: process.env.ZOOM_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.ZOOM_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/zoom/callback`,
    authorizationUrl: "https://zoom.us/oauth/authorize",
    tokenUrl: "https://zoom.us/oauth/token",
    scopes: ["meeting:write"],
  },
  linkedin: {
    clientId: process.env.LINKEDIN_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.LINKEDIN_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/linkedin/callback`,
    authorizationUrl: "https://www.linkedin.com/oauth/v2/authorization",
    tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
    scopes: ["w_member_social", "r_basicprofile"],
  },
  meta: {
    clientId: process.env.META_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.META_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/meta/callback`,
    authorizationUrl: "https://www.facebook.com/v18.0/dialog/oauth",
    tokenUrl: "https://graph.facebook.com/v18.0/oauth/access_token",
    scopes: ["business_basic", "instagram_basic"],
  },
  airtable: {
    clientId: process.env.AIRTABLE_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.AIRTABLE_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/airtable/callback`,
    authorizationUrl: "https://airtable.com/oauth2/v1/authorize",
    tokenUrl: "https://airtable.com/oauth2/v1/token",
    scopes: ["data.records:read", "data.records:write"],
  },
  canva: {
    clientId: process.env.CANVA_CLIENT_ID || "",
    clientSecret: process.env.CANVA_CLIENT_SECRET || "",
    redirectUri: process.env.CANVA_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/canva/callback`,
    authorizationUrl: "https://www.canva.com/api/oauth/authorize",
    tokenUrl: "https://api.canva.com/rest/v1/oauth/token",
    scopes: [
      "asset:read",
      "asset:write",
      "design:content:read",
      "design:content:write",
      "design:meta:read",
      "folder:read",
      "folder:write",
    ],
  },
  calendly: {
    clientId: process.env.CALENDLY_OAUTH_CLIENT_ID || "",
    clientSecret: process.env.CALENDLY_OAUTH_CLIENT_SECRET || "",
    redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/oauth/calendly/callback`,
    authorizationUrl: "https://auth.calendly.com/oauth/authorize",
    tokenUrl: "https://auth.calendly.com/oauth/token",
    scopes: ["calendar:read", "calendar:write"],
  },
};

/**
 * Generate OAuth authorization URL
 */
export function generateOAuthUrl(provider: string, state: string, additionalParams?: Record<string, string>): string {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    response_type: "code",
    state,
    scope: config.scopes.join(" "),
    ...additionalParams,
  });

  return `${config.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for access token
 */
export async function exchangeOAuthCode(
  provider: string,
  code: string,
  additionalParams?: Record<string, string>
): Promise<{
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  metadata?: Record<string, any>;
}> {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    grant_type: "authorization_code",
    redirect_uri: config.redirectUri,
    ...additionalParams,
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth token exchange failed: ${JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
    metadata: data,
  };
}

/**
 * Complete OAuth flow: exchange code, save connection, store credentials
 */
export async function completeOAuthFlow(params: {
  userId: string;
  provider: string;
  code: string;
  label?: string;
  ipAddress?: string;
  userAgent?: string;
  additionalParams?: Record<string, string>;
}): Promise<{ connectionId: string; status: string }> {
  try {
    // Exchange code for token
    const tokenData = await exchangeOAuthCode(
      params.provider,
      params.code,
      params.additionalParams
    );

    // Create connection record
    const connection = await upsertConnection({
      userId: params.userId,
      provider: params.provider,
      label: params.label || `${params.provider} Connection`,
      status: "active",
      metadata: tokenData.metadata,
    });

    // Store encrypted credentials
    await storeConnectionSecrets({
      connectionId: connection.id,
      accessToken: tokenData.accessToken,
      refreshToken: tokenData.refreshToken,
      expiresAt: tokenData.expiresIn
        ? new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
        : null,
    });

    // Log audit event
    await logConnectionAudit({
      userId: params.userId,
      connectionId: connection.id,
      action: "connection_created",
      status: "success",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      metadata: { provider: params.provider },
    });

    return { connectionId: connection.id, status: "active" };
  } catch (error) {
    await logConnectionAudit({
      userId: params.userId,
      connectionId: "unknown",
      action: "connection_created",
      status: "failure",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    throw error;
  }
}

/**
 * Refresh an OAuth token
 */
export async function refreshOAuthToken(
  provider: string,
  refreshToken: string
): Promise<{
  accessToken: string;
  expiresIn?: number;
}> {
  const config = OAUTH_PROVIDERS[provider];
  if (!config) throw new Error(`Unknown OAuth provider: ${provider}`);

  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch(config.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`OAuth token refresh failed: ${JSON.stringify(data)}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}
