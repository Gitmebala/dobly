# Dobly Capability Provider Stack

Dobly users should never see MCP, API keys, server URLs, or auth headers. They create coworkers, connect apps, approve access, and see work happen inside coworker chat.

## Product Model

User-facing flow:

1. Create a coworker.
2. Choose what it should handle.
3. Dobly resolves the capabilities needed.
4. Dobly asks for friendly connections only when needed.
5. Dobly routes work through the best hidden path.
6. Every meaningful step appears in the coworker's chat.

Internal routing priority:

1. Native connector/API when we have one.
2. User-connected app token stored in `connections` and `connection_secrets`.
3. `DOBLY_TOOL_GATEWAY_URL` for hosted design/document/video/browser/social tools.
4. Browser automation fallback for long-tail tools.
5. Approval gate when the action is sensitive.

## Launch Capabilities

| Capability | Launch provider | User sees | Platform env |
| --- | --- | --- | --- |
| Writing, planning, summaries | Anthropic | Ready in Dobly | `ANTHROPIC_API_KEY` |
| Research | Anthropic + optional tool gateway | Ready in Dobly | `ANTHROPIC_API_KEY`, optional gateway |
| Documents | Google Docs or tool gateway | Connect Google | `GOOGLE_*`, optional gateway |
| Calendar | Google Calendar | Connect Google | `GOOGLE_*` |
| Email | Gmail or Resend | Connect Google | `GOOGLE_*`, `RESEND_API_KEY` |
| Designs | Canva or creative gateway | Connect Canva | `CANVA_*`, optional gateway |
| Video | Dobly video gateway/renderer | Available when enabled | `DOBLY_TOOL_GATEWAY_*`, optional Remotion env |
| Voice | ElevenLabs | Dobly handles voice | `ELEVENLABS_API_KEY` |
| Calls and SMS | Kenya local provider, Twilio fallback | Set up business number | `LOCAL_VOICE_SMS_*`, optional `TWILIO_*` |
| WhatsApp | WhatsApp Business/Meta | Connect WhatsApp | `META_*`, WhatsApp IDs |
| Payments | Paystack + M-PESA | Connect payments | `PAYSTACK_*`, `MPESA_*` |
| Social publishing | Meta/Instagram or gateway | Connect Meta | `META_*`, optional gateway |
| CRM and sales | HubSpot or gateway | Connect HubSpot | `HUBSPOT_*`, optional gateway |

## Single Tool Gateway

The long-term default is:

```env
DOBLY_TOOL_GATEWAY_URL=https://tools.dobly.ai
DOBLY_TOOL_GATEWAY_TOKEN=...
```

Direct `ANTHROPIC_MCP_*_SERVER_URL` values are only overrides for a specific high-value tool. They are not the default product model.

## Code Entry Points

- Capability catalog: `src/lib/coworker-capabilities.ts`
- Capability API: `src/app/api/coworker-capabilities/route.ts`
- Connection storage: `src/lib/connections.ts`
- Connection catalog: `src/lib/connection-catalog.ts`
- Tool gateway fallback: `src/lib/mcp-registry.ts`
- Claude MCP execution: `src/lib/claude-mcp.ts`
- OAuth setup: `src/lib/oauth-service.ts`
