/**
 * AI-Powered Post Generation for Marketing Department
 * Generates platform-specific content with brand voice consistency
 */

import { humanizeText } from "@/lib/ai/humanizer";
import { generateAntiAISystemPrompt } from "@/lib/ai/prompt-engineering";

export interface PostGenerationRequest {
  topic: string;
  platforms: Platform[];
  tone: "professional" | "casual" | "enthusiastic" | "educational";
  targetAudience: string;
  keyPoints: string[];
  callToAction?: string;
  hashtags?: boolean;
  mentions?: string[];
  brandVoice?: BrandVoice;
}

export interface Platform {
  type: "linkedin" | "twitter" | "instagram" | "facebook" | "tiktok";
  characterLimit: number;
  format: "text" | "carousel" | "story" | "reel";
}

export interface BrandVoice {
  personality: string;
  values: string[];
  forbiddenWords: string[];
  preferredPhrases: string[];
}

export interface GeneratedPost {
  platform: string;
  content: string;
  hashtags: string[];
  mentions: string[];
  mediaSuggestions: MediaSuggestion[];
  engagementPrediction: number;
  characterCount: number;
  variations: string[];
}

export interface MediaSuggestion {
  type: "image" | "video" | "carousel" | "story";
  description: string;
  aspectRatio: string;
}

/**
 * Generate posts for multiple platforms
 */
export async function generateMarketingPosts(
  request: PostGenerationRequest
): Promise<GeneratedPost[]> {
  const posts: GeneratedPost[] = [];

  for (const platform of request.platforms) {
    const post = await generatePostForPlatform(request, platform);
    posts.push(post);
  }

  return posts;
}

/**
 * Generate post for specific platform
 */
async function generatePostForPlatform(
  request: PostGenerationRequest,
  platform: Platform
): Promise<GeneratedPost> {
  // Step 1: Create platform-specific prompt
  const prompt = createPlatformPrompt(request, platform);
  
  // Step 2: Generate content using AI
  const rawContent = await generateContentWithAI(prompt);
  
  // Step 3: Humanize and optimize
  const humanizedContent = humanizeText(rawContent, {
    formality: request.tone === "professional" ? "professional" : "casual",
    personality: "direct",
    avoidAIVocabulary: true,
    reduceComplexity: true,
  });
  
  // Step 4: Apply brand voice
  const brandedContent = applyBrandVoice(humanizedContent, request.brandVoice);
  
  // Step 5: Add platform-specific elements
  const finalContent = addPlatformElements(brandedContent, platform, request);
  
  // Step 6: Generate hashtags and mentions
  const hashtags = request.hashtags ? generateHashtags(request.topic, platform.type) : [];
  const mentions = generateMentions(request.mentions, platform.type);
  
  // Step 7: Suggest media
  const mediaSuggestions = generateMediaSuggestions(request, platform);
  
  // Step 8: Predict engagement
  const engagementPrediction = predictEngagement(finalContent, platform.type);
  
  // Step 9: Create variations
  const variations = await generateVariations(finalContent, platform);

  return {
    platform: platform.type,
    content: finalContent,
    hashtags,
    mentions,
    mediaSuggestions,
    engagementPrediction,
    characterCount: finalContent.length,
    variations,
  };
}

/**
 * Create platform-specific prompt
 */
