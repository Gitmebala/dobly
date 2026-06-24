/**
 * Fraud Detection Automation for Finance Department
 * Uses AI to detect suspicious transactions and prevent fraud
 */

export interface Transaction {
  id: string;
  type: "payment" | "refund" | "transfer" | "chargeback";
  amount: number;
  currency: string;
  timestamp: string;
  source: {
    accountId: string;
    customerId?: string;
    vendorId?: string;
    method: "card" | "bank" | "crypto" | "wallet";
    ip?: string;
    device?: string;
  };
  destination?: {
    accountId: string;
    vendorId?: string;
    method: string;
  };
  metadata: {
    description?: string;
    category?: string;
    reference?: string;
    invoiceId?: string;
  };
  status: "pending" | "approved" | "rejected" | "flagged" | "investigating";
}

export interface FraudAnalysis {
  transactionId: string;
  riskScore: number; // 0-100
  riskLevel: "low" | "medium" | "high" | "critical";
  indicators: FraudIndicator[];
  patterns: FraudPattern[];
  recommendations: FraudRecommendation[];
  confidence: number;
  analyzedAt: string;
  requiresAction: boolean;
  actionDeadline?: string;
}

export interface FraudIndicator {
  type: "amount" | "frequency" | "location" | "time" | "behavior" | "identity" | "velocity";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  value: any;
  threshold: any;
  deviation: number;
  evidence: string[];
}

export interface FraudPattern {
  name: string;
  type: "known_scheme" | "anomaly" | "correlation" | "sequence";
  description: string;
  confidence: number;
  relatedTransactions: string[];
  riskScore: number;
}

export interface FraudRecommendation {
  action: "block" | "investigate" | "monitor" | "approve" | "verify";
  priority: "low" | "medium" | "high" | "urgent";
  description: string;
  reasoning: string;
  estimatedImpact: string;
}

export interface CustomerProfile {
  customerId: string;
  accountAge: number; // days
  transactionHistory: Transaction[];
  averageTransactionAmount: number;
  typicalCategories: string[];
  typicalLocations: string[];
  typicalTimes: string[];
  riskScore: number;
  flags: string[];
  lastActivity: string;
}

/**
 * Analyze transaction for fraud indicators
 */
export async function analyzeTransactionForFraud(
  transaction: Transaction,
  customerProfile?: CustomerProfile,
  historicalData?: {
    recentTransactions: Transaction[];
    knownFraudPatterns: FraudPattern[];
    industryBenchmarks: IndustryBenchmark[];
  }
): Promise<FraudAnalysis> {
  // Step 1: Analyze amount-based indicators
  const amountIndicators = analyzeAmountIndicators(transaction, customerProfile, historicalData);
  
  // Step 2: Analyze frequency and velocity indicators
  const frequencyIndicators = analyzeFrequencyIndicators(transaction, customerProfile, historicalData);
  
  // Step 3: Analyze location and device indicators
  const locationIndicators = analyzeLocationIndicators(transaction, customerProfile);
  
  // Step 4: Analyze timing indicators
  const timingIndicators = analyzeTimingIndicators(transaction, customerProfile);
  
  // Step 5: Analyze behavioral indicators
  const behavioralIndicators = analyzeBehavioralIndicators(transaction, customerProfile);
  
  // Step 6: Check for known fraud patterns
  const patterns = checkFraudPatterns(transaction, historicalData?.knownFraudPatterns);
  
  // Step 7: Calculate overall risk score
  const allIndicators = [...amountIndicators, ...frequencyIndicators, ...locationIndicators, ...timingIndicators, ...behavioralIndicators];
  const riskScore = calculateRiskScore(allIndicators, patterns);
  
  // Step 8: Determine risk level
  const riskLevel = determineRiskLevel(riskScore);
  
  // Step 9: Generate recommendations
  const recommendations = generateFraudRecommendations(riskLevel, allIndicators, patterns);
  
  // Step 10: Calculate confidence
  const confidence = calculateAnalysisConfidence(allIndicators, patterns, customerProfile);

  return {
    transactionId: transaction.id,
    riskScore,
    riskLevel,
    indicators: allIndicators,
    patterns,
    recommendations,
    confidence,
    analyzedAt: new Date().toISOString(),
    requiresAction: riskLevel === "high" || riskLevel === "critical",
    actionDeadline: riskLevel === "critical" ? new Date(Date.now() + 60 * 60 * 1000).toISOString() : undefined,
  };
}

