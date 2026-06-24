/**
 * Quality Control Automation for Operations Department
 * Uses AI to monitor quality, detect defects, and recommend improvements
 */

export interface QualityInspection {
  id: string;
  productId: string;
  productName: string;
  batchId: string;
  inspectionDate: string;
  inspectorId: string;
  inspectionType: "incoming" | "in_process" | "final" | "customer_return";
  status: "passed" | "failed" | "conditional_pass" | "pending";
  overallScore: number; // 0-100
  measurements: QualityMeasurement[];
  defects: QualityDefect[];
  images?: string[];
  notes?: string;
  environmental: {
    temperature: number;
    humidity: number;
    pressure?: number;
  };
  equipment: {
    deviceId: string;
    calibrationDate: string;
    maintenanceStatus: "good" | "due" | "overdue";
  };
}

export interface QualityMeasurement {
  id: string;
  characteristic: string;
  specification: {
    nominal: number;
    tolerance: {
      upper: number;
      lower: number;
    };
    unit: string;
  };
  actual: number;
  deviation: number;
  result: "within_spec" | "out_of_spec" | "critical";
  confidence: number;
  method: "manual" | "automated" | "vision_system" | "sensor";
}

export interface QualityDefect {
  id: string;
  type: "cosmetic" | "functional" | "safety" | "dimensional" | "material";
  severity: "minor" | "major" | "critical";
  description: string;
  location: string;
  detectedBy: "human" | "ai_vision" | "sensor" | "automated_test";
  confidence: number;
  images?: string[];
  recommendedAction: "accept" | "rework" | "scrap" | "quarantine";
}

export interface QualityTrend {
  productId: string;
  productName: string;
  period: string;
  defectRate: number;
  qualityScore: number;
  topDefects: QualityDefect[];
  trend: "improving" | "declining" | "stable";
  confidence: number;
  factors: QualityFactor[];
  predictions: QualityPrediction[];
}

export interface QualityFactor {
  factor: string;
  impact: number; // -1 to 1
  weight: number;
  description: string;
  correlation: number;
  dataPoints: number[];
}

export interface QualityPrediction {
  metric: string;
  currentValue: number;
  predictedValue: number;
  timeframe: string;
  confidence: number;
  risk: "low" | "medium" | "high";
}

export interface QualityImprovement {
  type: "process" | "equipment" | "material" | "training" | "environmental";
  priority: "low" | "medium" | "high" | "urgent";
  title: string;
  description: string;
  rootCause: string;
  recommendedActions: string[];
  expectedImpact: {
    defectReduction: number;
    costSavings: number;
    qualityImprovement: number;
  };
  implementation: {
    cost: number;
    timeframe: string;
    resources: string[];
    risk: "low" | "medium" | "high";
  };
  roi: number;
}

export interface QualityAlert {
  type: "spike" | "trend" | "equipment" | "material" | "process";
  severity: "info" | "warning" | "critical";
  message: string;
  productId?: string;
  batchId?: string;
  metric: string;
  value: number;
  threshold: number;
  recommendation: string;
  timestamp: string;
}

/**
 * Analyze quality inspection results using AI
 */
export async function analyzeQualityInspection(
  inspection: QualityInspection,
  historicalData?: {
    previousInspections: QualityInspection[];
    qualityTrends: QualityTrend[];
    defectPatterns: Record<string, QualityDefect[]>;
    equipmentPerformance: Record<string, any>;
  }
): Promise<{
  qualityScore: number;
  riskAssessment: QualityRiskAssessment;
  recommendations: QualityImprovement[];
  alerts: QualityAlert[];
  trends: QualityTrend;
}> {
  // Step 1: Calculate comprehensive quality score
  const qualityScore = calculateQualityScore(inspection);
  
  // Step 2: Assess quality risks
  const riskAssessment = assessQualityRisks(inspection, historicalData);
  
  // Step 3: Generate improvement recommendations
  const recommendations = generateQualityImprovements(inspection, riskAssessment, historicalData);
  
  // Step 4: Generate quality alerts
  const alerts = generateQualityAlerts(inspection, qualityScore, riskAssessment);
  
  // Step 5: Analyze quality trends
  const trends = analyzeQualityTrends(inspection, historicalData);

  return {
    qualityScore,
    riskAssessment,
    recommendations,
    alerts,
    trends,
  };
}

