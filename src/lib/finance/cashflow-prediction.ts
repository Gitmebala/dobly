/**
 * Cash Flow Prediction for Finance Department
 * Uses AI to forecast cash flow and identify potential issues
 */

export interface CashFlowData {
  date: string;
  openingBalance: number;
  inflows: CashFlowItem[];
  outflows: CashFlowItem[];
  netCashFlow: number;
  closingBalance: number;
}

export interface CashFlowItem {
  id: string;
  type: "revenue" | "payment" | "investment" | "expense" | "payroll" | "tax" | "other";
  amount: number;
  category: string;
  description: string;
  expectedDate: string;
  actualDate?: string;
  probability: number; // 0-100% for expected items
  recurring?: {
    frequency: "daily" | "weekly" | "monthly" | "quarterly" | "annually";
    nextDate?: string;
    endDate?: string;
  };
}

export interface CashFlowPrediction {
  period: string;
  startDate: string;
  endDate: string;
  openingBalance: number;
  predictedInflows: PredictedCashFlow[];
  predictedOutflows: PredictedCashFlow[];
  netCashFlow: number;
  closingBalance: number;
  confidence: number;
  factors: PredictionFactor[];
  scenarios: CashFlowScenario[];
  alerts: CashFlowAlert[];
  recommendations: CashFlowRecommendation[];
}

export interface PredictedCashFlow extends CashFlowItem {
  predictedAmount: number;
  variance: number;
  confidence: number;
}

export interface PredictionFactor {
  factor: string;
  impact: number; // -1 to 1
  weight: number;
  description: string;
  historical: number[];
}

export interface CashFlowScenario {
  name: "pessimistic" | "realistic" | "optimistic";
  netCashFlow: number;
  closingBalance: number;
  probability: number;
  assumptions: string[];
}

export interface CashFlowAlert {
  type: "shortfall" | "surplus" | "volatility" | "trend";
  severity: "info" | "warning" | "critical";
  date: string;
  amount: number;
  description: string;
  threshold: number;
}

export interface CashFlowRecommendation {
  type: "payment_terms" | "expense_control" | "investment" | "financing" | "collection";
  priority: "low" | "medium" | "high" | "urgent";
  action: string;
  impact: string;
  timeframe: string;
  amount?: number;
}

/**
 * Predict cash flow for specified period
 */
