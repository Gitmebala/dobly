/**
 * Competitor Analysis for Sales Department
 * Tracks competitor activities, positioning, and market insights
 */

export interface Competitor {
  id: string;
  name: string;
  website: string;
  industry: string;
  size: "startup" | "small" | "medium" | "enterprise";
  founded: string;
  headquarters: string;
  description: string;
  strengths: string[];
  weaknesses: string[];
  marketPosition: "leader" | "challenger" | "follower" | "niche";
}

export interface CompetitorProduct {
  competitorId: string;
  name: string;
  category: string;
  features: string[];
  pricing: PricingInfo;
  targetMarket: string[];
  uniqueValueProp: string;
}

export interface PricingInfo {
  model: "one-time" | "subscription" | "freemium" | "usage-based";
  startingPrice: number;
  currency: string;
  tiers: PricingTier[];
}

export interface PricingTier {
  name: string;
  price: number;
  features: string[];
  target: string;
}

export interface CompetitorActivity {
  id: string;
  competitorId: string;
  type: "pricing_change" | "product_launch" | "marketing_campaign" | "partnership" | "funding" | "hiring" | "acquisition";
  title: string;
  description: string;
  date: string;
  source: string;
  impact: "high" | "medium" | "low";
  sentiment: "positive" | "neutral" | "negative";
}

export interface MarketInsight {
  id: string;
  category: "trend" | "threat" | "opportunity" | "benchmark";
  title: string;
  description: string;
  competitors: string[];
  impact: "high" | "medium" | "low";
  timeframe: "immediate" | "short-term" | "long-term";
  confidence: number;
  recommendations: string[];
}

export interface CompetitiveAnalysis {
  marketOverview: MarketOverview;
  competitorComparison: CompetitorComparison[];
  positioningMap: PositioningMap;
  pricingAnalysis: PricingAnalysis;
  threatAssessment: ThreatAssessment;
  opportunities: Opportunity[];
}

export interface MarketOverview {
  totalMarketSize: number;
  growthRate: number;
  keySegments: MarketSegment[];
  trends: string[];
  barriers: string[];
}

export interface MarketSegment {
  name: string;
  size: number;
  growth: number;
  competitors: string[];
}

export interface CompetitorComparison {
  competitor: string;
  strengths: string[];
  weaknesses: string[];
  marketShare: number;
  pricingPosition: "premium" | "mid-range" | "budget";
  innovationScore: number;
  customerSatisfaction: number;
}

export interface PositioningMap {
  axes: {
    x: string;
    y: string;
  };
  competitors: PositionPoint[];
}

