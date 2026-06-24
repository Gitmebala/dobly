type DoblyWorkTypeId = "communicate" | "research" | "create" | "coordinate" | "build" | "monitor" | "decide";
type DoblyOutputTypeId =
  | "message"
  | "task"
  | "alert"
  | "brief"
  | "document"
  | "presentation"
  | "spreadsheet_report"
  | "image_design"
  | "video"
  | "code_context_package"
  | "approval_request";
type DoblyTriggerTypeId =
  | "owner_request"
  | "inbound_signal"
  | "scheduled_trigger"
  | "threshold_alert"
  | "workflow_handoff"
  | "external_event";
type DoblyTrustLevelId = "informational" | "draft_propose" | "safe_auto_run" | "approval_required" | "human_only";
type DoblyMemoryScopeId = "run" | "department" | "workspace" | "customer" | "project" | "company";
type DoblyExecutionLaneId = "native_api" | "browser" | "http_webhook" | "local_desktop" | "voice" | "artifact_pipeline";
type DoblyCapabilityDepartmentId =
  | "reception"
  | "sales"
  | "marketing"
  | "support"
  | "finance"
  | "operations"
  | "engineering_product"
  | "leadership"
  | "admin";

type JsonRecord = Record<string, unknown>;

export type DoblyCapabilityState = "live" | "assisted" | "planned";
export type DoblyExecutionRoute =
  | "research"
  | "media"
  | "publishing"
  | "payments_commerce"
  | "software_execution"
  | "memory_synthesis"
  | "approval_only";

export interface DoblyExecutionIntent {
  departmentId: DoblyCapabilityDepartmentId;
  workTypeId: DoblyWorkTypeId;
  outputTypeId: DoblyOutputTypeId;
  triggerTypeId: DoblyTriggerTypeId;
  trustLevelId: DoblyTrustLevelId;
  memoryScopeId: DoblyMemoryScopeId;
  executionLaneId: DoblyExecutionLaneId;
  capabilityState: DoblyCapabilityState;
  route: DoblyExecutionRoute;
  preferredToolId: string | null;
  confidence: number;
  rationale: string[];
}

type DoblyIntentSeed = Omit<DoblyExecutionIntent, "capabilityState" | "route" | "preferredToolId" | "confidence" | "rationale">;

interface KeywordRule<T> {
  value: T;
  patterns: RegExp[];
}

const DEPARTMENT_RULES: Array<KeywordRule<DoblyCapabilityDepartmentId>> = [
  { value: "marketing", patterns: [/\bcampaign\b/i, /\bcontent\b/i, /\bnewsletter\b/i, /\bsocial\b/i, /\bbrand\b/i, /\bcreative\b/i, /\bdesign\b/i, /\bvideo\b/i, /\banimation\b/i, /\bmotion graphics?\b/i, /\bpost\b/i, /\bpublish\b/i, /\bads?\b/i] },
  { value: "engineering_product", patterns: [/\bgithub\b/i, /\brepo\b/i, /\bcode\b/i, /\bbug\b/i, /\brelease\b/i, /\bdeploy\b/i, /\broadmap\b/i, /\bfigma\b/i, /\blinear\b/i, /\bjira\b/i, /\bengineering\b/i, /\bproduct\b/i, /\bcad\b/i, /\b3d model\b/i, /\bfusion 360\b/i, /\bautodesk\b/i, /\bblueprint\b/i, /\bprototype\b/i, /pull request/i, /issue package/i] },
  { value: "finance", patterns: [/\binvoice\b/i, /\bpayment\b/i, /\breconcile\b/i, /\bcash\b/i, /\bexpense\b/i, /\bfinance\b/i, /\bquote\b/i, /\bbilling\b/i, /\bstk\b/i, /\bmpesa\b/i, /\baccounting\b/i] },
  { value: "support", patterns: [/\bsupport\b/i, /\bticket\b/i, /\bcomplaint\b/i, /customer issue/i, /\brefund\b/i, /\bsla\b/i, /\bfaq\b/i, /\bangry\b/i, /\bresolve\b/i] },
  { value: "sales", patterns: [/\blead\b/i, /\bpipeline\b/i, /\bdeal\b/i, /\bproposal\b/i, /\bqualif/i, /\bcrm\b/i, /follow-up/i, /follow up/i, /book a call/i, /\bcallback\b/i] },
  { value: "operations", patterns: [/\bsupplier\b/i, /\bvendor\b/i, /\boperations\b/i, /\btask\b/i, /\bhandoff\b/i, /\bblocker\b/i, /\bfulfillment\b/i, /\binventory\b/i, /\bschedule\b/i, /\bproject\b/i, /\brouting\b/i, /\broute\b/i] },
  { value: "reception", patterns: [/\bcall(s)?\b/i, /\bphone\b/i, /\breception\b/i, /\bwhatsapp\b/i, /\bsms\b/i, /\bchat\b/i, /\bchatbot\b/i, /\bwebsite bot\b/i, /\bassistant widget\b/i, /\bappointment(s)?\b/i, /\bbooking(s)?\b/i, /front desk/i, /\binbound\b/i, /\banswer\b/i] },
  { value: "leadership", patterns: [/\bboardroom\b/i, /\bleadership\b/i, /\bstrategy\b/i, /\bexecutive\b/i, /\bdecision\b/i, /\bbriefing\b/i, /\brecommendation\b/i, /what should we do/i] },
  { value: "admin", patterns: [/\bcalendar\b/i, /\badmin\b/i, /document filing/i, /back office/i, /\brecords\b/i, /\breminder\b/i, /email cleanup/i, /\bpaperwork\b/i] },
];

