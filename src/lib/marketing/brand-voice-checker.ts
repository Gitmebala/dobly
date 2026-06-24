/**
 * Brand Voice Consistency Checker for Marketing Department
 * Analyzes content to ensure it aligns with brand guidelines and voice
 */

import { detectAIWriting, humanizeText } from "@/lib/ai/humanizer";

export interface BrandVoiceProfile {
  id: string;
  name: string;
  personality: string;
  tone: string;
  values: string[];
  vocabulary: {
    preferred: string[];
    avoid: string[];
    industry: string[];
  };
  style: {
    sentenceLength: "short" | "medium" | "mixed";
    formality: "casual" | "professional" | "mixed";
    useEmojis: boolean;
    useHashtags: boolean;
  };
  guidelines: string[];
}

export interface ContentAnalysis {
  id: string;
  content: string;
  platform?: string;
  contentType: "social_post" | "email" | "blog" | "ad_copy" | "video_script";
  analyzedAt: Date;
}

export interface VoiceCheckResult {
  contentId: string;
  brandProfileId: string;
  overallScore: number; // 0-100
  alignmentScore: number; // 0-100
  issues: VoiceIssue[];
  suggestions: VoiceSuggestion[];
  aiDetectionScore: number;
  humanizedVersion?: string;
  approved: boolean;
  reviewedAt: Date;
}

export interface VoiceIssue {
  type: "vocabulary" | "tone" | "style" | "ai_detected" | "guideline_violation";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  location: {
    start: number;
    end: number;
    text: string;
  };
  suggestion: string;
}

export interface VoiceSuggestion {
  type: "word_choice" | "sentence_structure" | "tone_adjustment" | "formatting";
  priority: "high" | "medium" | "low";
  description: string;
  before: string;
  after: string;
  reasoning: string;
}

/**
 * Check content against brand voice profile
 */
export async function checkBrandVoiceConsistency(
  content: ContentAnalysis,
  brandProfile: BrandVoiceProfile
): Promise<VoiceCheckResult> {
  // Step 1: Check for AI-generated patterns
  const aiDetection = detectAIWriting(content.content);
  
  // Step 2: Analyze vocabulary usage
  const vocabularyIssues = analyzeVocabulary(content.content, brandProfile);
  
  // Step 3: Check tone and personality alignment
  const toneIssues = analyzeTone(content.content, brandProfile);
  
  // Step 4: Evaluate style consistency
  const styleIssues = analyzeStyle(content.content, brandProfile);
  
  // Step 5: Check guideline compliance
  const guidelineIssues = checkGuidelines(content.content, brandProfile);
  
  // Step 6: Generate suggestions
  const suggestions = generateSuggestions(content.content, brandProfile, [
    ...vocabularyIssues,
    ...toneIssues,
    ...styleIssues,
    ...guidelineIssues,
  ]);
  
  // Step 7: Calculate scores
  const alignmentScore = calculateAlignmentScore([
    ...vocabularyIssues,
    ...toneIssues,
    ...styleIssues,
    ...guidelineIssues,
  ]);
  
  const overallScore = calculateOverallScore(alignmentScore, aiDetection.score);
  
  // Step 8: Humanize if AI detected
  let humanizedVersion: string | undefined;
  if (aiDetection.score > 50) {
    humanizedVersion = humanizeText(content.content, {
      formality: brandProfile.style.formality === "professional" ? "professional" : "casual",
      personality: "direct",
      avoidAIVocabulary: true,
      reduceComplexity: true,
    });
  }
  
  // Step 9: Determine approval status
  const approved = overallScore >= 70 && aiDetection.score < 60;

  return {
    contentId: content.id,
    brandProfileId: brandProfile.id,
    overallScore,
    alignmentScore,
    issues: [...vocabularyIssues, ...toneIssues, ...styleIssues, ...guidelineIssues],
    suggestions,
    aiDetectionScore: aiDetection.score,
    humanizedVersion,
    approved,
    reviewedAt: new Date(),
  };
}

/**
 * Analyze vocabulary usage
 */
