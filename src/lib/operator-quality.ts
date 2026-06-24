import "server-only";
import { createAdminSupabaseClient } from "@/lib/supabase/server";
import type { DoblyExecutionIntent } from "@/lib/dobly-inference";

type JsonRecord = Record<string, unknown>;

export type OperatorQualityPresetKey =
  | "tone"
  | "directness"
  | "brand_posture"
  | "output_shape"
  | "approval_style";

export interface OperatorQualityPresetOption {
  id: string;
  label: string;
  description: string;
  custom?: boolean;
}

export interface OperatorQualityPresetGroup {
  key: OperatorQualityPresetKey;
  label: string;
  prompt: string;
  options: OperatorQualityPresetOption[];
}

export interface OperatorQualityTaskLane {
  id: string;
  label: string;
  minimumScore: number;
  requiredElements: string[];
  forbiddenPatterns: string[];
  antiAiChecks: string[];
  signals: string[];
}

export interface OperatorQualitySignalSummary {
  counts: {
    approved: number;
    rejected: number;
    corrections: number;
    preferences: number;
    bugs: number;
    handoffs: number;
    reviews: number;
  };
  preferenceSignals: Record<string, Record<string, number>>;
  recommendations: Array<{
    key: string;
    optionId: string;
    count: number;
    ready: boolean;
  }>;
  learningReadiness: "bootstrapping" | "gathering" | "ready_for_confirmation" | "stable";
}

export interface OperatorQualityProfileShape {
  version: number;
  operatorKind: string;
  baseline: {
    minimumOverallScore: number;
    hardBlockers: string[];
    universalMusts: string[];
    antiSlopRules: string[];
    antiAiRules: string[];
    reviewLoop: {
      critiqueAndRewrite: boolean;
      maxRevisionPasses: number;
    };
    evidencePolicy: {
      preferenceSuggestionThreshold: number;
      structuralPromotionThreshold: number;
      autoApplyWithoutApproval: false;
    };
  };
  selectedPresets: Record<string, string>;
  customOverrides: Record<string, string>;
  taskLanes: OperatorQualityTaskLane[];
  learning: OperatorQualitySignalSummary;
}

export interface OperatorQualityProfileRecord {
  id: string;
  user_id: string;
  workspace_id: string | null;
  operator_id: string;
  profile: OperatorQualityProfileShape;
  created_at: string;
  updated_at: string;
}

export interface OperatorQualityContractBundle {
  summaryLines: string[];
  successCriteria: string[];
  verificationChecklist: string[];
  unacceptableOutcomes: string[];
  improvementTargets: string[];
  approvalBoundaries: string[];
  evidenceLines: string[];
  qualityBar: {
    minimumOverallScore: number;
    hardBlockers: string[];
    antiAiSignals: string[];
    selectedPreferences: string[];
    learningReadiness: OperatorQualitySignalSummary["learningReadiness"];
  };
}

const UNIVERSAL_MUSTS = [
  "Solve the real job instead of merely sounding polished.",
  "Use concrete context and make it obvious this work belongs to this operator and this business.",
  "End with a clear next step, decision, or completion signal.",
  "Make the result strong enough that a capable human would keep it with little or no rewriting.",
];

const ANTI_SLOP_RULES = [
  "No generic filler, vague reassurance, or interchangeable business language.",
  "No repeated ideas disguised as smoother phrasing.",
  "No broad advice when a concrete action or recommendation is possible.",
  "No polished-but-empty structure that avoids the hard decision.",
  "No default assistant voice, no corporate mush, and no fake specificity.",
];

const ANTI_AI_RULES = [
  "Reject outputs that sound like an AI assistant trying to be helpful instead of an operator making progress.",
  "Reject safe-but-empty paragraphs, templated transitions, and overexplained obvious points.",
  "Reject closers that could appear in almost any AI-generated response.",
  "Reject outputs that could be reused for dozens of unrelated companies without anyone noticing.",
];