export async function predictCashFlow(
  historicalData: CashFlowData[],
  predictionPeriod: "weekly" | "monthly" | "quarterly",
  periods: number = 4,
  knownFutureItems?: CashFlowItem[]
): Promise<CashFlowPrediction[]> {
  const predictions: CashFlowPrediction[] = [];

  // Step 1: Analyze historical patterns
  const patterns = analyzeHistoricalPatterns(historicalData);
  
  // Step 2: Identify seasonal trends
  const seasonality = analyzeSeasonality(historicalData);
  
  // Step 3: Calculate growth rates
  const growthRates = calculateGrowthRates(historicalData);

  for (let i = 0; i < periods; i++) {
    const periodStart = calculatePeriodStart(predictionPeriod, i);
    const periodEnd = calculatePeriodEnd(predictionPeriod, i);
    
    // Step 4: Predict inflows
    const predictedInflows = predictInflows(
      historicalData,
      periodStart,
      periodEnd,
      patterns,
      seasonality,
      growthRates,
      knownFutureItems?.filter(item => item.type === "revenue" || item.type === "payment")
    );
    
    // Step 5: Predict outflows
    const predictedOutflows = predictOutflows(
      historicalData,
      periodStart,
      periodEnd,
      patterns,
      seasonality,
      growthRates,
      knownFutureItems?.filter(item => item.type === "expense" || item.type === "payroll" || item.type === "tax")
    );
    
    // Step 6: Calculate net cash flow and closing balance
    const openingBalance = i === 0 ? 
      historicalData[historicalData.length - 1]?.closingBalance || 0 :
      predictions[i - 1]?.closingBalance || 0;
    
    const netCashFlow = predictedInflows.reduce((sum, item) => sum + item.predictedAmount, 0) -
                        predictedOutflows.reduce((sum, item) => sum + item.predictedAmount, 0);
    
    const closingBalance = openingBalance + netCashFlow;
    
    // Step 7: Calculate confidence
    const confidence = calculatePredictionConfidence(
      historicalData,
      predictedInflows,
      predictedOutflows
    );
    
    // Step 8: Identify prediction factors
    const factors = identifyPredictionFactors(
      historicalData,
      patterns,
      seasonality,
      growthRates
    );
    
    // Step 9: Generate scenarios
    const scenarios = generateCashFlowScenarios(
      netCashFlow,
      closingBalance,
      confidence,
      predictedInflows,
      predictedOutflows
    );
    
    // Step 10: Generate alerts
    const alerts = generateCashFlowAlerts(
      openingBalance,
      netCashFlow,
      closingBalance,
      periodStart,
      periodEnd
    );
    
    // Step 11: Generate recommendations
    const recommendations = generateCashFlowRecommendations(
      netCashFlow,
      closingBalance,
      predictedInflows,
      predictedOutflows,
      alerts
    );

    predictions.push({
      period: `${predictionPeriod}_${i + 1}`,
      startDate: periodStart,
      endDate: periodEnd,
      openingBalance,
      predictedInflows,
      predictedOutflows,
      netCashFlow,
      closingBalance,
      confidence,
      factors,
      scenarios,
      alerts,
      recommendations,
    });
  }

  return predictions;
}

/**
 * Analyze historical patterns in cash flow data
 */
function analyzeHistoricalPatterns(data: CashFlowData[]): {
  inflowPatterns: CategoryPattern[];
  outflowPatterns: CategoryPattern[];
  volatility: number;
  trend: "increasing" | "decreasing" | "stable";
} {
  const inflowPatterns: CategoryPattern[] = [];
  const outflowPatterns: CategoryPattern[] = [];

  // Analyze inflow patterns by category
  const inflowCategories: Record<string, number[]> = {};
  data.forEach(period => {
    period.inflows.forEach(inflow => {
      if (!inflowCategories[inflow.category]) {
        inflowCategories[inflow.category] = [];
      }
      inflowCategories[inflow.category].push(inflow.amount);
    });
  });

  Object.entries(inflowCategories).forEach(([category, amounts]) => {
    const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
    
    inflowPatterns.push({
      category,
      averageAmount: avg,
      variance,
      seasonality: detectCategorySeasonality(amounts),
      growth: calculateCategoryGrowth(amounts),
    });
  });

  // Analyze outflow patterns by category
  const outflowCategories: Record<string, number[]> = {};
  data.forEach(period => {
    period.outflows.forEach(outflow => {
      if (!outflowCategories[outflow.category]) {
        outflowCategories[outflow.category] = [];
      }
      outflowCategories[outflow.category].push(outflow.amount);
    });
  });

  Object.entries(outflowCategories).forEach(([category, amounts]) => {
    const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
    const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / amounts.length;
    
    outflowPatterns.push({
      category,
      averageAmount: avg,
      variance,
      seasonality: detectCategorySeasonality(amounts),
      growth: calculateCategoryGrowth(amounts),
    });
  });

  // Calculate overall volatility
  const netFlows = data.map(d => d.netCashFlow);
  const avgNetFlow = netFlows.reduce((sum, flow) => sum + flow, 0) / netFlows.length;
  const volatility = Math.sqrt(
    netFlows.reduce((sum, flow) => sum + Math.pow(flow - avgNetFlow, 2), 0) / netFlows.length
  ) / Math.abs(avgNetFlow);

  // Determine trend
  const firstHalf = netFlows.slice(0, Math.floor(netFlows.length / 2));
  const secondHalf = netFlows.slice(Math.floor(netFlows.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, flow) => sum + flow, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, flow) => sum + flow, 0) / secondHalf.length;
  
  let trend: "increasing" | "decreasing" | "stable" = "stable";
  if (secondAvg > firstAvg * 1.1) trend = "increasing";
  else if (secondAvg < firstAvg * 0.9) trend = "decreasing";

  return {
    inflowPatterns,
    outflowPatterns,
    volatility,
    trend,
  };
}