/**
 * Calculate comprehensive quality score
 */
function calculateQualityScore(inspection: QualityInspection): number {
  let totalScore = 0;
  let weightSum = 0;

  // Measurement scores (50% weight)
  if (inspection.measurements.length > 0) {
    const measurementScore = inspection.measurements.reduce((sum, measurement) => {
      let score = 100;
      
      if (measurement.result === "critical") score = 0;
      else if (measurement.result === "out_of_spec") score = 50;
      else if (measurement.result === "within_spec") score = 100;
      
      // Adjust for confidence
      score *= measurement.confidence;
      
      return sum + score;
    }, 0) / inspection.measurements.length;
    
    totalScore += measurementScore * 0.5;
    weightSum += 0.5;
  }

  // Defect scores (40% weight)
  if (inspection.defects.length > 0) {
    const defectScore = calculateDefectScore(inspection.defects);
    totalScore += defectScore * 0.4;
    weightSum += 0.4;
  } else {
    totalScore += 100 * 0.4; // No defects = perfect score
    weightSum += 0.4;
  }

  // Environmental factors (5% weight)
  const environmentalScore = calculateEnvironmentalScore(inspection.environmental);
  totalScore += environmentalScore * 0.05;
  weightSum += 0.05;

  // Equipment factors (5% weight)
  const equipmentScore = calculateEquipmentScore(inspection.equipment);
  totalScore += equipmentScore * 0.05;
  weightSum += 0.05;

  return weightSum > 0 ? totalScore / weightSum : 0;
}

/**
 * Calculate defect score based on severity and quantity
 */
function calculateDefectScore(defects: QualityDefect[]): number {
  if (defects.length === 0) return 100;

  let totalPenalty = 0;
  
  defects.forEach(defect => {
    let penalty = 0;
    
    switch (defect.severity) {
      case "critical":
        penalty = 50;
        break;
      case "major":
        penalty = 20;
        break;
      case "minor":
        penalty = 5;
        break;
    }
    
    // Adjust for detection confidence
    penalty *= defect.confidence;
    
    totalPenalty += penalty;
  });

  return Math.max(0, 100 - totalPenalty);
}

/**
 * Calculate environmental quality score
 */
function calculateEnvironmentalScore(environmental: QualityInspection["environmental"]): number {
  let score = 100;
  
  // Temperature check (assuming optimal range 18-25°C)
  if (environmental.temperature < 18 || environmental.temperature > 25) {
    score -= Math.abs(environmental.temperature - 21.5) * 2;
  }
  
  // Humidity check (assuming optimal range 40-60%)
  if (environmental.humidity < 40 || environmental.humidity > 60) {
    score -= Math.abs(environmental.humidity - 50);
  }
  
  return Math.max(0, score);
}

/**
 * Calculate equipment quality score
 */
function calculateEquipmentScore(equipment: QualityInspection["equipment"]): number {
  let score = 100;
  
  // Check calibration status
  const calibrationAge = (Date.now() - new Date(equipment.calibrationDate).getTime()) / (1000 * 60 * 60 * 24);
  if (equipment.maintenanceStatus === "overdue") {
    score -= 30;
  } else if (equipment.maintenanceStatus === "due") {
    score -= 10;
  }
  
  // Check calibration age (assuming 90-day calibration interval)
  if (calibrationAge > 90) {
    score -= Math.min(20, (calibrationAge - 90) / 10);
  }
  
  return Math.max(0, score);
}

/**
 * Assess quality risks
 */
