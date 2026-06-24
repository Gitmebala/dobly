/**
 * Latency Budget Tracking
 * Monitors and enforces the <800ms latency target for voice interactions
 */

export interface LatencyMeasurement {
  sessionId: string;
  callSid: string;
  turnId: string;
  sttLatency: number;
  llmLatency: number;
  ttsLatency: number;
  totalLatency: number;
  timestamp: string;
  withinBudget: boolean;
}

export interface LatencyStats {
  totalTurns: number;
  turnsWithinBudget: number;
  turnsOverBudget: number;
  budgetComplianceRate: number;
  avgSTT: number;
  avgLLM: number;
  avgTTS: number;
  avgTotal: number;
  maxTotal: number;
  minTotal: number;
  p50Total: number;
  p95Total: number;
  p99Total: number;
}

const LATENCY_BUDGET_MS = 800;
const measurements = new Map<string, LatencyMeasurement[]>();

/**
 * Record a latency measurement
 */
export function recordLatency(measurement: LatencyMeasurement): void {
  measurement.withinBudget = measurement.totalLatency <= LATENCY_BUDGET_MS;
  
  const sessionMeasurements = measurements.get(measurement.sessionId) || [];
  sessionMeasurements.push(measurement);
  measurements.set(measurement.sessionId, sessionMeasurements);
  
  // Log if over budget
  if (!measurement.withinBudget) {
    console.warn(`Latency budget exceeded: ${measurement.totalLatency}ms (target: ${LATENCY_BUDGET_MS}ms)`, {
      sessionId: measurement.sessionId,
      turnId: measurement.turnId,
      stt: measurement.sttLatency,
      llm: measurement.llmLatency,
      tts: measurement.ttsLatency,
    });
  }
}

/**
 * Get latency statistics for a session
 */
export function getSessionLatencyStats(sessionId: string): LatencyStats | null {
  const sessionMeasurements = measurements.get(sessionId);
  if (!sessionMeasurements || sessionMeasurements.length === 0) {
    return null;
  }

  const totalTurns = sessionMeasurements.length;
  const turnsWithinBudget = sessionMeasurements.filter((m) => m.withinBudget).length;
  const turnsOverBudget = totalTurns - turnsWithinBudget;
  const budgetComplianceRate = turnsWithinBudget / totalTurns;

  const avgSTT = sessionMeasurements.reduce((sum, m) => sum + m.sttLatency, 0) / totalTurns;
  const avgLLM = sessionMeasurements.reduce((sum, m) => sum + m.llmLatency, 0) / totalTurns;
  const avgTTS = sessionMeasurements.reduce((sum, m) => sum + m.ttsLatency, 0) / totalTurns;
  const avgTotal = sessionMeasurements.reduce((sum, m) => sum + m.totalLatency, 0) / totalTurns;

  const maxTotal = Math.max(...sessionMeasurements.map((m) => m.totalLatency));
  const minTotal = Math.min(...sessionMeasurements.map((m) => m.totalLatency));

  // Calculate percentiles
  const sortedTotals = sessionMeasurements.map((m) => m.totalLatency).sort((a, b) => a - b);
  const p50Total = sortedTotals[Math.floor(totalTurns * 0.5)];
  const p95Total = sortedTotals[Math.floor(totalTurns * 0.95)];
  const p99Total = sortedTotals[Math.floor(totalTurns * 0.99)];

  return {
    totalTurns,
    turnsWithinBudget,
    turnsOverBudget,
    budgetComplianceRate,
    avgSTT,
    avgLLM,
    avgTTS,
    avgTotal,
    maxTotal,
    minTotal,
    p50Total,
    p95Total,
    p99Total,
  };
}

/**
 * Get latency statistics across all sessions
 */
export function getGlobalLatencyStats(): LatencyStats | null {
  const allMeasurements: LatencyMeasurement[] = [];
  
  for (const sessionMeasurements of measurements.values()) {
    allMeasurements.push(...sessionMeasurements);
  }

  if (allMeasurements.length === 0) {
    return null;
  }

  const totalTurns = allMeasurements.length;
  const turnsWithinBudget = allMeasurements.filter((m) => m.withinBudget).length;
  const turnsOverBudget = totalTurns - turnsWithinBudget;
  const budgetComplianceRate = turnsWithinBudget / totalTurns;

  const avgSTT = allMeasurements.reduce((sum, m) => sum + m.sttLatency, 0) / totalTurns;
  const avgLLM = allMeasurements.reduce((sum, m) => sum + m.llmLatency, 0) / totalTurns;
  const avgTTS = allMeasurements.reduce((sum, m) => sum + m.ttsLatency, 0) / totalTurns;
  const avgTotal = allMeasurements.reduce((sum, m) => sum + m.totalLatency, 0) / totalTurns;

  const maxTotal = Math.max(...allMeasurements.map((m) => m.totalLatency));
  const minTotal = Math.min(...allMeasurements.map((m) => m.totalLatency));

  const sortedTotals = allMeasurements.map((m) => m.totalLatency).sort((a, b) => a - b);
  const p50Total = sortedTotals[Math.floor(totalTurns * 0.5)];
  const p95Total = sortedTotals[Math.floor(totalTurns * 0.95)];
  const p99Total = sortedTotals[Math.floor(totalTurns * 0.99)];

  return {
    totalTurns,
    turnsWithinBudget,
    turnsOverBudget,
    budgetComplianceRate,
    avgSTT,
    avgLLM,
    avgTTS,
    avgTotal,
    maxTotal,
    minTotal,
    p50Total,
    p95Total,
    p99Total,
  };
}

/**
 * Clear measurements for a session
 */
export function clearSessionMeasurements(sessionId: string): void {
  measurements.delete(sessionId);
}

/**
 * Get the latency budget target
 */
export function getLatencyBudget(): number {
  return LATENCY_BUDGET_MS;
}

/**
 * Check if a latency measurement is within budget
 */
export function isWithinBudget(totalLatency: number): boolean {
  return totalLatency <= LATENCY_BUDGET_MS;
}

/**
 * Analyze latency bottlenecks
 */
export function analyzeBottlenecks(sessionId: string): {
  sttBottleneck: boolean;
  llmBottleneck: boolean;
  ttsBottleneck: boolean;
  recommendations: string[];
} | null {
  const stats = getSessionLatencyStats(sessionId);
  if (!stats) {
    return null;
  }

  const recommendations: string[] = [];
  const sttBottleneck = stats.avgSTT > 200;
  const llmBottleneck = stats.avgLLM > 400;
  const ttsBottleneck = stats.avgTTS > 200;

  if (sttBottleneck) {
    recommendations.push("STT latency is high. Consider using a faster model or optimizing audio quality.");
  }

  if (llmBottleneck) {
    recommendations.push("LLM latency is high. Consider using a smaller model, reducing max_tokens, or enabling streaming.");
  }

  if (ttsBottleneck) {
    recommendations.push("TTS latency is high. Consider using a faster voice model or lower quality settings.");
  }

  if (stats.avgTotal > LATENCY_BUDGET_MS && !sttBottleneck && !llmBottleneck && !ttsBottleneck) {
    recommendations.push("Overall latency is high but no single component is a bottleneck. Consider parallel processing.");
  }

  return {
    sttBottleneck,
    llmBottleneck,
    ttsBottleneck,
    recommendations,
  };
}