/**
 * Analyze seasonality in cash flow data
 */
function analyzeSeasonality(data: CashFlowData[]): SeasonalityPattern {
  const monthlyData: Record<number, number[]> = {};
  
  data.forEach(period => {
    const month = new Date(period.date).getMonth();
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(period.netCashFlow);
  });

  const seasonalFactors: number[] = new Array(12).fill(1);
  const overallAvg = data.reduce((sum, period) => sum + period.netCashFlow, 0) / data.length;

  Object.entries(monthlyData).forEach(([month, values]) => {
    const monthAvg = values.reduce((sum, value) => sum + value, 0) / values.length;
    seasonalFactors[parseInt(month)] = monthAvg / overallAvg;
  });

  return {
    factors: seasonalFactors,
    strength: calculateSeasonalityStrength(seasonalFactors),
  };
}

/**
 * Calculate growth rates from historical data
 */
function calculateGrowthRates(data: CashFlowData[]): {
  revenueGrowth: number;
  expenseGrowth: number;
  netGrowth: number;
  volatility: number;
} {
  if (data.length < 2) {
    return { revenueGrowth: 0, expenseGrowth: 0, netGrowth: 0, volatility: 0 };
  }

  const revenues = data.map(d => 
    d.inflows.reduce((sum, item) => sum + item.amount, 0)
  );
  const expenses = data.map(d => 
    d.outflows.reduce((sum, item) => sum + item.amount, 0)
  );
  const netFlows = data.map(d => d.netCashFlow);

  // Calculate compound growth rates
  const periods = data.length - 1;
  const revenueGrowth = Math.pow(revenues[revenues.length - 1] / revenues[0], 1 / periods) - 1;
  const expenseGrowth = Math.pow(expenses[expenses.length - 1] / expenses[0], 1 / periods) - 1;
  const netGrowth = Math.pow(netFlows[netFlows.length - 1] / Math.abs(netFlows[0]), 1 / periods) - 1;

  // Calculate volatility
  const netReturns = netFlows.slice(1).map((flow, i) => (flow - netFlows[i]) / Math.abs(netFlows[i]));
  const avgReturn = netReturns.reduce((sum, ret) => sum + ret, 0) / netReturns.length;
  const volatility = Math.sqrt(
    netReturns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / netReturns.length
  );

  return {
    revenueGrowth,
    expenseGrowth,
    netGrowth,
    volatility,
  };
}

/**
 * Predict inflows for a period
 */