const COMMON_PRESET_GROUPS: OperatorQualityPresetGroup[] = [
  {
    key: "tone",
    label: "Tone",
    prompt: "Pick the tone Dobly should default to when this operator speaks or writes.",
    options: [
      { id: "warm_reassuring", label: "Warm and reassuring", description: "Human, calm, and trust-building without sounding soft." },
      { id: "crisp_professional", label: "Crisp and professional", description: "Direct, clear, and businesslike without stiffness." },
      { id: "premium_high_trust", label: "Premium and high-trust", description: "Measured, careful, and polished for sensitive work." },
      { id: "custom", label: "Write my own", description: "Store a custom tone instruction for this operator.", custom: true },
    ],
  },
  {
    key: "directness",
    label: "Directness",
    prompt: "Choose how direct Dobly should be when it gives the answer.",
    options: [
      { id: "straight_to_point", label: "Straight to the point", description: "Lead with the answer and strip unnecessary explanation." },
      { id: "balanced_guidance", label: "Balanced explanation", description: "Answer clearly, then add just enough reasoning." },
      { id: "consultative_guided", label: "Consultative and guided", description: "Explain tradeoffs and walk the user through the next move." },
      { id: "custom", label: "Write my own", description: "Store a custom directness instruction.", custom: true },
    ],
  },
  {
    key: "brand_posture",
    label: "Brand Posture",
    prompt: "Choose the brand personality this operator should reflect by default.",
    options: [
      { id: "modern_confident", label: "Modern and confident", description: "Clear, current, and assured without hype." },
      { id: "friendly_human", label: "Friendly and human", description: "Approachable, thoughtful, and easy to work with." },
      { id: "formal_careful", label: "Formal and careful", description: "Deliberate, precise, and conservative with language." },
      { id: "custom", label: "Write my own", description: "Store a custom brand posture instruction.", custom: true },
    ],
  },
  {
    key: "output_shape",
    label: "Output Style",
    prompt: "Choose the structure Dobly should prefer when it delivers results.",
    options: [
      { id: "short_decisive", label: "Short and decisive", description: "Compact output with a strong recommendation or next step." },
      { id: "structured_bullets", label: "Structured with bullets", description: "Clean sections and scan-friendly structure." },
      { id: "detailed_explanatory", label: "Detailed and explanatory", description: "More context, rationale, and supporting detail." },
      { id: "custom", label: "Write my own", description: "Store a custom structure instruction.", custom: true },
    ],
  },
  {
    key: "approval_style",
    label: "Approval Style",
    prompt: "Choose how much freedom this operator gets before it asks the owner.",
    options: [
      { id: "draft_only", label: "Draft only", description: "Prepare everything, but leave execution or sending to the owner." },
      { id: "approve_risky", label: "Auto-handle low risk", description: "Handle low-risk cases and ask before sensitive ones." },
      { id: "propose_then_confirm", label: "Propose then confirm", description: "Make a recommendation first, then ask before acting." },
      { id: "custom", label: "Write my own", description: "Store a custom approval preference.", custom: true },
    ],
  },
];

const KIND_DEFAULTS: Record<string, Record<string, string>> = {
  business: {
    tone: "premium_high_trust",
    directness: "balanced_guidance",
    brand_posture: "modern_confident",
    output_shape: "structured_bullets",
    approval_style: "approve_risky",
  },
  work: {
    tone: "crisp_professional",
    directness: "straight_to_point",
    brand_posture: "modern_confident",
    output_shape: "structured_bullets",
    approval_style: "approve_risky",
  },
  life: {
    tone: "friendly_human",
    directness: "balanced_guidance",
    brand_posture: "friendly_human",
    output_shape: "short_decisive",
    approval_style: "propose_then_confirm",
  },
  custom: {
    tone: "crisp_professional",
    directness: "balanced_guidance",
    brand_posture: "modern_confident",
    output_shape: "structured_bullets",
    approval_style: "approve_risky",
  },
};

function isMissingRelationOrColumn(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /does not exist|Could not find the '.*' column|relation .* does not exist/i.test(message);
}

function unique(items: Array<string | null | undefined>) {
  return Array.from(new Set(items.map((item) => String(item ?? "").trim()).filter(Boolean)));
}

function presetGroupsForKind(kind: string) {
  return COMMON_PRESET_GROUPS;
}

