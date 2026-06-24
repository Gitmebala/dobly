/**
 * Automated Proposal Generation for Sales Department
 * Creates personalized proposals from templates and client data
 */

import { humanizeText } from "@/lib/ai/humanizer";
import { generateAntiAISystemPrompt } from "@/lib/ai/prompt-engineering";
import { estimateCapabilityCost } from "@/lib/billing/cost-catalog";
import { failedProviderCharge } from "@/lib/billing/economy-core";
import { reserveOperatingCapacity, settleOperatingCapacity } from "@/lib/billing/economy";

export interface ProposalBillingContext {
  userId: string;
  workspaceId?: string | null;
  coworkerId?: string | null;
  runId?: string | null;
  approvedCost?: boolean;
}

export interface ProposalRequest {
  clientId: string;
  clientInfo: ClientInfo;
  projectScope: ProjectScope;
  pricing: PricingInfo;
  timeline: TimelineInfo;
  customizations?: ProposalCustomization;
  templateId?: string;
  billing?: ProposalBillingContext;
}

export interface ClientInfo {
  name: string;
  industry: string;
  companySize: string;
  location: string;
  contactPerson: string;
  painPoints: string[];
  goals: string[];
  budget?: string;
  decisionMaker: string;
}

export interface ProjectScope {
  services: Service[];
  deliverables: Deliverable[];
  objectives: string[];
  requirements: string[];
  assumptions: string[];
  exclusions: string[];
}

export interface Service {
  name: string;
  description: string;
  hours?: number;
  rate?: number;
  category: string;
}

export interface Deliverable {
  name: string;
  description: string;
  quantity: number;
  unit: string;
  deliveryDate?: string;
}

export interface PricingInfo {
  currency: string;
  paymentTerms: string;
  discount?: number;
  taxes: number;
  totalValue: number;
  breakdown: PricingBreakdown[];
}