const WORK_TYPE_RULES: Array<KeywordRule<DoblyWorkTypeId>> = [
  { value: "create", patterns: [/\bcreate\b/i, /\bgenerate\b/i, /\bdraft\b/i, /\bwrite\b/i, /\bdesign\b/i, /\bcad\b/i, /\bmodel\b/i, /\banimation\b/i, /\bimage\b/i, /\bvideo\b/i, /\bdeck\b/i, /\bslides\b/i, /\bdocument\b/i, /\bproposal\b/i, /\breport\b/i, /\bspec\b/i] },
  { value: "research", patterns: [/\bresearch\b/i, /\bcompare\b/i, /find out/i, /look up/i, /\binvestigate\b/i, /\bsources\b/i, /monitor competitor/i, /\bcrawl\b/i, /\bscrape\b/i, /\bsummar(?:ize|ise)\b/i, /\bdigest\b/i] },
  { value: "communicate", patterns: [/\breply\b/i, /\bsend\b/i, /\bmessage\b/i, /\bemail\b/i, /\bwhatsapp\b/i, /\bsms\b/i, /\bcall\b/i, /\brespond\b/i, /\bchatbot\b/i, /follow up/i, /follow-up/i] },
  { value: "coordinate", patterns: [/\bcoordinate\b/i, /\broute\b/i, /\bassign\b/i, /\bhandoff\b/i, /\bschedule\b/i, /\bapprove\b/i, /\bapproval\b/i, /\btask\b/i, /\bproject\b/i, /\bescalate\b/i] },
  { value: "build", patterns: [/\bbuild\b/i, /\bfix\b/i, /\bimplement\b/i, /\btriage\b/i, /\brelease\b/i, /\bcode\b/i, /\brepo\b/i, /pull request/i, /\bdeploy\b/i] },
  { value: "monitor", patterns: [/\bwatch\b/i, /\bmonitor\b/i, /\balert\b/i, /\banomaly\b/i, /\bthreshold\b/i, /\brisk\b/i, /\bsla\b/i, /keep an eye/i] },
  { value: "decide", patterns: [/\brecommend\b/i, /\bbrief\b/i, /\bdecide\b/i, /\bboardroom\b/i, /\bstrategy\b/i, /\bsummary\b/i, /next move/i] },
];

