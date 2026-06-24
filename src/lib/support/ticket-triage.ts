/**
 * AI Ticket Triage for Support Department
 * Automatically categorizes, prioritizes, and routes support tickets
 */

export interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  customerId: string;
  customerInfo: CustomerInfo;
  category?: string;
  priority?: string;
  urgency?: string;
  channel: "email" | "chat" | "phone" | "web" | "social";
  attachments: number;
  createdAt: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  assignedTo?: string;
  tags: string[];
}

export interface CustomerInfo {
  id: string;
  name: string;
  email: string;
  tier: "free" | "basic" | "premium" | "enterprise";
  accountAge: number; // days
  previousTickets: number;
  satisfactionScore?: number;
  lastContact?: string;
  subscription?: {
    plan: string;
    status: "active" | "cancelled" | "expired";
    value: number;
  };
}

export interface TriageResult {
  ticketId: string;
  category: TicketCategory;
  priority: TicketPriority;
  urgency: TicketUrgency;
  sentiment: "positive" | "neutral" | "negative" | "angry";
  complexity: "simple" | "moderate" | "complex";
  estimatedResolutionTime: number; // hours
  recommendedAgent?: string;
  autoActions: AutoAction[];
  confidence: number;
  processedAt: string;
}

export interface TicketCategory {
  main: "technical" | "billing" | "feature_request" | "account" | "usage" | "bug_report" | "other";
  subcategory?: string;
  confidence: number;
}

export interface TicketPriority {
  level: "low" | "medium" | "high" | "critical";
  score: number; // 0-100
  factors: PriorityFactor[];
}

export interface PriorityFactor {
  factor: string;
  weight: number;
  value: number;
  description: string;
}

export interface TicketUrgency {
  level: "routine" | "standard" | "urgent" | "emergency";
  score: number; // 0-100
  reasons: string[];
}

export interface AutoAction {
  type: "auto_reply" | "knowledge_base" | "escalate" | "tag" | "assign" | "merge";
  action: string;
  reason: string;
  confidence: number;
}

export interface AgentSkill {
  agentId: string;
  name: string;
  skills: string[];
  currentWorkload: number;
  averageResolutionTime: number;
  satisfactionRate: number;
  specialties: string[];
}

/**
 * Triage a support ticket using AI
 */
export async function triageTicket(
  ticket: SupportTicket,
  agents: AgentSkill[],
  historicalData?: {
    similarTickets: SupportTicket[];
    resolutionPatterns: Record<string, number>;
    customerHistory: Record<string, CustomerInfo>;
  }
): Promise<TriageResult> {
  // Step 1: Analyze ticket content for category
  const category = await categorizeTicket(ticket);
  
  // Step 2: Determine priority based on multiple factors
  const priority = calculatePriority(ticket, category, historicalData);
  
  // Step 3: Assess urgency
  const urgency = assessUrgency(ticket, category, priority);
  
  // Step 4: Analyze sentiment
  const sentiment = analyzeSentiment(ticket);
  
  // Step 5: Estimate complexity
  const complexity = estimateComplexity(ticket, category);
  
  // Step 6: Predict resolution time
  const resolutionTime = estimateResolutionTime(category, priority, complexity, historicalData);
  
  // Step 7: Recommend best agent
  const recommendedAgent = recommendAgent(category, priority, agents);
  
  // Step 8: Generate auto-actions
  const autoActions = generateAutoActions(ticket, category, priority, sentiment);
  
  // Step 9: Calculate overall confidence
  const confidence = calculateTriageConfidence(category, priority, urgency);

  return {
    ticketId: ticket.id,
    category,
    priority,
    urgency,
    sentiment,
    complexity,
    estimatedResolutionTime: resolutionTime,
    recommendedAgent,
    autoActions,
    confidence,
    processedAt: new Date().toISOString(),
  };
}

/**
 * Categorize ticket using AI analysis
 */
