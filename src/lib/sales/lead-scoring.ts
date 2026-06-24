/**
 * AI-Powered Lead Scoring for Sales Department
 * Dynamically scores leads based on behavior, demographics, and predictive analytics
 */

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  industry?: string;
  companySize?: string;
  location: {
    country: string;
    city?: string;
    state?: string;
  };
  source: string;
  createdAt: string;
  activities: LeadActivity[];
  demographics: LeadDemographics;
  customFields?: Record<string, any>;
}

export interface LeadActivity {
  type: "email_open" | "email_click" | "website_visit" | "form_submit" | "demo_request" | "content_download" | "webinar_attend" | "meeting_booked";
  timestamp: string;
  properties?: Record<string, any>;
  value?: number; // Activity score value
}

export interface LeadDemographics {
  age?: number;
  income?: string;
  education?: string;
  interests: string[];
  painPoints: string[];
  budget?: string;
  timeline?: string;
  decisionMaker: boolean;
  technicalBackground?: boolean;
}

export interface LeadScore {
  leadId: string;
  totalScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
  likelihood: number; // 0-100%
  factors: ScoreFactor[];
  predictions: LeadPrediction[];
  recommendations: string[];
  lastUpdated: string;
  trend: "improving" | "declining" | "stable";
}

export interface ScoreFactor {
  category: "demographics" | "activity" | "engagement" | "timing" | "budget" | "fit";
  score: number;
  weight: number;
  description: string;
  details: string[];
}

export interface LeadPrediction {
  type: "conversion" | "timeline" | "deal_size" | "churn_risk";
  prediction: number | string;
  confidence: number;
  reasoning: string;
}

/**
 * Score a lead using AI and historical data
 */
export async function scoreLead(
  lead: Lead,
  historicalData?: {
    convertedLeads: Lead[];
    lostLeads: Lead[];
    averageDealSize: number;
    conversionRate: number;
  }
): Promise<LeadScore> {
  // Step 1: Analyze demographic fit
  const demographicScore = calculateDemographicScore(lead);
  
  // Step 2: Score engagement activities
  const activityScore = calculateActivityScore(lead.activities);
  
  // Step 3: Assess engagement quality
  const engagementScore = calculateEngagementScore(lead);
  
  // Step 4: Evaluate timing factors
  const timingScore = calculateTimingScore(lead);
  
  // Step 5: Assess budget and buying power
  const budgetScore = calculateBudgetScore(lead.demographics);
  
  // Step 6: Calculate overall fit score
  const fitScore = calculateFitScore(lead, historicalData);
  
  // Step 7: Combine scores with weights
  const factors = [
    { category: "demographics" as const, score: demographicScore, weight: 0.2, description: "Demographic alignment", details: [] },
    { category: "activity" as const, score: activityScore, weight: 0.25, description: "Activity level", details: [] },
    { category: "engagement" as const, score: engagementScore, weight: 0.25, description: "Engagement quality", details: [] },
    { category: "timing" as const, score: timingScore, weight: 0.15, description: "Timing factors", details: [] },
    { category: "budget" as const, score: budgetScore, weight: 0.1, description: "Budget fit", details: [] },
    { category: "fit" as const, score: fitScore, weight: 0.05, description: "Overall fit", details: [] },
  ];

  const totalScore = factors.reduce((sum, factor) => sum + (factor.score * factor.weight), 0);
  
  // Step 8: Generate predictions
  const predictions = await generateLeadPredictions(lead, totalScore, historicalData);
  
  // Step 9: Generate recommendations
  const recommendations = generateLeadRecommendations(lead, factors, predictions);
  
  // Step 10: Determine grade
  const grade = calculateLeadGrade(totalScore);
  
  // Step 11: Calculate trend (would need historical scores)
  const trend = "stable" as const; // Simplified

  return {
    leadId: lead.id,
    totalScore: Math.round(totalScore),
    grade,
    likelihood: Math.round(totalScore),
    factors,
    predictions,
    recommendations,
    lastUpdated: new Date().toISOString(),
    trend,
  };
}

/**
 * Calculate demographic score
 */
