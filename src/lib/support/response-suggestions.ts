/**
 * Automated Response Suggestions for Support Department
 * Generates context-aware, human-like responses for customer support
 */

import { humanizeText } from "@/lib/ai/humanizer";
import { generateAntiAISystemPrompt } from "@/lib/ai/prompt-engineering";

export interface ResponseRequest {
  ticketId: string;
  customerMessage: string;
  customerInfo: {
    name: string;
    tier: "free" | "basic" | "premium" | "enterprise";
    language?: string;
    timezone?: string;
    previousInteractions?: number;
    satisfactionScore?: number;
  };
  context: {
    category: string;
    priority: string;
    urgency: string;
    sentiment: string;
    channel: "email" | "chat" | "phone" | "web" | "social";
  };
  agentInfo: {
    name: string;
    role: string;
    expertise: string[];
    tone: "formal" | "friendly" | "technical" | "empathetic";
  };
  brandVoice?: {
    personality: string;
    values: string[];
    forbiddenWords: string[];
  };
}

export interface ResponseSuggestion {
  id: string;
  type: "template" | "personalized" | "escalation" | "kb_suggestion";
  content: string;
  tone: string;
  confidence: number;
  reasoning: string;
  variables: ResponseVariable[];
  followUpActions: string[];
  estimatedResolutionTime?: number;
}

export interface ResponseVariable {
  name: string;
  type: "customer_name" | "product_name" | "date" | "number" | "custom";
  value: string;
  required: boolean;
}

export interface KnowledgeBaseMatch {
  article: {
    id: string;
    title: string;
    content: string;
    category: string;
    relevance: number;
  };
  suggestion: string;
  confidence: number;
}

/**
 * Generate response suggestions for a support ticket
 */
