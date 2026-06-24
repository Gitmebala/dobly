/**
 * Knowledge Base Auto-Updates for Support Department
 * Automatically extracts insights from resolved tickets and updates knowledge base
 */

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "published" | "archived";
  viewCount: number;
  helpfulVotes: number;
  totalVotes: number;
  relatedTickets: string[];
}

export interface TicketInsight {
  ticketId: string;
  category: string;
  resolution: string;
  customerProblem: string;
  solutionSteps: string[];
  keywords: string[];
  frequency: number;
  confidence: number;
  extractedAt: string;
}

export interface KnowledgeUpdate {
  id: string;
  type: "new_article" | "update_article" | "merge_articles" | "archive_article" | "tag_update";
  articleId?: string;
  title: string;
  content: string;
  reasoning: string;
  confidence: number;
  status: "pending" | "approved" | "rejected" | "published";
  createdAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface KnowledgeGap {
  category: string;
  topic: string;
  frequency: number;
  urgency: "low" | "medium" | "high";
  suggestedTitle: string;
  suggestedContent: string;
  relatedTickets: string[];
}

/**
 * Analyze resolved tickets and generate knowledge base updates
 */
export async function analyzeResolvedTickets(
  resolvedTickets: Array<{
    id: string;
    subject: string;
    description: string;
    resolution: string;
    category: string;
    tags: string[];
    satisfactionRating?: number;
    agentNotes?: string;
    createdAt: string;
    resolvedAt: string;
    customerId: string;
  }>,
  existingArticles: KnowledgeBaseArticle[]
): Promise<{
  insights: TicketInsight[];
  updates: KnowledgeUpdate[];
  gaps: KnowledgeGap[];
  statistics: {
    ticketsAnalyzed: number;
    insightsGenerated: number;
    updatesCreated: number;
    gapsIdentified: number;
  };
}> {
  const insights: TicketInsight[] = [];
  const updates: KnowledgeUpdate[] = [];
  const gaps: KnowledgeGap[] = [];

  // Step 1: Extract insights from each resolved ticket
  for (const ticket of resolvedTickets) {
    const insight = await extractTicketInsight(ticket);
    insights.push(insight);
  }

  // Step 2: Group insights by topic
  const groupedInsights = groupInsightsByTopic(insights);

  // Step 3: Identify knowledge gaps
  const gaps = identifyKnowledgeGaps(groupedInsights, existingArticles);

  // Step 4: Generate article updates
  for (const [topic, topicInsights] of Object.entries(groupedInsights)) {
    if (topicInsights.length >= 3) { // Threshold for creating/updating articles
      const update = await generateKnowledgeUpdate(topic, topicInsights, existingArticles);
      if (update) {
        updates.push(update);
      }
    }
  }

  // Step 5: Generate statistics
  const statistics = {
    ticketsAnalyzed: resolvedTickets.length,
    insightsGenerated: insights.length,
    updatesCreated: updates.length,
    gapsIdentified: gaps.length,
  };

  return {
    insights,
    updates,
    gaps,
    statistics,
  };
}

/**
 * Extract insight from a single resolved ticket
 */
async function extractTicketInsight(ticket: any): Promise<TicketInsight> {
  // Extract customer problem
  const customerProblem = extractCustomerProblem(ticket.subject, ticket.description);
  
  // Extract resolution steps
  const solutionSteps = extractSolutionSteps(ticket.resolution, ticket.agentNotes);
  
  // Extract keywords
  const keywords = extractKeywords(ticket.subject, ticket.description, ticket.resolution);
  
  // Calculate confidence based on satisfaction rating and resolution quality
  const confidence = calculateInsightConfidence(ticket, solutionSteps);

  return {
    ticketId: ticket.id,
    category: ticket.category,
    resolution: ticket.resolution,
    customerProblem,
    solutionSteps,
    keywords,
    frequency: 1,
    confidence,
    extractedAt: new Date().toISOString(),
  };
}

/**
 * Extract customer problem from ticket
 */
function extractCustomerProblem(subject: string, description: string): string {
  // Combine subject and description
  const fullText = `${subject} ${description}`;
  
  // Remove agent responses and focus on customer issue
  const customerText = fullText
    .split(/\n(?=[A-Z][a-z]*:)/)[0] // Take first part before agent responses
    .replace(/^(Hi|Hello|Hey)[^\n]*\n/i, '') // Remove greetings
    .trim();

  // Extract the core problem (first 2-3 sentences)
  const sentences = customerText.split(/[.!?]+/).filter(s => s.trim());
  const coreProblem = sentences.slice(0, 3).join('. ').trim();

  return coreProblem || customerText.substring(0, 200);
}

/**
 * Extract solution steps from resolution
 */
function extractSolutionSteps(resolution: string, agentNotes?: string): string[] {
  const fullResolution = agentNotes ? `${resolution} ${agentNotes}` : resolution;
  
  // Look for step indicators
  const stepPatterns = [
    /(?:step|first|second|third|next|then|finally)[\s:]*([^.!?]+)/gi,
    /(\d+[\.\)]\s*[^.!?]+)/gi,
    /([A-Z][a-z]*[^a-z][^.!?]*:)/gi,
  ];