export interface PricingBreakdown {
  item: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface TimelineInfo {
  startDate: string;
  endDate: string;
  phases: Phase[];
  milestones: Milestone[];
}

export interface Phase {
  name: string;
  duration: string;
  description: string;
  deliverables: string[];
}

export interface Milestone {
  name: string;
  date: string;
  description: string;
  deliverables: string[];
}

export interface ProposalCustomization {
  tone: "formal" | "friendly" | "technical" | "executive";
  includeExecutiveSummary: boolean;
  includeCaseStudies: boolean;
  includeTeamInfo: boolean;
  brandColors?: string[];
  logo?: string;
}

export interface GeneratedProposal {
  id: string;
  clientId: string;
  title: string;
  sections: ProposalSection[];
  metadata: ProposalMetadata;
  generatedAt: string;
  status: "draft" | "review" | "approved" | "sent";
}

export interface ProposalSection {
  type: "cover" | "executive_summary" | "introduction" | "scope" | "timeline" | "pricing" | "terms" | "next_steps" | "appendix";
  title: string;
  content: string;
  order: number;
  subsections?: ProposalSubsection[];
}

export interface ProposalSubsection {
  title: string;
  content: string;
  order: number;
}

export interface ProposalMetadata {
  totalPages: number;
  wordCount: number;
  estimatedValue: number;
  probability: number;
  confidence: number;
  customizations: ProposalCustomization;
}

/**
 * Generate a complete proposal
 */
export async function generateProposal(request: ProposalRequest): Promise<GeneratedProposal> {
  const provider = process.env.ANTHROPIC_API_KEY ? "anthropic" : process.env.GROQ_API_KEY ? "groq" : null;
  const estimate = provider
    ? estimateCapabilityCost({
        capability: provider === "anthropic" ? "ai.reasoning" : "ai.routine",
        quantity: 7,
        preferredProvider: provider === "anthropic" ? "anthropic" : undefined,
      })
    : null;
  let reservation: { id: string } | null = null;
  if (request.billing && estimate) {
    reservation = await reserveOperatingCapacity({
      userId: request.billing.userId,
      workspaceId: request.billing.workspaceId ?? null,
      capability: estimate.route.capability,
      provider: provider!,
      estimatedMinor: estimate.estimatedMinor,
      idempotencyKey: `proposal:${request.billing.runId ?? request.clientId}`,
      runId: request.billing.runId ?? null,
      coworkerId: request.billing.coworkerId ?? null,
      metadata: { clientId: request.clientId, approvedCost: Boolean(request.billing.approvedCost) },
    });
  }

  try {
  // Step 1: Select and prepare template
  const template = await selectProposalTemplate(request.templateId, request.customizations);
  
  // Step 2: Generate executive summary
  const executiveSummary = await generateExecutiveSummary(request);
  
  // Step 3: Create introduction
  const introduction = await generateIntroduction(request);
  
  // Step 4: Detail project scope
  const scope = await generateScopeSection(request.projectScope, request.clientInfo);
  
  // Step 5: Create timeline
  const timeline = await generateTimelineSection(request.timeline);
  
  // Step 6: Generate pricing section
  const pricing = await generatePricingSection(request.pricing, request.projectScope);
  
  // Step 7: Create terms and conditions
  const terms = await generateTermsSection(request);
  
  // Step 8: Generate next steps
  const nextSteps = await generateNextSteps(request);
  
  // Step 9: Add appendix if needed
  const appendix = await generateAppendix(request);
  
  // Step 10: Assemble all sections
  const sections = assembleProposalSections({
    executiveSummary,
    introduction,
    scope,
    timeline,
    pricing,
    terms,
    nextSteps,
    appendix,
  }, request.customizations);
  
  // Step 11: Generate metadata
  const metadata = generateProposalMetadata(sections, request);
  
  const proposal = {
    id: `proposal-${Date.now()}`,
    clientId: request.clientId,
    title: generateProposalTitle(request),
    sections,
    metadata,
    generatedAt: new Date().toISOString(),
    status: "draft",
  } satisfies GeneratedProposal;
  if (reservation?.id && estimate) {
    await settleOperatingCapacity({
      reservationId: reservation.id,
      actualMinor: estimate.estimatedMinor,
      status: "succeeded",
      metadata: { proposalId: proposal.id, provider },
    });
  }
  return proposal;
  } catch (error) {
    if (reservation?.id && estimate) {
      const message = error instanceof Error ? error.message : "Proposal generation failed.";
      await settleOperatingCapacity({
        reservationId: reservation.id,
        actualMinor: failedProviderCharge({
          paidRail: estimate.route.paidRail,
          estimatedMinor: estimate.estimatedMinor,
          errorMessage: message,
        }),
        status: "failed",
        metadata: { error: message, provider },
      }).catch(() => undefined);
    }
    throw error;
  }
}

/**
 * Select appropriate proposal template
 */
async function selectProposalTemplate(
  templateId?: string,
  customizations?: ProposalCustomization
): Promise<ProposalTemplate> {
  // In a real implementation, this would fetch from a template database
  const defaultTemplate: ProposalTemplate = {
    id: "standard",
    name: "Standard Proposal",
    sections: [
      "cover",
      "executive_summary",
      "introduction",
      "scope",
      "timeline",
      "pricing",
      "terms",
      "next_steps",
    ],
    tone: "professional",
    includeBranding: true,
  };

  return defaultTemplate;
}

interface ProposalTemplate {
  id: string;
  name: string;
  sections: string[];
  tone: string;
  includeBranding: boolean;
}

function estimateProbability(request: ProposalRequest) {
  let score = 0.45;
  if (request.clientInfo.budget) score += 0.08;
  if (request.clientInfo.goals.length >= 2) score += 0.06;
  if (request.projectScope.objectives.length >= 2) score += 0.06;
  if (request.pricing.totalValue > 0) score += 0.05;
  return Math.max(0.35, Math.min(0.9, Number(score.toFixed(2))));
}

function proposalFallback(prompt: string) {
  const lines = prompt
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  const factual = lines.filter((line) =>
    /^(-|\*\*|Client:|Project:|Total|Timeline:|Project Period:|Services|Deliverables|Requirements|Assumptions|Exclusions|Pricing Breakdown|Contact person:|Decision maker:)/i.test(line),
  );
  return (factual.length > 0 ? factual.slice(0, 8) : lines.slice(0, 5)).join("\n");
}

/**
 * Generate executive summary
 */
async function generateExecutiveSummary(request: ProposalRequest): Promise<ProposalSection> {
  const prompt = `Write an executive summary for a business proposal with the following details:

Client: ${request.clientInfo.name} (${request.clientInfo.industry})
Project: ${request.projectScope.services.map(s => s.name).join(", ")}
Total Value: ${request.pricing.currency} ${request.pricing.totalValue.toLocaleString()}
Timeline: ${request.timeline.startDate} to ${request.timeline.endDate}

Key Client Pain Points:
${request.clientInfo.painPoints.map(p => `- ${p}`).join('\n')}

Client Goals:
${request.clientInfo.goals.map(g => `- ${g}`).join('\n')}

Project Objectives:
${request.projectScope.objectives.map(o => `- ${o}`).join('\n')}

Write a compelling executive summary that:
- Shows understanding of client needs
- Highlights value proposition
- Summarizes key benefits
- Creates urgency and excitement
- Is professional but engaging
- Avoids corporate jargon
- Sounds human and authentic

Keep it to 150-200 words maximum.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "direct",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "executive_summary",
    title: "Executive Summary",
    content: humanizedContent,
    order: 2,
  };
}

/**
 * Generate introduction
 */
async function generateIntroduction(request: ProposalRequest): Promise<ProposalSection> {
  const prompt = `Write an introduction for a proposal to ${request.clientInfo.name}.

About the client:
- Industry: ${request.clientInfo.industry}
- Company size: ${request.clientInfo.companySize}
- Location: ${request.clientInfo.location}
- Contact: ${request.clientInfo.contactPerson}

Their pain points:
${request.clientInfo.painPoints.map(p => `- ${p}`).join('\n')}

Their goals:
${request.clientInfo.goals.map(g => `- ${g}`).join('\n')}

Write an introduction that:
- Shows you understand their business
- Acknowledges their challenges
- Positions your company as the solution
- Builds trust and credibility
- Is warm and professional
- Avoids generic language
- Sounds like a real business conversation

Keep it to 200-250 words.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "friendly",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "introduction",
    title: "Introduction",
    content: humanizedContent,
    order: 3,
  };
}

