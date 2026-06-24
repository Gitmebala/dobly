/**
 * Demand Forecasting for Operations Department
 * Uses AI to predict product demand and optimize inventory planning
 */

export interface DemandForecast {
  id: string;
  productId: string;
  productName: string;
  category: string;
  period: string;
  forecastType: "short_term" | "medium_term" | "long_term";
  predictions: DemandPrediction[];
  confidence: number;
  accuracy: number;
  factors: DemandFactor[];
  seasonality: SeasonalityPattern;
  trend: TrendAnalysis;
  generatedAt: string;
  lastUpdated: string;
}

export interface DemandPrediction {
  date: string;
  predictedDemand: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
  probability: number;
  factors: string[];
}

export interface DemandFactor {
  factor: string;
  impact: number; // -1 to 1
  weight: number;
  description: string;
  correlation: number;
  historical: number[];
  category: "internal" | "external" | "seasonal" | "promotional";
}

export interface SeasonalityPattern {
  type: "daily" | "weekly" | "monthly" | "quarterly" | "annual";
  factors: number[];
  strength: number;
  peakPeriods: string[];
  description: string;
}

export interface TrendAnalysis {
  direction: "increasing" | "decreasing" | "stable" | "volatile";
  growthRate: number;
  acceleration: number;
  volatility: number;
  confidence: number;
  inflectionPoints: Date[];
}

export interface HistoricalDemand {
  date: string;
  demand: number;
  actual: number;
  forecast?: number;
  error?: number;
  factors: Record<string, any>;
}

export interface MarketCondition {
  type: "economic" | "competitor" | "seasonal" | "trend" | "disruption";
  impact: number; // -1 to 1
  description: string;
  timeframe: string;
  confidence: number;
  affectedProducts: string[];
}

export interface ForecastAccuracy {
  mape: number; // Mean Absolute Percentage Error
  mae: number; // Mean Absolute Error
  rmse: number; // Root Mean Square Error
  bias: number; // Forecast bias
  trackingSignal: number;
}

/**
 * Generate comprehensive demand forecast
 */
