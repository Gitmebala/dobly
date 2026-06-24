/**
 * Sentiment Analysis for Customer Recovery in Support Department
 * Monitors customer sentiment and triggers proactive recovery actions
 */

export interface SentimentAnalysis {
  customerId: string;
  ticketId: string;
  overallSentiment: "positive" | "neutral" | "negative" | "angry" | "frustrated";
  sentimentScore: number; // -100 to 100
  emotions: EmotionScore[];
  riskLevel: "low" | "medium" | "high" | "critical";
  triggers: SentimentTrigger[];
  trend: "improving" | "declining" | "stable";
  confidence: number;
  analyzedAt: string;
}

export interface EmotionScore {
  emotion: "joy" | "trust" | "anticipation" | "surprise" | "sadness" | "anger" | "disgust" | "fear";
  score: number; // 0-100
  indicators: string[];
}

export interface SentimentTrigger {
  type: "keyword" | "intensity" | "repetition" | "timing" | "context";
  description: string;
  severity: "low" | "medium" | "high";
  evidence: string[];
}

export interface CustomerRecoveryAction {
  type: "proactive_outreach" | "escalation" | "compensation" | "follow_up" | "training";
  priority: "low" | "medium" | "high" | "urgent";
  action: string;
  reasoning: string;
  estimatedImpact: string;
  deadline?: string;
  assignedTo?: string;
}

export interface SentimentHistory {
  customerId: string;
  timeline: SentimentDataPoint[];
  patterns: SentimentPattern[];
  predictions: SentimentPrediction[];
}

export interface SentimentDataPoint {
  timestamp: string;
  sentiment: string;
  score: number;
  context: string;
  channel: string;
}

export interface SentimentPattern {
  type: "time_based" | "issue_based" | "channel_based" | "agent_based";
  description: string;
  frequency: number;
  impact: string;
  recommendation: string;
}

export interface SentimentPrediction {
  timeframe: string;
  predictedSentiment: string;
  confidence: number;
  factors: string[];
  mitigation: string[];
}

/**
 * Analyze customer sentiment from communication
 */
export async function analyzeCustomerSentiment(
  customerId: string,
  ticketId: string,
  communications: Array<{
    content: string;
    timestamp: string;
    channel: string;
    sender: "customer" | "agent";
  }>,
  customerHistory?: {
    previousTickets: number;
    satisfactionScore: number;
    lastContact: string;
    tier: string;
  }
): Promise<SentimentAnalysis> {
  // Step 1: Extract customer communications only
  const customerMessages = communications.filter(c => c.sender === "customer");
  
  // Step 2: Calculate overall sentiment score
  const sentimentScore = calculateSentimentScore(customerMessages);
  
  // Step 3: Determine overall sentiment
  const overallSentiment = determineOverallSentiment(sentimentScore);
  
  // Step 4: Analyze specific emotions
  const emotions = analyzeEmotions(customerMessages);
  
  // Step 5: Identify sentiment triggers
  const triggers = identifySentimentTriggers(customerMessages, sentimentScore);
  
  // Step 6: Assess risk level
  const riskLevel = assessRiskLevel(sentimentScore, triggers, customerHistory);
  
  // Step 7: Analyze sentiment trend
  const trend = analyzeSentimentTrend(customerMessages);
  
  // Step 8: Calculate confidence
  const confidence = calculateAnalysisConfidence(customerMessages, sentimentScore);

  return {
    customerId,
    ticketId,
    overallSentiment,
    sentimentScore,
    emotions,
    riskLevel,
    triggers,
    trend,
    confidence,
    analyzedAt: new Date().toISOString(),
  };
}

/**
 * Generate customer recovery actions
 */