/**
 * Generate scope section
 */
async function generateScopeSection(
  scope: ProjectScope,
  clientInfo: ClientInfo
): Promise<ProposalSection> {
  const servicesText = scope.services.map(service => 
    `**${service.name}**: ${service.description}`
  ).join('\n\n');

  const deliverablesText = scope.deliverables.map(deliverable => 
    `- ${deliverable.name} (${deliverable.quantity} ${deliverable.unit})`
  ).join('\n');

  const objectivesText = scope.objectives.map(obj => `- ${obj}`).join('\n');

  const prompt = `Write a detailed scope of work section for ${clientInfo.name}.

Services to be provided:
${servicesText}

Deliverables:
${deliverablesText}

Project objectives:
${objectivesText}

Requirements:
${scope.requirements.map(r => `- ${r}`).join('\n')}

Assumptions:
${scope.assumptions.map(a => `- ${a}`).join('\n')}

Exclusions (what's not included):
${scope.exclusions.map(e => `- ${e}`).join('\n')}

Write a scope section that:
- Clearly defines what will be delivered
- Sets realistic expectations
- Protects both parties with clear boundaries
- Uses clear, simple language
- Avoids technical jargon unless necessary
- Sounds confident and professional
- Is well-organized and easy to read

Structure with clear subheadings for each category.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "direct",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "scope",
    title: "Scope of Work",
    content: humanizedContent,
    order: 4,
  };
}

/**
 * Generate timeline section
 */
async function generateTimelineSection(timeline: TimelineInfo): Promise<ProposalSection> {
  const phasesText = timeline.phases.map(phase => 
    `**${phase.name}** (${phase.duration}): ${phase.description}`
  ).join('\n\n');

  const milestonesText = timeline.milestones.map(milestone => 
    `- **${milestone.name}** (${milestone.date}): ${milestone.description}`
  ).join('\n');

  const prompt = `Write a project timeline section with the following details:

Project Period: ${timeline.startDate} to ${timeline.endDate}

Project Phases:
${phasesText}

Key Milestones:
${milestonesText}

Write a timeline section that:
- Shows clear project progression
- Highlights important dates and deliverables
- Builds confidence in your ability to deliver
- Is realistic and achievable
- Uses clear timeframes
- Sounds organized and professional
- Creates excitement about the project journey

Include the phases and milestones in a well-structured format.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "direct",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "timeline",
    title: "Project Timeline",
    content: humanizedContent,
    order: 5,
  };
}

/**
 * Generate pricing section
 */