const UNIVERSAL_TASK_LANES: OperatorQualityTaskLane[] = [
  {
    id: "message_output",
    label: "Message output",
    minimumScore: 0.92,
    requiredElements: [
      "Answer or move the conversation forward immediately.",
      "Use real context from the task, account, or record instead of generic language.",
      "Make the next step, question, or decision explicit.",
    ],
    forbiddenPatterns: [
      "Warm filler without operational value.",
      "Generic closing sentence that could fit any email or chat reply.",
      "Message that sounds reusable for unrelated companies.",
    ],
    antiAiChecks: [
      "No assistant-style reassurance padding.",
      "No overly smooth, generic cadence.",
    ],
    signals: ["message", "email", "reply", "whatsapp", "sms", "caption"],
  },
  {
    id: "task_output",
    label: "Task output",
    minimumScore: 0.9,
    requiredElements: [
      "State the action, owner, and purpose clearly.",
      "Remove ambiguity about what good completion looks like.",
    ],
    forbiddenPatterns: [
      "Task wording that is vague enough to require reinterpretation.",
      "Checklist items that restate the prompt without operational meaning.",
    ],
    antiAiChecks: [
      "No pseudo-productive wording that avoids specifics.",
    ],
    signals: ["task", "ticket", "todo", "assign", "jira", "linear", "asana", "trello"],
  },
  {
    id: "alert_output",
    label: "Alert output",
    minimumScore: 0.9,
    requiredElements: [
      "State what changed, why it matters, and what should happen next.",
      "Make urgency and confidence obvious.",
    ],
    forbiddenPatterns: [
      "Alert with no consequence or next move.",
      "Alarmist tone without evidence.",
    ],
    antiAiChecks: [
      "No inflated urgency language.",
    ],
    signals: ["alert", "anomaly", "threshold", "risk", "monitor", "watch"],
  },
  {
    id: "brief_output",
    label: "Brief output",
    minimumScore: 0.93,
    requiredElements: [
      "Organize the material into a decision-ready narrative.",
      "Make the central recommendation or takeaways explicit.",
      "Tie conclusions back to signals, records, or evidence.",
    ],
    forbiddenPatterns: [
      "Balanced summary with no stance.",
      "High-level framing that never lands on a practical recommendation.",
    ],
    antiAiChecks: [
      "No MBA-style filler or abstract key-takeaway language.",
    ],
    signals: ["brief", "summary", "board", "strategy", "recommendation"],
  },
  {
    id: "document_output",
    label: "Document output",
    minimumScore: 0.93,
    requiredElements: [
      "Use a clear structure with sections that each earn their place.",
      "Show enough detail to make the document usable without rewrite.",
      "Keep the narrative aligned to the real business or task context.",
    ],
    forbiddenPatterns: [
      "Template tone with interchangeable section content.",
      "Long document that says little beyond the headings.",
    ],
    antiAiChecks: [
      "No bland consultant-sounding prose.",
    ],
    signals: ["document", "doc", "memo", "proposal", "report", "contract", "spec"],
  },
  {
    id: "presentation_output",
    label: "Presentation output",
    minimumScore: 0.94,
    requiredElements: [
      "Build a real narrative arc instead of slide-shaped notes.",
      "Make slide roles distinct so the deck does not feel repetitive.",
      "End in a clear decision, action, or takeaway.",
    ],
    forbiddenPatterns: [
      "Slides that restate the same point with different wording.",
      "Decks with no clear audience logic or decision arc.",
    ],
    antiAiChecks: [
      "No generic presentation cadence or recycled slide language.",
    ],
    signals: ["presentation", "slides", "deck", "pitch deck", "slide deck", "powerpoint", "ppt"],
  },
  {
    id: "spreadsheet_report_output",
    label: "Spreadsheet or report output",
    minimumScore: 0.92,
    requiredElements: [
      "Expose the signal, metric, or decision that matters.",
      "Separate raw data from interpretation and next steps.",
    ],
    forbiddenPatterns: [
      "Numbers without explanation of why they matter.",
      "Interpretation with no tie back to the data shape.",
    ],
    antiAiChecks: [
      "No polished narrative that ignores the actual numbers.",
    ],
    signals: ["spreadsheet", "sheet", "excel", "forecast", "csv", "model", "reporting"],
  },
  {
    id: "image_design_output",
    label: "Image or design output",
    minimumScore: 0.93,
    requiredElements: [
      "Make the visual direction intentional and audience-specific.",
      "Ensure the concept has a clear communication purpose, not just visual polish.",
    ],
    forbiddenPatterns: [
      "Safe, average-looking design direction.",
      "Generic AI visual prompt language with no brand or message role.",
    ],
    antiAiChecks: [
      "No visual prompt slop or interchangeable style wording.",
    ],
    signals: ["image", "design", "graphic", "poster", "thumbnail", "figma", "canva", "mockup"],
  },
  {
    id: "video_output",
    label: "Video output",
    minimumScore: 0.94,
    requiredElements: [
      "Define hook, pacing, structure, and intended audience response.",
      "Show why each scene or segment exists.",
    ],
    forbiddenPatterns: [
      "Shot lists with no purpose or flow.",
      "Generic social-video language without a message hierarchy.",
    ],
    antiAiChecks: [
      "No trend-chasing filler without a real communication objective.",
    ],
    signals: ["video", "reel", "short", "youtube", "tiktok", "scene", "shot list"],
  },
  {
    id: "code_context_package_output",
    label: "Code context package",
    minimumScore: 0.93,
    requiredElements: [
      "State the technical problem, constraints, and next concrete action.",
      "Make blockers, ownership, and implementation impact explicit.",
    ],
    forbiddenPatterns: [
      "Technical summary with no execution-ready next step.",
      "Code note that sounds insightful but does not unblock anyone.",
    ],
    antiAiChecks: [
      "No generic engineering-sounding explanation.",
    ],
    signals: ["code", "repo", "github", "pull request", "issue package", "engineering brief", "release note"],
  },
  {
    id: "approval_request_output",
    label: "Approval request",
    minimumScore: 0.91,
    requiredElements: [
      "State the exact action awaiting approval.",
      "Show the risk, consequence, and what changes if approved.",
      "Make the decision easy to understand quickly.",
    ],
    forbiddenPatterns: [
      "Approval request that hides the real consequence.",
      "Approval message that forces the user to infer what Dobly wants to do.",
    ],
    antiAiChecks: [
      "No vague summarization where a decision packet is needed.",
    ],
    signals: ["approval", "approve", "sign off", "confirm", "authorize"],
  },
];