function predictInflows(
  historicalData: CashFlowData[],
  startDate: string,
  endDate: string,
  patterns: any,
  seasonality: SeasonalityPattern,
  growthRates: any,
  knownItems?: CashFlowItem[]
): PredictedCashFlow[] {
  const predictedInflows: PredictedCashFlow[] = [];

  // Add known future items
  if (knownItems) {
    knownItems.forEach(item => {
      const itemDate = new Date(item.expectedDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (itemDate >= start && itemDate <= end) {
        predictedInflows.push({
          ...item,
          predictedAmount: item.amount * (item.probability / 100),
          variance: item.amount * 0.1, // 10% variance
          confidence: item.probability / 100,
        });
      }
    });
  }

  // Predict recurring patterns
  patterns.inflowPatterns.forEach((pattern: CategoryPattern) => {
    const seasonalMultiplier = getSeasonalMultiplier(startDate, seasonality);
    const growthMultiplier = Math.pow(1 + growthRates.revenueGrowth, 1/12); // Monthly growth
    
    const predictedAmount = pattern.averageAmount * seasonalMultiplier * growthMultiplier;
    const variance = pattern.variance * seasonalMultiplier * growthMultiplier;
    
    predictedInflows.push({
      id: `predicted_${pattern.category}_${Date.now()}`,
      type: "revenue",
      amount: predictedAmount,
      category: pattern.category,
      description: `Predicted ${pattern.category} revenue`,
      expectedDate: startDate,
      probability: 80,
      predictedAmount,
      variance,
      confidence: 0.7,
    });
  });

  return predictedInflows;
}

/**
 * Predict outflows for a period
 */
function predictOutflows(
  historicalData: CashFlowData[],
  startDate: string,
  endDate: string,
  patterns: any,
  seasonality: SeasonalityPattern,
  growthRates: any,
  knownItems?: CashFlowItem[]
): PredictedCashFlow[] {
  const predictedOutflows: PredictedCashFlow[] = [];

  // Add known future items
  if (knownItems) {
    knownItems.forEach(item => {
      const itemDate = new Date(item.expectedDate);
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (itemDate >= start && itemDate <= end) {
        predictedOutflows.push({
          ...item,
          predictedAmount: item.amount * (item.probability / 100),
          variance: item.amount * 0.1,
          confidence: item.probability / 100,
        });
      }
    });
  }

  // Predict recurring patterns
  patterns.outflowPatterns.forEach((pattern: CategoryPattern) => {
    const seasonalMultiplier = getSeasonalMultiplier(startDate, seasonality);
    const growthMultiplier = Math.pow(1 + growthRates.expenseGrowth, 1/12);
    
    const predictedAmount = pattern.averageAmount * seasonalMultiplier * growthMultiplier;
    const variance = pattern.variance * seasonalMultiplier * growthMultiplier;
    
    predictedOutflows.push({
      id: `predicted_${pattern.category}_${Date.now()}`,
      type: "expense",
      amount: predictedAmount,
      category: pattern.category,
      description: `Predicted ${pattern.category} expense`,
      expectedDate: startDate,
      probability: 80,
      predictedAmount,
      variance,
      confidence: 0.7,
    });
  });

  return predictedOutflows;
}

/**
 * Generate cash flow scenarios
 */
function generateCashFlowScenarios(
  baseNetFlow: number,
  baseClosingBalance: number,
  confidence: number,
  inflows: PredictedCashFlow[],
  outflows: PredictedCashFlow[]
): CashFlowScenario[] {
  const variance = 1 - confidence;
  
  return [
    {
      name: "pessimistic",
      netCashFlow: baseNetFlow * (1 - variance * 0.3),
      closingBalance: baseClosingBalance * (1 - variance * 0.3),
      probability: 0.2,
      assumptions: [
        "Lower revenue collection",
        "Higher expenses",
        "Economic downturn",
      ],
    },
    {
      name: "realistic",
      netCashFlow: baseNetFlow,
      closingBalance: baseClosingBalance,
      probability: 0.6,
      assumptions: [
        "Normal business conditions",
        "Historical patterns continue",
        "No major disruptions",
      ],
    },
    {
      name: "optimistic",
      netCashFlow: baseNetFlow * (1 + variance * 0.2),
      closingBalance: baseClosingBalance * (1 + variance * 0.2),
      probability: 0.2,
      assumptions: [
        "Higher revenue collection",
        "Lower expenses",
        "Favorable market conditions",
      ],
    },
  ];
}

/**
 * Generate cash flow alerts
 */
function generateCashFlowAlerts(
  openingBalance: number,
  netCashFlow: number,
  closingBalance: number,
  startDate: string,
  endDate: string
): CashFlowAlert[] {
  const alerts: CashFlowAlert[] = [];

  // Cash shortfall alert
  const minimumBalance = 10000; // Would be configurable
  if (closingBalance < minimumBalance) {
    alerts.push({
      type: "shortfall",
      severity: closingBalance < 5000 ? "critical" : "warning",
      date: endDate,
      amount: closingBalance,
      description: `Projected cash balance below minimum threshold`,
      threshold: minimumBalance,
    });
  }

  // Negative cash flow alert
  if (netCashFlow < 0) {
    alerts.push({
      type: "shortfall",
      severity: netCashFlow < -50000 ? "critical" : "warning",
      date: endDate,
      amount: netCashFlow,
      description: `Negative cash flow projected`,
      threshold: 0,
    });
  }

  // High volatility alert
  if (Math.abs(netCashFlow) > openingBalance * 0.5) {
    alerts.push({
      type: "volatility",
      severity: "warning",
      date: endDate,
      amount: netCashFlow,
      description: `High cash flow volatility detected`,
      threshold: openingBalance * 0.5,
    });
  }

  return alerts;
}

/**
 * Generate cash flow recommendations
 */
function generateCashFlowRecommendations(
  netCashFlow: number,
  closingBalance: number,
  inflows: PredictedCashFlow[],
  outflows: PredictedCashFlow[],
  alerts: CashFlowAlert[]
): CashFlowRecommendation[] {
  const recommendations: CashFlowRecommendation[] = [];

  // Address cash shortfall
  if (netCashFlow < 0 || alerts.some(a => a.type === "shortfall")) {
    recommendations.push({
      type: "collection",
      priority: "high",
      action: "Accelerate accounts receivable collection",
      impact: "Improve cash inflow timing",
      timeframe: "2-4 weeks",
      amount: Math.abs(netCashFlow) * 0.5,
    });

    recommendations.push({
      type: "payment_terms",
      priority: "medium",
      action: "Negotiate extended payment terms with vendors",
      impact: "Reduce immediate cash outflow",
      timeframe: "1-2 weeks",
    });
  }

  // Expense control recommendations
  const totalOutflows = outflows.reduce((sum, item) => sum + item.predictedAmount, 0);
  if (totalOutflows > inflows.reduce((sum, item) => sum + item.predictedAmount, 0) * 0.8) {
    recommendations.push({
      type: "expense_control",
      priority: "medium",
      action: "Review and defer non-essential expenses",
      impact: "Reduce cash outflow",
      timeframe: "1 week",
      amount: totalOutflows * 0.1,
    });
  }

  // Investment recommendations for surplus
  if (netCashFlow > 50000 && closingBalance > 100000) {
    recommendations.push({
      type: "investment",
      priority: "low",
      action: "Consider short-term investment options",
      impact: "Generate returns on excess cash",
      timeframe: "2-4 weeks",
      amount: netCashFlow * 0.3,
    });
  }

  // Financing recommendations
  if (alerts.some(a => a.severity === "critical")) {
    recommendations.push({
      type: "financing",
      priority: "urgent",
      action: "Arrange short-term financing or credit line",
      impact: "Ensure liquidity during cash shortfall",
      timeframe: "Immediate",
      amount: Math.abs(netCashFlow),
    });
  }

  return recommendations;
}

/**
 * Helper functions
 */
function calculatePeriodStart(period: string, offset: number): string {
  const now = new Date();
  const start = new Date(now);
  
  switch (period) {
    case "weekly":
      start.setDate(start.getDate() + (offset * 7));
      break;
    case "monthly":
      start.setMonth(start.getMonth() + offset);
      break;
    case "quarterly":
      start.setMonth(start.getMonth() + (offset * 3));
      break;
  }
  
  return start.toISOString().split('T')[0];
}

function calculatePeriodEnd(period: string, offset: number): string {
  const start = new Date(calculatePeriodStart(period, offset));
  const end = new Date(start);
  
  switch (period) {
    case "weekly":
      end.setDate(end.getDate() + 6);
      break;
    case "monthly":
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);
      break;
    case "quarterly":
      end.setMonth(end.getMonth() + 3);
      end.setDate(end.getDate() - 1);
      break;
  }
  
  return end.toISOString().split('T')[0];
}