function assessQualityRisks(
  inspection: QualityInspection,
  historicalData?: any
): QualityRiskAssessment {
  const risks: QualityRisk[] = [];
  
  // Critical defects risk
  const criticalDefects = inspection.defects.filter(d => d.severity === "critical");
  if (criticalDefects.length > 0) {
    risks.push({
      type: "product_safety",
      severity: "critical",
      probability: 1.0,
      impact: `Critical defects detected: ${criticalDefects.length}`,
      description: criticalDefects.map(d => d.description).join("; "),
      mitigation: "Immediate quarantine and root cause analysis required",
    });
  }

  // Measurement out of spec risk
  const outOfSpecMeasurements = inspection.measurements.filter(m => m.result === "out_of_spec" || m.result === "critical");
  if (outOfSpecMeasurements.length > 0) {
    risks.push({
      type: "dimensional",
      severity: outOfSpecMeasurements.some(m => m.result === "critical") ? "critical" : "high",
      probability: 0.8,
      impact: `Measurements out of specification: ${outOfSpecMeasurements.length}`,
      description: outOfSpecMeasurements.map(m => `${m.characteristic}: ${m.actual} vs spec ${m.specification.nominal}±${m.specification.tolerance.upper}`).join("; "),
      mitigation: "Review measurement process and equipment calibration",
    });
  }

  // Equipment risk
  if (inspection.equipment.maintenanceStatus === "overdue") {
    risks.push({
      type: "equipment",
      severity: "medium",
      probability: 0.6,
      impact: "Equipment maintenance overdue",
      description: `Equipment ${inspection.equipment.deviceId} requires immediate maintenance`,
      mitigation: "Schedule equipment maintenance and calibration",
    });
  }

  // Environmental risk
  if (inspection.environmental.temperature < 15 || inspection.environmental.temperature > 30) {
    risks.push({
      type: "environmental",
      severity: "medium",
      probability: 0.4,
      impact: "Environmental conditions outside optimal range",
      description: `Temperature: ${inspection.environmental.temperature}°C, Humidity: ${inspection.environmental.humidity}%`,
      mitigation: "Adjust environmental controls before continuing production",
    });
  }

  // Historical pattern risk
  if (historicalData?.qualityTrends) {
    const recentTrend = historicalData.qualityTrends
      .filter(t => t.productId === inspection.productId)
      .slice(-3);
    
    if (recentTrend.length >= 2 && recentTrend.every(t => t.trend === "declining")) {
      risks.push({
        type: "trend",
        severity: "high",
        probability: 0.7,
        impact: "Declining quality trend detected",
        description: "Quality has been declining in recent inspections",
        mitigation: "Conduct comprehensive quality review and process improvement",
      });
    }
  }

  // Calculate overall risk score
  const riskScore = risks.reduce((sum, risk) => {
    const severityWeight = risk.severity === "critical" ? 4 : risk.severity === "high" ? 3 : risk.severity === "medium" ? 2 : 1;
    return sum + (risk.probability * severityWeight);
  }, 0) / (risks.length || 1);

  return {
    overallRisk: riskScore > 3 ? "critical" : riskScore > 2 ? "high" : riskScore > 1 ? "medium" : "low",
    riskScore,
    risks,
    mitigationPriority: risks.sort((a, b) => (b.probability * (b.severity === "critical" ? 4 : b.severity === "high" ? 3 : b.severity === "medium" ? 2 : 1)) - 
                                          (a.probability * (a.severity === "critical" ? 4 : a.severity === "high" ? 3 : a.severity === "medium" ? 2 : 1))),
  };
}

/**
 * Generate quality improvement recommendations
 */