const DEPARTMENT_QUALITY_LANES: OperatorQualityTaskLane[] = [
  {
    id: "sales_quality",
    label: "Sales quality",
    minimumScore: 0.93,
    requiredElements: [
      "Show a real point of view instead of listing features.",
      "Anchor the output in recipient or account context.",
      "End with a commercial next step or recommendation.",
    ],
    forbiddenPatterns: [
      "Template excitement lines.",
      "Feature dumping without a thesis.",
      "Abstract value claims with no specifics.",
    ],
    antiAiChecks: [
      "No polished sales mush.",
      "No empty enthusiasm.",
    ],
    signals: ["sales", "lead", "pipeline", "proposal", "renewal", "quote", "prospect"],
  },
  {
    id: "marketing_quality",
    label: "Marketing quality",
    minimumScore: 0.94,
    requiredElements: [
      "Make the audience, angle, and channel role distinct.",
      "Ensure the output feels intentional, differentiated, and on-brand.",
    ],
    forbiddenPatterns: [
      "Channel-agnostic copy or concept.",
      "Generic campaign language that could fit any launch.",
    ],
    antiAiChecks: [
      "No content slop or recycled social phrasing.",
    ],
    signals: ["marketing", "campaign", "content", "newsletter", "brand", "social", "creative"],
  },
  {
    id: "support_quality",
    label: "Support quality",
    minimumScore: 0.93,
    requiredElements: [
      "Resolve the actual issue, not just the tone around it.",
      "Preserve trust while making the next step clear.",
      "Stay aligned with policy and escalation boundaries.",
    ],
    forbiddenPatterns: [
      "Empathy without resolution.",
      "Soft reassurance that avoids the real issue.",
    ],
    antiAiChecks: [
      "No support-bot language.",
    ],
    signals: ["support", "ticket", "complaint", "refund", "issue", "sla", "resolve"],
  },
  {
    id: "finance_quality",
    label: "Finance quality",
    minimumScore: 0.95,
    requiredElements: [
      "Keep amounts, references, and consequences precise.",
      "Make approval boundaries and source records explicit.",
    ],
    forbiddenPatterns: [
      "Any ambiguity about money movement or record references.",
      "Finance output that sounds polished but hides risk.",
    ],
    antiAiChecks: [
      "No vague finance-safe language when exactness is required.",
    ],
    signals: ["finance", "invoice", "payment", "expense", "billing", "accounting", "cash", "mpesa"],
  },
  {
    id: "engineering_product_quality",
    label: "Engineering and product quality",
    minimumScore: 0.94,
    requiredElements: [
      "Make blockers, ownership, and next technical action explicit.",
      "Translate ambiguity into execution-ready context.",
    ],
    forbiddenPatterns: [
      "Insightful-sounding technical prose with no clear next step.",
      "Context package that still forces another engineer to guess.",
    ],
    antiAiChecks: [
      "No generic design-to-code or engineering handoff language.",
    ],
    signals: ["engineering", "product", "repo", "bug", "deploy", "release", "figma", "code"],
  },
  {
    id: "leadership_quality",
    label: "Leadership quality",
    minimumScore: 0.95,
    requiredElements: [
      "Take a stance instead of summarizing passively.",
      "Make tradeoffs and downside risk explicit.",
      "Leave the reader clearer on the decision than when they started.",
    ],
    forbiddenPatterns: [
      "Balanced summary with no recommendation.",
      "Executive-sounding language with no real judgment.",
    ],
    antiAiChecks: [
      "No abstract key-takeaway fluff.",
    ],
    signals: ["leadership", "board", "executive", "strategy", "decision", "briefing"],
  },
];