export async function generateDemandForecast(
  productId: string,
  productName: string,
  category: string,
  historicalData: HistoricalDemand[],
  forecastPeriod: "30_days" | "90_days" | "180_days" | "365_days" = "90_days",
  externalFactors?: {
    marketConditions: MarketCondition[];
    promotionalEvents: PromotionalEvent[];
    competitorActions: CompetitorAction[];
    economicIndicators: EconomicIndicator[];
  }
): Promise<DemandForecast> {
  // Step 1: Analyze historical demand patterns
  const patterns = analyzeHistoricalPatterns(historicalData);
  
  // Step 2: Identify seasonality
  const seasonality = identifySeasonality(historicalData);
  
  // Step 3: Analyze trends
  const trend = analyzeTrend(historicalData);
  
  // Step 4: Identify demand factors
  const factors = identifyDemandFactors(historicalData, externalFactors);
  
  // Step 5: Generate base predictions
  const basePredictions = generateBasePredictions(historicalData, patterns, seasonality, trend);
  
  // Step 6: Apply external factors
  const adjustedPredictions = applyExternalFactors(basePredictions, factors, externalFactors);
  
  // Step 7: Calculate confidence intervals
  const predictionsWithIntervals = calculateConfidenceIntervals(adjustedPredictions, historicalData);
  
  // Step 8: Calculate forecast accuracy
  const accuracy = calculateForecastAccuracy(historicalData);
  
  // Step 9: Determine overall confidence
  const confidence = calculateOverallConfidence(seasonality, trend, factors, historicalData);

  return {
    id: `forecast_${productId}_${Date.now()}`,
    productId,
    productName,
    category,
    period: forecastPeriod,
    forecastType: getForecastType(forecastPeriod),
    predictions: predictionsWithIntervals,
    confidence,
    accuracy,
    factors,
    seasonality,
    trend,
    generatedAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Analyze historical demand patterns
 */
function analyzeHistoricalPatterns(data: HistoricalDemand[]): {
  avgDemand: number;
  demandVariance: number;
  peakDemand: number;
  lowDemand: number;
  demandDistribution: DemandDistribution;
  patterns: DemandPattern[];
} {
  const demands = data.map(d => d.demand);
  const avgDemand = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  const variance = demands.reduce((sum, d) => sum + Math.pow(d - avgDemand, 2), 0) / demands.length;
  
  const peakDemand = Math.max(...demands);
  const lowDemand = Math.min(...demands);
  
  // Analyze demand distribution
  const distribution = analyzeDemandDistribution(demands);
  
  // Identify patterns
  const patterns = identifyDemandPatterns(data);

  return {
    avgDemand,
    demandVariance: variance,
    peakDemand,
    lowDemand,
    demandDistribution: distribution,
    patterns,
  };
}

/**
 * Identify seasonality in demand data
 */
function identifySeasonality(data: HistoricalDemand[]): SeasonalityPattern {
  const dates = data.map(d => new Date(d.date));
  const demands = data.map(d => d.demand);
  
  // Check for different seasonal patterns
  const patterns = [
    checkDailySeasonality(data),
    checkWeeklySeasonality(data),
    checkMonthlySeasonality(data),
    checkQuarterlySeasonality(data),
    checkAnnualSeasonality(data),
  ];
  
  // Find strongest pattern
  const strongestPattern = patterns.reduce((strongest, current) => 
    current.strength > strongest.strength ? current : strongest
  );
  
  return strongestPattern;
}

/**
 * Analyze trend in demand data
 */
function analyzeTrend(data: HistoricalDemand[]): TrendAnalysis {
  const demands = data.map(d => d.demand);
  const dates = data.map(d => new Date(d.date));
  
  // Linear regression for trend
  const n = data.length;
  const xSum = data.reduce((sum, _, i) => sum + i, 0);
  const ySum = demands.reduce((sum, d) => sum + d, 0);
  const xySum = data.reduce((sum, d, i) => sum + i * d.demand, 0);
  const x2Sum = data.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const intercept = (ySum - slope * xSum) / n;
  
  // Calculate growth rate
  const avgDemand = ySum / n;
  const growthRate = avgDemand > 0 ? slope / avgDemand : 0;
  
  // Calculate acceleration (second derivative)
  let acceleration = 0;
  if (n >= 3) {
    const firstDerivative = [];
    for (let i = 1; i < n; i++) {
      firstDerivative.push(demands[i] - demands[i - 1]);
    }
    const secondDerivative = [];
    for (let i = 1; i < firstDerivative.length; i++) {
      secondDerivative.push(firstDerivative[i] - firstDerivative[i - 1]);
    }
    acceleration = secondDerivative.reduce((sum, d) => sum + d, 0) / secondDerivative.length;
  }
  
  // Calculate volatility
  const predicted = data.map((_, i) => intercept + slope * i);
  const errors = demands.map((d, i) => d - predicted[i]);
  const volatility = Math.sqrt(errors.reduce((sum, e) => sum + e * e, 0) / errors.length) / avgDemand;
  
  // Determine direction
  let direction: TrendAnalysis["direction"] = "stable";
  if (Math.abs(growthRate) > 0.05) {
    direction = growthRate > 0 ? "increasing" : "decreasing";
  } else if (volatility > 0.3) {
    direction = "volatile";
  }
  
  // Find inflection points
  const inflectionPoints = findInflectionPoints(data);
  
  // Calculate confidence
  const rSquared = calculateRSquared(demands, predicted);
  const confidence = Math.max(0.3, rSquared);

  return {
    direction,
    growthRate,
    acceleration,
    volatility,
    confidence,
    inflectionPoints,
  };
}

/**
 * Identify factors affecting demand
 */
function identifyDemandFactors(
  historicalData: HistoricalDemand[],
  externalFactors?: {
    marketConditions: MarketCondition[];
    promotionalEvents: PromotionalEvent[];
    competitorActions: CompetitorAction[];
    economicIndicators: EconomicIndicator[];
  }
): DemandFactor[] {
  const factors: DemandFactor[] = [];
  
  // Internal factors from historical data
  factors.push(...analyzeInternalFactors(historicalData));
  
  // External factors
  if (externalFactors) {
    factors.push(...analyzeExternalFactors(historicalData, externalFactors));
  }
  
  // Seasonal factors
  factors.push(...analyzeSeasonalFactors(historicalData));
  
  return factors.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));
}