export interface PositionPoint {
  name: string;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface PricingAnalysis {
  marketAverage: number;
  priceRange: {
    min: number;
    max: number;
    median: number;
  };
  pricingModels: Record<string, number>;
  competitiveIndex: number;
}

export interface ThreatAssessment {
  threats: Threat[];
  overallRisk: "low" | "medium" | "high";
  mitigation: string[];
}

export interface Threat {
  type: "price_war" | "feature_competition" | "market_share_loss" | "talent_poaching";
  severity: "low" | "medium" | "high";
  probability: number;
  impact: string;
  source: string[];
}

export interface Opportunity {
  type: "market_gap" | "competitive_weakness" | "pricing_advantage" | "feature_advantage";
  description: string;
  targetCompetitor?: string;
  potentialValue: number;
  effort: "low" | "medium" | "high";
  timeframe: string;
}

/**
 * Perform comprehensive competitive analysis
 */
export async function analyzeCompetition(
  competitors: Competitor[],
  products: CompetitorProduct[],
  activities: CompetitorActivity[],
  marketData?: MarketOverview
): Promise<CompetitiveAnalysis> {
  // Step 1: Analyze market overview
  const marketOverview = marketData || await analyzeMarketOverview(competitors);
  
  // Step 2: Compare competitors
  const competitorComparison = compareCompetitors(competitors, products);
  
  // Step 3: Create positioning map
  const positioningMap = createPositioningMap(competitors, products);
  
  // Step 4: Analyze pricing
  const pricingAnalysis = analyzePricing(products);
  
  // Step 5: Assess threats
  const threatAssessment = assessThreats(competitors, activities);
  
  // Step 6: Identify opportunities
  const opportunities = identifyOpportunities(competitors, products, pricingAnalysis);

  return {
    marketOverview,
    competitorComparison,
    positioningMap,
    pricingAnalysis,
    threatAssessment,
    opportunities,
  };
}

/**
 * Track competitor activities
 */
export async function trackCompetitorActivities(
  competitorId: string,
  timeRange: "week" | "month" | "quarter" = "month"
): Promise<CompetitorActivity[]> {
  // In a real implementation, this would fetch from web monitoring, news APIs, etc.
  const mockActivities: CompetitorActivity[] = [
    {
      id: "act-1",
      competitorId,
      type: "pricing_change",
      title: "New pricing tier announced",
      description: "Competitor launched new enterprise pricing tier with additional features",
      date: new Date().toISOString(),
      source: "company_website",
      impact: "medium",
      sentiment: "neutral",
    },
    {
      id: "act-2",
      competitorId,
      type: "product_launch",
      title: "Feature enhancement released",
      description: "Added AI-powered analytics to their core product",
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      source: "product_blog",
      impact: "high",
      sentiment: "positive",
    },
  ];

  return mockActivities;
}

/**
 * Generate competitive insights
 */
export async function generateCompetitiveInsights(
  analysis: CompetitiveAnalysis,
  ourPositioning: {
    strengths: string[];
    weaknesses: string[];
    pricing: PricingInfo;
    targetMarket: string[];
  }
): Promise<MarketInsight[]> {
  const insights: MarketInsight[] = [];

  // Pricing insights
  if (analysis.pricingAnalysis.competitiveIndex < 0.8) {
    insights.push({
      id: "insight-1",
      category: "opportunity",
      title: "Pricing advantage detected",
      description: "Our pricing is more competitive than market average",
      competitors: [],
      impact: "medium",
      timeframe: "short-term",
      confidence: 0.8,
      recommendations: ["Highlight pricing advantage in marketing", "Consider premium positioning"],
    });
  }

  // Market gap insights
  const underservedSegments = analysis.marketOverview.keySegments
    .filter(segment => segment.competitors.length < 2);
  
  if (underservedSegments.length > 0) {
    insights.push({
      id: "insight-2",
      category: "opportunity",
      title: "Underserved market segments identified",
      description: `Found ${underservedSegments.length} segments with limited competition`,
      competitors: underservedSegments.flatMap(s => s.competitors),
      impact: "high",
      timeframe: "medium-term",
      confidence: 0.7,
      recommendations: ["Develop targeted offerings for these segments", "Prioritize market entry"],
    });
  }

  // Threat insights
  if (analysis.threatAssessment.overallRisk === "high") {
    insights.push({
      id: "insight-3",
      category: "threat",
      title: "High competitive pressure detected",
      description: "Multiple competitors posing significant threats",
      competitors: analysis.competitorComparison.map(c => c.competitor),
      impact: "high",
      timeframe: "immediate",
      confidence: 0.9,
      recommendations: ["Accelerate differentiation strategy", "Strengthen customer relationships"],
    });
  }

  return insights;
}

/**
 * Analyze market overview
 */
async function analyzeMarketOverview(competitors: Competitor[]): Promise<MarketOverview> {
  // Simplified market analysis
  const totalMarketSize = 1000000000; // $1B market
  const growthRate = 0.15; // 15% growth

  const keySegments: MarketSegment[] = [
    {
      name: "Enterprise",
      size: 500000000,
      growth: 0.12,
      competitors: competitors.filter(c => c.size === "enterprise").map(c => c.name),
    },
    {
      name: "Mid-Market",
      size: 300000000,
      growth: 0.18,
      competitors: competitors.filter(c => c.size === "medium").map(c => c.name),
    },
    {
      name: "Small Business",
      size: 200000000,
      growth: 0.20,
      competitors: competitors.filter(c => c.size === "small").map(c => c.name),
    },
  ];

  return {
    totalMarketSize,
    growthRate,
    keySegments,
    trends: ["AI integration", "Remote work tools", "Automation", "Data analytics"],
    barriers: ["High switching costs", "Integration complexity", "Data security concerns"],
  };
}

/**
 * Compare competitors
 */
function compareCompetitors(
  competitors: Competitor[],
  products: CompetitorProduct[]
): CompetitorComparison[] {
  return competitors.map(competitor => {
    const competitorProducts = products.filter(p => p.competitorId === competitor.id);
    const avgPrice = competitorProducts.length > 0 
      ? competitorProducts.reduce((sum, p) => sum + p.pricing.startingPrice, 0) / competitorProducts.length
      : 0;

    return {
      competitor: competitor.name,
      strengths: competitor.strengths,
      weaknesses: competitor.weaknesses,
      marketShare: Math.random() * 0.3, // Mock data
      pricingPosition: avgPrice > 1000 ? "premium" : avgPrice > 500 ? "mid-range" : "budget",
      innovationScore: Math.random() * 100, // Mock data
      customerSatisfaction: 70 + Math.random() * 30, // Mock data
    };
  });
}

/**
 * Create positioning map
 */
function createPositioningMap(
  competitors: Competitor[],
  products: CompetitorProduct[]
): PositioningMap {
  const points: PositionPoint[] = competitors.map(competitor => {
    const competitorProducts = products.filter(p => p.competitorId === competitor.id);
    const avgPrice = competitorProducts.length > 0 
      ? competitorProducts.reduce((sum, p) => sum + p.pricing.startingPrice, 0) / competitorProducts.length
      : 500;

    return {
      name: competitor.name,
      x: avgPrice / 10, // Price axis
      y: competitor.strengths.length * 10, // Features/quality axis
      size: competitor.size === "enterprise" ? 30 : competitor.size === "medium" ? 20 : 10,
      color: competitor.marketPosition === "leader" ? "red" : 
             competitor.marketPosition === "challenger" ? "orange" : "blue",
    };
  });

  return {
    axes: {
      x: "Price (Low to High)",
      y: "Features/Quality (Low to High)",
    },
    competitors: points,
  };
}

/**
 * Analyze pricing
 */
function analyzePricing(products: CompetitorProduct[]): PricingAnalysis {
  const prices = products.map(p => p.pricing.startingPrice);
  const models = products.reduce((acc, p) => {
    acc[p.pricing.model] = (acc[p.pricing.model] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    marketAverage: prices.reduce((sum, p) => sum + p, 0) / prices.length,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      median: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)],
    },
    pricingModels: models,
    competitiveIndex: 0.8, // Mock calculation
  };
}