function defaultTaskLanes(kind: string): OperatorQualityTaskLane[] {
  const kindSpecific =
    kind === "life"
      ? [
          {
            id: "personal_admin",
            label: "Personal admin",
            minimumScore: 0.89,
            requiredElements: [
              "Keep the output concrete and easy to act on.",
              "Separate what is done from what still needs a decision.",
            ],
            forbiddenPatterns: [
              "Overexplaining simple reminders or tasks.",
              "Wellness-style filler when the task is practical.",
            ],
            antiAiChecks: [
              "No overly polished assistant cadence.",
            ],
            signals: ["bill", "travel", "calendar", "subscription", "family", "personal"],
          },
        ]
      : kind === "business"
        ? [
            {
              id: "customer_reply",
              label: "Customer reply",
              minimumScore: 0.92,
              requiredElements: [
                "Answer the actual customer issue, not just the tone around it.",
                "Reflect the relevant business context or record that matters here.",
                "Make the next step explicit.",
              ],
              forbiddenPatterns: [
                "Generic empathy paragraph with no operational value.",
                "Vague 'let us know' close without direction.",
                "Reply that sounds usable for almost any customer or any business.",
              ],
              antiAiChecks: [
                "No assistant-style reassurance padding.",
                "No generic service language.",
              ],
              signals: ["customer", "reply", "message", "email", "support", "whatsapp", "sms"],
            },
          ]
        : [
            {
              id: "general_operator_work",
              label: "General operator work",
              minimumScore: 0.9,
              requiredElements: [
                "Make the result useful immediately.",
                "State what was decided, prepared, or still blocked.",
              ],
              forbiddenPatterns: [
                "Generic framing that could fit any task.",
                "Overexplained filler instead of a concrete outcome.",
              ],
              antiAiChecks: [
                "No assistant-style padding.",
              ],
              signals: ["task", "brief", "plan", "reply", "report", "draft"],
            },
          ];

  return [...kindSpecific, ...UNIVERSAL_TASK_LANES, ...DEPARTMENT_QUALITY_LANES];
}

function emptyLearningSummary(): OperatorQualitySignalSummary {
  return {
    counts: {
      approved: 0,
      rejected: 0,
      corrections: 0,
      preferences: 0,
      bugs: 0,
      handoffs: 0,
      reviews: 0,
    },
    preferenceSignals: {},
    recommendations: [],
    learningReadiness: "bootstrapping",
  };
}

function inferLearningReadiness(summary: OperatorQualitySignalSummary) {
  const total = Object.values(summary.counts).reduce((sum, value) => sum + value, 0);
  if (total < 4) return "bootstrapping" as const;
  if (summary.recommendations.some((item) => item.ready)) return "ready_for_confirmation" as const;
  if (total >= 12) return "stable" as const;
  return "gathering" as const;
}

function recomputeRecommendations(
  summary: OperatorQualitySignalSummary,
  threshold: number,
) {
  const recommendations = Object.entries(summary.preferenceSignals).flatMap(([key, options]) =>
    Object.entries(options).map(([optionId, count]) => ({
      key,
      optionId,
      count,
      ready: count >= threshold,
    })),
  );
  summary.recommendations = recommendations.sort((a, b) => b.count - a.count).slice(0, 12);
  summary.learningReadiness = inferLearningReadiness(summary);
  return summary;
}

function cloneSummary(value: OperatorQualitySignalSummary | null | undefined) {
  return recomputeRecommendations(
    JSON.parse(JSON.stringify(value ?? emptyLearningSummary())) as OperatorQualitySignalSummary,
    4,
  );
}

export function listOperatorQualityPresetGroups(kind: string) {
  return presetGroupsForKind(kind);
}