  const steps: string[] = [];
  
  stepPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(fullResolution)) !== null) {
      const step = match[1] || match[0];
      const cleanStep = step.replace(/^[:\s\d\.\)]+/, '').trim();
      if (cleanStep.length > 10 && !steps.includes(cleanStep)) {
        steps.push(cleanStep);
      }
    }
  });

  // If no clear steps found, split by common delimiters
  if (steps.length === 0) {
    const delimiterSteps = fullResolution
      .split(/(?:\.|\n|\;|\-|\*)/)
      .map(s => s.trim())
      .filter(s => s.length > 15);
    
    steps.push(...delimiterSteps.slice(0, 5));
  }

  return steps;
}

/**
 * Extract keywords from ticket content
 */
function extractKeywords(subject: string, description: string, resolution: string): string[] {
  const allText = `${subject} ${description} ${resolution}`.toLowerCase();
  
  // Remove common words
  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "by", "from", "up", "about", "into", "through", "during", "before", "after", "above",
    "below", "between", "under", "along", "following", "behind", "beyond", "plus", "except",
    "but", "yet", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "can",
    "will", "just", "don", "should", "now", "i", "you", "we", "they", "he", "she", "it",
    "is", "are", "was", "were", "be", "been", "being", "have", "has", "had", "having",
    "do", "does", "did", "doing", "would", "should", "could", "might", "must", "shall"
  ]);

  // Extract words (3+ characters)
  const words = allText
    .split(/\W+/)
    .filter(word => word.length >= 3)
    .filter(word => !stopWords.has(word))
    .filter(word => !/^\d+$/.test(word)); // Remove pure numbers

  // Count word frequency
  const wordCounts: Record<string, number> = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });

  // Sort by frequency and return top keywords
  return Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([word]) => word);
}

/**
 * Calculate insight confidence
 */
function calculateInsightConfidence(ticket: any, solutionSteps: string[]): number {
  let confidence = 0.5; // Base confidence

  // Satisfaction rating
  if (ticket.satisfactionRating) {
    if (ticket.satisfactionRating >= 4) confidence += 0.3;
    else if (ticket.satisfactionRating >= 3) confidence += 0.1;
    else confidence -= 0.2;
  }

  // Resolution quality (number of steps)
  if (solutionSteps.length >= 3) confidence += 0.2;
  else if (solutionSteps.length >= 2) confidence += 0.1;

  // Resolution length (detailed resolution)
  if (ticket.resolution.length > 200) confidence += 0.1;
  else if (ticket.resolution.length < 50) confidence -= 0.1;

  // Agent notes (additional context)
  if (ticket.agentNotes && ticket.agentNotes.length > 50) confidence += 0.1;

  return Math.max(0, Math.min(1, confidence));
}

/**
 * Group insights by topic
 */