const OUTPUT_RULES: Array<KeywordRule<DoblyOutputTypeId>> = [
  { value: "video", patterns: [/video|reel|short|tiktok|youtube|animation|animatic|motion graphics/i] },
  { value: "image_design", patterns: [/image|design|graphic|poster|thumbnail|mockup|figma|canva|cad|3d model|render|blueprint|prototype/i] },
  { value: "presentation", patterns: [/slides|deck|presentation|pitch deck|slide deck|powerpoint|pptx?/i] },
  { value: "spreadsheet_report", patterns: [/spreadsheet|sheet|excel|forecast|model|tableau|csv/i] },
  { value: "document", patterns: [/document|doc|proposal|contract|memo|spec|report|summary pack|design brief/i] },
  { value: "code_context_package", patterns: [/code|repo|github|pull request|release note|issue package|engineering brief/i] },
  { value: "message", patterns: [/message|email|reply|whatsapp|sms|call script|caption|chatbot response|website reply/i] },
  { value: "task", patterns: [/task|assign|ticket|todo|linear|jira|asana|trello/i] },
  { value: "alert", patterns: [/alert|warn|notify|anomaly|risk signal/i] },
  { value: "brief", patterns: [/brief|summary|summarize|summarise|digest|decision memo|executive update/i] },
  { value: "approval_request", patterns: [/approval|approve|review before/i] },
];

function scoreMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((score, pattern) => score + (pattern.test(text) ? 1 : 0), 0);
}

function chooseBest<T>(text: string, rules: Array<KeywordRule<T>>, fallback: T): { value: T; score: number } {
  let best = fallback;
  let bestScore = 0;
  for (const rule of rules) {
    const score = scoreMatches(text, rule.patterns);
    if (score > bestScore) {
      best = rule.value;
      bestScore = score;
    }
  }
  return { value: best, score: bestScore };
}

function inferTriggerType(text: string, context?: JsonRecord): DoblyTriggerTypeId {
  if (typeof context?.triggerTypeId === "string") return context.triggerTypeId as DoblyTriggerTypeId;
  if (typeof context?.scheduleAt === "string" || /daily|weekly|every morning|every day|schedule/i.test(text)) return "scheduled_trigger";
  if (/alert|threshold|anomaly|breach|drops below|goes above/i.test(text)) return "threshold_alert";
  if (/webhook|callback|provider event|api event/i.test(text)) return "external_event";
  if (/customer|lead|message|call|ticket|order|booking/i.test(text)) return "inbound_signal";
  if (/handoff|after that|then send to|pass to/i.test(text)) return "workflow_handoff";
  return "owner_request";
}

function inferMemoryScope(text: string, departmentId: DoblyCapabilityDepartmentId, context?: JsonRecord): DoblyMemoryScopeId {
  if (typeof context?.memoryScopeId === "string") return context.memoryScopeId as DoblyMemoryScopeId;
  if (/customer|client|lead|account/i.test(text)) return "customer";
  if (/project|campaign|release|roadmap|initiative/i.test(text)) return "project";
  if (departmentId === "leadership") return "company";
  return "department";
}

function inferTrustLevel(
  text: string,
  departmentId: DoblyCapabilityDepartmentId,
  workTypeId: DoblyWorkTypeId,
  outputTypeId: DoblyOutputTypeId,
): { value: DoblyTrustLevelId; rationale: string[] } {
  const rationale: string[] = [];

  if (departmentId === "finance") {
    rationale.push("Finance defaults to human-only or approval-gated execution.");
    return { value: "human_only", rationale };
  }

  if (/publish|post live|send to customer|charge|refund|purchase|commit|sign/i.test(text)) {
    rationale.push("The request includes an external or irreversible action.");
    return { value: "approval_required", rationale };
  }

  if (outputTypeId === "approval_request") {
    rationale.push("The requested output is itself an approval checkpoint.");
    return { value: "approval_required", rationale };
  }

  if (workTypeId === "decide" || workTypeId === "research") {
    rationale.push("Research and decision support are safer as informational or draft work.");
    return { value: workTypeId === "research" ? "draft_propose" : "informational", rationale };
  }

  if (outputTypeId === "code_context_package" || outputTypeId === "document" || outputTypeId === "presentation" || outputTypeId === "spreadsheet_report") {
    rationale.push("This output is usually prepared first, then reviewed.");
    return { value: "draft_propose", rationale };
  }

  if (departmentId === "operations" || departmentId === "admin") {
    rationale.push("Operations and admin can auto-run proven low-risk internal work.");
    return { value: "safe_auto_run", rationale };
  }

  rationale.push("Customer-facing or mixed work should stay approval-aware by default.");
  return { value: "approval_required", rationale };
}