function analyzeVocabulary(content: string, profile: BrandVoiceProfile): VoiceIssue[] {
  const issues: VoiceIssue[] = [];
  const words = content.split(/\s+/);

  // Check for avoided words
  profile.vocabulary.avoid.forEach(forbiddenWord => {
    const regex = new RegExp(`\\b${forbiddenWord}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      issues.push({
        type: "vocabulary",
        severity: "medium",
        description: `Avoid using "${forbiddenWord}" - it's not aligned with brand voice`,
        location: {
          start: match.index,
          end: match.index + forbiddenWord.length,
          text: match[0],
        },
        suggestion: `Replace with a brand-preferred alternative`,
      });
    }
  });

  // Check for preferred words usage
  const preferredWords = profile.vocabulary.preferred.filter(word => 
    !content.toLowerCase().includes(word.toLowerCase())
  );

  if (preferredWords.length > 0 && preferredWords.length < profile.vocabulary.preferred.length) {
    issues.push({
      type: "vocabulary",
      severity: "low",
      description: `Consider using brand-preferred terms: ${preferredWords.slice(0, 3).join(', ')}`,
      location: {
        start: 0,
        end: 0,
        text: "",
      },
      suggestion: `Incorporate brand vocabulary for stronger brand recognition`,
    });
  }

  // Check for AI vocabulary
  const aiWords = [
    "delve", "tapestry", "landscape", "pivotal", "crucial", "enhance", 
    "showcase", "furthermore", "moreover", "consequently"
  ];

  aiWords.forEach(aiWord => {
    const regex = new RegExp(`\\b${aiWord}\\b`, 'gi');
    let match;
    while ((match = regex.exec(content)) !== null) {
      issues.push({
        type: "ai_detected",
        severity: "high",
        description: `"${aiWord}" sounds AI-generated`,
        location: {
          start: match.index,
          end: match.index + aiWord.length,
          text: match[0],
        },
        suggestion: `Replace with more natural language`,
      });
    }
  });

  return issues;
}

/**
 * Analyze tone alignment
 */
function analyzeTone(content: string, profile: BrandVoiceProfile): VoiceIssue[] {
  const issues: VoiceIssue[] = [];

  // Check formality level
  const formalIndicators = ["furthermore", "moreover", "consequently", "therefore"];
  const casualIndicators = ["hey", "guys", "awesome", "cool", "yeah"];

  const formalCount = formalIndicators.filter(word => 
    content.toLowerCase().includes(word)
  ).length;
  
  const casualCount = casualIndicators.filter(word => 
    content.toLowerCase().includes(word)
  ).length;

  if (profile.style.formality === "professional" && casualCount > 0) {
    issues.push({
      type: "tone",
      severity: "medium",
      description: "Content is too casual for professional brand voice",
      location: {
        start: 0,
        end: content.length,
        text: content.substring(0, 100) + "...",
      },
      suggestion: "Use more professional language",
    });
  } else if (profile.style.formality === "casual" && formalCount > 2) {
    issues.push({
      type: "tone",
      severity: "medium",
      description: "Content is too formal for casual brand voice",
      location: {
        start: 0,
        end: content.length,
        text: content.substring(0, 100) + "...",
      },
      suggestion: "Use more conversational language",
    });
  }

  // Check personality alignment
  if (profile.personality.includes("friendly") && !containsFriendlyLanguage(content)) {
    issues.push({
      type: "tone",
      severity: "low",
      description: "Content could be more friendly to match brand personality",
      location: {
        start: 0,
        end: content.length,
        text: content.substring(0, 100) + "...",
      },
      suggestion: "Add more conversational and welcoming language",
    });
  }

  return issues;
}

/**
 * Analyze style consistency
 */