function detectCategorySeasonality(amounts: number[]): number {
  // Simplified seasonality detection
  if (amounts.length < 12) return 0;
  
  const monthly = amounts.slice(0, 12);
  const avg = monthly.reduce((sum, amount) => sum + amount, 0) / monthly.length;
  const variance = monthly.reduce((sum, amount) => sum + Math.pow(amount - avg, 2), 0) / monthly.length;
  
  return variance / avg; // Coefficient of variation
}

function calculateCategoryGrowth(amounts: number[]): number {
  if (amounts.length < 2) return 0;
  
  const periods = amounts.length - 1;
  return Math.pow(amounts[amounts.length - 1] / amounts[0], 1 / periods) - 1;
}

function getSeasonalMultiplier(date: string, seasonality: SeasonalityPattern): number {
  const month = new Date(date).getMonth();
  return seasonality.factors[month] || 1;
}

function calculateSeasonalityStrength(factors: number[]): number {
  const avg = factors.reduce((sum, factor) => sum + factor, 0) / factors.length;
  const variance = factors.reduce((sum, factor) => sum + Math.pow(factor - avg, 2), 0) / factors.length;
  return variance;
}

function calculatePredictionConfidence(
  historicalData: CashFlowData[],
  inflows: PredictedCashFlow[],
  outflows: PredictedCashFlow[]
): number {
  let confidence = 0.7; // Base confidence
  
  // More historical data = higher confidence
  if (historicalData.length >= 24) confidence += 0.1;
  else if (historicalData.length >= 12) confidence += 0.05;
  
  // Lower variance = higher confidence
  const totalVariance = [...inflows, ...outflows].reduce((sum, item) => sum + item.variance, 0);
  const totalAmount = [...inflows, ...outflows].reduce((sum, item) => sum + Math.abs(item.predictedAmount), 0);
  const varianceRatio = totalVariance / totalAmount;
  
  confidence -= varianceRatio * 0.2;
  
  return Math.max(0.3, Math.min(0.95, confidence));
}