function inferExecutionLane(
  workTypeId: DoblyWorkTypeId,
  outputTypeId: DoblyOutputTypeId,
  departmentId: DoblyCapabilityDepartmentId,
): DoblyExecutionLaneId {
  if (outputTypeId === "video" || outputTypeId === "image_design" || outputTypeId === "document" || outputTypeId === "presentation" || outputTypeId === "spreadsheet_report") {
    return "artifact_pipeline";
  }
  if (departmentId === "reception" || /message/.test(outputTypeId)) return "voice";
  if (workTypeId === "build") return "native_api";
  if (workTypeId === "monitor" || workTypeId === "research") return "http_webhook";
  return "native_api";
}

export function routeIntentToExecution(intent: DoblyIntentSeed, availability?: {
  softwareTools?: Partial<Record<string, boolean>>;
  runtimes?: Partial<Record<DoblyExecutionRoute, boolean>>;
}) {
  let route: DoblyExecutionRoute = "research";
  let preferredToolId: string | null = null;
  let capabilityState: DoblyCapabilityState = "assisted";

  if (intent.trustLevelId === "human_only") {
    route = "approval_only";
    capabilityState = "assisted";
    return { route, preferredToolId, capabilityState };
  }

  if (intent.outputTypeId === "video" || intent.outputTypeId === "image_design") {
    route = intent.workTypeId === "communicate" && intent.departmentId === "marketing" ? "publishing" : "media";
    preferredToolId = intent.outputTypeId === "image_design" ? "figma_design" : "creative_media_ops";
  } else if (intent.outputTypeId === "document" || intent.outputTypeId === "presentation") {
    route = "software_execution";
    preferredToolId = "document_production";
  } else if (intent.outputTypeId === "spreadsheet_report") {
    route = "software_execution";
    preferredToolId = "spreadsheet_modeling";
  } else if (intent.outputTypeId === "code_context_package") {
    route = "software_execution";
    preferredToolId = "github_repo_ops";
  } else if (intent.departmentId === "finance") {
    route = "payments_commerce";
    preferredToolId = "finance_backoffice_ops";
  } else if (intent.workTypeId === "research" || intent.outputTypeId === "brief" || intent.outputTypeId === "alert") {
    route = "research";
  } else if (intent.outputTypeId === "message" || intent.outputTypeId === "task") {
    route = "software_execution";
    preferredToolId =
      intent.departmentId === "sales" ? "crm_sales_ops" :
      intent.departmentId === "marketing" ? "social_publishing_ops" :
      intent.departmentId === "engineering_product" ? "github_repo_ops" :
      "browser_software_ops";
  }

  const runtimeAvailable =
    route === "software_execution"
      ? Boolean(preferredToolId && availability?.softwareTools?.[preferredToolId])
      : Boolean(availability?.runtimes?.[route]);

  if (runtimeAvailable) {
    capabilityState = "live";
  } else if (route === "research" || route === "media") {
    capabilityState = "assisted";
  } else {
    capabilityState = "planned";
  }

  return { route, preferredToolId, capabilityState };
}