async function categorizeTicket(ticket: SupportTicket): Promise<TicketCategory> {
  const content = `${ticket.subject} ${ticket.description}`.toLowerCase();
  
  // Category keywords and patterns
  const categoryPatterns: Record<string, { keywords: string[]; weight: number }> = {
    technical: {
      keywords: ["error", "bug", "crash", "broken", "not working", "issue", "problem", "technical", "system"],
      weight: 1.0,
    },
    billing: {
      keywords: ["payment", "charge", "invoice", "billing", "refund", "credit card", "subscription", "cost"],
      weight: 1.0,
    },
    feature_request: {
      keywords: ["feature", "request", "suggestion", "improve", "add", "enhancement", "would like", "wish"],
      weight: 0.8,
    },
    account: {
      keywords: ["account", "login", "password", "access", "profile", "settings", "authentication"],
      weight: 0.9,
    },
    usage: {
      keywords: ["how to", "help", "tutorial", "guide", "usage", "use", "question", "learn"],
      weight: 0.7,
    },
    bug_report: {
      keywords: ["bug", "glitch", "defect", "issue", "problem", "broken", "not working", "error"],
      weight: 1.0,
    },
  };

  // Score each category
  const categoryScores: Record<string, number> = {};
  
  Object.entries(categoryPatterns).forEach(([category, pattern]) => {
    let score = 0;
    pattern.keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        score += matches.length * pattern.weight;
      }
    });
    categoryScores[category] = score;
  });

  // Find highest scoring category
  const sortedCategories = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b - a);
  
  const topCategory = sortedCategories[0];
  const confidence = Math.min(1, topCategory[1] / 3); // Normalize to 0-1

  return {
    main: topCategory[0] as TicketCategory["main"],
    confidence,
  };
}

/**
 * Calculate ticket priority
 */
function calculatePriority(
  ticket: SupportTicket,
  category: TicketCategory,
  historicalData?: any
): TicketPriority {
  const factors: PriorityFactor[] = [];
  let totalScore = 0;

  // Customer tier factor
  const tierScores: Record<string, number> = {
    enterprise: 30,
    premium: 25,
    basic: 15,
    free: 10,
  };
  
  const tierScore = tierScores[ticket.customerInfo.tier] || 10;
  factors.push({
    factor: "Customer Tier",
    weight: 0.25,
    value: tierScore,
    description: `${ticket.customerInfo.tier} customer`,
  });
  totalScore += tierScore * 0.25;

  // Account value factor
  if (ticket.customerInfo.subscription) {
    const valueScore = Math.min(30, ticket.customerInfo.subscription.value / 100);
    factors.push({
      factor: "Account Value",
      weight: 0.2,
      value: valueScore,
      description: `$${ticket.customerInfo.subscription.value} subscription`,
    });
    totalScore += valueScore * 0.2;
  }

  // Customer history factor
  const previousTickets = ticket.customerInfo.previousTickets;
  let historyScore = 0;
  if (previousTickets === 0) {
    historyScore = 20; // New customer gets higher priority
  } else if (previousTickets > 10) {
    historyScore = 5; // Frequent contact - lower priority
  } else {
    historyScore = 15; // Normal contact
  }
  
  factors.push({
    factor: "Customer History",
    weight: 0.15,
    value: historyScore,
    description: `${previousTickets} previous tickets`,
  });
  totalScore += historyScore * 0.15;

  // Channel factor
  const channelScores: Record<string, number> = {
    phone: 25,
    chat: 20,
    email: 15,
    web: 10,
    social: 5,
  };
  
  const channelScore = channelScores[ticket.channel] || 10;
  factors.push({
    factor: "Channel",
    weight: 0.1,
    value: channelScore,
    description: `Via ${ticket.channel}`,
  });
  totalScore += channelScore * 0.1;

  // Category severity factor
  const categoryScores: Record<string, number> = {
    billing: 25,
    technical: 20,
    bug_report: 20,
    account: 15,
    usage: 10,
    feature_request: 5,
    other: 10,
  };
  
  const categoryScore = categoryScores[category.main] || 10;
  factors.push({
    factor: "Category Severity",
    weight: 0.2,
    value: categoryScore,
    description: `${category.main} issue`,
  });
  totalScore += categoryScore * 0.2;

  // Time factor (business hours)
  const now = new Date();
  const hour = now.getHours();
  let timeScore = 10;
  if (hour < 9 || hour > 17) {
    timeScore = 20; // After hours
  }
  
  factors.push({
    factor: "Time",
    weight: 0.1,
    value: timeScore,
    description: hour < 9 || hour > 17 ? "After hours" : "Business hours",
  });
  totalScore += timeScore * 0.1;

  // Determine priority level
  let level: TicketPriority["level"] = "low";
  if (totalScore >= 80) level = "critical";
  else if (totalScore >= 60) level = "high";
  else if (totalScore >= 40) level = "medium";

  return {
    level,
    score: Math.round(totalScore),
    factors,
  };
}

/**
 * Assess ticket urgency
 */