async function generatePricingSection(
  pricing: PricingInfo,
  scope: ProjectScope
): Promise<ProposalSection> {
  const breakdownText = pricing.breakdown.map(item => 
    `${item.item}: ${item.quantity} × ${pricing.currency} ${item.rate.toLocaleString()} = ${pricing.currency} ${item.total.toLocaleString()}`
  ).join('\n');

  const prompt = `Write a pricing section for a proposal with the following details:

Total Investment: ${pricing.currency} ${pricing.totalValue.toLocaleString()}
Payment Terms: ${pricing.paymentTerms}
Taxes: ${pricing.taxes}%
${pricing.discount ? `Discount: ${pricing.discount}%` : ''}

Pricing Breakdown:
${breakdownText}

Services included:
${scope.services.map(s => `- ${s.name}: ${s.description}`).join('\n')}

Write a pricing section that:
- Clearly presents the investment
- Justifies the value
- Makes the price feel reasonable
- Is transparent about all costs
- Sounds confident in the value proposition
- Avoids apologetic language about pricing
- Creates urgency to invest
- Is professional and clear

Include the breakdown in a clear, easy-to-read format.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "direct",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "pricing",
    title: "Investment",
    content: humanizedContent,
    order: 6,
  };
}

/**
 * Generate terms and conditions
 */
async function generateTermsSection(request: ProposalRequest): Promise<ProposalSection> {
  const prompt = `Write terms and conditions for a proposal to ${request.clientInfo.name}.

Include standard business terms covering:
- Payment schedule and terms
- Project acceptance criteria
- Change request process
- Confidentiality and data protection
- Termination clauses
- Intellectual property rights
- Limitation of liability
- Dispute resolution

Write terms that:
- Are clear and understandable
- Protect both parties fairly
- Sound professional but not overly legalistic
- Are reasonable and standard for the industry
- Build trust through transparency
- Avoid intimidating legal language
- Are comprehensive but concise

Keep it professional and balanced.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "direct",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "terms",
    title: "Terms and Conditions",
    content: humanizedContent,
    order: 7,
  };
}

/**
 * Generate next steps section
 */
async function generateNextSteps(request: ProposalRequest): Promise<ProposalSection> {
  const prompt = `Write a "next steps" section for a proposal to ${request.clientInfo.name}.

Contact person: ${request.clientInfo.contactPerson}
Decision maker: ${request.clientInfo.decisionMaker}

Write next steps that:
- Create urgency to move forward
- Make it easy to say yes
- Provide clear action items
- Show enthusiasm about working together
- Remove barriers to getting started
- Sound confident and proactive
- Include specific dates and timelines
- End on a high note

Include steps like:
1. Proposal review and approval
2. Contract signing
3. Project kickoff
4. First deliverable

Make it compelling and action-oriented.`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: "professional",
    personality: "friendly",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    type: "next_steps",
    title: "Next Steps",
    content: humanizedContent,
    order: 8,
  };
}

/**
 * Generate appendix (optional)
 */
async function generateAppendix(request: ProposalRequest): Promise<ProposalSection | null> {
  if (!request.customizations?.includeCaseStudies && !request.customizations?.includeTeamInfo) {
    return null;
  }

  let content = "";

  if (request.customizations?.includeTeamInfo) {
    content += "## Our Team\n\n";
    content += "Our experienced team is dedicated to delivering exceptional results. ";
    content += "Each member brings specialized expertise and a commitment to your success.\n\n";
  }

  if (request.customizations?.includeCaseStudies) {
    content += "## Case Studies\n\n";
    content += "We've helped similar companies achieve remarkable results. ";
    content += "Recent projects include:\n";
    content += "- Increased efficiency by 40% for a manufacturing client\n";
    content += "- Reduced costs by 25% for a retail company\n";
    content += "- Improved customer satisfaction by 35% for a service provider\n\n";
  }

  return {
    type: "appendix",
    title: "Appendix",
    content,
    order: 9,
  };
}

/**
 * Assemble all proposal sections
 */
function assembleProposalSections(
  sections: {
    executiveSummary: ProposalSection;
    introduction: ProposalSection;
    scope: ProposalSection;
    timeline: ProposalSection;
    pricing: ProposalSection;
    terms: ProposalSection;
    nextSteps: ProposalSection;
    appendix: ProposalSection | null;
  },
  customizations?: ProposalCustomization
): ProposalSection[] {
  const allSections: ProposalSection[] = [
    {
      type: "cover",
      title: "Proposal Cover",
      content: generateCoverContent(),
      order: 1,
    },
    sections.executiveSummary,
    sections.introduction,
    sections.scope,
    sections.timeline,
    sections.pricing,
    sections.terms,
    sections.nextSteps,
  ];

  if (sections.appendix) {
    allSections.push(sections.appendix);
  }

  // Sort by order
  return allSections.sort((a, b) => a.order - b.order);
}

/**
 * Generate cover content
 */
function generateCoverContent(): string {
  return `
# PROPOSAL

## [Project Title]

**Prepared for:** [Client Name]  
**Date:** [Current Date]  
**Prepared by:** [Your Company Name]  
**Contact:** [Your Contact Information]

---
  `.trim();
}

