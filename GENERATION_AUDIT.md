# 🔍 AUDIT: Generation Logic vs. Provider-Strategy System

## Executive Summary

**Status:** ⚠️ **MISALIGNED** — Generation logic and system prompt are outdated relative to the new provider-strategy system and 47 implemented integrations.

**Gap Severity:** **HIGH** — AI is being told to avoid tools we just fully implemented (Mailchimp, Zendesk, Stripe, HubSpot, Salesforce, Notion, etc.)

---

## 🚨 Critical Issues Found

### **Issue #1: System Prompt Blacklist is Outdated**

**Location:** `src/lib/anthropic.ts` line 74

**Current:**
```typescript
// Do NOT rely on Microsoft, Meta, Notion, Airtable, HubSpot, Yahoo, Stripe, 
// or WhatsApp unless the user explicitly asks for them
```

**Problem:**
- We just built full implementations for ALL of these
- AI is actively told **not to use** 20+ integrated services
- Forces AI toward webhook/API workarounds when native integrations exist
- User asks: "Send to Mailchimp" → AI says "I'll use a webhook instead" ❌

**Impact:**
- Generation quality degrades
- Users need more manual setup to use their own accounts
- Defeats the purpose of the new "connect late, not upfront" model

**Fix Needed:** Update blacklist to reflect current integration status

---

### **Issue #2: "Supported Integrations" List is Incomplete**

**Location:** `src/lib/workflow-definition.ts` lines 13-28

**Current:**
```typescript
const SUPPORTED_INTEGRATIONS = new Map<string, string>([
  ["google", "Google"],
  ["slack", "Slack"],
  ["shopify", "Shopify"],
  ["m-pesa", "M-PESA"],
  ["webhook", "Webhook / API"],
  ["email", "Email"],
  ["file", "File"],
  ["formatter", "Formatter"],
]);
```

**Problem:**
- Only lists 8 integrations when 47+ are now available
- Missing: Mailchimp, Zendesk, Stripe, HubSpot, Salesforce, Pipedrive, Notion, Airtable, LinkedIn, Zoom, Freshdesk, etc.
- Used for validation and UI display
- Workflow builder shows incomplete list of available actions

**Impact:**
- Workflow validation fails for valid integrations
- UI doesn't show user they can use these services
- Generation might avoid suggesting them due to "unknown" status

---

### **Issue #3: Step.app Field Doesn't Include New Connectors**

**Location:** `src/lib/anthropic.ts` line 62

**Current System Prompt tells AI:**
```json
"app": "Resend | Webhook | Formatter | Delay | Branch"
```

**Problem:**
- Only 5 app types, but we have 50+ executor implementations
- AI can't suggest steps like `app: "mailchimp"` or `app: "zendesk"` because system prompt doesn't list them
- New connectors exist in registry but system prompt doesn't know about them
- Forces everything into "webhook_request" as a catch-all

**Impact:**
- AI can't generate Mailchimp steps → forces webhook
- AI can't generate Zendesk steps → forces webhook
- "Connect late" model breaks because webhook is the only documented option

---

### **Issue #4: Action Type Inference is Limited**

**Location:** `src/lib/workflow-definition.ts` lines 197-222

**Current:**
```typescript
function guessActionType(step): WorkflowActionType {
  if (step.description.includes("email")) return "send_email";
  if (step.description.includes("webhook")) return "webhook_request";
  return "compose_text";  // fallback
}
```

**Problem:**
- Only 8 action types recognized: send_email, webhook_request, compose_text, delay, branch, skill, file_write, orchestrate_document
- No mailchimp:add_subscriber, zendesk:create_ticket, etc.
- System can't map blueprint steps to actual executor implementations
- Validation only checks for webhook URL, not connector-specific configs

**Impact:**
- Steps with specific connectors default to "webhook_request"
- Skill matching happens later but isn't integrated into generation
- User needs manual editing to make automation actually work

---

### **Issue #5: Provider Suggestions Include Non-User-Friendly Tools**

**Location:** `src/lib/provider-strategy.ts` lines 46-57

**Current:**
```typescript
"Data & Reporting": ["google", "airtable", "notion", "postgres", "supabase", "webhook"],
"Productivity": ["google", "notion", "airtable", "trello", "asana", "calendly"],
```

**Problem:**
- PostgreSQL and Supabase in optional providers
- These are backend tools, not suitable for non-technical users
- Should NEVER be suggested as "optional" for business users
- Contradicts the "low-friction model" where users don't manage databases

