/**
 * Guardrails are the hard rules a coworker can never talk itself past.
 *
 * The console lets an owner write rules in plain language ("never refund
 * over $50", "don't email customers on weekends"). Storing and showing
 * those rules is not enough — this module matches them against what the
 * coworker is actually about to do, and returns the ones that trip.
 *
 * Design constraints that matter here:
 * - A guardrail that fails to parse must still stop the run. Silence is
 *   the one outcome a safety check may never produce, so anything
 *   unparseable degrades to "hold for a human", never to "allow".
 * - Money amounts are compared numerically, not by string match, so
 *   "refund $120" trips a "$50 limit" rule.
 */

export type GuardrailVerdict = {
  allowed: boolean;
  /** Rules that tripped, in the owner's own words. */
  tripped: string[];
  /** Why each rule tripped, for the shift tape. */
  reasons: string[];
};

/** Verbs that mean the coworker is about to touch the outside world. */
const ACTION_VERBS = [
  "send",
  "email",
  "post",
  "publish",
  "pay",
  "charge",
  "refund",
  "invoice",
  "delete",
  "remove",
  "cancel",
  "book",
  "buy",
  "sell",
  "transfer",
  "share",
  "approve",
  "sign",
];

const NEGATION_MARKERS = [
  "never",
  "don't",
  "dont",
  "do not",
  "no ",
  "cannot",
  "can't",
  "cant",
  "must not",
  "avoid",
  "without",
  "refuse",
];

/** Pulls every money amount out of a string, normalised to a number. */
function extractAmounts(text: string): number[] {
  const amounts: number[] = [];
  // $1,200.50 · 1200 usd · ksh 4,000 · 50 dollars
  const pattern = /(?:[$£€]|\b(?:usd|kes|ksh|gbp|eur)\b)?\s*(\d[\d,]*(?:\.\d+)?)\s*(?:\b(?:usd|kes|ksh|gbp|eur|dollars?|shillings?)\b)?/gi;
  for (const match of text.matchAll(pattern)) {
    const raw = match[1]?.replace(/,/g, "");
    if (!raw) continue;
    const hasCurrencyMarker = /[$£€]|usd|kes|ksh|gbp|eur|dollar|shilling/i.test(match[0]);
    if (!hasCurrencyMarker) continue;
    const value = Number.parseFloat(raw);
    if (Number.isFinite(value)) amounts.push(value);
  }
  return amounts;
}

/** Content words shared between a rule and an action, ignoring filler. */
function sharedKeywords(rule: string, action: string): string[] {
  const stop = new Set([
    "the", "a", "an", "and", "or", "to", "of", "for", "on", "in", "at", "by",
    "is", "be", "not", "no", "never", "any", "all", "with", "without", "over",
    "under", "than", "more", "less", "that", "this", "it", "do", "does",
    "must", "should", "can", "cannot", "dont", "don't", "you", "your",
  ]);
  const words = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-z0-9\s$]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length > 2 && !stop.has(word)),
    );
  const ruleWords = words(rule);
  const actionWords = words(action);
  return [...ruleWords].filter((word) => actionWords.has(word));
}

/**
 * Checks one plain-language rule against a described action.
 * Returns a reason when the rule trips, or null when it does not apply.
 */
export function checkGuardrail(rule: string, action: string): string | null {
  const cleanRule = rule.trim();
  const cleanAction = action.trim();
  if (!cleanRule || !cleanAction) return null;

  const lowerRule = cleanRule.toLowerCase();
  const lowerAction = cleanAction.toLowerCase();

  // Money ceilings: "never refund over $50" vs "refund $120 to Dana".
  const ruleAmounts = extractAmounts(lowerRule);
  const actionAmounts = extractAmounts(lowerAction);
  const hasCeiling = /\b(over|above|more than|exceed|greater than|beyond|up to|limit|max|maximum)\b/.test(lowerRule);
  if (ruleAmounts.length > 0 && actionAmounts.length > 0 && hasCeiling) {
    const ceiling = Math.min(...ruleAmounts);
    const requested = Math.max(...actionAmounts);
    const topicOverlap = sharedKeywords(lowerRule, lowerAction);
    if (requested > ceiling && topicOverlap.length > 0) {
      return `The action involves ${requested}, above the ${ceiling} limit in "${cleanRule}".`;
    }
    // Under the ceiling on the same topic: explicitly fine.
    if (topicOverlap.length > 0) return null;
  }

  const ruleForbids = NEGATION_MARKERS.some((marker) => lowerRule.includes(marker));
  if (!ruleForbids) return null;

  // A forbidding rule trips when the action performs the thing it names.
  const overlap = sharedKeywords(lowerRule, lowerAction);
  const ruleVerbs = ACTION_VERBS.filter((verb) => lowerRule.includes(verb));
  const actionVerbs = ACTION_VERBS.filter((verb) => lowerAction.includes(verb));
  const sharedVerb = ruleVerbs.find((verb) => actionVerbs.includes(verb));

  if (sharedVerb && overlap.length > 0) {
    return `"${cleanRule}" forbids this — the action would ${sharedVerb} the thing that rule protects.`;
  }
  // Strong topical overlap without a shared verb still deserves a human.
  if (overlap.length >= 2) {
    return `"${cleanRule}" may forbid this (matched on ${overlap.slice(0, 3).join(", ")}).`;
  }
  return null;
}

/**
 * Evaluates every guardrail against an action.
 * Anything that throws is treated as a trip, never as permission.
 */
export function enforceGuardrails(guardrails: unknown, action: string): GuardrailVerdict {
  const rules = normaliseRules(guardrails);
  if (rules.length === 0) return { allowed: true, tripped: [], reasons: [] };

  const tripped: string[] = [];
  const reasons: string[] = [];

  for (const rule of rules) {
    if (rule === UNREADABLE_RULE) {
      tripped.push(rule);
      reasons.push("A guardrail on this coworker could not be read, so the run is held for you.");
      continue;
    }
    try {
      const reason = checkGuardrail(rule, action);
      if (reason) {
        tripped.push(rule);
        reasons.push(reason);
      }
    } catch {
      // A rule we cannot evaluate is a rule we must not ignore.
      tripped.push(rule);
      reasons.push(`"${rule}" could not be evaluated, so the run is held for you.`);
    }
  }

  return { allowed: tripped.length === 0, tripped, reasons };
}

/** A rule we cannot even read still has to reach the owner as a blocker. */
const UNREADABLE_RULE = "[unreadable guardrail]";

/** Coerces one rule to text without letting a hostile value throw. */
function ruleToText(rule: unknown): string {
  try {
    return String(rule).trim();
  } catch {
    return UNREADABLE_RULE;
  }
}

/** Guardrails arrive as string[], {rules: []}, or free text. Accept all. */
export function normaliseRules(guardrails: unknown): string[] {
  if (!guardrails) return [];
  if (Array.isArray(guardrails)) {
    return guardrails.map(ruleToText).filter(Boolean);
  }
  if (typeof guardrails === "string") {
    return guardrails
      .split(/[\n;]+/)
      .map((rule) => rule.trim())
      .filter(Boolean);
  }
  if (typeof guardrails === "object") {
    const record = guardrails as Record<string, unknown>;
    const candidate = record.rules ?? record.guardrails ?? record.items;
    if (candidate) return normaliseRules(candidate);
  }
  return [];
}
