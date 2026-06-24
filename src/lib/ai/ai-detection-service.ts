/**
 * AI Detection Service
 * Monitors and prevents AI-generated text patterns
 */

import { detectAIWriting, humanizeText } from "./humanizer";
import type { ModelConfig } from "./model-config";

export interface DetectionResult {
  isAI: boolean;
  confidence: number;
  patterns: string[];
  suggestions: string[];
  humanizedText?: string;
}

export interface MonitoringConfig {
  enableRealTimeDetection: boolean;
  sensitivity: "low" | "medium" | "high";
  autoHumanize: boolean;
  logDetections: boolean;
}

/**
 * Main AI detection service
 */
export class AIDetectionService {
  private config: MonitoringConfig;
  private detectionHistory: DetectionResult[] = [];

  constructor(config: MonitoringConfig) {
    this.config = config;
  }

  /**
   * Analyze text for AI patterns
   */
  analyzeText(text: string): DetectionResult {
    const detection = detectAIWriting(text);
    
    const result: DetectionResult = {
      isAI: detection.score > (this.config.sensitivity === "high" ? 30 : this.config.sensitivity === "medium" ? 50 : 70),
      confidence: detection.score / 100,
      patterns: detection.patterns,
      suggestions: detection.suggestions,
    };

    // Auto-humanize if enabled
    if (this.config.autoHumanize && result.isAI) {
      result.humanizedText = humanizeText(text, {
        formality: "neutral",
        personality: "direct",
        avoidAIVocabulary: true,
        reduceComplexity: true,
      });
    }

    // Log detection if enabled
    if (this.config.logDetections) {
      this.logDetection(result);
    }

    return result;
  }

  /**
   * Monitor real-time text generation
   */
  monitorGeneration(
    textGenerator: () => string,
    onDetection: (result: DetectionResult) => void
  ): string {
    if (!this.config.enableRealTimeDetection) {
      return textGenerator();
    }

    let generatedText = textGenerator();
    const detection = this.analyzeText(generatedText);
    
    if (detection.isAI) {
      onDetection(detection);
      
      if (this.config.autoHumanize && detection.humanizedText) {
        generatedText = detection.humanizedText;
      }
    }

    return generatedText;
  }

  /**
   * Get detection statistics
   */
  getStatistics(): {
    totalDetections: number;
    aiDetections: number;
    humanizedCorrections: number;
    averageConfidence: number;
    commonPatterns: Record<string, number>;
  } {
    const total = this.detectionHistory.length;
    const aiDetected = this.detectionHistory.filter(d => d.isAI).length;
    const humanized = this.detectionHistory.filter(d => d.humanizedText).length;
    
    const avgConfidence = total > 0 
      ? this.detectionHistory.reduce((sum, d) => sum + d.confidence, 0) / total 
      : 0;

    const patternCounts: Record<string, number> = {};
    this.detectionHistory.forEach(d => {
      d.patterns.forEach(pattern => {
        patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
      });
    });

    return {
      totalDetections: total,
      aiDetections: aiDetected,
      humanizedCorrections: humanized,
      averageConfidence: avgConfidence,
      commonPatterns: patternCounts,
    };
  }

  /**
   * Log detection to history
   */
  private logDetection(result: DetectionResult): void {
    this.detectionHistory.push({
      ...result,
      timestamp: new Date().toISOString(),
    });

    // Keep only last 1000 detections
    if (this.detectionHistory.length > 1000) {
      this.detectionHistory = this.detectionHistory.slice(-1000);
    }
  }

  /**
   * Export detection data
   */
  exportData(): string {
    return JSON.stringify({
      config: this.config,
      statistics: this.getStatistics(),
      history: this.detectionHistory,
    }, null, 2);
  }

  /**
   * Clear detection history
   */
  clearHistory(): void {
    this.detectionHistory = [];
  }
}

/**
 * Create detection service with default config
 */
export function createDetectionService(config: Partial<MonitoringConfig> = {}): AIDetectionService {
  const defaultConfig: MonitoringConfig = {
    enableRealTimeDetection: true,
    sensitivity: "medium",
    autoHumanize: true,
    logDetections: true,
  };

  return new AIDetectionService({ ...defaultConfig, ...config });
}

/**
 * Middleware for API responses
 */
export function createAIDetectionMiddleware(service: AIDetectionService) {
  return (req: any, res: any, next: any) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Check for AI-generated content in response
      if (data.text || data.message || data.content) {
        const text = data.text || data.message || data.content;
        const detection = service.analyzeText(text);
        
        if (detection.isAI) {
          console.warn(`AI content detected: ${detection.confidence.toFixed(2)} confidence`);
          
          if (detection.humanizedText) {
            data.text = detection.humanizedText;
            data.message = detection.humanizedText;
            data.content = detection.humanizedText;
            data.aiDetection = detection;
          }
        }
      }
      
      return originalJson.call(this, data);
    };
    
    next();
  };
}

/**
 * React hook for AI detection
 */
export function useAIDetection(service: AIDetectionService) {
  return {
    analyze: (text: string) => service.analyzeText(text),
    monitor: (generator: () => string, callback: (result: DetectionResult) => void) => 
      service.monitorGeneration(generator, callback),
    statistics: service.getStatistics(),
  };
}