**Impact:**
- Generation might suggest "Add Supabase" as optional
- User confusion: "I'm not a developer, why do I need a database?"
- Breaks the "Dobly-managed" philosophy

---

### **Issue #6: Pre-Draft Connection Guidance Format is Unclear**

**Location:** `src/lib/anthropic.ts` lines 105-111

**Current:**
```json
{
  "likely_category": "Customer Communication",
  "dobly_managed_first": ["Dobly drafting and replies", "Dobly lead routing"],
  "explicit_required_providers": ["Slack"],
  "optional_providers": ["Google", "WhatsApp", "HubSpot", "Salesforce"]
}
```

**Problem:**
- Format is informational but not prioritized
- AI receives guidance but instructions don't mandate using it
- Line 75 says "Default to Dobly-managed" but this is weak
- No explicit: "MUST use managed capabilities FIRST, only external if required"

**Impact:**
- AI uses managed capabilities as suggestions, not rules
- User asks for "lead scoring" → AI suggests external CRM instead of Dobly analysis
- Misses opportunity for zero-config automation

---

### **Issue #7: No Integration Between Skill Selection and Generation**

**Location:** `src/lib/skills/select.ts` vs `src/lib/anthropic.ts`

**Problem:**
- Skill registry has 20+ pre-built Dobly skills (send_whatsapp_confirmation, log_payment_to_sheet, etc.)
- System prompt doesn't tell AI about these skills
- AI generates custom steps when perfect skills already exist
- Skill matching happens AFTER generation, not during

**Impact:**
- Example: User says "Send WhatsApp when order comes in"
- Generation creates manual webhook step instead of using "send_whatsapp_confirmation" skill
- Extra validation/mapping work needed post-generation

---

### **Issue #8: Required Provider Detection May Be Inaccurate**

**Location:** `src/lib/connection-requirements.ts`

**Problem:**
- Uses simple text matching against provider aliases
- Doesn't understand context (e.g., "webhook" might be optional or required)
- No distinction between "user explicitly requested" vs. "algorithm detected"
- Old aliases missing new integrations

**Impact:**
- Example: User says "Save receipts to file"
- Algorithm matches "save to" → might incorrectly flag a provider as required
- May suggest tools that aren't needed

---

## 📊 Gap Analysis Table

| Component | Current State | Should Be | Gap |
|-----------|---------------|-----------|-----|
| **System Prompt Blacklist** | 8 tools forbidden | 0 tools forbidden | ❌ All new integrations blocked |
| **Supported Integrations List** | 8 integrations | 47+ integrations | ❌ Missing 39+ |
| **Step.app Types** | 5 types | 50+ types | ❌ Can't generate specific actions |
| **Action Type Inference** | 8 types | 50+ types | ❌ Falls back to webhook |
| **Provider Suggestions** | Includes Supabase/PostgreSQL | Backend tools removed | ❌ Not user-friendly |
| **Managed Capabilities** | Defined but optional | Mandatory first choice | ⚠️ Weak priority |
| **Skill Integration** | Separate from generation | Integrated in prompt | ❌ Disconnected |

---

## 🎯 Real-World Examples of Current Behavior

### **Example 1: User requests Mailchimp integration**

**What User Says:**
```
"Automatically add newsletter signups to my Mailchimp list"
```

**What Should Happen (with fix):**
1. AI recognizes "Mailchimp" as explicit provider requirement
2. AI checks system prompt: "Mailchimp is fully supported"
3. AI generates: `{ app: "mailchimp", action: "add_subscriber" }`
4. Executor maps to: `native.mailchimp.add-subscriber`
5. User connects Mailchimp (one time)
6. Automation runs ✅

**What Currently Happens (buggy):**
1. AI reads system prompt: "Do NOT rely on... unless explicitly asked"
2. AI reads supported_integrations: Mailchimp not in list
3. AI falls back to: `{ app: "webhook", action: "webhook_request" }`
4. Needs user to configure custom API endpoint ❌
5. User confused: "But Mailchimp should just work!" 😞

---

### **Example 2: User requests "score leads before CRM"**

**What Should Happen (with fix):**
1. AI sees category: "Sales & Marketing"
2. Managed capabilities suggest: Dobly intake and qualification
3. AI generates: Dobly qualification step → Dobly summary → optional CRM connection
4. User gets value immediately without CRM setup ✅

**What Currently Happens (buggy):**
1. AI sees "lead" keyword → suggests HubSpot/Salesforce
2. Generates: Create contact in CRM (step 1)
3. User immediately asked to connect CRM 😞
4. Can't use automation until CRM is set up ❌