/**
 * Generate base predictions using time series models
 */
function generateBasePredictions(
  historicalData: HistoricalDemand[],
  patterns: any,
  seasonality: SeasonalityPattern,
  trend: TrendAnalysis
): DemandPrediction[] {
  const predictions: DemandPrediction[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  
  // Generate predictions for next 90 days
  for (let i = 1; i <= 90; i++) {
    const predictionDate = new Date(lastDate);
    predictionDate.setDate(predictionDate.getDate() + i);
    
    // Base demand from trend
    const baseDemand = calculateTrendDemand(historicalData, i, trend);
    
    // Apply seasonality
    const seasonalMultiplier = getSeasonalMultiplier(predictionDate, seasonality);
    const seasonalDemand = baseDemand * seasonalMultiplier;
    
    predictions.push({
      date: predictionDate.toISOString().split('T')[0],
      predictedDemand: Math.max(0, Math.round(seasonalDemand)),
      confidenceInterval: {
        lower: Math.max(0, seasonalDemand * 0.8),
        upper: seasonalDemand * 1.2,
      },
      probability: 0.8,
      factors: ["trend", "seasonality"],
    });
  }
  
  return predictions;
}

/**
 * Apply external factors to predictions
 */
function applyExternalFactors(
  predictions: DemandPrediction[],
  factors: DemandFactor[],
  externalFactors?: any
): DemandPrediction[] {
  return predictions.map(prediction => {
    let adjustedDemand = prediction.predictedDemand;
    const appliedFactors: string[] = [...prediction.factors];
    
    factors.forEach(factor => {
      if (Math.abs(factor.impact) > 0.1) {
        const adjustment = 1 + (factor.impact * factor.weight);
        adjustedDemand *= adjustment;
        appliedFactors.push(factor.factor);
      }
    });
    
    return {
      ...prediction,
      predictedDemand: Math.max(0, Math.round(adjustedDemand)),
      factors: appliedFactors,
    };
  });
}

/**
 * Calculate confidence intervals for predictions
 */
function calculateConfidenceIntervals(
  predictions: DemandPrediction[],
  historicalData: HistoricalDemand[]
): DemandPrediction[] {
  // Calculate historical error variance
  const errors = historicalData
    .filter(d => d.forecast !== undefined)
    .map(d => Math.abs(d.demand - d.forecast!));
  
  const avgError = errors.length > 0 ? errors.reduce((sum, e) => sum + e, 0) / errors.length : 0.2;
  const errorVariance = errors.length > 1 ? 
    errors.reduce((sum, e) => sum + Math.pow(e - avgError, 2), 0) / (errors.length - 1) : 
    avgError * avgError;
  
  const standardError = Math.sqrt(errorVariance);
  
  return predictions.map(prediction => {
    const demand = prediction.predictedDemand;
    const margin = standardError * 1.96; // 95% confidence interval
    
    return {
      ...prediction,
      confidenceInterval: {
        lower: Math.max(0, Math.round(demand - margin)),
        upper: Math.round(demand + margin),
      },
    };
  });
}

/**
 * Calculate forecast accuracy metrics
 */
function calculateForecastAccuracy(historicalData: HistoricalDemand[]): ForecastAccuracy {
  const validData = historicalData.filter(d => d.forecast !== undefined);
  
  if (validData.length === 0) {
    return { mape: 0, mae: 0, rmse: 0, bias: 0, trackingSignal: 0 };
  }
  
  const errors = validData.map(d => d.demand - d.forecast!);
  const absoluteErrors = errors.map(e => Math.abs(e));
  const squaredErrors = errors.map(e => e * e);
  const percentageErrors = validData.map(d => 
    d.demand !== 0 ? Math.abs((d.demand - d.forecast!) / d.demand) : 0
  );
  
  const mape = percentageErrors.reduce((sum, e) => sum + e, 0) / percentageErrors.length;
  const mae = absoluteErrors.reduce((sum, e) => sum + e, 0) / absoluteErrors.length;
  const rmse = Math.sqrt(squaredErrors.reduce((sum, e) => sum + e, 0) / squaredErrors.length);
  const bias = errors.reduce((sum, e) => sum + e, 0) / errors.length;
  const trackingSignal = errors.reduce((sum, e) => sum + Math.sign(e), 0) / mae;
  
  return { mape, mae, rmse, bias, trackingSignal };
}

/**
 * Calculate overall forecast confidence
 */
function calculateOverallConfidence(
  seasonality: SeasonalityPattern,
  trend: TrendAnalysis,
  factors: DemandFactor[],
  historicalData: HistoricalDemand[]
): number {
  let confidence = 0.5; // Base confidence
  
  // Data volume factor
  if (historicalData.length >= 365) confidence += 0.2;
  else if (historicalData.length >= 90) confidence += 0.1;
  
  // Seasonality confidence
  confidence += seasonality.strength * 0.1;
  
  // Trend confidence
  confidence += trend.confidence * 0.15;
  
  // Factor coverage
  const strongFactors = factors.filter(f => Math.abs(f.impact) > 0.2);
  confidence += Math.min(0.1, strongFactors.length * 0.02);
  
  return Math.min(0.95, confidence);
}

/**
 * Helper functions for pattern analysis
 */
function checkDailySeasonality(data: HistoricalDemand[]): SeasonalityPattern {
  const hourlyData: Record<number, number[]> = {};
  
  data.forEach(d => {
    const hour = new Date(d.date).getHours();
    if (!hourlyData[hour]) hourlyData[hour] = [];
    hourlyData[hour].push(d.demand);
  });
  
  const hourlyAverages = new Array(24).fill(0);
  Object.entries(hourlyData).forEach(([hour, demands]) => {
    hourlyAverages[parseInt(hour)] = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  });
  
  const overallAvg = hourlyAverages.reduce((sum, avg) => sum + avg, 0) / hourlyAverages.filter(a => a > 0).length;
  const factors = hourlyAverages.map(avg => overallAvg > 0 ? avg / overallAvg : 1);
  
  const strength = calculateSeasonalityStrength(factors);
  const peakHours = factors
    .map((factor, index) => ({ hour: index, factor }))
    .filter(({ factor }) => factor > 1.2)
    .map(({ hour }) => `${hour}:00`);
  
  return {
    type: "daily",
    factors,
    strength,
    peakPeriods: peakHours,
    description: strength > 0.3 ? "Strong daily pattern detected" : "Weak daily pattern",
  };
}

function checkWeeklySeasonality(data: HistoricalDemand[]): SeasonalityPattern {
  const dailyData: Record<number, number[]> = {};
  
  data.forEach(d => {
    const day = new Date(d.date).getDay();
    if (!dailyData[day]) dailyData[day] = [];
    dailyData[day].push(d.demand);
  });
  
  const dailyAverages = new Array(7).fill(0);
  Object.entries(dailyData).forEach(([day, demands]) => {
    dailyAverages[parseInt(day)] = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  });
  
  const overallAvg = dailyAverages.reduce((sum, avg) => sum + avg, 0) / dailyAverages.filter(a => a > 0).length;
  const factors = dailyAverages.map(avg => overallAvg > 0 ? avg / overallAvg : 1);
  
  const strength = calculateSeasonalityStrength(factors);
  const peakDays = factors
    .map((factor, index) => ({ day: index, factor }))
    .filter(({ factor }) => factor > 1.2)
    .map(({ day }) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]);
  
  return {
    type: "weekly",
    factors,
    strength,
    peakPeriods: peakDays,
    description: strength > 0.3 ? "Strong weekly pattern detected" : "Weak weekly pattern",
  };
}