function groupInsightsByTopic(insights: TicketInsight[]): Record<string, TicketInsight[]> {
  const grouped: Record<string, TicketInsight[]> = {};

  insights.forEach(insight => {
    // Create topic key from category and top keywords
    const topKeywords = insight.keywords.slice(0, 3);
    const topicKey = `${insight.category}_${topKeywords.join('_')}`;
    
    if (!grouped[topicKey]) {
      grouped[topicKey] = [];
    }
    grouped[topicKey].push(insight);
  });

  // Update frequency for each insight
  Object.values(grouped).forEach(topicInsights => {
    topicInsights.forEach(insight => {
      insight.frequency = topicInsights.length;
    });
  });

  return grouped;
}

/**
 * Identify knowledge gaps
 */
function identifyKnowledgeGaps(
  groupedInsights: Record<string, TicketInsight[]>,
  existingArticles: KnowledgeBaseArticle[]
): KnowledgeGap[] {
  const gaps: KnowledgeGap[] = [];

  Object.entries(groupedInsights).forEach(([topic, insights]) => {
    // Check if topic is covered by existing articles
    const [category, ...keywords] = topic.split('_');
    const topicKeywords = keywords.join(' ');
    
    const existingCoverage = existingArticles.filter(article => {
      const articleText = `${article.title} ${article.content} ${article.tags.join(' ')}`.toLowerCase();
      return articleText.includes(category.toLowerCase()) && 
             keywords.some(keyword => articleText.includes(keyword.toLowerCase()));
    });

    // If no coverage or low coverage, identify as gap
    if (existingCoverage.length === 0 || existingCoverage.length < insights.length / 3) {
      const urgency = insights.length >= 5 ? "high" : insights.length >= 3 ? "medium" : "low";
      
      gaps.push({
        category,
        topic: topicKeywords,
        frequency: insights.length,
        urgency,
        suggestedTitle: generateArticleTitle(category, topicKeywords, insights),
        suggestedContent: generateArticleContent(insights),
        relatedTickets: insights.map(i => i.ticketId),
      });
    }
  });

  return gaps.sort((a, b) => b.frequency - a.frequency);
}

/**
 * Generate knowledge update
 */
async function generateKnowledgeUpdate(
  topic: string,
  insights: TicketInsight[],
  existingArticles: KnowledgeBaseArticle[]
): Promise<KnowledgeUpdate | null> {
  // Find existing article for this topic
  const [category, ...keywords] = topic.split('_');
  const topicKeywords = keywords.join(' ');
  
  const existingArticle = existingArticles.find(article => {
    const articleText = `${article.title} ${article.content}`.toLowerCase();
    return articleText.includes(category.toLowerCase()) && 
           keywords.some(keyword => articleText.includes(keyword.toLowerCase()));
  });

  if (existingArticle) {
    // Update existing article
    const updatedContent = await updateArticleContent(existingArticle, insights);
    
    return {
      id: `update-${Date.now()}`,
      type: "update_article",
      articleId: existingArticle.id,
      title: existingArticle.title,
      content: updatedContent,
      reasoning: `Updated based on ${insights.length} new resolved tickets`,
      confidence: calculateUpdateConfidence(insights),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  } else {
    // Create new article
    const newArticle = await createNewArticle(category, topicKeywords, insights);
    
    return {
      id: `new-${Date.now()}`,
      type: "new_article",
      title: newArticle.title,
      content: newArticle.content,
      reasoning: `Created based on ${insights.length} resolved tickets about ${topic}`,
      confidence: calculateUpdateConfidence(insights),
      status: "pending",
      createdAt: new Date().toISOString(),
    };
  }
}

/**
 * Generate article title
 */
function generateArticleTitle(category: string, topic: string, insights: TicketInsight[]): string {
  const commonProblems = insights.map(i => i.customerProblem);
  const problemWords = commonProblems.join(' ').toLowerCase().split(/\s+/);
  
  // Find most frequent problem words
  const wordCounts: Record<string, number> = {};
  problemWords.forEach(word => {
    if (word.length > 4) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });

  const topWords = Object.entries(wordCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([word]) => word);

  // Capitalize words
  const capitalizedWords = topWords.map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  );

  return `How to ${category === 'technical' ? 'Fix' : 'Resolve'} ${capitalizedWords.join(' and ')} Issues`;
}

/**
 * Generate article content
 */