export function buildDefaultOperatorQualityProfile(input: {
  operatorKind: string;
  mission: string;
  outcome?: string | null;
}): OperatorQualityProfileShape {
  const defaults = KIND_DEFAULTS[input.operatorKind] ?? KIND_DEFAULTS.custom;
  return {
    version: 1,
    operatorKind: input.operatorKind,
    baseline: {
      minimumOverallScore: input.operatorKind === "business" ? 0.92 : 0.9,
      hardBlockers: [
        "Obviously AI sounding output",
        "Generic content that could fit any company",
        "Missing next action or decision clarity",
        "Hidden ambiguity on risky work",
      ],
      universalMusts: UNIVERSAL_MUSTS,
      antiSlopRules: ANTI_SLOP_RULES,
      antiAiRules: ANTI_AI_RULES,
      reviewLoop: {
        critiqueAndRewrite: true,
        maxRevisionPasses: 2,
      },
      evidencePolicy: {
        preferenceSuggestionThreshold: 4,
        structuralPromotionThreshold: 6,
        autoApplyWithoutApproval: false,
      },
    },
    selectedPresets: defaults,
    customOverrides: {},
    taskLanes: defaultTaskLanes(input.operatorKind),
    learning: emptyLearningSummary(),
  };
}

function normalizeSelections(
  existing: Record<string, string>,
  updates?: Record<string, string> | null,
  custom?: Record<string, string> | null,
) {
  return {
    selectedPresets: {
      ...existing,
      ...(updates ?? {}),
    },
    customOverrides: Object.fromEntries(
      Object.entries(custom ?? {}).filter(([, value]) => value.trim().length > 0),
    ),
  };
}

export function detectOperatorTaskLane(input: {
  profile: OperatorQualityProfileShape;
  prompt?: string | null;
  intent?: DoblyExecutionIntent | null;
}) {
  const haystack = `${input.prompt ?? ""} ${input.intent?.departmentId ?? ""} ${input.intent?.workTypeId ?? ""} ${input.intent?.outputTypeId ?? ""}`.toLowerCase();
  const scored = input.profile.taskLanes.map((lane) => ({
    lane,
    score: lane.signals.reduce((sum, signal) => sum + (haystack.includes(signal.toLowerCase()) ? 1 : 0), 0),
  }));
  const exactOutput =
    input.intent?.outputTypeId
      ? scored.find(({ lane }) => lane.id === `${input.intent?.outputTypeId}_output`)
      : null;
  if (exactOutput?.lane) return exactOutput.lane;
  const exactDepartment =
    input.intent?.departmentId
      ? scored.find(({ lane }) => lane.id === `${input.intent?.departmentId}_quality`)
      : null;
  if (exactDepartment?.lane) return exactDepartment.lane;
  const best = scored.sort((a, b) => b.score - a.score)[0];
  return (best?.score ?? 0) > 0 ? best.lane : input.profile.taskLanes[0] ?? null;
}

function universalOutcomeRequirements(intent: DoblyExecutionIntent | null | undefined) {
  if (!intent) return [];
  if (intent.outputTypeId === "message") {
    return [
      "The message should read like a real operator response, not a helpful assistant draft.",
      "The message should sound specific to the person, business, and moment.",
    ];
  }
  if (intent.outputTypeId === "task") {
    return [
      "The task should remove ambiguity instead of merely renaming the work.",
    ];
  }
  if (intent.outputTypeId === "alert") {
    return [
      "The alert should explain why this matters now and what to do next.",
    ];
  }
  if (intent.outputTypeId === "brief") {
    return [
      "The brief should leave the reader clearer on the decision than before reading it.",
    ];
  }
  if (intent.outputTypeId === "document") {
    return [
      "The document should feel authored with intent, not assembled from generic sections.",
    ];
  }
  if (intent.outputTypeId === "presentation") {
    return [
      "The deck should have a deliberate narrative arc and audience logic.",
    ];
  }
  if (intent.outputTypeId === "spreadsheet_report") {
    return [
      "The report should separate signal from noise and make the implications explicit.",
    ];
  }
  if (intent.outputTypeId === "image_design") {
    return [
      "The design direction should have a clear communication purpose, not just visual polish.",
    ];
  }
  if (intent.outputTypeId === "video") {
    return [
      "The video output should show pacing, hook logic, and why each segment exists.",
    ];
  }
  if (intent.outputTypeId === "code_context_package") {
    return [
      "The technical package should unblock execution, not just summarize context.",
    ];
  }
  if (intent.outputTypeId === "approval_request") {
    return [
      "The approval packet should make the decision easy without hiding any consequence.",
    ];
  }
  return [];
}

function presetLabel(kind: string, key: string, optionId: string, customOverrides: Record<string, string>) {
  if (optionId === "custom") {
    return customOverrides[key] || "Custom instruction";
  }
  const group = presetGroupsForKind(kind).find((item) => item.key === key);
  return group?.options.find((option) => option.id === optionId)?.label ?? optionId;
}

