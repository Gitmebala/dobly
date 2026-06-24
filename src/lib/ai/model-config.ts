/**
 * Model Configuration for Anti-AI Detection
 * Configures AI models to generate human-like text
 */

import type { AntiAIPromptConfig } from "./prompt-engineering";

export interface ModelConfig {
  temperature: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  maxTokens: number;
  stopSequences: string[];
  systemPrompt: string;
}

/**
 * Get model configuration optimized for human-like text
 */
export function getHumanizedModelConfig(
  baseModel: "gpt-4" | "gpt-4-turbo" | "claude-3-5-sonnet",
  config: AntiAIPromptConfig
): ModelConfig {
  const baseConfig = {
    temperature: 0.7, // Slightly higher for creativity
    topP: 0.9,
    frequencyPenalty: 0.3, // Reduce repetition
    presencePenalty: 0.3, // Encourage new topics
    maxTokens: 500, // Keep responses concise
    stopSequences: ["\n\n\n", "---", "###"], // Avoid list-like endings
    systemPrompt: generateAntiAISystemPrompt(config),
  };

  // Adjust based on model
  if (baseModel === "gpt-4") {
    return {
      ...baseConfig,
      temperature: 0.75,
      frequencyPenalty: 0.4,
      presencePenalty: 0.4,
    };
  } else if (baseModel === "gpt-4-turbo") {
    return {
      ...baseConfig,
      temperature: 0.8,
      maxTokens: 400,
    };
  } else if (baseModel === "claude-3-5-sonnet") {
    return {
      ...baseConfig,
      temperature: 0.65,
      topP: 0.85,
      frequencyPenalty: 0.2,
      presencePenalty: 0.2,
    };
  }

  return baseConfig;
}

/**
 * Get streaming configuration for real-time responses
 */
export function getStreamingConfig(
  baseModel: string,
  config: AntiAIPromptConfig
): {
  stream: true;
  temperature: number;
  maxTokens: number;
  onChunk?: (chunk: string) => void;
} {
  return {
    stream: true,
    temperature: getHumanizedModelConfig(baseModel as any, config).temperature,
    maxTokens: getHumanizedModelConfig(baseModel as any, config).maxTokens,
  };
}

/**
 * Post-processing configuration
 */
export interface PostProcessingConfig {
  enableHumanizer: boolean;
  enableAIDetection: boolean;
  minConfidence: number;
  autoRetry: boolean;
  maxRetries: number;
}

/**
 * Get post-processing configuration
 */
export function getPostProcessingConfig(
  sensitivity: "low" | "medium" | "high"
): PostProcessingConfig {
  const baseConfig = {
    enableHumanizer: true,
    enableAIDetection: true,
    minConfidence: 0.7,
    autoRetry: true,
    maxRetries: 2,
  };

  switch (sensitivity) {
    case "low":
      return {
        ...baseConfig,
        minConfidence: 0.5,
        maxRetries: 1,
      };
    case "medium":
      return baseConfig;
    case "high":
      return {
        ...baseConfig,
        minConfidence: 0.85,
        maxRetries: 3,
      };
  }
}

/**
 * Model-specific optimizations
 */
export const MODEL_OPTIMIZATIONS = {
  "gpt-4": {
    // GPT-4 tends to be more formal and structured
    preferredTemperature: 0.75,
    preferredFrequencyPenalty: 0.4,
    preferredPresencePenalty: 0.4,
    commonIssues: ["overly formal", "structured responses", "corporate language"],
    mitigations: [
      "Use higher temperature",
      "Increase frequency/presence penalties",
      "Add conversational examples in prompt",
    ],
  },
  "gpt-4-turbo": {
    // GPT-4 Turbo is faster but can be repetitive
    preferredTemperature: 0.8,
    preferredFrequencyPenalty: 0.5,
    preferredPresencePenalty: 0.5,
    commonIssues: ["repetition", "generic responses", "AI vocabulary"],
    mitigations: [
      "Strong frequency penalties",
      "Varied examples in prompt",
      "Post-processing with humanizer",
    ],
  },
  "claude-3-5-sonnet": {
    // Claude tends to be more verbose and analytical
    preferredTemperature: 0.65,
    preferredFrequencyPenalty: 0.2,
    preferredPresencePenalty: 0.2,
    commonIssues: ["overly analytical", "wordy", "hedging language"],
    mitigations: [
      "Lower temperature for conciseness",
      "Direct instructions to be concise",
      "Avoid analytical framing",
    ],
  },
};

/**
 * Dynamic configuration based on content type
 */
export function getDynamicConfig(
  contentType: "email" | "message" | "document" | "creative",
  baseConfig: AntiAIPromptConfig
): ModelConfig {
  const config = getHumanizedModelConfig("gpt-4", baseConfig);

  switch (contentType) {
    case "email":
      return {
        ...config,
        temperature: 0.6,
        maxTokens: 300,
        systemPrompt: `${config.systemPrompt}\n\nKeep emails concise and to the point.`,
      };
    case "message":
      return {
        ...config,
        temperature: 0.8,
        maxTokens: 200,
        systemPrompt: `${config.systemPrompt}\n\nWrite like a natural message or text.`,
      };
    case "document":
      return {
        ...config,
        temperature: 0.5,
        maxTokens: 1000,
        systemPrompt: `${config.systemPrompt}\n\nWrite clearly and professionally but avoid corporate jargon.`,
      };
    case "creative":
      return {
        ...config,
        temperature: 0.9,
        maxTokens: 600,
        systemPrompt: `${config.systemPrompt}\n\nBe creative and expressive, but authentic.`,
      };
  }
}