export async function generateRecoveryActions(
  sentimentAnalysis: SentimentAnalysis,
  customerInfo: {
    name: string;
    tier: string;
    value: number;
    subscriptionStatus: string;
  },
  ticketContext: {
    category: string;
    priority: string;
    duration: number;
    agentAssigned?: string;
  }
): Promise<CustomerRecoveryAction[]> {
  const actions: CustomerRecoveryAction[] = [];

  // High-risk customer actions
  if (sentimentAnalysis.riskLevel === "critical") {
    actions.push({
      type: "escalation",
      priority: "urgent",
      action: "Immediately escalate to senior support manager",
      reasoning: "Critical sentiment risk detected - immediate intervention required",
      estimatedImpact: "Prevent customer churn and restore confidence",
      deadline: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
      assignedTo: "support_manager",
    });

    actions.push({
      type: "proactive_outreach",
      priority: "urgent",
      action: "Schedule immediate callback from senior representative",
      reasoning: "Critical sentiment requires personal outreach",
      estimatedImpact: "Show customer we value their business",
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
    });
  }

  // Anger recovery actions
  if (sentimentAnalysis.overallSentiment === "angry") {
    actions.push({
      type: "compensation",
      priority: "high",
      action: "Offer service credit or discount",
      reasoning: "Customer anger indicates service failure - compensation appropriate",
      estimatedImpact: "Restore goodwill and prevent churn",
    });

    actions.push({
      type: "follow_up",
      priority: "high",
      action: "Personal follow-up from support team lead within 24 hours",
      reasoning: "Angry customers need reassurance from leadership",
      estimatedImpact: "Demonstrate commitment to resolution",
      deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Frustration recovery actions
  if (sentimentAnalysis.overallSentiment === "frustrated") {
    actions.push({
      type: "proactive_outreach",
      priority: "medium",
      action: "Send empathetic acknowledgment and resolution timeline",
      reasoning: "Frustrated customers need clarity and empathy",
      estimatedImpact: "Reduce frustration through clear communication",
    });

    actions.push({
      type: "training",
      priority: "low",
      action: "Review agent handling of similar issues",
      reasoning: "Identify training opportunities to prevent future frustration",
      estimatedImpact: "Improve overall service quality",
    });
  }

  // High-value customer actions
  if (customerInfo.tier === "enterprise" || customerInfo.value > 10000) {
    actions.push({
      type: "proactive_outreach",
      priority: "high",
      action: "Assign dedicated success manager for resolution period",
      reasoning: "High-value customer requires premium service",
      estimatedImpact: "Protect revenue and strengthen relationship",
    });
  }

  // Declining sentiment actions
  if (sentimentAnalysis.trend === "declining") {
    actions.push({
      type: "follow_up",
      priority: "medium",
      action: "Schedule check-in call within 48 hours",
      reasoning: "Declining sentiment indicates unresolved issues",
      estimatedImpact: "Identify and address root causes",
      deadline: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    });
  }

  // Channel-specific actions
  if (sentimentAnalysis.triggers.some(t => t.type === "channel_based")) {
    actions.push({
      type: "training",
      priority: "low",
      action: "Review channel-specific communication guidelines",
      reasoning: "Channel-specific sentiment issues detected",
      estimatedImpact: "Improve channel communication strategies",
    });
  }

  return actions;
}

/**
 * Track sentiment over time for customer
 */
export async function trackCustomerSentiment(
  customerId: string,
  historicalData: SentimentDataPoint[]
): Promise<SentimentHistory> {
  // Step 1: Analyze patterns in historical data
  const patterns = analyzeSentimentPatterns(historicalData);
  
  // Step 2: Predict future sentiment
  const predictions = predictFutureSentiment(historicalData, patterns);

  return {
    customerId,
    timeline: historicalData,
    patterns,
    predictions,
  };
}

/**
 * Calculate sentiment score from messages
 */
function calculateSentimentScore(messages: Array<{ content: string; timestamp: string; channel: string }>): number {
  if (messages.length === 0) return 0;

  let totalScore = 0;
  
  messages.forEach(message => {
    const content = message.content.toLowerCase();
    let messageScore = 0;

    // Positive words and phrases
    const positiveWords = [
      "thank", "thanks", "great", "good", "excellent", "helpful", "appreciate", 
      "love", "perfect", "wonderful", "fantastic", "amazing", "solved", "fixed"
    ];
    
    // Negative words and phrases
    const negativeWords = [
      "frustrated", "angry", "disappointed", "terrible", "awful", "hate", "worst",
      "useless", "broken", "stuck", "impossible", "ridiculous", "unacceptable"
    ];

    // Intensifiers
    const intensifiers = ["very", "extremely", "really", "absolutely", "completely"];
    
    // Count positive words
    positiveWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        let score = matches.length * 5;
        // Check for intensifiers
        intensifiers.forEach(intensifier => {
          if (content.includes(intensifier + " " + word)) {
            score *= 1.5;
          }
        });
        messageScore += score;
      }
    });

    // Count negative words
    negativeWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = content.match(regex);
      if (matches) {
        let score = matches.length * -5;
        // Check for intensifiers
        intensifiers.forEach(intensifier => {
          if (content.includes(intensifier + " " + word)) {
            score *= 1.5;
          }
        });
        messageScore += score;
      }
    });

    // Exclamation marks (indicate emotion)
    const exclamationCount = (content.match(/!/g) || []).length;
    messageScore += exclamationCount * 2;

    // Question marks (indicate confusion/need)
    const questionCount = (content.match(/\?/g) || []).length;
    messageScore -= questionCount * 1;

    // Capital letters (indicate shouting/anger)
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) {
      messageScore -= 10;
    }

    totalScore += messageScore;
  });

  // Normalize to -100 to 100 scale
  const averageScore = totalScore / messages.length;
  return Math.max(-100, Math.min(100, averageScore));
}