/**
 * Analyze amount-based fraud indicators
 */
function analyzeAmountIndicators(
  transaction: Transaction,
  customerProfile?: CustomerProfile,
  historicalData?: any
): FraudIndicator[] {
  const indicators: FraudIndicator[] = [];

  // Unusually large amount
  if (customerProfile) {
    const avgAmount = customerProfile.averageTransactionAmount;
    const deviation = (transaction.amount - avgAmount) / avgAmount;
    
    if (deviation > 5) { // 500% of average
      indicators.push({
        type: "amount",
        severity: "critical",
        description: "Transaction amount significantly exceeds customer average",
        value: transaction.amount,
        threshold: avgAmount * 5,
        deviation: deviation * 100,
        evidence: [`Average: $${avgAmount.toFixed(2)}, Current: $${transaction.amount.toFixed(2)}`],
      });
    } else if (deviation > 2) { // 200% of average
      indicators.push({
        type: "amount",
        severity: "high",
        description: "Transaction amount unusually high for this customer",
        value: transaction.amount,
        threshold: avgAmount * 2,
        deviation: deviation * 100,
        evidence: [`Average: $${avgAmount.toFixed(2)}, Current: $${transaction.amount.toFixed(2)}`],
      });
    }
  }

  // Round number amounts (often suspicious)
  if (transaction.amount % 1 === 0 && transaction.amount > 1000) {
    indicators.push({
      type: "amount",
      severity: "medium",
      description: "Large round number transaction (potential structuring)",
      value: transaction.amount,
      threshold: 1000,
      deviation: 0,
      evidence: [`Round amount: $${transaction.amount.toFixed(0)}`],
    });
  }

  // Industry benchmark comparison
  if (historicalData?.industryBenchmarks) {
    const benchmark = historicalData.industryBenchmarks.find(b => b.category === transaction.metadata.category);
    if (benchmark) {
      const percentile = calculatePercentile(transaction.amount, benchmark.amountDistribution);
      if (percentile > 95) {
        indicators.push({
          type: "amount",
          severity: "high",
          description: "Transaction in top 5% of industry amounts",
          value: transaction.amount,
          threshold: benchmark.percentile95,
          deviation: percentile - 95,
          evidence: [`Percentile: ${percentile.toFixed(1)}%`],
        });
      }
    }
  }

  // Maximum transaction limits
  const dailyLimit = 10000; // Would be customer-specific
  if (transaction.amount > dailyLimit) {
    indicators.push({
      type: "amount",
      severity: "critical",
      description: "Transaction exceeds daily limit",
      value: transaction.amount,
      threshold: dailyLimit,
      deviation: ((transaction.amount - dailyLimit) / dailyLimit) * 100,
      evidence: [`Limit: $${dailyLimit}, Amount: $${transaction.amount.toFixed(2)}`],
    });
  }

  return indicators;
}

/**
 * Analyze frequency and velocity indicators
 */
function analyzeFrequencyIndicators(
  transaction: Transaction,
  customerProfile?: CustomerProfile,
  historicalData?: any
): FraudIndicator[] {
  const indicators: FraudIndicator[] = [];

  if (!historicalData?.recentTransactions) return indicators;

  const now = new Date(transaction.timestamp);
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // High frequency in short time
  const recentTransactions = historicalData.recentTransactions.filter(t => 
    t.source.accountId === transaction.source.accountId &&
    new Date(t.timestamp) > oneHourAgo
  );

  if (recentTransactions.length > 10) {
    indicators.push({
      type: "frequency",
      severity: "high",
      description: "High transaction frequency detected",
      value: recentTransactions.length,
      threshold: 10,
      deviation: recentTransactions.length - 10,
      evidence: [`${recentTransactions.length} transactions in last hour`],
    });
  }

  // Rapid succession (velocity check)
  const last5Minutes = historicalData.recentTransactions.filter(t => 
    t.source.accountId === transaction.source.accountId &&
    new Date(t.timestamp) > new Date(now.getTime() - 5 * 60 * 1000)
  );

  if (last5Minutes.length > 3) {
    indicators.push({
      type: "velocity",
      severity: "critical",
      description: "Rapid succession transactions detected",
      value: last5Minutes.length,
      threshold: 3,
      deviation: last5Minutes.length - 3,
      evidence: [`${last5Minutes.length} transactions in 5 minutes`],
    });
  }

  // Daily volume check
  const dailyTransactions = historicalData.recentTransactions.filter(t => 
    t.source.accountId === transaction.source.accountId &&
    new Date(t.timestamp) > oneDayAgo
  );

  const dailyVolume = dailyTransactions.reduce((sum, t) => sum + t.amount, 0);
  if (dailyVolume > 50000) {
    indicators.push({
      type: "velocity",
      severity: "high",
      description: "High daily transaction volume",
      value: dailyVolume,
      threshold: 50000,
      deviation: ((dailyVolume - 50000) / 50000) * 100,
      evidence: [`Daily volume: $${dailyVolume.toFixed(2)}`],
    });
  }

  return indicators;
}