function assessUrgency(
  ticket: SupportTicket,
  category: TicketCategory,
  priority: TicketPriority
): TicketUrgency {
  const reasons: string[] = [];
  let score = 0;

  // Check for urgent keywords
  const urgentKeywords = [
    "urgent", "emergency", "critical", "asap", "immediately", "broken", "down",
    "can't", "unable", "blocked", "stuck", "lost", "deleted", "hack", "security"
  ];

  const content = `${ticket.subject} ${ticket.description}`.toLowerCase();
  urgentKeywords.forEach(keyword => {
    if (content.includes(keyword)) {
      score += 20;
      reasons.push(`Contains urgent keyword: ${keyword}`);
    }
  });

  // Category-based urgency
  const categoryUrgency: Record<string, number> = {
    billing: 15,
    technical: 20,
    bug_report: 25,
    account: 30,
    usage: 5,
    feature_request: 0,
    other: 10,
  };

  score += categoryUrgency[category.main] || 10;
  if (categoryUrgency[category.main] > 15) {
    reasons.push(`${category.main} issues typically need quick attention`);
  }

  // Priority-based urgency
  if (priority.level === "critical") {
    score += 30;
    reasons.push("Critical priority ticket");
  } else if (priority.level === "high") {
    score += 15;
    reasons.push("High priority ticket");
  }

  // Customer tier urgency
  if (ticket.customerInfo.tier === "enterprise") {
    score += 10;
    reasons.push("Enterprise customer");
  }

  // Determine urgency level
  let level: TicketUrgency["level"] = "routine";
  if (score >= 80) level = "emergency";
  else if (score >= 60) level = "urgent";
  else if (score >= 40) level = "standard";

  return {
    level,
    score,
    reasons,
  };
}

/**
 * Analyze ticket sentiment
 */
function analyzeSentiment(ticket: SupportTicket): "positive" | "neutral" | "negative" | "angry" {
  const content = `${ticket.subject} ${ticket.description}`.toLowerCase();
  
  // Positive indicators
  const positiveWords = ["thank", "thanks", "great", "good", "excellent", "helpful", "appreciate", "love"];
  const positiveCount = positiveWords.filter(word => content.includes(word)).length;
  
  // Negative indicators
  const negativeWords = ["frustrated", "angry", "disappointed", "terrible", "awful", "hate", "worst"];
  const negativeCount = negativeWords.filter(word => content.includes(word)).length;
  
  // Angry indicators
  const angryWords = ["angry", "furious", "outraged", "unacceptable", "ridiculous", "disgrace"];
  const angryCount = angryWords.filter(word => content.includes(word)).length;
  
  // Question marks (indicate confusion/need)
  const questionMarks = (content.match(/\?/g) || []).length;
  
  // Exclamation marks (indicate emotion)
  const exclamationMarks = (content.match(/!/g) || []).length;
  
  // Determine sentiment
  if (angryCount > 0 || negativeCount > 2 || exclamationMarks > 3) {
    return "angry";
  } else if (negativeCount > 0 || questionMarks > 2) {
    return "negative";
  } else if (positiveCount > 0) {
    return "positive";
  } else {
    return "neutral";
  }
}

/**
 * Estimate ticket complexity
 */
function estimateComplexity(
  ticket: SupportTicket,
  category: TicketCategory
): "simple" | "moderate" | "complex" {
  const content = `${ticket.subject} ${ticket.description}`;
  const wordCount = content.split(/\s+/).length;
  
  let complexityScore = 0;
  
  // Length factor
  if (wordCount > 200) complexityScore += 20;
  else if (wordCount > 100) complexityScore += 10;
  
  // Attachments factor
  if (ticket.attachments > 2) complexityScore += 15;
  else if (ticket.attachments > 0) complexityScore += 5;
  
  // Category complexity
  const categoryComplexity: Record<string, number> = {
    technical: 20,
    billing: 15,
    bug_report: 25,
    account: 10,
    usage: 5,
    feature_request: 10,
    other: 15,
  };
  
  complexityScore += categoryComplexity[category.main] || 10;
  
  // Technical indicators
  const technicalIndicators = ["error", "code", "api", "integration", "database", "server"];
  const techCount = technicalIndicators.filter(indicator => 
    content.toLowerCase().includes(indicator)
  ).length;
  
  complexityScore += techCount * 5;
  
  // Determine complexity
  if (complexityScore >= 50) return "complex";
  if (complexityScore >= 25) return "moderate";
  return "simple";
}

/**
 * Estimate resolution time
 */
function estimateResolutionTime(
  category: TicketCategory,
  priority: TicketPriority,
  complexity: "simple" | "moderate" | "complex",
  historicalData?: any
): number {
  let baseTime = 2; // Base 2 hours
  
  // Category adjustments
  const categoryTimes: Record<string, number> = {
    technical: 8,
    billing: 4,
    bug_report: 6,
    account: 2,
    usage: 1,
    feature_request: 3,
    other: 4,
  };
  
  baseTime = categoryTimes[category.main] || baseTime;
  
  // Priority adjustments
  if (priority.level === "critical") baseTime *= 0.5; // Faster for critical
  else if (priority.level === "low") baseTime *= 1.5; // Slower for low priority
  
  // Complexity adjustments
  if (complexity === "complex") baseTime *= 2;
  else if (complexity === "simple") baseTime *= 0.7;
  
  return Math.round(baseTime);
}