/**
 * Determine overall sentiment from score
 */
function determineOverallSentiment(score: number): SentimentAnalysis["overallSentiment"] {
  if (score <= -60) return "angry";
  if (score <= -30) return "frustrated";
  if (score <= -10) return "negative";
  if (score <= 10) return "neutral";
  if (score <= 30) return "positive";
  return "positive";
}

/**
 * Analyze specific emotions
 */
function analyzeEmotions(messages: Array<{ content: string; timestamp: string; channel: string }>): EmotionScore[] {
  const emotions: EmotionScore[] = [];
  const allContent = messages.map(m => m.content.toLowerCase()).join(" ");

  // Joy indicators
  const joyWords = ["happy", "pleased", "satisfied", "delighted", "excited", "love", "great"];
  const joyScore = calculateEmotionScore(allContent, joyWords);
  if (joyScore > 0) {
    emotions.push({
      emotion: "joy",
      score: joyScore,
      indicators: joyWords.filter(w => allContent.includes(w)),
    });
  }

  // Trust indicators
  const trustWords = ["trust", "confident", "reliable", "dependable", "believe", "faith"];
  const trustScore = calculateEmotionScore(allContent, trustWords);
  if (trustScore > 0) {
    emotions.push({
      emotion: "trust",
      score: trustScore,
      indicators: trustWords.filter(w => allContent.includes(w)),
    });
  }

  // Anger indicators
  const angerWords = ["angry", "furious", "outraged", "mad", "irritated", "annoyed"];
  const angerScore = calculateEmotionScore(allContent, angerWords);
  if (angerScore > 0) {
    emotions.push({
      emotion: "anger",
      score: angerScore,
      indicators: angerWords.filter(w => allContent.includes(w)),
    });
  }

  // Fear indicators
  const fearWords = ["worried", "concerned", "anxious", "nervous", "afraid", "scared"];
  const fearScore = calculateEmotionScore(allContent, fearWords);
  if (fearScore > 0) {
    emotions.push({
      emotion: "fear",
      score: fearScore,
      indicators: fearWords.filter(w => allContent.includes(w)),
    });
  }

  // Sadness indicators
  const sadnessWords = ["sad", "disappointed", "upset", "unhappy", "depressed"];
  const sadnessScore = calculateEmotionScore(allContent, sadnessWords);
  if (sadnessScore > 0) {
    emotions.push({
      emotion: "sadness",
      score: sadnessScore,
      indicators: sadnessWords.filter(w => allContent.includes(w)),
    });
  }

  return emotions.sort((a, b) => b.score - a.score);
}

