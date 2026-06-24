/**
 * Deal Intelligence and Forecasting for Sales Department
 * Provides AI-powered insights on pipeline health and revenue predictions
 */

export interface Deal {
  id: string;
  name: string;
  clientId: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate: string;
  createdAt: string;
  lastActivity: string;
  activities: DealActivity[];
  products: Product[];
  team: TeamMember[];
  competitors: Competitor[];
  riskFactors: RiskFactor[];
}

export interface DealActivity {
  type: "meeting" | "call" | "email" | "demo" | "proposal_sent" | "negotiation";
  timestamp: string;
  outcome: string;
  nextStep?: string;
  sentiment: "positive" | "neutral" | "negative";
}

export interface Product {
  name: string;
  category: string;
  margin: number;
  competitionLevel: "low" | "medium" | "high";
}

export interface TeamMember {
  name: string;
  role: string;
  involvement: number; // 0-100%
}

export interface Competitor {
  name: string;
  strength: "weak" | "moderate" | "strong";
  pricing: "lower" | "similar" | "higher";
}

export interface RiskFactor {
  type: "timing" | "budget" | "competition" | "technical" | "relationship";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  mitigation?: string;
}

export interface PipelineAnalysis {
  totalValue: number;
  weightedValue: number;
  dealCount: number;
  averageDealSize: number;
  conversionRate: number;
  salesCycleLength: number;
  stageDistribution: Record<string, number>;
  healthScore: number;
  trends: PipelineTrend[];
}

export interface PipelineTrend {
  metric: string;
  direction: "up" | "down" | "stable";
  change: number;
  period: string;
}

export interface ForecastResult {
  period: string;
  predictedRevenue: number;
  confidence: number;
  factors: ForecastFactor[];
  scenarios: ForecastScenario[];
  recommendations: string[];
}

export interface ForecastFactor {
  factor: string;
  impact: number;
  weight: number;
  description: string;
}

export interface ForecastScenario {
  name: "pessimistic" | "realistic" | "optimistic";
  revenue: number;
  probability: number;
  assumptions: string[];
}

/**
 * Analyze entire sales pipeline
 */
export async function analyzePipeline(
  deals: Deal[],
  historicalData?: {
    previousPeriods: PipelineAnalysis[];
    seasonalityData: Record<string, number>;
    teamPerformance: Record<string, number>;
  }
): Promise<PipelineAnalysis> {
  // Step 1: Calculate basic metrics
  const totalValue = deals.reduce((sum, deal) => sum + deal.value, 0);
  const weightedValue = deals.reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
  const averageDealSize = totalValue / deals.length;
  
  // Step 2: Calculate conversion rate
  const conversionRate = calculateConversionRate(deals, historicalData);
  
  // Step 3: Analyze sales cycle length
  const salesCycleLength = calculateSalesCycleLength(deals);
  
  // Step 4: Analyze stage distribution
  const stageDistribution = calculateStageDistribution(deals);
  
  // Step 5: Calculate health score
  const healthScore = calculatePipelineHealth(deals, conversionRate, salesCycleLength);
  
  // Step 6: Identify trends
  const trends = identifyPipelineTrends(deals, historicalData);

  return {
    totalValue,
    weightedValue,
    dealCount: deals.length,
    averageDealSize,
    conversionRate,
    salesCycleLength,
    stageDistribution,
    healthScore,
    trends,
  };
}

/**
 * Generate revenue forecast
 */
export async function generateRevenueForecast(
  deals: Deal[],
  pipeline: PipelineAnalysis,
  forecastPeriod: "monthly" | "quarterly" | "annual",
  periods: number = 3
): Promise<ForecastResult[]> {
  const forecasts: ForecastResult[] = [];

  for (let i = 0; i < periods; i++) {
    const period = calculateForecastPeriod(forecastPeriod, i);
    
    // Step 1: Base forecast from pipeline
    const baseRevenue = calculateBaseRevenue(deals, period);
    
    // Step 2: Apply historical patterns
    const adjustedRevenue = applyHistoricalPatterns(baseRevenue, period, pipeline);
    
    // Step 3: Calculate confidence
    const confidence = calculateForecastConfidence(deals, pipeline, period);
    
    // Step 4: Generate scenarios
    const scenarios = generateForecastScenarios(adjustedRevenue, confidence);
    
    // Step 5: Identify influencing factors
    const factors = identifyForecastFactors(deals, pipeline, period);
    
    // Step 6: Generate recommendations
    const recommendations = generateForecastRecommendations(factors, scenarios);

    forecasts.push({
      period,
      predictedRevenue: adjustedRevenue,
      confidence,
      factors,
      scenarios,
      recommendations,
    });
  }

  return forecasts;
}