export function inferDoblyExecutionIntent(input: {
  prompt: string;
  context?: JsonRecord;
  explicit?: Partial<{
    departmentId: DoblyCapabilityDepartmentId;
    workTypeId: DoblyWorkTypeId;
    outputTypeId: DoblyOutputTypeId;
    triggerTypeId: DoblyTriggerTypeId;
    trustLevelId: DoblyTrustLevelId;
    memoryScopeId: DoblyMemoryScopeId;
  }>;
  availability?: Parameters<typeof routeIntentToExecution>[1];
}): DoblyExecutionIntent {
  const prompt = input.prompt.trim();
  const lowered = prompt.toLowerCase();
  const rationale: string[] = [];

  const departmentChoice = input.explicit?.departmentId
    ? { value: input.explicit.departmentId, score: 2 }
    : chooseBest(lowered, DEPARTMENT_RULES, "operations");
  const workTypeChoice = input.explicit?.workTypeId
    ? { value: input.explicit.workTypeId, score: 2 }
    : chooseBest(lowered, WORK_TYPE_RULES, departmentChoice.value === "engineering_product" ? "build" : "coordinate");
  const outputChoice = input.explicit?.outputTypeId
    ? { value: input.explicit.outputTypeId, score: 2 }
    : chooseBest(
        lowered,
        OUTPUT_RULES,
        workTypeChoice.value === "research" ? "brief" : workTypeChoice.value === "coordinate" ? "task" : "document",
      );

  if (
    !input.explicit?.workTypeId &&
    (departmentChoice.value === "reception" || departmentChoice.value === "support") &&
    /reply|respond|message|chatbot|website bot|support bot|customer question|complaint|inbound/i.test(prompt)
  ) {
    workTypeChoice.value = "communicate";
    rationale.push(`Shifted work type to communicate because ${departmentChoice.value} work is centered on live conversation handling.`);
  }

  if (
    !input.explicit?.outputTypeId &&
    (departmentChoice.value === "reception" || departmentChoice.value === "support") &&
    /chatbot|reply|respond|message|website bot|support bot|customer question|complaint|inbound/i.test(prompt)
  ) {
    outputChoice.value = "message";
    rationale.push("Shifted output to message because this request is primarily about live conversational handling.");
  }

  if (departmentChoice.score > 0) rationale.push(`Matched department keywords for ${departmentChoice.value}.`);
  if (workTypeChoice.score > 0) rationale.push(`Matched work type keywords for ${workTypeChoice.value}.`);
  if (outputChoice.score > 0) rationale.push(`Matched output keywords for ${outputChoice.value}.`);

  const triggerTypeId = input.explicit?.triggerTypeId ?? inferTriggerType(lowered, input.context);
  const memoryScopeId = input.explicit?.memoryScopeId ?? inferMemoryScope(lowered, departmentChoice.value, input.context);
  const trustDecision = input.explicit?.trustLevelId
    ? { value: input.explicit.trustLevelId, rationale: ["Used explicit trust override."] }
    : inferTrustLevel(lowered, departmentChoice.value, workTypeChoice.value, outputChoice.value);

  rationale.push(...trustDecision.rationale);

  const executionLaneId = inferExecutionLane(workTypeChoice.value, outputChoice.value, departmentChoice.value);
  const route = routeIntentToExecution(
    {
      departmentId: departmentChoice.value,
      workTypeId: workTypeChoice.value,
      outputTypeId: outputChoice.value,
      triggerTypeId,
      trustLevelId: trustDecision.value,
      memoryScopeId,
      executionLaneId,
    },
    input.availability,
  );

  const scores = [departmentChoice.score, workTypeChoice.score, outputChoice.score].reduce((sum, item) => sum + item, 0);
  const confidence = Math.min(0.98, 0.45 + scores * 0.12 + (input.explicit ? 0.08 : 0));

  return {
    departmentId: departmentChoice.value,
    workTypeId: workTypeChoice.value,
    outputTypeId: outputChoice.value,
    triggerTypeId,
    trustLevelId: trustDecision.value,
    memoryScopeId,
    executionLaneId,
    capabilityState: route.capabilityState,
    route: route.route,
    preferredToolId: route.preferredToolId,
    confidence,
    rationale,
  };
}

export function attachDoblyIntentMetadata<T extends JsonRecord | undefined | null>(target: T, intent: DoblyExecutionIntent) {
  return {
    ...(target ?? {}),
    doblyIntent: intent,
  };
}

export function getDepartmentExecutionPack(departmentId: DoblyCapabilityDepartmentId) {
  if (departmentId === "marketing") {
    return {
      signals: ["campaign briefs", "brand inputs", "channel performance", "competitor shifts"],
      outputs: ["documents", "designs", "images", "videos", "approval-ready publishing packs"],
      standards: [
        "Campaigns should turn into assets, not just ideas.",
        "Brand-risk claims should pause before publishing.",
      ],
    };
  }

  if (departmentId === "engineering_product") {
    return {
      signals: ["issues", "roadmap notes", "release context", "design handoff", "customer bugs"],
      outputs: ["issue packages", "release briefs", "code context bundles", "decision memos"],
      standards: [
        "Every engineering handoff should include context and next step.",
        "Production-facing changes should stay reviewable and explicit.",
      ],
    };
  }

  return {
    signals: ["requests", "alerts", "records"],
    outputs: ["tasks", "briefs", "messages"],
    standards: ["Work should keep moving with the right context attached."],
  };
}
