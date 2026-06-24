/**
 * AI Inventory Management for Operations Department
 * Optimizes inventory levels, predicts demand, and automates reordering
 */

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  currentStock: number;
  unitCost: number;
  sellingPrice: number;
  supplier: string;
  leadTime: number; // days
  reorderPoint: number;
  maxStock: number;
  minStock: number;
  location: string;
  lastRestocked: string;
  lastSold: string;
  status: "in_stock" | "low_stock" | "out_of_stock" | "discontinued";
  metadata: {
    weight?: number;
    dimensions?: { length: number; width: number; height: number };
    shelfLife?: number; // days
    storageRequirements?: string[];
    seasonality?: "high" | "medium" | "low";
  };
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  type: "sale" | "purchase" | "adjustment" | "return" | "transfer" | "waste";
  quantity: number;
  timestamp: string;
  reference?: string;
  reason?: string;
  cost?: number;
  location?: string;
  userId: string;
}

export interface DemandForecast {
  itemId: string;
  period: string;
  predictedDemand: number;
  confidence: number;
  factors: DemandFactor[];
  seasonality: SeasonalityPattern;
  trend: TrendAnalysis;
  recommendations: InventoryRecommendation[];
  generatedAt: string;
}

export interface DemandFactor {
  factor: string;
  impact: number; // -1 to 1
  weight: number;
  description: string;
  historicalData: number[];
}

export interface SeasonalityPattern {
  monthly: number[];
  quarterly: number[];
  strength: number;
  peakSeasons: string[];
}

export interface TrendAnalysis {
  direction: "increasing" | "decreasing" | "stable";
  growthRate: number;
  volatility: number;
  confidence: number;
}

export interface InventoryRecommendation {
  type: "reorder" | "adjust_stock" | "discontinue" | "promotion" | "transfer";
  priority: "low" | "medium" | "high" | "urgent";
  action: string;
  reasoning: string;
  quantity?: number;
  deadline?: string;
  impact: string;
}

export interface InventoryOptimization {
  itemId: string;
  currentStock: number;
  optimalStock: number;
  reorderPoint: number;
  maxStock: number;
  safetyStock: number;
  serviceLevel: number;
  holdingCost: number;
  stockoutCost: number;
  totalCost: number;
  recommendations: InventoryRecommendation[];
}

/**
 * Analyze inventory and generate AI-powered recommendations
 */
export async function analyzeInventory(
  item: InventoryItem,
  transactions: InventoryTransaction[],
  historicalData?: {
    salesHistory: Array<{ date: string; quantity: number; price: number }>;
    seasonalTrends: SeasonalityPattern;
    marketConditions: MarketCondition[];
  }
): Promise<{
  currentStatus: InventoryStatus;
  demandForecast: DemandForecast;
  optimization: InventoryOptimization;
  alerts: InventoryAlert[];
}> {
  // Step 1: Calculate current inventory status
  const currentStatus = calculateInventoryStatus(item, transactions);
  
  // Step 2: Generate demand forecast
  const demandForecast = await generateDemandForecast(item, transactions, historicalData);
  
  // Step 3: Optimize inventory levels
  const optimization = optimizeInventoryLevels(item, transactions, demandForecast);
  
  // Step 4: Generate alerts
  const alerts = generateInventoryAlerts(item, currentStatus, demandForecast, optimization);

  return {
    currentStatus,
    demandForecast,
    optimization,
    alerts,
  };
}

/**
 * Calculate current inventory status
 */