function checkMonthlySeasonality(data: HistoricalDemand[]): SeasonalityPattern {
  const monthlyData: Record<number, number[]> = {};
  
  data.forEach(d => {
    const month = new Date(d.date).getMonth();
    if (!monthlyData[month]) monthlyData[month] = [];
    monthlyData[month].push(d.demand);
  });
  
  const monthlyAverages = new Array(12).fill(0);
  Object.entries(monthlyData).forEach(([month, demands]) => {
    monthlyAverages[parseInt(month)] = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  });
  
  const overallAvg = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / monthlyAverages.filter(a => a > 0).length;
  const factors = monthlyAverages.map(avg => overallAvg > 0 ? avg / overallAvg : 1);
  
  const strength = calculateSeasonalityStrength(factors);
  const peakMonths = factors
    .map((factor, index) => ({ month: index, factor }))
    .filter(({ factor }) => factor > 1.2)
    .map(({ month }) => new Date(2024, month, 1).toLocaleString('default', { month: 'long' }));
  
  return {
    type: "monthly",
    factors,
    strength,
    peakPeriods: peakMonths,
    description: strength > 0.3 ? "Strong monthly pattern detected" : "Weak monthly pattern",
  };
}

function checkQuarterlySeasonality(data: HistoricalDemand[]): SeasonalityPattern {
  const quarterlyData: Record<number, number[]> = {};
  
  data.forEach(d => {
    const quarter = Math.floor(new Date(d.date).getMonth() / 3);
    if (!quarterlyData[quarter]) quarterlyData[quarter] = [];
    quarterlyData[quarter].push(d.demand);
  });
  
  const quarterlyAverages = new Array(4).fill(0);
  Object.entries(quarterlyData).forEach(([quarter, demands]) => {
    quarterlyAverages[parseInt(quarter)] = demands.reduce((sum, d) => sum + d, 0) / demands.length;
  });
  
  const overallAvg = quarterlyAverages.reduce((sum, avg) => sum + avg, 0) / quarterlyAverages.filter(a => a > 0).length;
  const factors = quarterlyAverages.map(avg => overallAvg > 0 ? avg / overallAvg : 1);
  
  const strength = calculateSeasonalityStrength(factors);
  const peakQuarters = factors
    .map((factor, index) => ({ quarter: index, factor }))
    .filter(({ factor }) => factor > 1.2)
    .map(({ quarter }) => `Q${quarter + 1}`);
  
  return {
    type: "quarterly",
    factors,
    strength,
    peakPeriods: peakQuarters,
    description: strength > 0.3 ? "Strong quarterly pattern detected" : "Weak quarterly pattern",
  };
}