/**
 * Generate proposal title
 */
function generateProposalTitle(request: ProposalRequest): string {
  const serviceNames = request.projectScope.services.map(s => s.name).slice(0, 2).join(" & ");
  return `Proposal for ${serviceNames} Services`;
}

/**
 * Generate proposal metadata
 */
function generateProposalMetadata(
  sections: ProposalSection[],
  request: ProposalRequest
): ProposalMetadata {
  const wordCount = sections.reduce((sum, section) => sum + section.content.split(/\s+/).length, 0);
  const totalPages = Math.ceil(wordCount / 250); // Approximate 250 words per page

  return {
    totalPages,
    wordCount,
    estimatedValue: request.pricing.totalValue,
    probability: estimateProbability(request),
    confidence: request.projectScope.requirements.length > 0 ? 0.86 : 0.74,
    customizations: request.customizations || {
      tone: "formal",
      includeExecutiveSummary: true,
      includeCaseStudies: false,
      includeTeamInfo: false,
    },
  };
}

/**
 * Generate content using AI
 */
async function generateContentWithAI(prompt: string): Promise<string> {
  const system = generateAntiAISystemPrompt({
    personality: "professional",
    tone: "direct",
    complexity: "moderate",
    constraints: [
      "Write proposal-ready business content.",
      "Do not use AI disclaimers or meta commentary.",
      "Stay grounded in the client facts provided.",
      "Do not invent case studies, metrics, or legal promises that were not supplied.",
    ],
  });

  if (process.env.ANTHROPIC_API_KEY) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.DOBLY_PREMIUM_MODEL || "claude-sonnet-4-20250514",
        max_tokens: 900,
        system,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json().catch(() => null) as
      | { content?: Array<{ type?: string; text?: string }> }
      | null;
    if (response.ok) {
      const text = (data?.content ?? [])
        .filter((item) => item.type === "text" && typeof item.text === "string")
        .map((item) => item.text?.trim())
        .filter(Boolean)
        .join("\n\n");
      if (text) return text;
    }
  }

  if (process.env.GROQ_API_KEY) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.DOBLY_GENERATION_MODEL || process.env.DOBLY_STANDARD_MODEL || "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 900,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt },
        ],
      }),
    });

    const data = await response.json().catch(() => null) as
      | { choices?: Array<{ message?: { content?: string } }> }
      | null;
    const text = data?.choices?.[0]?.message?.content?.trim();
    if (response.ok && text) return text;
  }

  return proposalFallback(prompt);
}

/**
 * Generate proposal variations
 */
export async function generateProposalVariations(
  request: ProposalRequest,
  variations: number = 3
): Promise<GeneratedProposal[]> {
  const proposals: GeneratedProposal[] = [];

  const tones: ProposalCustomization["tone"][] = ["formal", "friendly", "technical"];
  
  for (let i = 0; i < variations; i++) {
    const variationRequest: ProposalRequest = {
      ...request,
      customizations: {
        includeExecutiveSummary: request.customizations?.includeExecutiveSummary ?? true,
        includeCaseStudies: request.customizations?.includeCaseStudies ?? false,
        includeTeamInfo: request.customizations?.includeTeamInfo ?? false,
        brandColors: request.customizations?.brandColors,
        logo: request.customizations?.logo,
        tone: tones[i % tones.length],
      },
    };

    const proposal = await generateProposal(variationRequest);
    proposals.push(proposal);
  }

  return proposals;
}

/**
 * Update proposal with client feedback
 */
export async function updateProposalWithFeedback(
  proposal: GeneratedProposal,
  feedback: string,
  sectionType?: ProposalSection["type"]
): Promise<GeneratedProposal> {
  const updatedSections = await Promise.all(proposal.sections.map(async (section) => {
    if (!sectionType || section.type === sectionType) {
      const prompt = `Update the following proposal section based on client feedback:

Current content:
${section.content}

Client feedback:
${feedback}

Update the content to address the feedback while maintaining:
- Professional tone
- Clear messaging
- Value proposition focus
- Client-centric language

Keep the same section structure and purpose.`;

      // Generate updated content
      const updatedContent = await generateContentWithAI(prompt);
      const humanizedContent = humanizeText(updatedContent, {
        formality: "professional",
        personality: "direct",
        avoidAIVocabulary: true,
        reduceComplexity: true,
      });

      return {
        ...section,
        content: humanizedContent,
      };
    }
    return section;
  }));

  return {
    ...proposal,
    sections: updatedSections,
    status: "review",
  };
}