/**
 * Recommend best agent for the ticket
 */
function recommendAgent(
  category: TicketCategory,
  priority: TicketPriority,
  agents: AgentSkill[]
): string | undefined {
  // Filter agents by relevant skills
  const relevantSkills = getRelevantSkills(category);
  const qualifiedAgents = agents.filter(agent => 
    relevantSkills.some(skill => agent.skills.includes(skill))
  );
  
  if (qualifiedAgents.length === 0) return undefined;
  
  // Score agents based on multiple factors
  const agentScores = qualifiedAgents.map(agent => {
    let score = 0;
    
    // Workload factor (prefer less busy agents)
    score += Math.max(0, 50 - agent.currentWorkload);
    
    // Satisfaction factor (prefer higher satisfaction)
    score += agent.satisfactionRate * 0.3;
    
    // Resolution time factor (prefer faster agents)
    score += Math.max(0, 30 - agent.averageResolutionTime);
    
    // Specialty match
    const specialtyMatch = relevantSkills.filter(skill => 
      agent.specialties.includes(skill)
    ).length;
    score += specialtyMatch * 10;
    
    return { agent: agent.agentId, score };
  });
  
  // Return agent with highest score
  const bestAgent = agentScores.sort((a, b) => b.score - a.score)[0];
  return bestAgent?.agent;
}

/**
 * Get relevant skills for ticket category
 */
function getRelevantSkills(category: TicketCategory): string[] {
  const skillMap: Record<string, string[]> = {
    technical: ["technical_support", "troubleshooting", "api", "integration"],
    billing: ["billing", "payments", "subscriptions", "refunds"],
    feature_request: ["product_knowledge", "development", "roadmap"],
    account: ["account_management", "authentication", "security"],
    usage: ["customer_success", "training", "onboarding"],
    bug_report: ["technical_support", "quality_assurance", "development"],
    other: ["general_support", "customer_service"],
  };
  
  return skillMap[category.main] || ["general_support"];
}

/**
 * Generate automatic actions
 */
function generateAutoActions(
  ticket: SupportTicket,
  category: TicketCategory,
  priority: TicketPriority,
  sentiment: string
): AutoAction[] {
  const actions: AutoAction[] = [];
  
  // Auto-tag action
  actions.push({
    type: "tag",
    action: `Add tags: ${category.main}, ${priority.level}, ${sentiment}`,
    reason: "Automatic categorization and tagging",
    confidence: 0.9,
  });
  
  // Auto-reply for simple issues
  if (category.main === "usage" && priority.level === "low") {
    actions.push({
      type: "auto_reply",
      action: "Send knowledge base suggestions",
      reason: "Simple usage question - can be resolved with KB",
      confidence: 0.7,
    });
  }
  
  // Escalation for critical issues
  if (priority.level === "critical" || sentiment === "angry") {
    actions.push({
      type: "escalate",
      action: "Escalate to senior support",
      reason: "Critical priority or angry customer",
      confidence: 0.8,
    });
  }
  
  // Knowledge base suggestion
  if (category.main === "usage" || category.main === "account") {
    actions.push({
      type: "knowledge_base",
      action: "Suggest relevant KB articles",
      reason: "Common issue type with existing documentation",
      confidence: 0.6,
    });
  }
  
  return actions;
}

/**
 * Calculate triage confidence
 */
function calculateTriageConfidence(
  category: TicketCategory,
  priority: TicketPriority,
  urgency: TicketUrgency
): number {
  let confidence = 0.7; // Base confidence
  
  // Category confidence
  confidence += category.confidence * 0.3;
  
  // Priority score confidence (higher scores = more confident)
  confidence += (priority.score / 100) * 0.2;
  
  // Urgency confidence (higher scores = more confident)
  confidence += (urgency.score / 100) * 0.1;
  
  return Math.min(0.95, confidence);
}

/**
 * Batch triage multiple tickets
 */
export async function batchTriageTickets(
  tickets: SupportTicket[],
  agents: AgentSkill[],
  historicalData?: any
): Promise<TriageResult[]> {
  const results: TriageResult[] = [];
  
  for (const ticket of tickets) {
    const result = await triageTicket(ticket, agents, historicalData);
    results.push(result);
  }
  
  return results;
}

/**
 * Update triage with new information
 */
export async function updateTriage(
  existingTriage: TriageResult,
  newInfo: {
    customerResponse?: string;
    agentNotes?: string;
    statusChange?: string;
  }
): Promise<TriageResult> {
  // In a real implementation, this would re-analyze with new information
  return {
    ...existingTriage,
    processedAt: new Date().toISOString(),
  };
}