/**
 * Calculate emotion score
 */
function calculateEmotionScore(content: string, words: string[]): number {
  let score = 0;
  words.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) {
      score += matches.length * 10;
    }
  });
  return Math.min(100, score);
}

/**
 * Identify sentiment triggers
 */
function identifySentimentTriggers(
  messages: Array<{ content: string; timestamp: string; channel: string }>,
  sentimentScore: number
): SentimentTrigger[] {
  const triggers: SentimentTrigger[] = [];
  const allContent = messages.map(m => m.content).join(" ");

  // Keyword triggers
  const negativeKeywords = ["never", "always", "worst", "terrible", "unacceptable"];
  const foundKeywords = negativeKeywords.filter(keyword => 
    allContent.toLowerCase().includes(keyword)
  );
  
  if (foundKeywords.length > 0) {
    triggers.push({
      type: "keyword",
      description: "Negative keyword usage detected",
      severity: foundKeywords.length > 2 ? "high" : "medium",
      evidence: foundKeywords,
    });
  }

  // Intensity triggers
  const exclamationCount = (allContent.match(/!/g) || []).length;
  if (exclamationCount > 3) {
    triggers.push({
      type: "intensity",
      description: "High emotional intensity detected",
      severity: exclamationCount > 5 ? "high" : "medium",
      evidence: [`${exclamationCount} exclamation marks found`],
    });
  }

  // Repetition triggers
  const words = allContent.toLowerCase().split(/\s+/);
  const wordCounts: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 3) { // Ignore short words
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  });
  
  const repeatedWords = Object.entries(wordCounts)
    .filter(([, count]) => count > 3)
    .map(([word, count]) => `${word} (${count} times)`);
  
  if (repeatedWords.length > 0) {
    triggers.push({
      type: "repetition",
      description: "Word repetition indicates strong emotion",
      severity: repeatedWords.length > 2 ? "medium" : "low",
      evidence: repeatedWords,
    });
  }

  // Timing triggers
  if (messages.length > 0) {
    const firstMessage = new Date(messages[0].timestamp);
    const lastMessage = new Date(messages[messages.length - 1].timestamp);
    const duration = (lastMessage.getTime() - firstMessage.getTime()) / (1000 * 60); // minutes
    
    if (duration < 5 && messages.length > 2) {
      triggers.push({
        type: "timing",
        description: "Rapid message exchange indicates urgency",
        severity: "medium",
        evidence: [`${messages.length} messages in ${Math.round(duration)} minutes`],
      });
    }
  }

  return triggers;
}

/**
 * Assess risk level
 */
function assessRiskLevel(
  sentimentScore: number,
  triggers: SentimentTrigger[],
  customerHistory?: any
): "low" | "medium" | "high" | "critical" {
  let riskScore = 0;

  // Sentiment score risk
  if (sentimentScore <= -60) riskScore += 40;
  else if (sentimentScore <= -30) riskScore += 25;
  else if (sentimentScore <= -10) riskScore += 10;

  // Trigger risk
  triggers.forEach(trigger => {
    if (trigger.severity === "high") riskScore += 20;
    else if (trigger.severity === "medium") riskScore += 10;
    else if (trigger.severity === "low") riskScore += 5;
  });

  // Customer history risk
  if (customerHistory) {
    if (customerHistory.previousTickets > 10) riskScore += 15;
    if (customerHistory.satisfactionScore < 3) riskScore += 20;
    if (customerHistory.tier === "enterprise") riskScore += 10;
  }

  // Determine risk level
  if (riskScore >= 70) return "critical";
  if (riskScore >= 50) return "high";
  if (riskScore >= 25) return "medium";
  return "low";
}