function generateArticleContent(insights: TicketInsight[]): string {
  if (insights.length === 0) return "";

  // Extract common solution steps
  const allSteps = insights.flatMap(i => i.solutionSteps);
  const stepCounts: Record<string, number> = {};
  
  allSteps.forEach(step => {
    const normalizedStep = step.toLowerCase().trim();
    stepCounts[normalizedStep] = (stepCounts[normalizedStep] || 0) + 1;
  });

  // Get most common steps
  const commonSteps = Object.entries(stepCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([step]) => step);

  // Generate content
  let content = `## Overview\n\n`;
  content += `This article addresses common issues related to ${insights[0].category}. `;
  content += `Based on analysis of ${insights.length} resolved support tickets, we've identified the most effective solutions.\n\n`;

  content += `## Problem Description\n\n`;
  content += `Customers typically experience the following issues:\n\n`;
  insights.slice(0, 3).forEach(insight => {
    content += `- ${insight.customerProblem}\n`;
  });
  content += `\n`;

  content += `## Solution Steps\n\n`;
  commonSteps.forEach((step, index) => {
    content += `### Step ${index + 1}: ${step.charAt(0).toUpperCase() + step.slice(1)}\n\n`;
    content += `${step}\n\n`;
  });

  content += `## Additional Tips\n\n`;
  content += `- If the issue persists after following these steps, contact support\n`;
  content += `- Keep your software updated to prevent similar issues\n`;
  content += `- Document any error messages for faster troubleshooting\n\n`;

  content += `## Related Articles\n\n`;
  content += `*[Would be populated with related article links]*\n`;

  return content;
}

/**
 * Update existing article content
 */
async function updateArticleContent(
  existingArticle: KnowledgeBaseArticle,
  newInsights: TicketInsight[]
): Promise<string> {
  // In a real implementation, this would intelligently merge new content
  // For now, append new information
  const newContent = generateArticleContent(newInsights);
  
  return `${existingArticle.content}\n\n---\n\n## Recently Added Solutions\n\n${newContent}`;
}

/**
 * Create new article
 */
async function createNewArticle(
  category: string,
  topic: string,
  insights: TicketInsight[]
): Promise<{ title: string; content: string }> {
  const title = generateArticleTitle(category, topic, insights);
  const content = generateArticleContent(insights);
  
  return { title, content };
}

/**
 * Calculate update confidence
 */
function calculateUpdateConfidence(insights: TicketInsight[]): number {
  if (insights.length === 0) return 0;

  const avgConfidence = insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length;
  const frequencyBonus = Math.min(0.2, insights.length * 0.05);
  
  return Math.min(1, avgConfidence + frequencyBonus);
}

/**
 * Review and approve knowledge updates
 */
export async function reviewKnowledgeUpdate(
  updateId: string,
  decision: "approve" | "reject",
  reviewerId: string,
  feedback?: string
): Promise<KnowledgeUpdate> {
  // In a real implementation, this would update the database
  return {
    id: updateId,
    type: "new_article",
    title: "Sample Article",
    content: "Sample content",
    reasoning: "Sample reasoning",
    confidence: 0.8,
    status: decision === "approve" ? "approved" : "rejected",
    createdAt: new Date().toISOString(),
    reviewedBy: reviewerId,
    reviewedAt: new Date().toISOString(),
  };
}

/**
 * Publish approved updates
 */
export async function publishKnowledgeUpdates(
  updateIds: string[]
): Promise<{ published: number; failed: string[] }> {
  // In a real implementation, this would publish the articles
  return {
    published: updateIds.length,
    failed: [],
  };
}

/**
 * Search knowledge base for similar articles
 */
export async function searchSimilarArticles(
  query: string,
  existingArticles: KnowledgeBaseArticle[]
): Promise<KnowledgeBaseArticle[]> {
  const queryWords = query.toLowerCase().split(/\s+/);
  
  const scored = existingArticles.map(article => {
    const articleText = `${article.title} ${article.content} ${article.tags.join(' ')}`.toLowerCase();
    
    let score = 0;
    queryWords.forEach(word => {
      if (articleText.includes(word)) {
        score += 1;
      }
    });

    return { article, score };
  });

  return scored
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(item => item.article);
}