/**
 * Analyze location and device indicators
 */
function analyzeLocationIndicators(
  transaction: Transaction,
  customerProfile?: CustomerProfile
): FraudIndicator[] {
  const indicators: FraudIndicator[] = [];

  if (!transaction.source.ip || !customerProfile) return indicators;

  // New location (geolocation would be implemented here)
  const isNewLocation = !customerProfile.typicalLocations.includes(transaction.source.ip);
  if (isNewLocation) {
    indicators.push({
      type: "location",
      severity: "medium",
      description: "Transaction from new location",
      value: transaction.source.ip,
      threshold: "Known locations only",
      deviation: 0,
      evidence: [`New IP: ${transaction.source.ip}`],
    });
  }

  // Cross-border transaction
  // In real implementation, would check IP geolocation vs account location
  const isCrossBorder = Math.random() > 0.8; // Mock
  if (isCrossBorder) {
    indicators.push({
      type: "location",
      severity: "medium",
      description: "Cross-border transaction detected",
      value: "International",
      threshold: "Domestic only",
      deviation: 0,
      evidence: ["International IP detected"],
    });
  }

  // New device
  if (transaction.source.device && customerProfile.lastActivity) {
    const isNewDevice = Math.random() > 0.9; // Mock - would check device history
    if (isNewDevice) {
      indicators.push({
        type: "identity",
        severity: "low",
        description: "Transaction from new device",
        value: transaction.source.device,
        threshold: "Known devices only",
        deviation: 0,
        evidence: [`New device: ${transaction.source.device}`],
      });
    }
  }

  return indicators;
}

/**
 * Analyze timing indicators
 */
function analyzeTimingIndicators(
  transaction: Transaction,
  customerProfile?: CustomerProfile
): FraudIndicator[] {
  const indicators: FraudIndicator[] = [];

  const transactionTime = new Date(transaction.timestamp);
  const hour = transactionTime.getHours();

  // Unusual transaction time
  if (hour < 6 || hour > 23) {
    indicators.push({
      type: "time",
      severity: "low",
      description: "Transaction during unusual hours",
      value: hour,
      threshold: "6:00 - 23:00",
      deviation: 0,
      evidence: [`Transaction time: ${hour}:00`],
    });
  }

  // Weekend transaction
  const dayOfWeek = transactionTime.getDay();
  if (dayOfWeek === 0 || dayOfWeek === 6) { // Saturday or Sunday
    indicators.push({
      type: "time",
      severity: "low",
      description: "Weekend transaction",
      value: dayOfWeek,
      threshold: "Weekdays only",
      deviation: 0,
      evidence: ["Weekend transaction detected"],
    });
  }

  // Time since last transaction
  if (customerProfile?.lastActivity) {
    const lastActivity = new Date(customerProfile.lastActivity);
    const hoursSinceLastActivity = (transactionTime.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastActivity < 1) {
      indicators.push({
        type: "time",
        severity: "medium",
        description: "Very rapid transaction succession",
        value: hoursSinceLastActivity,
        threshold: 1,
        deviation: 1 - hoursSinceLastActivity,
        evidence: [`${hoursSinceLastActivity.toFixed(2)} hours since last transaction`],
      });
    }
  }

  return indicators;
}

/**
 * Analyze behavioral indicators
 */