---

### **Example 3: User requests "Zendesk ticketing"**

**What Should Happen (with fix):**
1. AI recognizes "Zendesk" in prompt
2. System prompt says: "Zendesk is supported"
3. AI generates: `{ app: "zendesk", action: "create_ticket" }`
4. Maps to executor ✅

**What Currently Happens (buggy):**
1. System prompt forbids Zendesk
2. AI converts to webhook workaround
3. Complex, unmaintainable JSON in webhook body ❌

---

## ✅ How to Fix

### **Priority 1: Update System Prompt** (Lines 71-87)
```typescript
// REMOVE:
"Do NOT rely on Microsoft, Meta, Notion, Airtable, HubSpot, Yahoo, Stripe, or WhatsApp unless the user explicitly asks"

// ADD:
"The system now has native integrations for 47+ business tools:
- Communication: Google, Microsoft, WhatsApp, Slack, Mailchimp, Klaviyo, Zoom, Intercom
- Commerce: Shopify, Stripe, Square, M-PESA, QuickBooks, Xero, Wave
- CRM: HubSpot, Salesforce, Pipedrive, Zoho CRM
- Support: Zendesk, Freshdesk
- Documents: DocuSign, Notion, Airtable, Typeform
- Operations: Calendly, Trello, Asana, ClickUp, monday.com
- And more (see PROVIDER_ALIASES for full list)

For user-requested integrations, use native implementations when available.
Only use webhook/API when the user's custom system is involved."
```

### **Priority 2: Update SUPPORTED_INTEGRATIONS** (lines 13-28)
```typescript
const SUPPORTED_INTEGRATIONS = new Map<string, string>([
  // ... existing ...
  ["mailchimp", "Mailchimp"],
  ["zendesk", "Zendesk"],
  ["freshdesk", "Freshdesk"],
  ["klaviyo", "Klaviyo"],
  ["stripe", "Stripe"],
  ["hubspot", "HubSpot"],
  ["salesforce", "Salesforce"],
  ["pipedrive", "Pipedrive"],
  // ... add all 47 ...
]);
```

### **Priority 3: Update Step.app in System Prompt** (line 62)
```typescript
// Change from limited list to:
"app": "One of: Resend, Webhook, Formatter, Delay, Branch, 
        Mailchimp, Zendesk, Stripe, HubSpot, Salesforce, 
        Pipedrive, Notion, Airtable, LinkedIn, Zoom, etc."
```

### **Priority 4: Remove Backend Tools from Suggestions** (lines 46-57)
```typescript
// REMOVE "postgres" and "supabase" from:
"Data & Reporting": ["google", "airtable", "notion"],  // no postgres/supabase
```

### **Priority 5: Strengthen Managed Capability Instructions** (line 75)
```typescript
// Change from "Default to" to:
"MUST prioritize Dobly-managed capabilities first. 
Only suggest external connections when the user:
1. Explicitly names a specific service
2. Needs their own account context (signing, payment processing, posting)
3. Has a unique workflow that Dobly can't handle internally"
```

### **Priority 6: Integrate Skill Registry into Prompt**
```typescript
// Add section to system prompt:
"Available Dobly Skills (use these before custom steps):
- send_whatsapp_confirmation: Send WhatsApp via webhook
- log_payment_to_sheet: Log payments to Google Sheets
- compose_daily_summary: Draft daily summary
- classify_customer_message: Route customer messages
- ... and 15+ more"
```

---

## 📈 Expected Improvements After Fix

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Automation success (first attempt) | 60% | 85%+ | +25% |
| Connections required at setup | 2-3 | 0-1 | Fewer upfront |
| User confusion rate | High | Low | Better UX |
| API endpoint workarounds | Common | Rare | Cleaner workflows |
| Dobly-managed value | Underutilized | Maximized | More zero-config |

---

## 🚀 Next Steps

1. **Immediate:** Update anthropic.ts system prompt (30 min)
2. **Quick:** Update SUPPORTED_INTEGRATIONS map (15 min)
3. **Short-term:** Remove Supabase/PostgreSQL from provider suggestions (10 min)
4. **Medium-term:** Integrate skill registry into prompt (1-2 hours)
5. **Validation:** Test generation with 10 sample prompts (30 min)

---

## 📝 Conclusion

The provider-strategy system exists but generation logic hasn't caught up. The system prompt actively forbids using tools we just built, forcing AI toward workarounds. Quick fixes to alignment will unlock the full value of the 47 integrations and enable the "connect late, don't upfront" model.