/**
 * Analyze individual deal health
 */
export async function analyzeDealHealth(deal: Deal): Promise<{
  healthScore: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  insights: string[];
  recommendations: string[];
  winProbability: number;
}> {
  // Step 1: Calculate activity score
  const activityScore = calculateDealActivityScore(deal);
  
  // Step 2: Calculate engagement score
  const engagementScore = calculateDealEngagementScore(deal);
  
  // Step 3: Calculate risk score
  const riskScore = calculateDealRiskScore(deal);
  
  // Step 4: Calculate competitive position
  const competitiveScore = calculateCompetitivePosition(deal);
  
  // Step 5: Calculate timing score
  const timingScore = calculateTimingScore(deal);
  
  // Step 6: Combine scores
  const healthScore = (activityScore * 0.2) + (engagementScore * 0.3) + 
                     ((100 - riskScore) * 0.25) + (competitiveScore * 0.15) + 
                     (timingScore * 0.1);
  
  // Step 7: Generate insights
  const insights = generateDealInsights(deal, {
    activityScore,
    engagementScore,
    riskScore,
    competitiveScore,
    timingScore,
  });
  
  // Step 8: Generate recommendations
  const recommendations = generateDealRecommendations(deal, insights);
  
  // Step 9: Calculate win probability
  const winProbability = calculateWinProbability(deal, healthScore);

  return {
    healthScore: Math.round(healthScore),
    riskLevel: determineRiskLevel(healthScore),
    insights,
    recommendations,
    winProbability,
  };
}

/**
 * Calculate conversion rate
 */
function calculateConversionRate(
  deals: Deal[],
  historicalData?: any
): number {
  // Simplified calculation - in real implementation would use historical data
  const qualifiedDeals = deals.filter(deal => deal.probability >= 50);
  const highValueDeals = deals.filter(deal => deal.value > 10000);
  
  if (deals.length === 0) return 0;
  
  // Base conversion rate with adjustments
  let conversionRate = 0.25; // 25% base rate
  
  if (qualifiedDeals.length / deals.length > 0.5) {
    conversionRate += 0.1; // More qualified deals
  }
  
  if (highValueDeals.length / deals.length > 0.3) {
    conversionRate += 0.05; // More high-value deals
  }
  
  if (historicalData?.previousPeriods?.length > 0) {
    const lastPeriod = historicalData.previousPeriods[0];
    if (lastPeriod.conversionRate > 0) {
      conversionRate = (conversionRate + lastPeriod.conversionRate) / 2;
    }
  }
  
  return Math.min(1, conversionRate);
}

/**
 * Calculate sales cycle length
 */