function createPlatformPrompt(
  request: PostGenerationRequest,
  platform: Platform
): string {
  const platformInstructions = {
    linkedin: "Write a professional LinkedIn post. Use a hook, provide value, include industry insights, and end with a clear call-to-action. Use professional but engaging language.",
    twitter: "Write a concise Twitter post. Use a strong hook, be punchy and direct, include relevant hashtags, and keep it under the character limit. Use emojis sparingly.",
    instagram: "Write an engaging Instagram caption. Use storytelling, include emojis naturally, ask questions to drive engagement, and use line breaks for readability.",
    facebook: "Write a conversational Facebook post. Use a friendly tone, tell a story, ask questions, and include a clear call-to-action. Use paragraphs for readability.",
    tiktok: "Write a TikTok video script. Use trendy language, include hooks, use emojis and hashtags naturally, and create engagement through questions or challenges.",
  };

  const basePrompt = `Create ${platform.type} content about: ${request.topic}

Key points to include:
${request.keyPoints.map((point, i) => `${i + 1}. ${point}`).join('\n')}

Target audience: ${request.targetAudience}
Tone: ${request.tone}
${request.callToAction ? `Call to action: ${request.callToAction}` : ''}

Character limit: ${platform.characterLimit}
Format: ${platform.format}

${platformInstructions[platform.type]}

Requirements:
- Write like a human, not AI
- Avoid corporate jargon and buzzwords
- Be authentic and genuine
- Use natural language
- Keep it engaging and valuable
- Don't sound like marketing copy
`;

  return basePrompt;
}

/**
 * Generate content using AI
 */
async function generateContentWithAI(prompt: string): Promise<string> {
  // In a real implementation, this would call OpenAI, Anthropic, or another AI service
  // For now, we'll simulate the response
  
  console.log("Generating content with AI...");
  
  // Mock AI response
  const mockResponse = `Here's an engaging post about your topic! This would normally be generated by the AI service with the provided prompt and brand voice guidelines.`;
  
  return mockResponse;
}

/**
 * Apply brand voice to content
 */
function applyBrandVoice(
  content: string,
  brandVoice?: BrandVoice
): string {
  if (!brandVoice) return content;

  let result = content;

  // Remove forbidden words
  brandVoice.forbiddenWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    result = result.replace(regex, '');
  });

  // Add preferred phrases where appropriate
  brandVoice.preferredPhrases.forEach(phrase => {
    // Simple insertion - in real implementation would be more sophisticated
    if (Math.random() > 0.7) {
      result = result.replace(/\./, ` ${phrase}.`);
    }
  });

  return result;
}

/**
 * Add platform-specific elements
 */
function addPlatformElements(
  content: string,
  platform: Platform,
  request: PostGenerationRequest
): string {
  let result = content;

  // Platform-specific formatting
  switch (platform.type) {
    case "instagram":
      // Add line breaks for readability
      result = result.replace(/([.!?])\s+/g, '$1\n\n');
      break;
    
    case "twitter":
      // Ensure it fits character limit
      if (result.length > platform.characterLimit) {
        result = result.substring(0, platform.characterLimit - 3) + "...";
      }
      break;
    
    case "linkedin":
      // Add professional formatting
      if (!result.includes('\n\n')) {
        result = result.replace(/([.!?])\s+/g, '$1\n\n');
      }
      break;
  }

  // Add call to action if specified
  if (request.callToAction && !result.includes(request.callToAction)) {
    result += `\n\n${request.callToAction}`;
  }

  return result;
}

/**
 * Generate relevant hashtags
 */
function generateHashtags(topic: string, platform: string): string[] {
  const baseHashtags = [
    topic.toLowerCase().replace(/\s+/g, ''),
    `#${topic.toLowerCase().replace(/\s+/g, '')}`,
  ];

  const platformSpecificHashtags = {
    linkedin: ['#business', '#professional', '#industry'],
    twitter: ['#trending', '#viral', '#news'],
    instagram: ['#instagood', '#photooftheday', '#love'],
    facebook: ['#community', '#share', '#like'],
    tiktok: ['#fyp', '#viral', '#trending'],
  };

  return [...baseHashtags, ...(platformSpecificHashtags[platform] || [])].slice(0, 5);
}

/**
 * Generate mentions for platform
 */
function generateMentions(mentions: string[] = [], platform: string): string[] {
  // Format mentions based on platform
  return mentions.map(mention => {
    switch (platform) {
      case "twitter":
        return `@${mention}`;
      case "linkedin":
        return mention.includes('@') ? mention : `[@${mention}]`;
      default:
        return `@${mention}`;
    }
  });
}