function analyzeStyle(content: string, profile: BrandVoiceProfile): VoiceIssue[] {
  const issues: VoiceIssue[] = [];
  const sentences = content.split(/[.!?]+/).filter(s => s.trim());

  // Check sentence length
  const avgSentenceLength = sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length;
  
  if (profile.style.sentenceLength === "short" && avgSentenceLength > 15) {
    issues.push({
      type: "style",
      severity: "medium",
      description: "Sentences are too long - brand uses shorter sentences",
      location: {
        start: 0,
        end: content.length,
        text: `Average sentence length: ${avgSentenceLength.toFixed(1)} words`,
      },
      suggestion: "Break up long sentences for better readability",
    });
  } else if (profile.style.sentenceLength === "medium" && avgSentenceLength < 10) {
    issues.push({
      type: "style",
      severity: "low",
      description: "Sentences might be too short - brand uses medium-length sentences",
      location: {
        start: 0,
        end: content.length,
        text: `Average sentence length: ${avgSentenceLength.toFixed(1)} words`,
      },
      suggestion: "Consider combining some short sentences",
    });
  }

  // Check emoji usage
  const emojiCount = (content.match(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]/gu) || []).length;
  
  if (!profile.style.useEmojis && emojiCount > 0) {
    issues.push({
      type: "style",
      severity: "medium",
      description: "Brand voice doesn't use emojis",
      location: {
        start: 0,
        end: content.length,
        text: `Found ${emojiCount} emoji(s)`,
      },
      suggestion: "Remove emojis to maintain brand consistency",
    });
  } else if (profile.style.useEmojis && emojiCount === 0 && content.length > 100) {
    issues.push({
      type: "style",
      severity: "low",
      description: "Consider adding emojis for brand voice consistency",
      location: {
        start: 0,
        end: content.length,
        text: "No emojis found",
      },
      suggestion: "Add appropriate brand emojis",
    });
  }

  return issues;
}

/**
 * Check guideline compliance
 */