function calculateSalesCycleLength(deals: Deal[]): number {
  if (deals.length === 0) return 0;
  
  const closedDeals = deals.filter(deal => deal.stage === "closed-won");
  if (closedDeals.length === 0) return 60; // Default 60 days
  
  const totalDays = closedDeals.reduce((sum, deal) => {
    const created = new Date(deal.createdAt);
    const closed = new Date(deal.expectedCloseDate);
    return sum + Math.floor((closed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);
  
  return Math.round(totalDays / closedDeals.length);
}

/**
 * Calculate stage distribution
 */
function calculateStageDistribution(deals: Deal[]): Record<string, number> {
  const distribution: Record<string, number> = {};
  
  deals.forEach(deal => {
    distribution[deal.stage] = (distribution[deal.stage] || 0) + 1;
  });
  
  return distribution;
}

/**
 * Calculate pipeline health score
 */
function calculatePipelineHealth(
  deals: Deal[],
  conversionRate: number,
  salesCycleLength: number
): number {
  let healthScore = 50; // Base score
  
  // Deal quantity
  if (deals.length >= 10) healthScore += 10;
  else if (deals.length >= 5) healthScore += 5;
  
  // Average deal size
  const avgValue = deals.reduce((sum, d) => sum + d.value, 0) / deals.length;
  if (avgValue >= 50000) healthScore += 10;
  else if (avgValue >= 25000) healthScore += 5;
  
  // Conversion rate
  if (conversionRate >= 0.3) healthScore += 15;
  else if (conversionRate >= 0.2) healthScore += 10;
  else if (conversionRate >= 0.1) healthScore += 5;
  
  // Sales cycle length (shorter is better)
  if (salesCycleLength <= 30) healthScore += 15;
  else if (salesCycleLength <= 60) healthScore += 10;
  else if (salesCycleLength <= 90) healthScore += 5;
  
  return Math.min(100, healthScore);
}

/**
 * Identify pipeline trends
 */
function identifyPipelineTrends(
  deals: Deal[],
  historicalData?: any
): PipelineTrend[] {
  const trends: PipelineTrend[] = [];
  
  if (!historicalData?.previousPeriods || historicalData.previousPeriods.length === 0) {
    return trends;
  }
  
  const current = deals;
  const previous = historicalData.previousPeriods[0];
  
  // Deal count trend
  const dealCountChange = (current.length - previous.dealCount) / previous.dealCount;
  trends.push({
    metric: "Deal Count",
    direction: dealCountChange > 0.1 ? "up" : dealCountChange < -0.1 ? "down" : "stable",
    change: Math.abs(dealCountChange * 100),
    period: "vs last period",
  });
  
  // Value trend
  const currentValue = current.reduce((sum, d) => sum + d.value, 0);
  const previousValue = previous.totalValue;
  const valueChange = (currentValue - previousValue) / previousValue;
  trends.push({
    metric: "Pipeline Value",
    direction: valueChange > 0.1 ? "up" : valueChange < -0.1 ? "down" : "stable",
    change: Math.abs(valueChange * 100),
    period: "vs last period",
  });
  
  return trends;
}

/**
 * Calculate base revenue from pipeline
 */
function calculateBaseRevenue(deals: Deal[], period: string): number {
  // Simple calculation based on deals expected to close in period
  const periodEnd = new Date(period);
  
  return deals
    .filter(deal => new Date(deal.expectedCloseDate) <= periodEnd)
    .reduce((sum, deal) => sum + (deal.value * deal.probability / 100), 0);
}

/**
 * Apply historical patterns to forecast
 */
function applyHistoricalPatterns(
  baseRevenue: number,
  period: string,
  pipeline: PipelineAnalysis
): number {
  let adjustedRevenue = baseRevenue;
  
  // Apply conversion rate
  adjustedRevenue *= pipeline.conversionRate;
  
  // Apply seasonal adjustments (simplified)
  const month = new Date(period).getMonth();
  const seasonalMultiplier = getSeasonalMultiplier(month);
  adjustedRevenue *= seasonalMultiplier;
  
  return adjustedRevenue;
}

/**
 * Get seasonal multiplier
 */
function getSeasonalMultiplier(month: number): number {
  // Simplified seasonal patterns
  const multipliers = [0.9, 0.85, 0.95, 1.0, 1.05, 1.1, 1.15, 1.1, 1.05, 1.0, 0.95, 0.9];
  return multipliers[month] || 1.0;
}

/**
 * Calculate forecast confidence
 */
function calculateForecastConfidence(
  deals: Deal[],
  pipeline: PipelineAnalysis,
  period: string
): number {
  let confidence = 0.7; // Base confidence
  
  // More deals = higher confidence
  if (deals.length >= 20) confidence += 0.1;
  else if (deals.length >= 10) confidence += 0.05;
  
  // Higher conversion rate = higher confidence
  if (pipeline.conversionRate >= 0.3) confidence += 0.1;
  else if (pipeline.conversionRate >= 0.2) confidence += 0.05;
  
  // Better pipeline health = higher confidence
  if (pipeline.healthScore >= 80) confidence += 0.1;
  else if (pipeline.healthScore >= 60) confidence += 0.05;
  
  return Math.min(0.95, confidence);
}

/**
 * Generate forecast scenarios
 */
function generateForecastScenarios(
  baseRevenue: number,
  confidence: number
): ForecastScenario[] {
  const variance = 1 - confidence;
  
  return [
    {
      name: "pessimistic",
      revenue: baseRevenue * (1 - variance * 0.3),
      probability: 0.2,
      assumptions: ["Lower conversion rate", "Longer sales cycle", "Increased competition"],
    },
    {
      name: "realistic",
      revenue: baseRevenue,
      probability: 0.6,
      assumptions: ["Current trends continue", "Normal conversion rates", "Market stability"],
    },
    {
      name: "optimistic",
      revenue: baseRevenue * (1 + variance * 0.2),
      probability: 0.2,
      assumptions: ["Higher conversion rate", "Shorter sales cycle", "Market expansion"],
    },
  ];
}

/**
 * Identify forecast factors
 */
function identifyForecastFactors(
  deals: Deal[],
  pipeline: PipelineAnalysis,
  period: string
): ForecastFactor[] {
  return [
    {
      factor: "Pipeline Size",
      impact: deals.length / 10, // Normalized
      weight: 0.3,
      description: `Current pipeline has ${deals.length} active deals`,
    },
    {
      factor: "Conversion Rate",
      impact: pipeline.conversionRate,
      weight: 0.25,
      description: `Historical conversion rate of ${(pipeline.conversionRate * 100).toFixed(1)}%`,
    },
    {
      factor: "Deal Quality",
      impact: pipeline.healthScore / 100,
      weight: 0.2,
      description: `Pipeline health score of ${pipeline.healthScore}`,
    },
    {
      factor: "Sales Cycle",
      impact: Math.max(0, 1 - pipeline.salesCycleLength / 90),
      weight: 0.15,
      description: `Average sales cycle of ${pipeline.salesCycleLength} days`,
    },
    {
      factor: "Market Conditions",
      impact: 0.8, // Would be calculated from market data
      weight: 0.1,
      description: "Current market conditions are favorable",
    },
  ];
}

/**
 * Generate forecast recommendations
 */
function generateForecastRecommendations(
  factors: ForecastFactor[],
  scenarios: ForecastScenario[]
): string[] {
  const recommendations: string[] = [];
  
  // Based on factors
  const lowImpactFactors = factors.filter(f => f.impact < 0.5);
  if (lowImpactFactors.length > 0) {
    recommendations.push(`Focus on improving ${lowImpactFactors.map(f => f.factor).join(" and ")}`);
  }
  
  // Based on scenarios
  const pessimisticGap = scenarios[0].revenue - scenarios[1].revenue;
  if (Math.abs(pessimisticGap) > scenarios[1].revenue * 0.2) {
    recommendations.push("Develop contingency plans for downside scenarios");
  }
  
  // General recommendations
  recommendations.push("Increase prospecting activity to build pipeline buffer");
  recommendations.push("Focus on high-probability deals to ensure quarterly targets");
  
  return recommendations;
}

/**
 * Calculate forecast period
 */
function calculateForecastPeriod(
  forecastPeriod: "monthly" | "quarterly" | "annual",
  offset: number
): string {
  const now = new Date();
  const period = new Date(now);
  
  switch (forecastPeriod) {
    case "monthly":
      period.setMonth(period.getMonth() + offset);
      break;
    case "quarterly":
      period.setMonth(period.getMonth() + (offset * 3));
      break;
    case "annual":
      period.setFullYear(period.getFullYear() + offset);
      break;
  }
  
  return period.toISOString().split('T')[0];
}

/**
 * Calculate deal activity score
 */
function calculateDealActivityScore(deal: Deal): number {
  if (deal.activities.length === 0) return 20;
  
  const now = new Date();
  const recentActivities = deal.activities.filter(
    activity => new Date(activity.timestamp) > new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  );
  
  const activityScore = Math.min(100, (recentActivities.length / 5) * 100);
  return activityScore;
}

/**
 * Calculate deal engagement score
 */
function calculateDealEngagementScore(deal: Deal): number {
  if (deal.activities.length === 0) return 20;
  
  const positiveActivities = deal.activities.filter(a => a.sentiment === "positive").length;
  const totalActivities = deal.activities.length;
  
  return (positiveActivities / totalActivities) * 100;
}

/**
 * Calculate deal risk score
 */
function calculateDealRiskScore(deal: Deal): number {
  let riskScore = 0;
  
  deal.riskFactors.forEach(risk => {
    const severityWeight = {
      low: 5,
      medium: 15,
      high: 25,
      critical: 40,
    };
    riskScore += severityWeight[risk.severity] || 0;
  });
  
  return Math.min(100, riskScore);
}

/**
 * Calculate competitive position
 */
function calculateCompetitivePosition(deal: Deal): number {
  if (deal.competitors.length === 0) return 80;
  
  const strongCompetitors = deal.competitors.filter(c => c.strength === "strong").length;
  const baseScore = 80 - (strongCompetitors * 20);
  
  return Math.max(20, baseScore);
}

/**
 * Calculate timing score
 */
function calculateTimingScore(deal: Deal): number {
  const now = new Date();
  const expectedClose = new Date(deal.expectedCloseDate);
  const daysToClose = Math.floor((expectedClose.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (daysToClose < 0) return 20; // Overdue
  if (daysToClose <= 30) return 80; // Good timing
  if (daysToClose <= 90) return 60; // Reasonable
  return 40; // Too far out
}

/**
 * Generate deal insights
 */
function generateDealInsights(
  deal: Deal,
  scores: Record<string, number>
): string[] {
  const insights: string[] = [];
  
  if (scores.activityScore < 50) {
    insights.push("Low recent activity - may need engagement boost");
  }
  
  if (scores.engagementScore < 60) {
    insights.push("Mixed sentiment in recent interactions");
  }
  
  if (deal.competitors.length > 0) {
    insights.push(`Facing competition from ${deal.competitors.map(c => c.name).join(", ")}`);
  }
  
  if (deal.probability > 70 && scores.riskScore > 50) {
    insights.push("High probability but notable risks present");
  }
  
  return insights;
}

/**
 * Generate deal recommendations
 */
function generateDealRecommendations(
  deal: Deal,
  insights: string[]
): string[] {
  const recommendations: string[] = [];
  
  insights.forEach(insight => {
    if (insight.includes("activity")) {
      recommendations.push("Schedule follow-up meeting to re-engage client");
    }
    if (insight.includes("sentiment")) {
      recommendations.push("Address concerns and reinforce value proposition");
    }
    if (insight.includes("competition")) {
      recommendations.push("Highlight competitive advantages and differentiators");
    }
    if (insight.includes("risks")) {
      recommendations.push("Develop risk mitigation plan and update stakeholder");
    }
  });
  
  if (deal.probability > 80) {
    recommendations.push("Prepare for closing - finalize terms and next steps");
  }
  
  return recommendations;
}

/**
 * Calculate win probability
 */
function calculateWinProbability(deal: Deal, healthScore: number): number {
  // Combine existing probability with health score
  const adjustedProbability = (deal.probability * 0.6) + (healthScore * 0.4);
  return Math.round(adjustedProbability);
}

/**
 * Determine risk level
 */
function determineRiskLevel(healthScore: number): "low" | "medium" | "high" | "critical" {
  if (healthScore >= 80) return "low";
  if (healthScore >= 60) return "medium";
  if (healthScore >= 40) return "high";
  return "critical";
}

/**
 * Calculate forecast period
 */
function calculateForecastPeriod(
  forecastPeriod: "monthly" | "quarterly" | "annual",
  offset: number
): string {
  const now = new Date();
  const period = new Date(now);
  
  switch (forecastPeriod) {
    case "monthly":
      period.setMonth(period.getMonth() + offset);
      break;
    case "quarterly":
      period.setMonth(period.getMonth() + (offset * 3));
      break;
    case "annual":
      period.setFullYear(period.getFullYear() + offset);
      break;
  }
  
  return period.toISOString().split('T')[0];
}