/**
 * Analyze sentiment trend
 */
function analyzeSentimentTrend(messages: Array<{ content: string; timestamp: string; channel: string }>): "improving" | "declining" | "stable" {
  if (messages.length < 3) return "stable";

  // Calculate sentiment for each message
  const messageSentiments = messages.map(message => {
    const score = calculateSentimentScore([message]);
    return { timestamp: message.timestamp, score };
  });

  // Compare first third to last third
  const firstThird = messageSentiments.slice(0, Math.floor(messageSentiments.length / 3));
  const lastThird = messageSentiments.slice(-Math.floor(messageSentiments.length / 3));

  const firstAvg = firstThird.reduce((sum, m) => sum + m.score, 0) / firstThird.length;
  const lastAvg = lastThird.reduce((sum, m) => sum + m.score, 0) / lastThird.length;

  const difference = lastAvg - firstAvg;

  if (difference > 10) return "improving";
  if (difference < -10) return "declining";
  return "stable";
}

/**
 * Calculate analysis confidence
 */
function calculateAnalysisConfidence(
  messages: Array<{ content: string; timestamp: string; channel: string }>,
  sentimentScore: number
): number {
  let confidence = 0.5; // Base confidence

  // More messages = higher confidence
  if (messages.length >= 5) confidence += 0.2;
  else if (messages.length >= 3) confidence += 0.1;

  // Stronger sentiment = higher confidence
  if (Math.abs(sentimentScore) > 50) confidence += 0.2;
  else if (Math.abs(sentimentScore) > 25) confidence += 0.1;

  // Clear emotion indicators = higher confidence
  const totalWords = messages.reduce((sum, m) => sum + m.content.split(/\s+/).length, 0);
  if (totalWords > 50) confidence += 0.1;

  return Math.min(0.95, confidence);
}

/**
 * Analyze sentiment patterns
 */
function analyzeSentimentPatterns(data: SentimentDataPoint[]): SentimentPattern[] {
  const patterns: SentimentPattern[] = [];

  // Time-based patterns
  const hourPatterns: Record<number, { count: number; avgSentiment: number }> = {};
  data.forEach(point => {
    const hour = new Date(point.timestamp).getHours();
    if (!hourPatterns[hour]) {
      hourPatterns[hour] = { count: 0, avgSentiment: 0 };
    }
    hourPatterns[hour].count++;
    hourPatterns[hour].avgSentiment += (point.score > 0 ? 1 : -1);
  });

  Object.entries(hourPatterns).forEach(([hour, data]) => {
    data.avgSentiment /= data.count;
    if (data.count >= 3 && data.avgSentiment < -0.5) {
      patterns.push({
        type: "time_based",
        description: `Negative sentiment spike around ${hour}:00`,
        frequency: data.count,
        impact: "Customers more negative during this time",
        recommendation: "Consider staffing adjustments during peak negative hours",
      });
    }
  });

  return patterns;
}

/**
 * Predict future sentiment
 */
function predictFutureSentiment(
  historicalData: SentimentDataPoint[],
  patterns: SentimentPattern[]
): SentimentPrediction[] {
  const predictions: SentimentPrediction[] = [];

  // Simple trend-based prediction
  if (historicalData.length >= 5) {
    const recentData = historicalData.slice(-5);
    const avgSentiment = recentData.reduce((sum, d) => sum + d.score, 0) / recentData.length;
    
    let predictedSentiment = "neutral";
    if (avgSentiment > 10) predictedSentiment = "positive";
    else if (avgSentiment < -10) predictedSentiment = "negative";

    predictions.push({
      timeframe: "next_week",
      predictedSentiment,
      confidence: 0.6,
      factors: ["Recent sentiment trend", "Historical patterns"],
      mitigation: avgSentiment < -10 ? ["Proactive outreach", "Service review"] : ["Maintain current service levels"],
    });
  }

  return predictions;
}