function generateQualityImprovements(
  inspection: QualityInspection,
  riskAssessment: QualityRiskAssessment,
  historicalData?: any
): QualityImprovement[] {
  const improvements: QualityImprovement[] = [];

  // Process improvements for critical defects
  const criticalDefects = inspection.defects.filter(d => d.severity === "critical");
  if (criticalDefects.length > 0) {
    improvements.push({
      type: "process",
      priority: "urgent",
      title: "Address Critical Quality Issues",
      description: `Critical defects detected requiring immediate process review`,
      rootCause: "Process or equipment failure causing critical defects",
      recommendedActions: [
        "Stop production and quarantine affected batches",
        "Conduct root cause analysis",
        "Implement corrective actions",
        "Update quality control procedures",
      ],
      expectedImpact: {
        defectReduction: 95,
        costSavings: criticalDefects.length * 1000,
        qualityImprovement: 30,
      },
      implementation: {
        cost: 5000,
        timeframe: "1-2 weeks",
        resources: ["Quality Engineer", "Production Manager", "Equipment Technician"],
        risk: "medium",
      },
      roi: 10,
    });
  }

  // Equipment improvements
  if (inspection.equipment.maintenanceStatus !== "good") {
    improvements.push({
      type: "equipment",
      priority: "high",
      title: "Equipment Maintenance and Calibration",
      description: "Equipment requires maintenance to ensure consistent quality",
      rootCause: "Equipment maintenance overdue affecting measurement accuracy",
      recommendedActions: [
        "Schedule immediate maintenance",
        "Calibrate all measurement equipment",
        "Implement preventive maintenance schedule",
        "Document maintenance procedures",
      ],
      expectedImpact: {
        defectReduction: 20,
        costSavings: 2000,
        qualityImprovement: 15,
      },
      implementation: {
        cost: 1500,
        timeframe: "3-5 days",
        resources: ["Maintenance Technician", "Quality Engineer"],
        risk: "low",
      },
      roi: 5,
    });
  }

  // Environmental improvements
  if (inspection.environmental.temperature < 18 || inspection.environmental.temperature > 25) {
    improvements.push({
      type: "environmental",
      priority: "medium",
      title: "Optimize Environmental Conditions",
      description: "Environmental conditions are affecting product quality",
      rootCause: "Temperature and humidity outside optimal ranges",
      recommendedActions: [
        "Adjust HVAC system settings",
        "Install environmental monitoring",
        "Implement environmental control procedures",
        "Train staff on environmental requirements",
      ],
      expectedImpact: {
        defectReduction: 10,
        costSavings: 1000,
        qualityImprovement: 8,
      },
      implementation: {
        cost: 3000,
        timeframe: "1 week",
        resources: ["Facilities Manager", "HVAC Technician"],
        risk: "low",
      },
      roi: 2,
    });
  }

  // Training improvements
  const humanDetectedDefects = inspection.defects.filter(d => d.detectedBy === "human");
  if (humanDetectedDefects.length > inspection.defects.length * 0.5) {
    improvements.push({
      type: "training",
      priority: "medium",
      title: "Enhance Quality Inspection Training",
      description: "Improve inspector effectiveness through better training",
      rootCause: "Inconsistent defect detection by human inspectors",
      recommendedActions: [
        "Develop comprehensive training program",
        "Create visual defect reference guides",
        "Implement regular competency assessments",
        "Introduce AI-assisted inspection tools",
      ],
      expectedImpact: {
        defectReduction: 15,
        costSavings: 1500,
        qualityImprovement: 12,
      },
      implementation: {
        cost: 2500,
        timeframe: "2-3 weeks",
        resources: ["Training Manager", "Quality Engineer"],
        risk: "low",
      },
      roi: 3,
    });
  }

  return improvements.sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

/**
 * Generate quality alerts
 */
function generateQualityAlerts(
  inspection: QualityInspection,
  qualityScore: number,
  riskAssessment: QualityRiskAssessment
): QualityAlert[] {
  const alerts: QualityAlert[] = [];

  // Quality score alert
  if (qualityScore < 70) {
    alerts.push({
      type: "spike",
      severity: qualityScore < 50 ? "critical" : "warning",
      message: `Low quality score detected: ${qualityScore.toFixed(1)}`,
      productId: inspection.productId,
      batchId: inspection.batchId,
      metric: "quality_score",
      value: qualityScore,
      threshold: 70,
      recommendation: "Immediate investigation required",
      timestamp: new Date().toISOString(),
    });
  }

  // Critical defect alert
  const criticalDefects = inspection.defects.filter(d => d.severity === "critical");
  if (criticalDefects.length > 0) {
    alerts.push({
      type: "spike",
      severity: "critical",
      message: `Critical defects detected: ${criticalDefects.length}`,
      productId: inspection.productId,
      batchId: inspection.batchId,
      metric: "critical_defects",
      value: criticalDefects.length,
      threshold: 0,
      recommendation: "Stop production and quarantine batch",
      timestamp: new Date().toISOString(),
    });
  }

  // Equipment alert
  if (inspection.equipment.maintenanceStatus === "overdue") {
    alerts.push({
      type: "equipment",
      severity: "warning",
      message: "Equipment maintenance overdue",
      productId: inspection.productId,
      metric: "equipment_status",
      value: 1,
      threshold: 0,
      recommendation: "Schedule maintenance immediately",
      timestamp: new Date().toISOString(),
    });
  }

  // Environmental alert
  if (inspection.environmental.temperature < 15 || inspection.environmental.temperature > 30) {
    alerts.push({
      type: "environmental",
      severity: "warning",
      message: `Environmental conditions out of range: ${inspection.environmental.temperature}°C`,
      productId: inspection.productId,
      metric: "temperature",
      value: inspection.environmental.temperature,
      threshold: 25,
      recommendation: "Adjust environmental controls",
      timestamp: new Date().toISOString(),
    });
  }

  return alerts;
}

/**
 * Analyze quality trends
 */
function analyzeQualityTrends(
  inspection: QualityInspection,
  historicalData?: any
): QualityTrend {
  const defectRate = inspection.defects.length / Math.max(1, inspection.measurements.length);
  const qualityScore = calculateQualityScore(inspection);

  // Get historical data for trend analysis
  const previousInspections = historicalData?.previousInspections?.filter(
    i => i.productId === inspection.productId
  ).slice(-10) || [];

  let trend: "improving" | "declining" | "stable" = "stable";
  let confidence = 0.5;

  if (previousInspections.length >= 3) {
    const recentScores = previousInspections.map(i => calculateQualityScore(i));
    const avgRecent = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    
    if (qualityScore > avgRecent * 1.05) {
      trend = "improving";
      confidence = 0.7;
    } else if (qualityScore < avgRecent * 0.95) {
      trend = "declining";
      confidence = 0.7;
    } else {
      trend = "stable";
      confidence = 0.6;
    }
  }

  // Identify top defects
  const topDefects = inspection.defects
    .sort((a, b) => (b.severity === "critical" ? 3 : b.severity === "major" ? 2 : 1) - 
                        (a.severity === "critical" ? 3 : a.severity === "major" ? 2 : 1))
    .slice(0, 5);

  // Identify quality factors
  const factors = identifyQualityFactors(inspection, previousInspections);

  // Generate predictions
  const predictions = generateQualityPredictions(qualityScore, defectRate, trend, factors);

  return {
    productId: inspection.productId,
    productName: inspection.productName,
    period: new Date().toISOString().split('T')[0],
    defectRate,
    qualityScore,
    topDefects,
    trend,
    confidence,
    factors,
    predictions,
  };
}

/**
 * Identify quality factors affecting outcomes
 */
function identifyQualityFactors(
  inspection: QualityInspection,
  previousInspections: QualityInspection[]
): QualityFactor[] {
  const factors: QualityFactor[] = [];

  // Environmental factors
  const tempImpact = inspection.environmental.temperature < 18 || inspection.environmental.temperature > 25 ? -0.3 : 0.1;
  factors.push({
    factor: "Temperature",
    impact: tempImpact,
    weight: 0.2,
    description: `Temperature impact on quality: ${inspection.environmental.temperature}°C`,
    correlation: Math.abs(tempImpact),
    dataPoints: [inspection.environmental.temperature],
  });

  // Equipment factors
  const equipmentScore = calculateEquipmentScore(inspection.equipment);
  const equipmentImpact = (equipmentScore - 100) / 100;
  factors.push({
    factor: "Equipment Condition",
    impact: equipmentImpact,
    weight: 0.3,
    description: `Equipment condition impact: ${equipmentScore.toFixed(1)}% score`,
    correlation: Math.abs(equipmentImpact),
    dataPoints: [equipmentScore],
  });

  // Inspector factors (if human inspection)
  if (inspection.inspectionType !== "automated") {
    const humanDefectRatio = inspection.defects.filter(d => d.detectedBy === "human").length / 
                           Math.max(1, inspection.defects.length);
    factors.push({
      factor: "Inspector Effectiveness",
      impact: humanDefectRatio > 0.5 ? -0.2 : 0.1,
      weight: 0.15,
      description: `Human inspector detected ${Math.round(humanDefectRatio * 100)}% of defects`,
      correlation: humanDefectRatio,
      dataPoints: [humanDefectRatio],
    });
  }

  // Batch size factors
  if (previousInspections.length > 0) {
    const batchSizes = previousInspections.map(i => i.measurements.length);
    const avgBatchSize = batchSizes.reduce((sum, size) => sum + size, 0) / batchSizes.length;
    const currentBatchSize = inspection.measurements.length;
    
    if (Math.abs(currentBatchSize - avgBatchSize) > avgBatchSize * 0.5) {
      factors.push({
        factor: "Batch Size",
        impact: currentBatchSize > avgBatchSize * 1.5 ? -0.15 : 0.05,
        weight: 0.1,
        description: `Batch size variation: ${currentBatchSize} vs avg ${avgBatchSize.toFixed(0)}`,
        correlation: Math.abs(currentBatchSize - avgBatchSize) / avgBatchSize,
        dataPoints: [currentBatchSize],
      });
    }
  }

  return factors;
}

/**
 * Generate quality predictions
 */
function generateQualityPredictions(
  currentScore: number,
  currentDefectRate: number,
  trend: "improving" | "declining" | "stable",
  factors: QualityFactor[]
): QualityPrediction[] {
  const predictions: QualityPrediction[] = [];

  // Quality score prediction
  let scoreChange = 0;
  if (trend === "improving") scoreChange = 5;
  else if (trend === "declining") scoreChange = -5;

  // Adjust for factors
  const factorImpact = factors.reduce((sum, factor) => sum + (factor.impact * factor.weight), 0);
  scoreChange += factorImpact * 10;

  const predictedScore = Math.max(0, Math.min(100, currentScore + scoreChange));

  predictions.push({
    metric: "quality_score",
    currentValue: currentScore,
    predictedValue: predictedScore,
    timeframe: "next_period",
    confidence: trend === "stable" ? 0.6 : 0.7,
    risk: predictedScore < 70 ? "high" : predictedScore < 85 ? "medium" : "low",
  });

  // Defect rate prediction
  let defectChange = 0;
  if (trend === "improving") defectChange = -0.02;
  else if (trend === "declining") defectChange = 0.02;

  const predictedDefectRate = Math.max(0, currentDefectRate + defectChange);

  predictions.push({
    metric: "defect_rate",
    currentValue: currentDefectRate,
    predictedValue: predictedDefectRate,
    timeframe: "next_period",
    confidence: 0.6,
    risk: predictedDefectRate > 0.1 ? "high" : predictedDefectRate > 0.05 ? "medium" : "low",
  });

  return predictions;
}

/**
 * Batch analyze multiple inspections
 */
export async function batchAnalyzeQualityInspections(
  inspections: QualityInspection[],
  historicalData?: any
): Promise<Array<{
  inspectionId: string;
  analysis: Awaited<ReturnType<typeof analyzeQualityInspection>>;
}>> {
  const results = [];

  for (const inspection of inspections) {
    const analysis = await analyzeQualityInspection(inspection, historicalData);
    results.push({
      inspectionId: inspection.id,
      analysis,
    });
  }

  return results;
}

/**
 * Generate quality dashboard summary
 */
export function generateQualityDashboard(
  analyses: Array<Awaited<ReturnType<typeof analyzeQualityInspection>>>
): {
  summary: QualitySummary;
  topIssues: QualityIssue[];
  recommendations: QualityImprovement[];
  alerts: QualityAlert[];
} {
  const summary = calculateQualitySummary(analyses);
  const topIssues = identifyTopQualityIssues(analyses);
  const recommendations = consolidateRecommendations(analyses);
  const alerts = consolidateAlerts(analyses);

  return {
    summary,
    topIssues,
    recommendations,
    alerts,
  };
}

// Helper functions
function calculateQualitySummary(analyses: Array<Awaited<ReturnType<typeof analyzeQualityInspection>>>): QualitySummary {
  const avgQualityScore = analyses.reduce((sum, a) => sum + a.qualityScore, 0) / analyses.length;
  const totalDefects = analyses.reduce((sum, a) => sum + a.trends.defectRate, 0);
  const criticalIssues = analyses.filter(a => a.riskAssessment.overallRisk === "critical").length;

  return {
    totalInspections: analyses.length,
    averageQualityScore: avgQualityScore,
    totalDefects: totalDefects,
    criticalIssues: criticalIssues,
    improvementOpportunities: analyses.reduce((sum, a) => sum + a.recommendations.length, 0),
  };
}

function identifyTopQualityIssues(analyses: Array<Awaited<ReturnType<typeof analyzeQualityInspection>>>): QualityIssue[] {
  const issues: QualityIssue[] = [];

  analyses.forEach(analysis => {
    analysis.riskAssessment.risks.forEach(risk => {
      issues.push({
        type: risk.type,
        severity: risk.severity,
        description: risk.description,
        count: 1,
        impact: risk.impact,
      });
    });
  });

  // Aggregate similar issues
  const aggregated = issues.reduce((acc, issue) => {
    const key = `${issue.type}_${issue.severity}`;
    if (!acc[key]) {
      acc[key] = { ...issue, count: 0 };
    }
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, QualityIssue>);

  return Object.values(aggregated).sort((a, b) => b.count - a.count).slice(0, 10);
}

function consolidateRecommendations(analyses: Array<Awaited<ReturnType<typeof analyzeQualityInspection>>>): QualityImprovement[] {
  const allRecommendations = analyses.flatMap(a => a.recommendations);
  
  // Group by type and priority
  const grouped = allRecommendations.reduce((acc, rec) => {
    const key = `${rec.type}_${rec.priority}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(rec);
    return acc;
  }, {} as Record<string, QualityImprovement[]>);

  // Consolidate similar recommendations
  return Object.values(grouped).map(group => {
    const first = group[0];
    const totalCount = group.length;
    const totalCost = group.reduce((sum, r) => sum + r.implementation.cost, 0);
    const avgSavings = group.reduce((sum, r) => sum + r.expectedImpact.costSavings, 0) / group.length;

    return {
      ...first,
      title: `${first.title} (${totalCount} instances)`,
      description: `${first.description} (Applicable to ${totalCount} products/processes)`,
      implementation: {
        ...first.implementation,
        cost: totalCost,
      },
      expectedImpact: {
        ...first.expectedImpact,
        costSavings: avgSavings * totalCount,
      },
    };
  }).sort((a, b) => {
    const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

function consolidateAlerts(analyses: Array<Awaited<ReturnType<typeof analyzeQualityInspection>>>): QualityAlert[] {
  const allAlerts = analyses.flatMap(a => a.alerts);
  
  // Group by type and severity
  const grouped = allAlerts.reduce((acc, alert) => {
    const key = `${alert.type}_${alert.severity}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(alert);
    return acc;
  }, {} as Record<string, QualityAlert[]>);

  // Consolidate similar alerts
  return Object.values(grouped).map(group => {
    const first = group[0];
    const count = group.length;
    
    return {
      ...first,
      message: `${first.message} (${count} occurrences)`,
      timestamp: new Date().toISOString(),
    };
  }).sort((a, b) => {
    const severityOrder = { critical: 4, warning: 3, info: 2 };
    return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0);
  });
}

// Type definitions
interface QualityRiskAssessment {
  overallRisk: "low" | "medium" | "high" | "critical";
  riskScore: number;
  risks: QualityRisk[];
  mitigationPriority: QualityRisk[];
}

interface QualityRisk {
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  probability: number;
  impact: string;
  description: string;
  mitigation: string;
}

interface QualitySummary {
  totalInspections: number;
  averageQualityScore: number;
  totalDefects: number;
  criticalIssues: number;
  improvementOpportunities: number;
}

interface QualityIssue {
  type: string;
  severity: string;
  description: string;
  count: number;
  impact: string;
}