/**
 * Generate media suggestions
 */
function generateMediaSuggestions(
  request: PostGenerationRequest,
  platform: Platform
): MediaSuggestion[] {
  const suggestions: MediaSuggestion[] = [];

  switch (platform.type) {
    case "instagram":
      suggestions.push({
        type: "image",
        description: "Eye-catching graphic with key statistics",
        aspectRatio: "1:1",
      });
      if (platform.format === "carousel") {
        suggestions.push({
          type: "carousel",
          description: "3-5 slide carousel explaining key points",
          aspectRatio: "1:1",
        });
      }
      break;
    
    case "linkedin":
      suggestions.push({
        type: "image",
        description: "Professional infographic or chart",
        aspectRatio: "1.91:1",
      });
      break;
    
    case "tiktok":
      suggestions.push({
        type: "video",
        description: "15-30 second engaging video with text overlays",
        aspectRatio: "9:16",
      });
      break;
    
    case "facebook":
      suggestions.push({
        type: "image",
        description: "Engaging photo or graphic",
        aspectRatio: "1.91:1",
      });
      break;
  }

  return suggestions;
}

/**
 * Predict engagement score
 */
function predictEngagement(content: string, platform: string): number {
  // Simple prediction based on content characteristics
  let score = 0.5; // Base score

  // Add points for engagement elements
  if (content.includes('?')) score += 0.1; // Questions
  if (content.includes('!')) score += 0.05; // Exclamation
  if (content.length > 50 && content.length < 200) score += 0.1; // Good length
  if (/\d/.test(content)) score += 0.05; // Numbers/statistics

  // Platform-specific factors
  switch (platform) {
    case "instagram":
      if (content.includes('\n\n')) score += 0.1; // Good formatting
      break;
    case "twitter":
      if (content.length < 280) score += 0.1; // Concise
      break;
  }

  return Math.min(1, score);
}

/**
 * Generate variations of the post
 */
async function generateVariations(
  originalContent: string,
  platform: Platform
): Promise<string[]> {
  const variations: string[] = [];

  // Variation 1: Different hook
  const hookVariations = [
    "Did you know?",
    "Here's something interesting:",
    "Quick question:",
    "Breaking news:",
  ];

  const firstSentence = originalContent.split('.')[0];
  const restOfContent = originalContent.substring(firstSentence.length + 1);

  for (const hook of hookVariations.slice(0, 2)) {
    variations.push(`${hook} ${restOfContent.trim()}`);
  }

  // Variation 2: Different angle
  if (originalContent.includes('you')) {
    variations.push(originalContent.replace(/you/g, 'your business'));
  }

  return variations.slice(0, 3);
}

/**
 * Generate campaign batch posts
 */
export async function generateCampaignBatch(
  campaign: {
    theme: string;
    duration: number; // days
    postsPerDay: number;
    platforms: Platform[];
    brandVoice?: BrandVoice;
  }
): Promise<{ day: number; posts: GeneratedPost[] }[]> {
  const campaignPosts: { day: number; posts: GeneratedPost[] }[] = [];

  for (let day = 1; day <= campaign.duration; day++) {
    const dailyPosts: GeneratedPost[] = [];

    for (let i = 0; i < campaign.postsPerDay; i++) {
      const request: PostGenerationRequest = {
        topic: `${campaign.theme} - Day ${day}`,
        platforms: campaign.platforms,
        tone: "enthusiastic",
        targetAudience: "General audience",
        keyPoints: [
          `Day ${day} update`,
          "Progress highlight",
          "Next steps",
        ],
        callToAction: "Follow our journey!",
        hashtags: true,
        brandVoice: campaign.brandVoice,
      };

      const posts = await generateMarketingPosts(request);
      dailyPosts.push(...posts);
    }

    campaignPosts.push({ day, posts: dailyPosts });
  }

  return campaignPosts;
}