export function buildOperatorQualityContract(input: {
  profile: OperatorQualityProfileShape;
  prompt?: string | null;
  intent?: DoblyExecutionIntent | null;
}) {
  const lane = detectOperatorTaskLane(input);
  const preferenceLines = Object.entries(input.profile.selectedPresets).map(
    ([key, optionId]) => `${key.replaceAll("_", " ")}: ${presetLabel(input.profile.operatorKind, key, optionId, input.profile.customOverrides)}`,
  );
  const summaryLines = unique([
    `Operator quality baseline: ${input.profile.operatorKind} operator.`,
    lane ? `Task lane: ${lane.label}.` : null,
    `Minimum quality score: ${input.profile.baseline.minimumOverallScore}.`,
    `Learning state: ${input.profile.learning.learningReadiness}.`,
    ...preferenceLines,
  ]);

  return {
    summaryLines,
    successCriteria: unique([
      ...input.profile.baseline.universalMusts,
      ...(lane?.requiredElements ?? []),
      ...universalOutcomeRequirements(input.intent),
      "The result should feel intentional and operator-owned, not AI-authored.",
    ]),
    verificationChecklist: unique([
      "Check whether the output would still make sense if all generic brand names were removed. If yes, it is too generic.",
      "Check whether every paragraph earns its place and moves the task forward.",
      "Check whether the next step or decision is explicit.",
      ...(lane?.requiredElements ?? []).map((line) => `Verify: ${line}`),
    ]),
    unacceptableOutcomes: unique([
      ...input.profile.baseline.antiSlopRules,
      ...input.profile.baseline.antiAiRules,
      ...(lane?.forbiddenPatterns ?? []),
    ]),
    improvementTargets: unique([
      "Push the result above 'acceptable' and into clearly reusable operator work.",
      ...(lane?.antiAiChecks ?? []),
    ]),
    approvalBoundaries: unique([
      `Approval style preference: ${presetLabel(input.profile.operatorKind, "approval_style", input.profile.selectedPresets.approval_style ?? "approve_risky", input.profile.customOverrides)}.`,
      "Never silently adopt new stylistic defaults without enough repeated evidence and explicit confirmation.",
    ]),
    evidenceLines: unique([
      `Evidence policy: need ${input.profile.baseline.evidencePolicy.preferenceSuggestionThreshold}+ consistent signals before suggesting a preference change.`,
      `Current evidence counts: ${JSON.stringify(input.profile.learning.counts)}.`,
      ...summaryLines,
    ]),
    qualityBar: {
      minimumOverallScore: Math.max(input.profile.baseline.minimumOverallScore, lane?.minimumScore ?? 0),
      hardBlockers: unique([
        ...input.profile.baseline.hardBlockers,
        ...(lane?.forbiddenPatterns ?? []),
      ]),
      antiAiSignals: unique([
        ...input.profile.baseline.antiAiRules,
        ...(lane?.antiAiChecks ?? []),
      ]),
      selectedPreferences: preferenceLines,
      learningReadiness: input.profile.learning.learningReadiness,
    },
  } satisfies OperatorQualityContractBundle;
}

export async function getOperatorQualityProfile(params: {
  userId: string;
  operatorId: string;
}) {
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_quality_profiles")
    .select("*")
    .eq("user_id", params.userId)
    .eq("operator_id", params.operatorId)
    .maybeSingle();

  if (error) {
    if (isMissingRelationOrColumn(error)) return null;
    throw new Error(error.message);
  }

  return (data as OperatorQualityProfileRecord | null) ?? null;
}