export async function generateResponseSuggestions(
  request: ResponseRequest,
  knowledgeBase?: any[]
): Promise<ResponseSuggestion[]> {
  const suggestions: ResponseSuggestion[] = [];

  // Step 1: Analyze customer message for intent and key information
  const messageAnalysis = analyzeCustomerMessage(request.customerMessage);
  
  // Step 2: Search knowledge base for relevant articles
  const kbMatches = await searchKnowledgeBase(request.customerMessage, knowledgeBase);
  
  // Step 3: Generate template-based response
  const templateResponse = await generateTemplateResponse(request, messageAnalysis);
  suggestions.push(templateResponse);
  
  // Step 4: Generate personalized response
  const personalizedResponse = await generatePersonalizedResponse(request, messageAnalysis, kbMatches);
  suggestions.push(personalizedResponse);
  
  // Step 5: Generate knowledge base suggestion if relevant
  if (kbMatches.length > 0) {
    const kbSuggestion = generateKnowledgeBaseSuggestion(kbMatches[0], request);
    suggestions.push(kbSuggestion);
  }
  
  // Step 6: Generate escalation response if needed
  if (request.context.priority === "critical" || request.context.sentiment === "angry") {
    const escalationResponse = generateEscalationResponse(request);
    suggestions.push(escalationResponse);
  }
  
  // Step 7: Generate follow-up response options
  const followUpResponses = await generateFollowUpResponses(request, messageAnalysis);
  suggestions.push(...followUpResponses);

  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Analyze customer message for intent and key information
 */
function analyzeCustomerMessage(message: string): {
  intent: string;
  entities: Record<string, string>;
  sentiment: string;
  urgency: string;
  questions: string[];
} {
  const lowerMessage = message.toLowerCase();
  
  // Extract intent
  let intent = "general_inquiry";
  if (lowerMessage.includes("help") || lowerMessage.includes("how to")) {
    intent = "help_request";
  } else if (lowerMessage.includes("error") || lowerMessage.includes("broken")) {
    intent = "technical_issue";
  } else if (lowerMessage.includes("billing") || lowerMessage.includes("payment")) {
    intent = "billing_inquiry";
  } else if (lowerMessage.includes("cancel") || lowerMessage.includes("refund")) {
    intent = "cancellation_request";
  }
  
  // Extract entities (simplified)
  const entities: Record<string, string> = {};
  
  // Product names
  const productNames = ["product_a", "product_b", "service_x"];
  productNames.forEach(product => {
    if (lowerMessage.includes(product)) {
      entities.product = product;
    }
  });
  
  // Dates
  const dateMatch = message.match(/\d{1,2}\/\d{1,2}\/\d{4}/);
  if (dateMatch) {
    entities.date = dateMatch[0];
  }
  
  // Numbers (order IDs, amounts)
  const numberMatch = message.match(/\b\d+\b/g);
  if (numberMatch) {
    entities.number = numberMatch[0];
  }
  
  // Extract questions
  const questionMatches = message.match(/[^.!?]*\?[^.!?]*/g) || [];
  const questions = questionMatches.map(q => q.trim()).filter(q => q.length > 5);
  
  // Determine sentiment
  let sentiment = "neutral";
  const positiveWords = ["thank", "great", "good", "helpful", "appreciate"];
  const negativeWords = ["frustrated", "angry", "terrible", "awful", "hate"];
  
  if (negativeWords.some(word => lowerMessage.includes(word))) {
    sentiment = "negative";
  } else if (positiveWords.some(word => lowerMessage.includes(word))) {
    sentiment = "positive";
  }
  
  // Determine urgency
  let urgency = "normal";
  const urgentWords = ["urgent", "asap", "immediately", "emergency", "critical"];
  if (urgentWords.some(word => lowerMessage.includes(word))) {
    urgency = "high";
  }

  return {
    intent,
    entities,
    sentiment,
    urgency,
    questions,
  };
}

/**
 * Search knowledge base for relevant articles
 */
async function searchKnowledgeBase(
  query: string,
  knowledgeBase?: any[]
): Promise<KnowledgeBaseMatch[]> {
  if (!knowledgeBase || knowledgeBase.length === 0) {
    return [];
  }

  const matches: KnowledgeBaseMatch[] = [];
  const queryWords = query.toLowerCase().split(/\s+/);

  knowledgeBase.forEach(article => {
    const articleContent = `${article.title} ${article.content}`.toLowerCase();
    let relevanceScore = 0;

    // Calculate relevance based on word overlap
    queryWords.forEach(word => {
      if (articleContent.includes(word)) {
        relevanceScore += 1;
      }
    });

    // Normalize relevance score
    const normalizedRelevance = Math.min(1, relevanceScore / queryWords.length);

    if (normalizedRelevance > 0.3) { // Threshold for relevance
      matches.push({
        article: {
          ...article,
          relevance: normalizedRelevance,
        },
        suggestion: `Based on your question, you might find this helpful: ${article.title}`,
        confidence: normalizedRelevance,
      });
    }
  });

  return matches.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
}

/**
 * Generate template-based response
 */
async function generateTemplateResponse(
  request: ResponseRequest,
  analysis: ReturnType<typeof analyzeCustomerMessage>
): Promise<ResponseSuggestion> {
  const templates = getResponseTemplates(request.context.category, request.context.sentiment);
  const template = templates[0] || templates.default;

  let content = template.content;
  
  // Replace variables
  content = content.replace(/\{customer_name\}/g, request.customerInfo.name);
  content = content.replace(/\{agent_name\}/g, request.agentInfo.name);
  
  if (analysis.entities.product) {
    content = content.replace(/\{product\}/g, analysis.entities.product);
  }

  // Apply brand voice and humanization
  content = humanizeText(content, {
    formality: request.agentInfo.tone === "formal" ? "professional" : "casual",
    personality: request.agentInfo.tone,
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    id: `template-${Date.now()}`,
    type: "template",
    content,
    tone: request.agentInfo.tone,
    confidence: 0.7,
    reasoning: `Template response for ${request.context.category} with ${request.context.sentiment} sentiment`,
    variables: [
      { name: "customer_name", type: "customer_name", value: request.customerInfo.name, required: true },
      { name: "agent_name", type: "custom", value: request.agentInfo.name, required: true },
    ],
    followUpActions: ["Wait for customer response", "Follow up in 24 hours if no response"],
    estimatedResolutionTime: 24,
  };
}

/**
 * Generate personalized response
 */
async function generatePersonalizedResponse(
  request: ResponseRequest,
  analysis: ReturnType<typeof analyzeCustomerMessage>,
  kbMatches: KnowledgeBaseMatch[]
): Promise<ResponseSuggestion> {
  const prompt = `Generate a personalized customer support response with the following details:

Customer: ${request.customerInfo.name} (${request.customerInfo.tier} tier)
Channel: ${request.context.channel}
Issue: ${request.context.category}
Priority: ${request.context.priority}
Sentiment: ${request.context.sentiment}
Intent: ${analysis.intent}

Customer Message: "${request.customerMessage}"

Agent: ${request.agentInfo.name} (${request.agentInfo.role})
Agent Tone: ${request.agentInfo.tone}
Agent Expertise: ${request.agentInfo.expertise.join(", ")}

${kbMatches.length > 0 ? `Relevant Knowledge Base: ${kbMatches[0].article.title}` : ""}

Requirements:
- Address the customer by name
- Acknowledge their specific issue
- Show empathy for their situation
- Provide a clear solution or next step
- Use ${request.agentInfo.tone} tone
- Be helpful and professional
- Avoid corporate jargon
- Sound like a real person, not AI
- Include specific details from their message
- Keep it concise but comprehensive

${request.customerInfo.tier === "enterprise" ? "This is an enterprise customer - provide premium service." : ""}
${request.context.sentiment === "angry" ? "Customer is angry - use calming, empathetic language." : ""}
${request.context.priority === "critical" ? "This is critical - provide immediate assistance." : ""}`;

  const content = await generateContentWithAI(prompt);
  const humanizedContent = humanizeText(content, {
    formality: request.agentInfo.tone === "formal" ? "professional" : "casual",
    personality: request.agentInfo.tone,
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });

  return {
    id: `personalized-${Date.now()}`,
    type: "personalized",
    content: humanizedContent,
    tone: request.agentInfo.tone,
    confidence: 0.85,
    reasoning: `Personalized response based on customer message analysis and agent expertise`,
    variables: [
      { name: "customer_name", type: "customer_name", value: request.customerInfo.name, required: true },
    ],
    followUpActions: [
      "Monitor for customer response",
      "Check if issue is resolved in follow-up",
      "Document solution for future reference",
    ],
    estimatedResolutionTime: estimateResolutionTime(request.context.priority, analysis.intent),
  };
}

/**
 * Generate knowledge base suggestion
 */
function generateKnowledgeBaseSuggestion(
  kbMatch: KnowledgeBaseMatch,
  request: ResponseRequest
): ResponseSuggestion {
  const content = `Hi ${request.customerInfo.name},

I found a helpful resource that might answer your question: "${kbMatch.article.title}"

${kbMatch.article.content.substring(0, 200)}...

Would you like me to elaborate on any part of this, or does this help resolve your issue?

Best regards,
${request.agentInfo.name}`;

  return {
    id: `kb-${Date.now()}`,
    type: "kb_suggestion",
    content,
    tone: request.agentInfo.tone,
    confidence: kbMatch.confidence,
    reasoning: `Knowledge base article with ${Math.round(kbMatch.confidence * 100)}% relevance`,
    variables: [
      { name: "customer_name", type: "customer_name", value: request.customerInfo.name, required: true },
      { name: "agent_name", type: "custom", value: request.agentInfo.name, required: true },
    ],
    followUpActions: ["Track if customer finds KB helpful", "Update KB based on feedback"],
    estimatedResolutionTime: 2,
  };
}

/**
 * Generate escalation response
 */
function generateEscalationResponse(request: ResponseRequest): ResponseSuggestion {
  const content = `Hi ${request.customerInfo.name},

I understand this is ${request.context.priority === "critical" ? "critical" : "important"} to you, and I'm here to help resolve this quickly.

I'm escalating this to our senior support team who specialize in ${request.context.category} issues. You can expect a response within the next hour.

In the meantime, is there anything I can help clarify or any additional information that would help our team assist you better?

Thank you for your patience.

Best regards,
${request.agentInfo.name}`;

  return {
    id: `escalation-${Date.now()}`,
    type: "escalation",
    content,
    tone: "empathetic",
    confidence: 0.9,
    reasoning: "Escalation response for high-priority or angry customer",
    variables: [
      { name: "customer_name", type: "customer_name", value: request.customerInfo.name, required: true },
      { name: "agent_name", type: "custom", value: request.agentInfo.name, required: true },
    ],
    followUpActions: [
      "Escalate to senior support",
      "Monitor escalation progress",
      "Follow up with customer after escalation",
    ],
    estimatedResolutionTime: 1,
  };
}

/**
 * Generate follow-up response options
 */
async function generateFollowUpResponses(
  request: ResponseRequest,
  analysis: ReturnType<typeof analyzeCustomerMessage>
): Promise<ResponseSuggestion[]> {
  const responses: ResponseSuggestion[] = [];

  // Quick acknowledgment
  responses.push({
    id: `ack-${Date.now()}`,
    type: "template",
    content: `Hi ${request.customerInfo.name}, thanks for reaching out. I'm looking into your ${request.context.category} issue and will get back to you shortly.`,
    tone: "friendly",
    confidence: 0.6,
    reasoning: "Quick acknowledgment while investigating",
    variables: [
      { name: "customer_name", type: "customer_name", value: request.customerInfo.name, required: true },
    ],
    followUpActions: ["Investigate issue", "Provide detailed response"],
  });

  // Request more information
  if (analysis.questions.length === 0 && analysis.intent === "technical_issue") {
    responses.push({
      id: `info-${Date.now()}`,
      type: "template",
      content: `Hi ${request.customerInfo.name}, to help me resolve this issue better, could you provide:
- What exactly were you doing when this happened?
- Any error messages you saw?
- When did this start?`,
      tone: "technical",
      confidence: 0.7,
      reasoning: "Requesting more information for technical issue",
      variables: [
        { name: "customer_name", type: "customer_name", value: request.customerInfo.name, required: true },
      ],
      followUpActions: ["Wait for customer details", "Analyze provided information"],
    });
  }

  return responses;
}

/**
 * Get response templates by category and sentiment
 */
function getResponseTemplates(
  category: string,
  sentiment: string
): Record<string, { content: string; tone: string }> {
  const templates: Record<string, Record<string, { content: string; tone: string }>> = {
    technical: {
      neutral: {
        content: "Hi {customer_name}, I understand you're experiencing a technical issue. I'm here to help you resolve this. Could you provide more details about what you're seeing?",
        tone: "technical",
      },
      negative: {
        content: "Hi {customer_name}, I'm sorry to hear you're experiencing technical difficulties. I understand how frustrating this can be, and I'm committed to helping you get this resolved quickly.",
        tone: "empathetic",
      },
    },
    billing: {
      neutral: {
        content: "Hi {customer_name}, I'm here to help with your billing inquiry. Let me look into this for you right away.",
        tone: "professional",
      },
      negative: {
        content: "Hi {customer_name}, I understand your concern about the billing issue. I'm going to investigate this thoroughly and ensure we get this sorted out for you.",
        tone: "empathetic",
      },
    },
    usage: {
      neutral: {
        content: "Hi {customer_name}, I'd be happy to help you with how to use our service. What specifically would you like to know?",
        tone: "friendly",
      },
      negative: {
        content: "Hi {customer_name}, I'm sorry you're having trouble with our service. Let me walk you through this step by step to make sure you get the help you need.",
        tone: "patient",
      },
    },
  };

  return templates[category]?.[sentiment] || templates.technical.neutral;
}

/**
 * Estimate resolution time based on priority and intent
 */
function estimateResolutionTime(priority: string, intent: string): number {
  const baseTimes: Record<string, number> = {
    critical: 1,
    high: 4,
    medium: 24,
    low: 48,
  };

  const intentMultipliers: Record<string, number> = {
    technical_issue: 1.5,
    billing_inquiry: 0.8,
    help_request: 0.7,
    cancellation_request: 0.5,
    general_inquiry: 0.6,
  };

  const baseTime = baseTimes[priority] || 24;
  const multiplier = intentMultipliers[intent] || 1;

  return Math.round(baseTime * multiplier);
}

/**
 * Generate content using AI
 */
async function generateContentWithAI(prompt: string): Promise<string> {
  // In a real implementation, this would call OpenAI, Anthropic, or another AI service
  console.log("Generating response content with AI...");
  
  // Mock AI response
  return "This would be an AI-generated personalized response based on the provided prompt and context.";
}

/**
 * Generate multi-language response
 */
export async function generateMultiLanguageResponse(
  request: ResponseRequest,
  targetLanguage: string
): Promise<ResponseSuggestion> {
  // In a real implementation, this would translate and adapt the response
  const baseResponse = await generatePersonalizedResponse(
    request,
    analyzeCustomerMessage(request.customerMessage),
    []
  );

  return {
    ...baseResponse,
    content: `[Translated to ${targetLanguage}] ${baseResponse.content}`,
    reasoning: `Response translated to ${targetLanguage}`,
  };
}

/**
 * Generate response variations for A/B testing
 */
export async function generateResponseVariations(
  request: ResponseRequest,
  variations: number = 3
): Promise<ResponseSuggestion[]> {
  const allVariations: ResponseSuggestion[] = [];
  
  const tones: ResponseRequest["agentInfo"]["tone"][] = ["friendly", "professional", "empathetic"];
  
  for (let i = 0; i < variations; i++) {
    const variationRequest = {
      ...request,
      agentInfo: {
        ...request.agentInfo,
        tone: tones[i % tones.length],
      },
    };

    const variation = await generatePersonalizedResponse(
      variationRequest,
      analyzeCustomerMessage(request.customerMessage),
      []
    );
    
    allVariations.push(variation);
  }

  return allVariations;
}