function identifyPredictionFactors(
  historicalData: CashFlowData[],
  patterns: any,
  seasonality: SeasonalityPattern,
  growthRates: any
): PredictionFactor[] {
  return [
    {
      factor: "Historical Trend",
      impact: patterns.trend === "increasing" ? 0.3 : patterns.trend === "decreasing" ? -0.3 : 0,
      weight: 0.3,
      description: `Cash flow trend: ${patterns.trend}`,
      historical: historicalData.map(d => d.netCashFlow),
    },
    {
      factor: "Seasonality",
      impact: seasonality.strength > 0.2 ? 0.2 : 0,
      weight: 0.2,
      description: `Seasonal strength: ${seasonality.strength.toFixed(2)}`,
      historical: seasonality.factors,
    },
    {
      factor: "Revenue Growth",
      impact: growthRates.revenueGrowth,
      weight: 0.25,
      description: `Revenue growth rate: ${(growthRates.revenueGrowth * 100).toFixed(1)}%`,
      historical: [],
    },
    {
      factor: "Expense Growth",
      impact: -growthRates.expenseGrowth,
      weight: 0.15,
      description: `Expense growth rate: ${(growthRates.expenseGrowth * 100).toFixed(1)}%`,
      historical: [],
    },
    {
      factor: "Volatility",
      impact: -growthRates.volatility,
      weight: 0.1,
      description: `Volatility: ${(growthRates.volatility * 100).toFixed(1)}%`,
      historical: [],
    },
  ];
}

// Type definitions
interface CategoryPattern {
  category: string;
  averageAmount: number;
  variance: number;
  seasonality: number;
  growth: number;
}

interface SeasonalityPattern {
  factors: number[];
  strength: number;
}