/**
 * Assess threats
 */
function assessThreats(
  competitors: Competitor[],
  activities: CompetitorActivity[]
): ThreatAssessment {
  const threats: Threat[] = [];

  // Price war threat
  const recentPriceChanges = activities.filter(a => 
    a.type === "pricing_change" && 
    new Date(a.date) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  );

  if (recentPriceChanges.length > 0) {
    threats.push({
      type: "price_war",
      severity: "medium",
      probability: 0.6,
      impact: "Margin pressure and competitive pricing",
      source: recentPriceChanges.map(a => a.competitorId),
    });
  }

  // Feature competition threat
  const recentFeatureLaunches = activities.filter(a => 
    a.type === "product_launch" && 
    a.impact === "high"
  );

  if (recentFeatureLaunches.length > 2) {
    threats.push({
      type: "feature_competition",
      severity: "high",
      probability: 0.8,
      impact: "Pressure to accelerate development",
      source: recentFeatureLaunches.map(a => a.competitorId),
    });
  }

  const overallRisk = threats.some(t => t.severity === "high") ? "high" :
                     threats.some(t => t.severity === "medium") ? "medium" : "low";

  return {
    threats,
    overallRisk,
    mitigation: [
      "Monitor competitor activities closely",
      "Develop rapid response capabilities",
      "Focus on differentiation",
      "Strengthen customer relationships",
    ],
  };
}

/**
 * Identify opportunities
 */