function calculateInventoryStatus(item: InventoryItem, transactions: InventoryTransaction[]): InventoryStatus {
  // Calculate recent sales (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentSales = transactions.filter(t => 
    t.itemId === item.id && 
    t.type === "sale" && 
    new Date(t.timestamp) > thirtyDaysAgo
  );
  
  const totalRecentSales = recentSales.reduce((sum, t) => sum + t.quantity, 0);
  const avgDailySales = totalRecentSales / 30;
  
  // Calculate stock turnover
  const daysOfSupply = avgDailySales > 0 ? item.currentStock / avgDailySales : 999;
  
  // Calculate inventory value
  const inventoryValue = item.currentStock * item.unitCost;
  
  // Determine status
  let status: InventoryStatus["status"] = "in_stock";
  if (item.currentStock === 0) status = "out_of_stock";
  else if (item.currentStock <= item.minStock) status = "low_stock";
  else if (item.currentStock >= item.maxStock * 0.9) status = "overstock";

  return {
    status,
    currentStock: item.currentStock,
    daysOfSupply,
    avgDailySales,
    inventoryValue,
    turnoverRate: calculateTurnoverRate(item, transactions),
    lastSaleDate: getLastSaleDate(transactions, item.id),
    stockoutRisk: calculateStockoutRisk(item, avgDailySales),
    holdingCosts: calculateHoldingCosts(item),
  };
}

/**
 * Generate demand forecast using AI
 */