function analyzeBehavioralIndicators(
  transaction: Transaction,
  customerProfile?: CustomerProfile
): FraudIndicator[] {
  const indicators: FraudIndicator[] = [];

  // Unusual category for customer
  if (customerProfile && transaction.metadata.category) {
    const isTypicalCategory = customerProfile.typicalCategories.includes(transaction.metadata.category);
    if (!isTypicalCategory) {
      indicators.push({
        type: "behavior",
        severity: "medium",
        description: "Transaction in unusual category for customer",
        value: transaction.metadata.category,
        threshold: "Typical categories only",
        deviation: 0,
        evidence: [`New category: ${transaction.metadata.category}`],
      });
    }
  }

  // Multiple payment methods
  if (customerProfile) {
    const recentMethods = customerProfile.transactionHistory
      .slice(-10)
      .map(t => t.source.method);
    
    const uniqueMethods = new Set(recentMethods);
    if (uniqueMethods.size > 3) {
      indicators.push({
        type: "behavior",
        severity: "medium",
        description: "Multiple payment methods used recently",
        value: uniqueMethods.size,
        threshold: 3,
        deviation: uniqueMethods.size - 3,
        evidence: [`${uniqueMethods.size} different payment methods`],
      });
    }
  }

  // Chargeback history
  if (customerProfile?.flags.includes("previous_chargeback")) {
    indicators.push({
      type: "behavior",
      severity: "high",
      description: "Customer has previous chargeback history",
      value: true,
      threshold: false,
      deviation: 0,
      evidence: ["Previous chargeback flag found"],
    });
  }

  return indicators;
}

/**
 * Check for known fraud patterns
 */
function checkFraudPatterns(
  transaction: Transaction,
  knownPatterns?: FraudPattern[]
): FraudPattern[] {
  if (!knownPatterns) return [];

  const matchedPatterns: FraudPattern[] = [];

  knownPatterns.forEach(pattern => {
    // Simplified pattern matching - in real implementation would be more sophisticated
    let matches = false;
    let confidence = 0;

    switch (pattern.name) {
      case "card_testing":
        matches = transaction.amount < 5 && transaction.type === "payment";
        confidence = matches ? 0.8 : 0;
        break;
      
      case "micro_structuring":
        matches = transaction.amount > 900 && transaction.amount < 1000 && transaction.type === "payment";
        confidence = matches ? 0.7 : 0;
        break;
      
      case "rapid_refunds":
        matches = transaction.type === "refund" && transaction.amount > 1000;
        confidence = matches ? 0.6 : 0;
        break;
    }

    if (matches && confidence > 0.5) {
      matchedPatterns.push({
        ...pattern,
        confidence,
        relatedTransactions: [transaction.id],
      });
    }
  });

  return matchedPatterns;
}

/**
 * Calculate overall risk score
 */
function calculateRiskScore(
  indicators: FraudIndicator[],
  patterns: FraudPattern[]
): number {
  let totalScore = 0;

  // Score from indicators
  indicators.forEach(indicator => {
    const severityWeights = {
      low: 5,
      medium: 15,
      high: 30,
      critical: 50,
    };
    
    const weight = severityWeights[indicator.severity] || 10;
    totalScore += weight;
  });

  // Score from patterns
  patterns.forEach(pattern => {
    totalScore += pattern.riskScore * pattern.confidence;
  });

  // Normalize to 0-100 scale
  return Math.min(100, totalScore);
}

/**
 * Determine risk level
 */
function determineRiskLevel(riskScore: number): FraudAnalysis["riskLevel"] {
  if (riskScore >= 80) return "critical";
  if (riskScore >= 60) return "high";
  if (riskScore >= 30) return "medium";
  return "low";
}

/**
 * Generate fraud recommendations
 */