function identifyOpportunities(
  competitors: Competitor[],
  products: CompetitorProduct[],
  pricingAnalysis: PricingAnalysis
): Opportunity[] {
  const opportunities: Opportunity[] = [];

  // Pricing opportunities
  if (pricingAnalysis.competitiveIndex < 0.7) {
    opportunities.push({
      type: "pricing_advantage",
      description: "Significant pricing advantage over competitors",
      potentialValue: 100000,
      effort: "low",
      timeframe: "Immediate",
    });
  }

  // Feature gaps
  const allFeatures = new Set<string>();
  products.forEach(p => p.features.forEach(f => allFeatures.add(f)));
  
  const commonFeatures = Array.from(allFeatures).filter(feature => {
    const competitorsWithFeature = products.filter(p => p.features.includes(feature)).length;
    return competitorsWithFeature < products.length * 0.5; // Less than half have it
  });

  if (commonFeatures.length > 0) {
    opportunities.push({
      type: "feature_advantage",
      description: `Feature gap identified: ${commonFeatures[0]}`,
      potentialValue: 50000,
      effort: "medium",
      timeframe: "3-6 months",
    });
  }

  // Market positioning gaps
  const marketLeaders = competitors.filter(c => c.marketPosition === "leader");
  if (marketLeaders.length < 2) {
    opportunities.push({
      type: "market_gap",
      description: "Opportunity to establish market leadership",
      potentialValue: 500000,
      effort: "high",
      timeframe: "12-18 months",
    });
  }

  return opportunities;
}

/**
 * Generate competitive battle cards
 */
export async function generateBattleCards(
  competitor: Competitor,
  ourPositioning: {
    strengths: string[];
    weaknesses: string[];
    pricing: PricingInfo;
  }
): Promise<{
  overview: string;
  strengths: string[];
  weaknesses: string[];
  talkingPoints: string[];
  differentiators: string[];
  winStrategies: string[];
}> {
  const prompt = `Generate competitive battle card content for ${competitor.name}.

Competitor Info:
- Industry: ${competitor.industry}
- Size: ${competitor.size}
- Market Position: ${competitor.marketPosition}
- Strengths: ${competitor.strengths.join(", ")}
- Weaknesses: ${competitor.weaknesses.join(", ")}

Our Positioning:
- Strengths: ${ourPositioning.strengths.join(", ")}
- Pricing: ${ourPositioning.pricing.startingPrice} ${ourPositioning.pricing.currency}

Generate:
1. Brief competitor overview
2. Key strengths to acknowledge
3. Weaknesses to highlight
4. Talking points for sales conversations
5. Our key differentiators
6. Strategies to win against this competitor

Keep it concise, actionable, and focused on helping sales reps win deals.`;

  const content = await generateContentWithAI(prompt);

  // Parse and structure the generated content
  return {
    overview: `${competitor.name} is a ${competitor.size} company in the ${competitor.industry} space with a ${competitor.marketPosition} market position.`,
    strengths: competitor.strengths,
    weaknesses: competitor.weaknesses,
    talkingPoints: [
      "Acknowledge their strengths but pivot to our advantages",
      "Focus on areas where we outperform",
      "Highlight our unique value proposition",
    ],
    differentiators: ourPositioning.strengths,
    winStrategies: [
      "Emphasize our superior customer service",
      "Leverage our pricing advantage",
      "Focus on our unique features",
    ],
  };
}

/**
 * Generate content using AI
 */
async function generateContentWithAI(prompt: string): Promise<string> {
  // In a real implementation, this would call OpenAI, Anthropic, or another AI service
  console.log("Generating competitive analysis content with AI...");
  
  // Mock response
  return "This would be AI-generated competitive analysis content based on the provided prompt.";
}

/**
 * Update competitor intelligence
 */
export async function updateCompetitorIntelligence(
  competitorId: string,
  newActivities: CompetitorActivity[]
): Promise<{
  updated: boolean;
  insights: string[];
  alerts: string[];
}> {
  const insights: string[] = [];
  const alerts: string[] = [];

  // Analyze new activities for insights
  newActivities.forEach(activity => {
    if (activity.impact === "high") {
      insights.push(`High-impact activity: ${activity.title}`);
      if (activity.type === "pricing_change") {
        alerts.push("Competitor pricing change detected - review our positioning");
      }
    }
  });

  return {
    updated: true,
    insights,
    alerts,
  };
}