function checkGuidelines(content: string, profile: BrandVoiceProfile): VoiceIssue[] {
  const issues: VoiceIssue[] = [];

  profile.guidelines.forEach(guideline => {
    // Simplified guideline checking
    if (guideline.toLowerCase().includes("no jargon") && containsJargon(content)) {
      issues.push({
        type: "guideline_violation",
        severity: "medium",
        description: "Content contains jargon - brand avoids technical language",
        location: {
          start: 0,
          end: content.length,
          text: "Jargon detected",
        },
        suggestion: "Replace jargon with simpler language",
      });
    }

    if (guideline.toLowerCase().includes("always include cta") && !containsCallToAction(content)) {
      issues.push({
        type: "guideline_violation",
        severity: "high",
        description: "Missing call-to-action - brand always includes CTAs",
        location: {
          start: 0,
          end: content.length,
          text: "No CTA found",
        },
        suggestion: "Add a clear call-to-action",
      });
    }

    if (guideline.toLowerCase().includes("mention value proposition") && !containsValueProp(content)) {
      issues.push({
        type: "guideline_violation",
        severity: "medium",
        description: "Content should mention value proposition",
        location: {
          start: 0,
          end: content.length,
          text: "No value proposition found",
        },
        suggestion: "Include brand value proposition",
      });
    }
  });

  return issues;
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(
  content: string,
  profile: BrandVoiceProfile,
  issues: VoiceIssue[]
): VoiceSuggestion[] {
  const suggestions: VoiceSuggestion[] = [];

  // Generate suggestions based on issues
  issues.forEach(issue => {
    if (issue.type === "vocabulary" && issue.location.text) {
      const alternatives = getWordAlternatives(issue.location.text, profile);
      if (alternatives.length > 0) {
        suggestions.push({
          type: "word_choice",
          priority: issue.severity === "critical" ? "high" : 
                   issue.severity === "high" ? "medium" : "low",
          description: `Replace "${issue.location.text}" with brand-aligned alternative`,
          before: issue.location.text,
          after: alternatives[0],
          reasoning: "Better aligns with brand vocabulary",
        });
      }
    }

    if (issue.type === "tone" && issue.description.includes("too casual")) {
      suggestions.push({
        type: "tone_adjustment",
        priority: "medium",
        description: "Make content more professional",
        before: content,
        after: makeMoreProfessional(content),
        reasoning: "Matches brand's professional tone",
      });
    }

    if (issue.type === "style" && issue.description.includes("sentences are too long")) {
      suggestions.push({
        type: "sentence_structure",
        priority: "medium",
        description: "Break up long sentences",
        before: content,
        after: breakUpLongSentences(content),
        reasoning: "Improves readability and matches brand style",
      });
    }
  });

  return suggestions;
}

/**
 * Calculate alignment score
 */
function calculateAlignmentScore(issues: VoiceIssue[]): number {
  if (issues.length === 0) return 100;

  const severityWeights = {
    critical: 25,
    high: 15,
    medium: 10,
    low: 5,
  };

  const totalDeduction = issues.reduce((sum, issue) => {
    return sum + (severityWeights[issue.severity] || 0);
  }, 0);

  return Math.max(0, 100 - totalDeduction);
}

/**
 * Calculate overall score
 */
function calculateOverallScore(alignmentScore: number, aiDetectionScore: number): number {
  // Weight alignment more heavily than AI detection
  return (alignmentScore * 0.7) + ((100 - aiDetectionScore) * 0.3);
}

/**
 * Helper functions
 */
function containsFriendlyLanguage(content: string): boolean {
  const friendlyWords = ["you", "we", "together", "help", "support", "welcome"];
  return friendlyWords.some(word => content.toLowerCase().includes(word));
}

function containsJargon(content: string): boolean {
  const jargonWords = ["synergy", "leverage", "paradigm", "ecosystem", "bandwidth"];
  return jargonWords.some(word => content.toLowerCase().includes(word));
}

function containsCallToAction(content: string): boolean {
  const ctaPhrases = ["click here", "learn more", "get started", "contact us", "buy now"];
  return ctaPhrases.some(phrase => content.toLowerCase().includes(phrase));
}

function containsValueProp(content: string): boolean {
  const valuePhrases = ["save time", "save money", "increase revenue", "reduce costs"];
  return valuePhrases.some(phrase => content.toLowerCase().includes(phrase));
}

function getWordAlternatives(word: string, profile: BrandVoiceProfile): string[] {
  const alternatives: Record<string, string[]> = {
    "delve": ["explore", "examine", "look into"],
    "tapestry": ["mix", "variety", "combination"],
    "landscape": ["environment", "setting", "context"],
    "pivotal": ["key", "important", "critical"],
    "crucial": ["important", "essential", "vital"],
    "enhance": ["improve", "boost", "strengthen"],
    "showcase": ["display", "demonstrate", "highlight"],
  };

  return alternatives[word.toLowerCase()] || [];
}

function makeMoreProfessional(content: string): string {
  let result = content;
  
  // Replace casual words
  const casualToProfessional = {
    "awesome": "excellent",
    "cool": "impressive",
    "guys": "team",
    "hey": "hello",
    "yeah": "yes",
  };

  Object.entries(casualToProfessional).forEach(([casual, professional]) => {
    const regex = new RegExp(`\\b${casual}\\b`, 'gi');
    result = result.replace(regex, professional);
  });

  return result;
}

function breakUpLongSentences(content: string): string {
  const sentences = content.split(/[.!?]+/);
  return sentences
    .map(sentence => {
      const words = sentence.trim().split(' ');
      if (words.length > 15) {
        // Break long sentence
        const midpoint = Math.floor(words.length / 2);
        return [
          words.slice(0, midpoint).join(' '),
          words.slice(midpoint).join(' ')
        ].join('. ');
      }
      return sentence.trim();
    })
    .join('. ');
}

/**
 * Batch check multiple content pieces
 */
export async function batchCheckBrandVoice(
  contents: ContentAnalysis[],
  profile: BrandVoiceProfile
): Promise<VoiceCheckResult[]> {
  const results: VoiceCheckResult[] = [];

  for (const content of contents) {
    const result = await checkBrandVoiceConsistency(content, profile);
    results.push(result);
  }

  return results;
}

/**
 * Create brand voice profile from examples
 */
export function createBrandVoiceProfile(
  name: string,
  examples: string[]
): BrandVoiceProfile {
  // Analyze examples to extract brand characteristics
  const allWords = examples.join(' ').toLowerCase().split(/\s+/);
  const uniqueWords = [...new Set(allWords)];
  
  // Extract vocabulary patterns (simplified)
  const commonWords = uniqueWords.filter(word => 
    allWords.filter(w => w === word).length > 2
  );

  return {
    id: `brand-${Date.now()}`,
    name,
    personality: "friendly", // Would be extracted from examples
    tone: "conversational", // Would be extracted from examples
    values: ["quality", "innovation", "customer-focus"],
    vocabulary: {
      preferred: commonWords.slice(0, 10),
      avoid: ["delve", "tapestry", "landscape"],
      industry: ["technology", "business", "innovation"],
    },
    style: {
      sentenceLength: "medium",
      formality: "casual",
      useEmojis: true,
      useHashtags: true,
    },
    guidelines: [
      "Always include value proposition",
      "Use customer-centric language",
      "Avoid technical jargon",
    ],
  };
}