function calculateDemographicScore(lead: Lead): number {
  let score = 50; // Base score
  
  // Industry alignment
  const targetIndustries = ["technology", "software", "healthcare", "finance", "manufacturing"];
  if (lead.industry && targetIndustries.includes(lead.industry.toLowerCase())) {
    score += 15;
  }
  
  // Company size
  if (lead.companySize) {
    const sizeScores: Record<string, number> = {
      "1-10": 5,
      "11-50": 10,
      "51-200": 15,
      "201-500": 20,
      "501-1000": 18,
      "1000+": 15,
    };
    score += sizeScores[lead.companySize] || 0;
  }
  
  // Job title relevance
  if (lead.jobTitle) {
    const title = lead.jobTitle.toLowerCase();
    const decisionMakerTitles = ["ceo", "cto", "cfo", "director", "manager", "vp", "president", "founder", "owner"];
    const technicalTitles = ["engineer", "developer", "architect", "technical", "developer"];
    
    if (decisionMakerTitles.some(t => title.includes(t))) {
      score += 20;
    } else if (technicalTitles.some(t => title.includes(t))) {
      score += 10;
    }
  }
  
  // Decision maker status
  if (lead.demographics.decisionMaker) {
    score += 15;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate activity score
 */
function calculateActivityScore(activities: LeadActivity[]): number {
  if (activities.length === 0) return 20;
  
  const activityWeights: Record<string, number> = {
    email_open: 5,
    email_click: 10,
    website_visit: 8,
    form_submit: 20,
    demo_request: 35,
    content_download: 15,
    webinar_attend: 25,
    meeting_booked: 40,
  };
  
  let totalScore = 0;
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Score activities with recency decay
  activities.forEach(activity => {
    const weight = activityWeights[activity.type] || 5;
    const activityDate = new Date(activity.timestamp);
    const daysAgo = Math.floor((now.getTime() - activityDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Apply recency decay (more recent activities worth more)
    let recencyMultiplier = 1;
    if (daysAgo <= 7) {
      recencyMultiplier = 1.5;
    } else if (daysAgo <= 14) {
      recencyMultiplier = 1.2;
    } else if (daysAgo <= 30) {
      recencyMultiplier = 1.0;
    } else {
      recencyMultiplier = 0.5; // Older activities less valuable
    }
    
    totalScore += weight * recencyMultiplier;
  });
  
  // Bonus for consistent activity
  const recentActivities = activities.filter(a => new Date(a.timestamp) > thirtyDaysAgo);
  if (recentActivities.length >= 5) {
    totalScore += 10;
  }
  
  return Math.min(100, totalScore);
}

/**
 * Calculate engagement score
 */
function calculateEngagementScore(lead: Lead): number {
  let score = 50; // Base score
  
  const activities = lead.activities;
  
  // Email engagement rate
  const emailActivities = activities.filter(a => a.type.startsWith("email"));
  if (emailActivities.length > 0) {
    const opens = emailActivities.filter(a => a.type === "email_open").length;
    const clicks = emailActivities.filter(a => a.type === "email_click").length;
    const engagementRate = opens > 0 ? (opens + clicks) / emailActivities.length : 0;
    score += engagementRate * 30;
  }
  
  // High-value activities
  const highValueActivities = activities.filter(a => 
    ["demo_request", "meeting_booked", "webinar_attend"].includes(a.type)
  );
  score += highValueActivities.length * 15;
  
  // Content engagement
  const contentActivities = activities.filter(a => a.type === "content_download");
  score += contentActivities.length * 8;
  
  // Multi-channel engagement
  const channels = new Set(activities.map(a => a.type.split('_')[0]));
  if (channels.size >= 3) {
    score += 10;
  }
  
  return Math.min(100, score);
}

/**
 * Calculate timing score
 */
function calculateTimingScore(lead: Lead): number {
  let score = 50;
  
  // Timeline urgency
  if (lead.demographics.timeline) {
    const timeline = lead.demographics.timeline.toLowerCase();
    if (timeline.includes("immediate") || timeline.includes("asap")) {
      score += 25;
    } else if (timeline.includes("month") || timeline.includes("quarter")) {
      score += 15;
    } else if (timeline.includes("year")) {
      score += 5;
    }
  }
  
  // Recency of first activity
  if (lead.activities.length > 0) {
    const firstActivity = new Date(lead.activities[0].timestamp);
    const daysSinceFirst = Math.floor((new Date().getTime() - firstActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceFirst <= 7) {
      score += 15;
    } else if (daysSinceFirst <= 30) {
      score += 10;
    } else if (daysSinceFirst <= 90) {
      score += 5;
    }
  }
  
  // Activity velocity (recent activity spike)
  const now = new Date();
  const last7Days = activities.filter(a => 
    new Date(a.timestamp) > new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  );
  const previous7Days = activities.filter(a => {
    const date = new Date(a.timestamp);
    return date > new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000) && 
           date <= new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  });
  
  if (last7Days.length > previous7Days.length * 1.5) {
    score += 10; // Activity increasing
  }
  
  return Math.min(100, score);
}

/**
 * Calculate budget score
 */
function calculateBudgetScore(demographics: LeadDemographics): number {
  let score = 50;
  
  // Budget range
  if (demographics.budget) {
    const budget = demographics.budget.toLowerCase();
    if (budget.includes("100k+") || budget.includes("unlimited")) {
      score += 30;
    } else if (budget.includes("50k") || budget.includes("75k")) {
      score += 25;
    } else if (budget.includes("25k") || budget.includes("35k")) {
      score += 20;
    } else if (budget.includes("10k") || budget.includes("15k")) {
      score += 15;
    } else if (budget.includes("5k")) {
      score += 10;
    }
  }
  
  // Company size proxy for budget
  if (demographics.income) {
    const income = demographics.income.toLowerCase();
    if (income.includes("high") || income.includes("enterprise")) {
      score += 15;
    } else if (income.includes("medium") || income.includes("mid")) {
      score += 10;
    }
  }
  
  return Math.min(100, score);
}

/**
 * Calculate overall fit score
 */
function calculateFitScore(
  lead: Lead,
  historicalData?: {
    convertedLeads: Lead[];
    lostLeads: Lead[];
    averageDealSize: number;
    conversionRate: number;
  }
): number {
  let score = 50;
  
  if (!historicalData) return score;
  
  // Similarity to converted leads
  const similarityScore = calculateLeadSimilarity(lead, historicalData.convertedLeads);
  score += similarityScore * 25;
  
  // Dissimilarity to lost leads
  const lostSimilarityScore = calculateLeadSimilarity(lead, historicalData.lostLeads);
  score -= lostSimilarityScore * 15;
  
  // Market fit based on conversion rate
  if (historicalData.conversionRate > 0.2) {
    score += 10;
  } else if (historicalData.conversionRate > 0.1) {
    score += 5;
  }
  
  return Math.min(100, Math.max(0, score));
}

/**
 * Calculate lead similarity to historical leads
 */
function calculateLeadSimilarity(lead: Lead, comparisonLeads: Lead[]): number {
  if (comparisonLeads.length === 0) return 0;
  
  let totalSimilarity = 0;
  
  comparisonLeads.forEach(comparisonLead => {
    let similarity = 0;
    
    // Industry match
    if (lead.industry && comparisonLead.industry && lead.industry === comparisonLead.industry) {
      similarity += 25;
    }
    
    // Company size match
    if (lead.companySize && comparisonLead.companySize && lead.companySize === comparisonLead.companySize) {
      similarity += 20;
    }
    
    // Job title level match
    if (lead.jobTitle && comparisonLead.jobTitle) {
      const leadLevel = getJobTitleLevel(lead.jobTitle);
      const comparisonLevel = getJobTitleLevel(comparisonLead.jobTitle);
      if (leadLevel === comparisonLevel) {
        similarity += 15;
      }
    }
    
    // Source match
    if (lead.source === comparisonLead.source) {
      similarity += 10;
    }
    
    totalSimilarity += similarity;
  });
  
  return totalSimilarity / comparisonLeads.length;
}

/**
 * Get job title level
 */
function getJobTitleLevel(title: string): "executive" | "management" | "professional" | "individual" {
  const lowerTitle = title.toLowerCase();
  
  if (lowerTitle.includes("ceo") || lowerTitle.includes("president") || lowerTitle.includes("founder")) {
    return "executive";
  } else if (lowerTitle.includes("manager") || lowerTitle.includes("director") || lowerTitle.includes("vp")) {
    return "management";
  } else if (lowerTitle.includes("senior") || lowerTitle.includes("lead") || lowerTitle.includes("principal")) {
    return "professional";
  } else {
    return "individual";
  }
}

/**
 * Generate lead predictions
 */
async function generateLeadPredictions(
  lead: Lead,
  score: number,
  historicalData?: any
): Promise<LeadPrediction[]> {
  const predictions: LeadPrediction[] = [];
  
  // Conversion likelihood
  predictions.push({
    type: "conversion",
    prediction: score,
    confidence: 0.75,
    reasoning: `Based on lead score of ${score} and historical patterns`,
  });
  
  // Timeline prediction
  const timelinePrediction = predictTimeline(lead, score);
  predictions.push(timelinePrediction);
  
  // Deal size prediction
  const dealSizePrediction = predictDealSize(lead, score);
  predictions.push(dealSizePrediction);
  
  // Churn risk
  const churnRisk = predictChurnRisk(lead, score);
  predictions.push(churnRisk);
  
  return predictions;
}

/**
 * Predict conversion timeline
 */
function predictTimeline(lead: Lead, score: number): LeadPrediction {
  let timeline = "3-6 months";
  let confidence = 0.6;
  
  if (score >= 80) {
    timeline = "1-2 months";
    confidence = 0.8;
  } else if (score >= 60) {
    timeline = "2-4 months";
    confidence = 0.7;
  } else if (score < 40) {
    timeline = "6+ months";
    confidence = 0.5;
  }
  
  // Override with explicit timeline if available
  if (lead.demographics.timeline) {
    timeline = lead.demographics.timeline;
    confidence = 0.9;
  }
  
  return {
    type: "timeline",
    prediction: timeline,
    confidence,
    reasoning: `Based on lead score ${score} and stated timeline`,
  };
}

/**
 * Predict deal size
 */
function predictDealSize(lead: Lead, score: number): LeadPrediction {
  let dealSize = "$10,000";
  let confidence = 0.5;
  
  // Base on company size and budget
  if (lead.companySize === "1000+" || lead.demographics.budget?.includes("100k")) {
    dealSize = "$50,000+";
    confidence = 0.7;
  } else if (lead.companySize === "501-1000" || lead.demographics.budget?.includes("50k")) {
    dealSize = "$25,000-$50,000";
    confidence = 0.6;
  } else if (lead.companySize === "201-500") {
    dealSize = "$15,000-$25,000";
    confidence = 0.6;
  } else {
    dealSize = "$5,000-$15,000";
    confidence = 0.5;
  }
  
  return {
    type: "deal_size",
    prediction: dealSize,
    confidence,
    reasoning: `Based on company size ${lead.companySize} and budget indicators`,
  };
}

/**
 * Predict churn risk
 */
function predictChurnRisk(lead: Lead, score: number): LeadPrediction {
  let risk = "low";
  let confidence = 0.7;
  
  if (score < 30) {
    risk = "high";
    confidence = 0.8;
  } else if (score < 50) {
    risk = "medium";
    confidence = 0.7;
  } else {
    risk = "low";
    confidence = 0.6;
  }
  
  return {
    type: "churn_risk",
    prediction: risk,
    confidence,
    reasoning: `Based on lead score ${score} and engagement patterns`,
  };
}

/**
 * Generate lead recommendations
 */
function generateLeadRecommendations(
  lead: Lead,
  factors: ScoreFactor[],
  predictions: LeadPrediction[]
): string[] {
  const recommendations: string[] = [];
  
  // Based on score factors
  const lowScoringFactors = factors.filter(f => f.score < 50);
  
  if (lowScoringFactors.some(f => f.category === "engagement")) {
    recommendations.push("Increase engagement through personalized content and follow-ups");
  }
  
  if (lowScoringFactors.some(f => f.category === "activity")) {
    recommendations.push("Nurture with more touchpoints and valuable content");
  }
  
  if (lowScoringFactors.some(f => f.category === "demographics")) {
    recommendations.push("Verify lead information and assess better fit");
  }
  
  // Based on predictions
  const conversionPred = predictions.find(p => p.type === "conversion");
  if (conversionPred && typeof conversionPred.prediction === "number" && conversionPred.prediction > 70) {
    recommendations.push("Prioritize for immediate follow-up and demo scheduling");
  }
  
  const timelinePred = predictions.find(p => p.type === "timeline");
  if (timelinePred && typeof timelinePred.prediction === "string" && timelinePred.prediction.includes("1-2")) {
    recommendations.push("Accelerate sales cycle with urgent messaging and limited-time offers");
  }
  
  // Based on lead characteristics
  if (lead.demographics.decisionMaker) {
    recommendations.push("Focus on ROI and business value messaging");
  }
  
  if (lead.activities.some(a => a.type === "demo_request")) {
    recommendations.push("Prepare personalized demo addressing specific pain points");
  }
  
  return recommendations;
}

/**
 * Calculate lead grade
 */
function calculateLeadGrade(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 80) return "A";
  if (score >= 60) return "B";
  if (score >= 40) return "C";
  if (score >= 20) return "D";
  return "F";
}

/**
 * Batch score multiple leads
 */
export async function batchScoreLeads(
  leads: Lead[],
  historicalData?: any
): Promise<LeadScore[]> {
  const scores: LeadScore[] = [];
  
  for (const lead of leads) {
    const score = await scoreLead(lead, historicalData);
    scores.push(score);
  }
  
  return scores;
}

/**
 * Update lead score with new activity
 */
export async function updateLeadScore(
  existingScore: LeadScore,
  newActivity: LeadActivity,
  lead: Lead
): Promise<LeadScore> {
  // Add new activity to lead
  const updatedLead = {
    ...lead,
    activities: [...lead.activities, newActivity],
  };
  
  // Recalculate score
  const newScore = await scoreLead(updatedLead);
  
  // Calculate trend
  const trend = newScore.totalScore > existingScore.totalScore ? "improving" :
               newScore.totalScore < existingScore.totalScore ? "declining" : "stable";
  
  return {
    ...newScore,
    trend,
  };
}