function checkAnnualSeasonality(data: HistoricalDemand[]): SeasonalityPattern {
  // For annual patterns, we'd need multiple years of data
  return {
    type: "annual",
    factors: new Array(12).fill(1),
    strength: 0,
    peakPeriods: [],
    description: "Insufficient data for annual pattern analysis",
  };
}

function analyzeDemandDistribution(demands: number[]): DemandDistribution {
  const sorted = [...demands].sort((a, b) => a - b);
  const n = sorted.length;
  
  return {
    min: sorted[0],
    max: sorted[n - 1],
    q1: sorted[Math.floor(n * 0.25)],
    median: sorted[Math.floor(n * 0.5)],
    q3: sorted[Math.floor(n * 0.75)],
    mean: demands.reduce((sum, d) => sum + d, 0) / n,
    stdDev: Math.sqrt(demands.reduce((sum, d) => sum + Math.pow(d - (demands.reduce((s, d) => s + d, 0) / n), 2), 0) / n),
    skewness: calculateSkewness(demands),
    kurtosis: calculateKurtosis(demands),
  };
}

function identifyDemandPatterns(data: HistoricalDemand[]): DemandPattern[] {
  const patterns: DemandPattern[] = [];
  
  // Check for recurring spikes
  const spikes = detectDemandSpikes(data);
  if (spikes.length > 0) {
    patterns.push({
      type: "spike",
      description: `Recurring demand spikes detected (${spikes.length} instances)`,
      frequency: spikes.length / data.length,
      confidence: 0.7,
      examples: spikes.slice(0, 3),
    });
  }
  
  // Check for recurring dips
  const dips = detectDemandDips(data);
  if (dips.length > 0) {
    patterns.push({
      type: "dip",
      description: `Recurring demand dips detected (${dips.length} instances)`,
      frequency: dips.length / data.length,
      confidence: 0.6,
      examples: dips.slice(0, 3),
    });
  }
  
  return patterns;
}