async function generateDemandForecast(
  item: InventoryItem,
  transactions: InventoryTransaction[],
  historicalData?: any
): Promise<DemandForecast> {
  // Extract sales data
  const salesData = extractSalesData(transactions, item.id);
  
  // Analyze seasonal patterns
  const seasonality = analyzeSeasonality(salesData);
  
  // Analyze trends
  const trend = analyzeTrend(salesData);
  
  // Identify demand factors
  const factors = identifyDemandFactors(item, salesData, historicalData);
  
  // Generate forecast
  const predictedDemand = calculatePredictedDemand(salesData, seasonality, trend, factors);
  
  // Generate recommendations
  const recommendations = generateDemandRecommendations(item, predictedDemand, seasonality, trend);

  return {
    itemId: item.id,
    period: "next_30_days",
    predictedDemand,
    confidence: calculateForecastConfidence(salesData, seasonality, trend),
    factors,
    seasonality,
    trend,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Optimize inventory levels
 */
function optimizeInventoryLevels(
  item: InventoryItem,
  transactions: InventoryTransaction[],
  forecast: DemandForecast
): InventoryOptimization {
  // Calculate safety stock
  const safetyStock = calculateSafetyStock(forecast, item);
  
  // Calculate optimal reorder point
  const optimalReorderPoint = safetyStock + (forecast.predictedDemand * item.leadTime / 30);
  
  // Calculate optimal max stock
  const optimalMaxStock = optimalReorderPoint + (forecast.predictedDemand * item.leadTime);
  
  // Calculate service level
  const serviceLevel = calculateServiceLevel(item, transactions, forecast);
  
  // Calculate costs
  const holdingCost = calculateHoldingCosts(item);
  const stockoutCost = calculateStockoutCost(item, forecast);
  const totalCost = holdingCost + stockoutCost;
  
  // Generate recommendations
  const recommendations = generateOptimizationRecommendations(
    item,
    safetyStock,
    optimalReorderPoint,
    optimalMaxStock,
    serviceLevel
  );

  return {
    itemId: item.id,
    currentStock: item.currentStock,
    optimalStock: optimalReorderPoint + safetyStock,
    reorderPoint: optimalReorderPoint,
    maxStock: optimalMaxStock,
    safetyStock,
    serviceLevel,
    holdingCost,
    stockoutCost,
    totalCost,
    recommendations,
  };
}

/**
 * Generate inventory alerts
 */
function generateInventoryAlerts(
  item: InventoryItem,
  status: InventoryStatus,
  forecast: DemandForecast,
  optimization: InventoryOptimization
): InventoryAlert[] {
  const alerts: InventoryAlert[] = [];

  // Stock alerts
  if (status.status === "out_of_stock") {
    alerts.push({
      type: "stockout",
      severity: "critical",
      message: `Item ${item.name} is out of stock`,
      itemId: item.id,
      recommendation: "Immediate reorder required",
      impact: "Lost sales and customer dissatisfaction",
    });
  } else if (status.status === "low_stock") {
    alerts.push({
      type: "low_stock",
      severity: "high",
      message: `Item ${item.name} has low stock (${item.currentStock} units)`,
      itemId: item.id,
      recommendation: "Reorder soon to avoid stockout",
      impact: "Risk of stockout in ${Math.round(status.daysOfSupply)} days",
    });
  }

  // Overstock alerts
  if (status.status === "overstock") {
    alerts.push({
      type: "overstock",
      severity: "medium",
      message: `Item ${item.name} is overstocked (${item.currentStock} units)`,
      itemId: item.id,
      recommendation: "Consider promotion or reduce order quantity",
      impact: `Excess holding cost: $${status.holdingCosts.toFixed(2)}`,
    });
  }

  // Demand change alerts
  if (forecast.trend.direction === "increasing" && forecast.trend.growthRate > 0.2) {
    alerts.push({
      type: "demand_increase",
      severity: "medium",
      message: `Significant demand increase predicted for ${item.name}`,
      itemId: item.id,
      recommendation: "Increase safety stock and reorder point",
      impact: "Risk of stockout during demand surge",
    });
  } else if (forecast.trend.direction === "decreasing" && forecast.trend.growthRate < -0.2) {
    alerts.push({
      type: "demand_decrease",
      severity: "medium",
      message: `Demand decreasing for ${item.name}`,
      itemId: item.id,
      recommendation: "Reduce order quantities and consider discontinuation",
      impact: "Risk of excess inventory",
    });
  }

  // Seasonal alerts
  if (forecast.seasonality.strength > 0.3) {
    const currentMonth = new Date().getMonth();
    const seasonalFactor = forecast.seasonality.monthly[currentMonth];
    
    if (seasonalFactor > 1.5) {
      alerts.push({
        type: "seasonal_peak",
        severity: "medium",
        message: `Entering peak season for ${item.name}`,
        itemId: item.id,
        recommendation: "Increase stock levels for seasonal demand",
        impact: `${Math.round((seasonalFactor - 1) * 100)}% increase in demand expected`,
      });
    }
  }

  // Cost alerts
  if (optimization.totalCost > optimization.holdingCost * 2) {
    alerts.push({
      type: "high_cost",
      severity: "medium",
      message: `High inventory costs for ${item.name}`,
      itemId: item.id,
      recommendation: "Optimize order quantities and safety stock",
      impact: `Annual cost: $${optimization.totalCost.toFixed(2)}`,
    });
  }

  return alerts;
}

/**
 * Extract sales data from transactions
 */
function extractSalesData(transactions: InventoryTransaction[], itemId: string): Array<{ date: string; quantity: number }> {
  return transactions
    .filter(t => t.itemId === itemId && t.type === "sale")
    .map(t => ({
      date: t.timestamp,
      quantity: t.quantity,
    }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
}

/**
 * Analyze seasonality patterns
 */
function analyzeSeasonality(salesData: Array<{ date: string; quantity: number }>): SeasonalityPattern {
  const monthlyData: Record<number, number[]> = {};
  
  salesData.forEach(sale => {
    const month = new Date(sale.date).getMonth();
    if (!monthlyData[month]) {
      monthlyData[month] = [];
    }
    monthlyData[month].push(sale.quantity);
  });

  // Calculate monthly averages
  const monthlyAverages = new Array(12).fill(0);
  Object.entries(monthlyData).forEach(([month, quantities]) => {
    monthlyAverages[parseInt(month)] = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
  });

  // Calculate seasonal factors
  const overallAvg = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / monthlyAverages.filter(a => a > 0).length;
  const monthlyFactors = monthlyAverages.map(avg => overallAvg > 0 ? avg / overallAvg : 1);

  // Identify peak seasons
  const peakSeasons = monthlyFactors
    .map((factor, index) => ({ month: index, factor }))
    .filter(({ factor }) => factor > 1.2)
    .map(({ month }) => new Date(2024, month, 1).toLocaleString('default', { month: 'long' }));

  // Calculate seasonality strength
  const variance = monthlyFactors.reduce((sum, factor) => sum + Math.pow(factor - 1, 2), 0) / monthlyFactors.length;

  return {
    monthly: monthlyFactors,
    quarterly: calculateQuarterlyFactors(monthlyFactors),
    strength: Math.sqrt(variance),
    peakSeasons,
  };
}

/**
 * Analyze trend in sales data
 */
function analyzeTrend(salesData: Array<{ date: string; quantity: number }>): TrendAnalysis {
  if (salesData.length < 2) {
    return {
      direction: "stable",
      growthRate: 0,
      volatility: 0,
      confidence: 0,
    };
  }

  // Calculate growth rate using linear regression
  const n = salesData.length;
  const xSum = salesData.reduce((sum, _, i) => sum + i, 0);
  const ySum = salesData.reduce((sum, sale) => sum + sale.quantity, 0);
  const xySum = salesData.reduce((sum, sale, i) => sum + i * sale.quantity, 0);
  const x2Sum = salesData.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);
  const avgY = ySum / n;
  const growthRate = avgY > 0 ? slope / avgY : 0;

  // Determine direction
  let direction: "increasing" | "decreasing" | "stable" = "stable";
  if (growthRate > 0.05) direction = "increasing";
  else if (growthRate < -0.05) direction = "decreasing";

  // Calculate volatility
  const avgQuantity = ySum / n;
  const variance = salesData.reduce((sum, sale) => sum + Math.pow(sale.quantity - avgQuantity, 2), 0) / n;
  const volatility = Math.sqrt(variance) / avgY;

  // Calculate confidence based on data consistency
  const confidence = Math.max(0, 1 - volatility);

  return {
    direction,
    growthRate,
    volatility,
    confidence,
  };
}

/**
 * Identify demand factors
 */
function identifyDemandFactors(
  item: InventoryItem,
  salesData: Array<{ date: string; quantity: number }>,
  historicalData?: any
): DemandFactor[] {
  const factors: DemandFactor[] = [];

  // Seasonality factor
  const seasonality = analyzeSeasonality(salesData);
  if (seasonality.strength > 0.2) {
    factors.push({
      factor: "Seasonality",
      impact: seasonality.strength,
      weight: 0.3,
      description: `Strong seasonal pattern with ${seasonality.peakSeasons.length} peak seasons`,
      historicalData: seasonality.monthly,
    });
  }

  // Trend factor
  const trend = analyzeTrend(salesData);
  if (Math.abs(trend.growthRate) > 0.1) {
    factors.push({
      factor: "Trend",
      impact: trend.growthRate,
      weight: 0.25,
      description: `${trend.direction} trend with ${(trend.growthRate * 100).toFixed(1)}% growth rate`,
      historicalData: salesData.map(s => s.quantity),
    });
  }

  // Seasonality factor (item metadata)
  if (item.metadata.seasonality === "high") {
    factors.push({
      factor: "Product Seasonality",
      impact: 0.4,
      weight: 0.2,
      description: "Product has high seasonality",
      historicalData: [],
    });
  }

  // Market conditions factor
  if (historicalData?.marketConditions) {
    const marketImpact = calculateMarketImpact(item, historicalData.marketConditions);
    if (Math.abs(marketImpact) > 0.1) {
      factors.push({
        factor: "Market Conditions",
        impact: marketImpact,
        weight: 0.15,
        description: "Market conditions affecting demand",
        historicalData: [],
      });
    }
  }

  return factors;
}

/**
 * Calculate predicted demand
 */
function calculatePredictedDemand(
  salesData: Array<{ date: string; quantity: number }>,
  seasonality: SeasonalityPattern,
  trend: TrendAnalysis,
  factors: DemandFactor[]
): number {
  // Base demand from recent average
  const recentSales = salesData.slice(-30); // Last 30 data points
  const baseDemand = recentSales.length > 0 
    ? recentSales.reduce((sum, sale) => sum + sale.quantity, 0) / recentSales.length
    : 0;

  // Apply trend
  const trendAdjusted = baseDemand * (1 + trend.growthRate);

  // Apply seasonality
  const currentMonth = new Date().getMonth();
  const seasonalMultiplier = seasonality.monthly[currentMonth] || 1;
  const seasonalAdjusted = trendAdjusted * seasonalMultiplier;

  // Apply factors
  let factorAdjusted = seasonalAdjusted;
  factors.forEach(factor => {
    factorAdjusted *= (1 + factor.impact * factor.weight);
  });

  return Math.max(0, Math.round(factorAdjusted));
}

/**
 * Calculate forecast confidence
 */
function calculateForecastConfidence(
  salesData: Array<{ date: string; quantity: number }>,
  seasonality: SeasonalityPattern,
  trend: TrendAnalysis
): number {
  let confidence = 0.5; // Base confidence

  // Data volume factor
  if (salesData.length >= 90) confidence += 0.2;
  else if (salesData.length >= 30) confidence += 0.1;

  // Trend confidence
  confidence += trend.confidence * 0.2;

  // Seasonality confidence
  if (seasonality.strength > 0.3) confidence += 0.1;

  return Math.min(0.95, confidence);
}

/**
 * Generate demand-based recommendations
 */
function generateDemandRecommendations(
  item: InventoryItem,
  predictedDemand: number,
  seasonality: SeasonalityPattern,
  trend: TrendAnalysis
): InventoryRecommendation[] {
  const recommendations: InventoryRecommendation[] = [];

  // Stock level recommendations
  if (predictedDemand > item.currentStock) {
    recommendations.push({
      type: "reorder",
      priority: "high",
      action: "Increase stock to meet predicted demand",
      reasoning: `Predicted demand (${predictedDemand}) exceeds current stock (${item.currentStock})`,
      quantity: predictedDemand - item.currentStock,
      impact: "Prevent stockout and meet customer demand",
    });
  }

  // Trend-based recommendations
  if (trend.direction === "increasing" && trend.growthRate > 0.2) {
    recommendations.push({
      type: "adjust_stock",
      priority: "medium",
      action: "Increase safety stock and reorder points",
      reasoning: "Strong upward trend in demand",
      impact: "Maintain service levels during growth",
    });
  } else if (trend.direction === "decreasing" && trend.growthRate < -0.2) {
    recommendations.push({
      type: "adjust_stock",
      priority: "medium",
      action: "Reduce stock levels and order quantities",
      reasoning: "Declining demand trend",
      impact: "Reduce holding costs",
    });
  }

  // Seasonal recommendations
  if (seasonality.strength > 0.3) {
    const currentMonth = new Date().getMonth();
    const nextMonth = (currentMonth + 1) % 12;
    
    if (seasonality.monthly[nextMonth] > 1.5) {
      recommendations.push({
        type: "reorder",
        priority: "medium",
        action: "Stock up for upcoming peak season",
        reasoning: `Seasonal peak expected next month`,
        impact: "Meet seasonal demand increase",
      });
    }
  }

  return recommendations;
}

/**
 * Helper functions
 */
function calculateTurnoverRate(item: InventoryItem, transactions: InventoryTransaction[]): number {
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const recentSales = transactions.filter(t => 
    t.itemId === item.id && 
    t.type === "sale" && 
    new Date(t.timestamp) > ninetyDaysAgo
  );
  
  const totalSales = recentSales.reduce((sum, t) => sum + t.quantity, 0);
  const avgInventory = item.currentStock;
  
  return avgInventory > 0 ? (totalSales / 90) / avgInventory : 0;
}

function getLastSaleDate(transactions: InventoryTransaction[], itemId: string): string | null {
  const sales = transactions
    .filter(t => t.itemId === itemId && t.type === "sale")
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return sales.length > 0 ? sales[0].timestamp : null;
}

function calculateStockoutRisk(item: InventoryItem, avgDailySales: number): number {
  if (avgDailySales === 0) return 0;
  
  const daysOfSupply = item.currentStock / avgDailySales;
  const leadTimeDays = item.leadTime;
  
  if (daysOfSupply > leadTimeDays * 2) return 0.1; // Low risk
  if (daysOfSupply > leadTimeDays) return 0.3; // Medium risk
  if (daysOfSupply > 0) return 0.7; // High risk
  return 1.0; // Critical risk
}

function calculateHoldingCosts(item: InventoryItem): number {
  // Annual holding cost = 25% of inventory value (industry standard)
  const annualCost = item.currentStock * item.unitCost * 0.25;
  return annualCost / 365; // Daily holding cost
}

function calculateSafetyStock(forecast: DemandForecast, item: InventoryItem): number {
  // Safety stock = (max daily demand - avg daily demand) * lead time
  const demandVariability = forecast.predictedDemand * 0.2; // 20% variability
  return Math.ceil(demandVariability * (item.leadTime / 30));
}

function calculateServiceLevel(
  item: InventoryItem,
  transactions: InventoryTransaction[],
  forecast: DemandForecast
): number {
  // Service level = 1 - (stockouts / total demand)
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const stockouts = transactions.filter(t => 
    t.itemId === item.id && 
    t.type === "sale" && 
    new Date(t.timestamp) > ninetyDaysAgo &&
    item.currentStock === 0 // Simplified stockout detection
  ).length;
  
  const totalDemand = transactions.filter(t => 
    t.itemId === item.id && 
    t.type === "sale" && 
    new Date(t.timestamp) > ninetyDaysAgo
  ).length;
  
  return totalDemand > 0 ? 1 - (stockouts / totalDemand) : 1;
}

function calculateStockoutCost(item: InventoryItem, forecast: DemandForecast): number {
  // Stockout cost = lost profit + customer dissatisfaction cost
  const lostProfitPerUnit = item.sellingPrice - item.unitCost;
  const customerDissatisfactionCost = lostProfitPerUnit * 0.5; // 50% of profit
  
  return (lostProfitPerUnit + customerDissatisfactionCost) * forecast.predictedDemand * 0.1; // 10% stockout probability
}

function generateOptimizationRecommendations(
  item: InventoryItem,
  safetyStock: number,
  reorderPoint: number,
  maxStock: number,
  serviceLevel: number
): InventoryRecommendation[] {
  const recommendations: InventoryRecommendation[] = [];

  // Reorder point recommendations
  if (Math.abs(reorderPoint - item.reorderPoint) > item.reorderPoint * 0.2) {
    recommendations.push({
      type: "adjust_stock",
      priority: "medium",
      action: `Update reorder point to ${Math.round(reorderPoint)} units`,
      reasoning: `Optimal reorder point differs significantly from current setting`,
      impact: "Improve service level and reduce stockouts",
    });
  }

  // Max stock recommendations
  if (Math.abs(maxStock - item.maxStock) > item.maxStock * 0.2) {
    recommendations.push({
      type: "adjust_stock",
      priority: "medium",
      action: `Update max stock to ${Math.round(maxStock)} units`,
      reasoning: "Optimal max stock differs significantly from current setting",
      impact: "Reduce holding costs while maintaining service levels",
    });
  }

  // Service level recommendations
  if (serviceLevel < 0.9) {
    recommendations.push({
      type: "adjust_stock",
      priority: "high",
      action: "Increase safety stock to improve service level",
      reasoning: `Current service level ${(serviceLevel * 100).toFixed(1)}% is below target`,
      impact: "Reduce stockouts and improve customer satisfaction",
    });
  }

  return recommendations;
}

function calculateQuarterlyFactors(monthlyFactors: number[]): number[] {
  const quarterly = new Array(4).fill(0);
  for (let i = 0; i < 12; i++) {
    quarterly[Math.floor(i / 3)] += monthlyFactors[i];
  }
  return quarterly.map(q => q / 3);
}

function calculateMarketImpact(item: InventoryItem, marketConditions: MarketCondition[]): number {
  // Simplified market impact calculation
  return marketConditions.reduce((impact, condition) => {
    if (condition.category === item.category) {
      return impact + condition.impact;
    }
    return impact;
  }, 0) / marketConditions.length;
}

// Type definitions
interface InventoryStatus {
  status: "in_stock" | "low_stock" | "out_of_stock" | "overstock" | "discontinued";
  currentStock: number;
  daysOfSupply: number;
  avgDailySales: number;
  inventoryValue: number;
  turnoverRate: number;
  lastSaleDate: string | null;
  stockoutRisk: number;
  holdingCosts: number;
}

interface InventoryAlert {
  type: "stockout" | "low_stock" | "overstock" | "demand_increase" | "demand_decrease" | "seasonal_peak" | "high_cost";
  severity: "info" | "low" | "medium" | "high" | "critical";
  message: string;
  itemId: string;
  recommendation: string;
  impact: string;
}

interface MarketCondition {
  category: string;
  impact: number;
  description: string;
}