export async function ensureOperatorQualityProfile(input: {
  userId: string;
  operatorId: string;
  workspaceId?: string | null;
  operatorKind: string;
  mission: string;
  outcome?: string | null;
  selectedPresets?: Record<string, string> | null;
  customOverrides?: Record<string, string> | null;
}) {
  const existing = await getOperatorQualityProfile({ userId: input.userId, operatorId: input.operatorId });
  if (existing) {
    if (input.selectedPresets || input.customOverrides) {
      return updateOperatorQualityProfile({
        userId: input.userId,
        operatorId: input.operatorId,
        selectedPresets: input.selectedPresets ?? undefined,
        customOverrides: input.customOverrides ?? undefined,
      });
    }
    return existing;
  }

  const profile = buildDefaultOperatorQualityProfile({
    operatorKind: input.operatorKind,
    mission: input.mission,
    outcome: input.outcome ?? null,
  });
  const normalized = normalizeSelections(profile.selectedPresets, input.selectedPresets, input.customOverrides);
  profile.selectedPresets = normalized.selectedPresets;
  profile.customOverrides = normalized.customOverrides;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_quality_profiles")
    .insert({
      user_id: input.userId,
      workspace_id: input.workspaceId ?? null,
      operator_id: input.operatorId,
      profile,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingRelationOrColumn(error)) {
      return {
        id: `ephemeral-${input.operatorId}`,
        user_id: input.userId,
        workspace_id: input.workspaceId ?? null,
        operator_id: input.operatorId,
        profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } satisfies OperatorQualityProfileRecord;
    }
    throw new Error(error.message);
  }

  return (data as OperatorQualityProfileRecord | null) ?? {
    id: `ephemeral-${input.operatorId}`,
    user_id: input.userId,
    workspace_id: input.workspaceId ?? null,
    operator_id: input.operatorId,
    profile,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export async function updateOperatorQualityProfile(input: {
  userId: string;
  operatorId: string;
  selectedPresets?: Record<string, string>;
  customOverrides?: Record<string, string>;
}) {
  const existing = await getOperatorQualityProfile({ userId: input.userId, operatorId: input.operatorId });
  if (!existing) {
    throw new Error("Operator quality profile not found.");
  }

  const nextProfile = JSON.parse(JSON.stringify(existing.profile)) as OperatorQualityProfileShape;
  const normalized = normalizeSelections(nextProfile.selectedPresets, input.selectedPresets, input.customOverrides);
  nextProfile.selectedPresets = normalized.selectedPresets;
  nextProfile.customOverrides = normalized.customOverrides;

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from("operator_quality_profiles")
    .update({
      profile: nextProfile,
    })
    .eq("user_id", input.userId)
    .eq("operator_id", input.operatorId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as OperatorQualityProfileRecord | null) ?? { ...existing, profile: nextProfile };
}

export async function recordOperatorQualitySignal(input: {
  userId: string;
  operatorId: string;
  workspaceId?: string | null;
  signalType: "good" | "bad" | "correction" | "preference" | "bug" | "handoff";
  body?: string | null;
  metadata?: JsonRecord;
}) {
  const existing = await getOperatorQualityProfile({ userId: input.userId, operatorId: input.operatorId });
  if (!existing) return null;

  const profile = JSON.parse(JSON.stringify(existing.profile)) as OperatorQualityProfileShape;
  const summary = cloneSummary(profile.learning);

  if (input.signalType === "good") summary.counts.approved += 1;
  if (input.signalType === "bad") summary.counts.rejected += 1;
  if (input.signalType === "correction") summary.counts.corrections += 1;
  if (input.signalType === "preference") summary.counts.preferences += 1;
  if (input.signalType === "bug") summary.counts.bugs += 1;
  if (input.signalType === "handoff") summary.counts.handoffs += 1;
  summary.counts.reviews += 1;

  const preferenceKey =
    typeof input.metadata?.preferenceKey === "string" ? input.metadata.preferenceKey : null;
  const selectedOptionId =
    typeof input.metadata?.selectedOptionId === "string" ? input.metadata.selectedOptionId : null;
  if (preferenceKey && selectedOptionId) {
    summary.preferenceSignals[preferenceKey] ??= {};
    summary.preferenceSignals[preferenceKey][selectedOptionId] =
      (summary.preferenceSignals[preferenceKey][selectedOptionId] ?? 0) + 1;
  }

  recomputeRecommendations(summary, profile.baseline.evidencePolicy.preferenceSuggestionThreshold);
  profile.learning = summary;

  const admin = createAdminSupabaseClient();
  await admin.from("operator_quality_signals").insert({
    user_id: input.userId,
    workspace_id: input.workspaceId ?? existing.workspace_id,
    operator_id: input.operatorId,
    signal_type: input.signalType,
    body: input.body ?? "",
    metadata: input.metadata ?? {},
  }).then(({ error }) => {
    if (error && !isMissingRelationOrColumn(error)) {
      throw new Error(error.message);
    }
  });

  const { data, error } = await admin
    .from("operator_quality_profiles")
    .update({
      profile,
    })
    .eq("user_id", input.userId)
    .eq("operator_id", input.operatorId)
    .select("*")
    .maybeSingle();

  if (error) {
    if (isMissingRelationOrColumn(error)) return { ...existing, profile };
    throw new Error(error.message);
  }

  return (data as OperatorQualityProfileRecord | null) ?? { ...existing, profile };
}