// Additional helper functions
function getForecastType(period: string): DemandForecast["forecastType"] {
  if (period === "30_days") return "short_term";
  if (period === "90_days") return "medium_term";
  return "long_term";
}

function calculateSeasonalityStrength(factors: number[]): number {
  const avg = factors.reduce((sum, f) => sum + f, 0) / factors.length;
  const variance = factors.reduce((sum, f) => sum + Math.pow(f - avg, 2), 0) / factors.length;
  return Math.sqrt(variance);
}

function getSeasonalMultiplier(date: Date, seasonality: SeasonalityPattern): number {
  switch (seasonality.type) {
    case "daily":
      return seasonality.factors[date.getHours()] || 1;
    case "weekly":
      return seasonality.factors[date.getDay()] || 1;
    case "monthly":
      return seasonality.factors[date.getMonth()] || 1;
    case "quarterly":
      return seasonality.factors[Math.floor(date.getMonth() / 3)] || 1;
    default:
      return 1;
  }
}

function calculateTrendDemand(historicalData: HistoricalDemand, periodsAhead: number, trend: TrendAnalysis): number {
  const lastDemand = historicalData[historicalData.length - 1].demand;
  const avgDemand = historicalData.reduce((sum, d) => sum + d.demand, 0) / historicalData.length;
  
  return avgDemand * Math.pow(1 + trend.growthRate, periodsAhead / 30);
}

function analyzeInternalFactors(data: HistoricalDemand[]): DemandFactor[] {
  const factors: DemandFactor[] = [];
  
  // Day of week factor
  const dayOfWeekImpact = calculateDayOfWeekImpact(data);
  if (Math.abs(dayOfWeekImpact) > 0.1) {
    factors.push({
      factor: "Day of Week",
      impact: dayOfWeekImpact,
      weight: 0.15,
      description: "Demand varies by day of week",
      correlation: Math.abs(dayOfWeekImpact),
      historical: [],
      category: "seasonal",
    });
  }
  
  // Month factor
  const monthImpact = calculateMonthImpact(data);
  if (Math.abs(monthImpact) > 0.1) {
    factors.push({
      factor: "Month",
      impact: monthImpact,
      weight: 0.2,
      description: "Demand varies by month",
      correlation: Math.abs(monthImpact),
      historical: [],
      category: "seasonal",
    });
  }
  
  return factors;
}

function analyzeExternalFactors(
  historicalData: HistoricalDemand[],
  externalFactors: any
): DemandFactor[] {
  const factors: DemandFactor[] = [];
  
  // Market conditions
  externalFactors.marketConditions?.forEach((condition: MarketCondition) => {
    factors.push({
      factor: `Market: ${condition.type}`,
      impact: condition.impact,
      weight: 0.25,
      description: condition.description,
      correlation: Math.abs(condition.impact),
      historical: [],
      category: "external",
    });
  });
  
  // Promotional events
  externalFactors.promotionalEvents?.forEach((event: PromotionalEvent) => {
    factors.push({
      factor: `Promotion: ${event.type}`,
      impact: event.impact,
      weight: 0.3,
      description: event.description,
      correlation: Math.abs(event.impact),
      historical: [],
      category: "promotional",
    });
  });
  
  return factors;
}