function generateFraudRecommendations(
  riskLevel: FraudAnalysis["riskLevel"],
  indicators: FraudIndicator[],
  patterns: FraudPattern[]
): FraudRecommendation[] {
  const recommendations: FraudRecommendation[] = [];

  switch (riskLevel) {
    case "critical":
      recommendations.push({
        action: "block",
        priority: "urgent",
        description: "Block transaction immediately",
        reasoning: "Critical risk score requires immediate action",
        estimatedImpact: "Prevents potential financial loss",
      });
      recommendations.push({
        action: "investigate",
        priority: "urgent",
        description: "Initiate fraud investigation",
        reasoning: "Critical indicators detected",
        estimatedImpact: "Identifies fraud source and prevents future attempts",
      });
      break;

    case "high":
      recommendations.push({
        action: "verify",
        priority: "high",
        description: "Require additional verification",
        reasoning: "High risk transaction needs confirmation",
        estimatedImpact: "Reduces false positives while maintaining security",
      });
      recommendations.push({
        action: "monitor",
        priority: "medium",
        description: "Place account on heightened monitoring",
        reasoning: "Account shows suspicious behavior",
        estimatedImpact: "Detects follow-up fraudulent activity",
      });
      break;

    case "medium":
      recommendations.push({
        action: "monitor",
        priority: "medium",
        description: "Monitor for related transactions",
        reasoning: "Medium risk indicators present",
        estimatedImpact: "Builds pattern evidence if fraud is attempted",
      });
      break;

    case "low":
      recommendations.push({
        action: "approve",
        priority: "low",
        description: "Proceed with transaction",
        reasoning: "Low risk, normal transaction pattern",
        estimatedImpact: "Maintains customer experience while monitoring",
      });
      break;
  }

  // Add specific recommendations based on indicators
  const criticalIndicators = indicators.filter(i => i.severity === "critical");
  if (criticalIndicators.length > 0) {
    recommendations.push({
      action: "investigate",
      priority: "high",
      description: "Investigate critical indicators",
      reasoning: `Critical indicators: ${criticalIndicators.map(i => i.type).join(", ")}`,
      estimatedImpact: "Addresses specific fraud vectors",
    });
  }

  return recommendations;
}

/**
 * Calculate analysis confidence
 */
function calculateAnalysisConfidence(
  indicators: FraudIndicator[],
  patterns: FraudPattern[],
  customerProfile?: CustomerProfile
): number {
  let confidence = 0.5; // Base confidence

  // More indicators = higher confidence
  if (indicators.length >= 3) confidence += 0.2;
  else if (indicators.length >= 1) confidence += 0.1;

  // Known patterns = higher confidence
  if (patterns.length > 0) confidence += 0.2;

  // Customer history = higher confidence
  if (customerProfile && customerProfile.transactionHistory.length > 10) {
    confidence += 0.1;
  }

  return Math.min(0.95, confidence);
}

/**
 * Calculate percentile for benchmark comparison
 */
function calculatePercentile(value: number, distribution: number[]): number {
  const sorted = distribution.sort((a, b) => a - b);
  const rank = sorted.findIndex(v => v >= value);
  return (rank / sorted.length) * 100;
}

/**
 * Batch analyze multiple transactions
 */
export async function batchAnalyzeTransactions(
  transactions: Transaction[],
  customerProfiles?: Record<string, CustomerProfile>,
  historicalData?: any
): Promise<FraudAnalysis[]> {
  const analyses: FraudAnalysis[] = [];

  for (const transaction of transactions) {
    const profile = customerProfiles?.[transaction.source.accountId];
    const analysis = await analyzeTransactionForFraud(transaction, profile, historicalData);
    analyses.push(analysis);
  }

  return analyses;
}

/**
 * Update customer profile with transaction data
 */
export function updateCustomerProfile(
  profile: CustomerProfile,
  transaction: Transaction
): CustomerProfile {
  const updatedProfile = { ...profile };

  // Update transaction history
  updatedProfile.transactionHistory.push(transaction);
  
  // Keep only last 100 transactions
  if (updatedProfile.transactionHistory.length > 100) {
    updatedProfile.transactionHistory = updatedProfile.transactionHistory.slice(-100);
  }

  // Update average transaction amount
  const totalAmount = updatedProfile.transactionHistory.reduce((sum, t) => sum + t.amount, 0);
  updatedProfile.averageTransactionAmount = totalAmount / updatedProfile.transactionHistory.length;

  // Update typical categories
  const categories = updatedProfile.transactionHistory.map(t => t.metadata.category).filter(Boolean);
  const categoryCounts: Record<string, number> = {};
  categories.forEach(cat => {
    if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  updatedProfile.typicalCategories = Object.entries(categoryCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat]) => cat);

  // Update last activity
  updatedProfile.lastActivity = transaction.timestamp;

  return updatedProfile;
}

interface IndustryBenchmark {
  category: string;
  amountDistribution: number[];
  percentile95: number;
  averageAmount: number;
}