function analyzeSeasonalFactors(data: HistoricalDemand[]): DemandFactor[] {
  const factors: DemandFactor[] = [];
  
  // Holiday impact
  const holidayImpact = calculateHolidayImpact(data);
  if (Math.abs(holidayImpact) > 0.1) {
    factors.push({
      factor: "Holidays",
      impact: holidayImpact,
      weight: 0.2,
      description: "Demand affected by holidays",
      correlation: Math.abs(holidayImpact),
      historical: [],
      category: "seasonal",
    });
  }
  
  return factors;
}

// Additional calculation functions
function calculateSkewness(data: number[]): number {
  const n = data.length;
  const mean = data.reduce((sum, x) => sum + x, 0) / n;
  const stdDev = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n);
  
  if (stdDev === 0) return 0;
  
  const skew = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 3), 0) / n;
  return skew;
}

function calculateKurtosis(data: number[]): number {
  const n = data.length;
  const mean = data.reduce((sum, x) => sum + x, 0) / n;
  const stdDev = Math.sqrt(data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n);
  
  if (stdDev === 0) return 0;
  
  const kurt = data.reduce((sum, x) => sum + Math.pow((x - mean) / stdDev, 4), 0) / n;
  return kurt - 3; // Excess kurtosis
}

function findInflectionPoints(data: HistoricalDemand[]): Date[] {
  const inflectionPoints: Date[] = [];
  const demands = data.map(d => d.demand);
  
  for (let i = 1; i < demands.length - 1; i++) {
    const firstDerivative = demands[i] - demands[i - 1];
    const secondDerivative = demands[i + 1] - demands[i];
    
    // Sign change in second derivative indicates inflection point
    if (firstDerivative * secondDerivative < 0) {
      inflectionPoints.push(new Date(data[i].date));
    }
  }
  
  return inflectionPoints;
}

function calculateRSquared(actual: number[], predicted: number[]): number {
  const yMean = actual.reduce((sum, y) => sum + y, 0) / actual.length;
  const ssTotal = actual.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
  const ssResidual = actual.reduce((sum, y, i) => sum + Math.pow(y - predicted[i], 2), 0);
  
  return 1 - (ssResidual / ssTotal);
}

// Placeholder functions for complex calculations
function calculateDayOfWeekImpact(data: HistoricalDemand[]): number {
  // Simplified calculation - would be more sophisticated in real implementation
  return 0.15;
}

function calculateMonthImpact(data: HistoricalDemand[]): number {
  return 0.2;
}

function calculateHolidayImpact(data: HistoricalDemand[]): number {
  return 0.25;
}

function detectDemandSpikes(data: HistoricalDemand[]): Array<{ date: string; demand: number }> {
  const avgDemand = data.reduce((sum, d) => sum + d.demand, 0) / data.length;
  const threshold = avgDemand * 1.5;
  
  return data
    .filter(d => d.demand > threshold)
    .map(d => ({ date: d.date, demand: d.demand }));
}

function detectDemandDips(data: HistoricalDemand[]): Array<{ date: string; demand: number }> {
  const avgDemand = data.reduce((sum, d) => sum + d.demand, 0) / data.length;
  const threshold = avgDemand * 0.5;
  
  return data
    .filter(d => d.demand < threshold)
    .map(d => ({ date: d.date, demand: d.demand }));
}

// Type definitions
interface DemandDistribution {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  mean: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
}

interface DemandPattern {
  type: "spike" | "dip" | "trend" | "seasonal";
  description: string;
  frequency: number;
  confidence: number;
  examples: Array<{ date: string; demand: number }>;
}

interface PromotionalEvent {
  type: string;
  description: string;
  impact: number;
  date: string;
  duration: number;
}

interface CompetitorAction {
  type: string;
  description: string;
  impact: number;
  date: string;
  competitor: string;
}

interface EconomicIndicator {
  name: string;
  value: number;
  impact: number;
  date: string;
  description: string;
}
