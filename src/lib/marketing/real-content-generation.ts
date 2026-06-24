/**
 * Real AI Content Generation for Marketing Department
 * Integrates with actual OpenAI GPT models for content creation
 */

import { openai, withRetry, costTracker, API_LIMITS, AI_MODELS } from '../ai/real-integrations';
import { supabase } from '../ai/real-integrations';

export interface ContentGenerationRequest {
  contentType: "social_post" | "blog_post" | "email" | "ad_copy" | "product_description";
  topic: string;
  tone: "professional" | "casual" | "enthusiastic" | "authoritative" | "friendly";
  platform?: "twitter" | "linkedin" | "instagram" | "facebook" | "blog" | "email";
  length?: "short" | "medium" | "long";
  keywords?: string[];
  brandVoice?: {
    personality: string;
    values: string[];
    language: string;
  };
  targetAudience?: {
    demographics: string[];
    interests: string[];
    painPoints: string[];
  };
}

export interface ContentGenerationResult {
  content: string;
  metadata: {
    contentType: string;
    wordCount: number;
    readingTime: number;
    seoScore: number;
    engagementPrediction: number;
    generatedAt: string;
    modelUsed: string;
    tokensUsed: number;
  };
  variations: string[];
  hashtags: string[];
  callToAction: string;
  sentiment: "positive" | "neutral" | "negative";
}

/**
 * Generate real AI content using GPT-4
 */
export async function generateRealContent(
  request: ContentGenerationRequest
): Promise<ContentGenerationResult> {
  try {
    // Step 1: Analyze request and create enhanced prompt
    const enhancedPrompt = createEnhancedPrompt(request);
    
    // Step 2: Generate primary content
    const primaryContent = await generatePrimaryContent(enhancedPrompt, request);
    
    // Step 3: Generate variations
    const variations = await generateContentVariations(primaryContent, request);
    
    // Step 4: Generate hashtags and CTAs
    const hashtags = await generateHashtags(primaryContent, request);
    const callToAction = await generateCallToAction(primaryContent, request);
    
    // Step 5: Analyze sentiment and SEO
    const sentiment = await analyzeSentiment(primaryContent);
    const seoScore = await analyzeSEO(primaryContent, request.keywords || []);
    
    // Step 6: Predict engagement
    const engagementPrediction = await predictEngagement(primaryContent, request);
    
    // Step 7: Store in database
    const { data, error } = await supabase
      .from('generated_content')
      .insert({
        content: primaryContent,
        request: request,
        metadata: {
          contentType: request.contentType,
          platform: request.platform,
          generatedAt: new Date().toISOString(),
        },
      })
      .select()
      .single();
    
    if (error) throw new Error(`Database error: ${error.message}`);

    return {
      content: primaryContent,
      metadata: {
        contentType: request.contentType,
        wordCount: primaryContent.split(' ').length,
        readingTime: Math.ceil(primaryContent.split(' ').length / 200),
        seoScore,
        engagementPrediction,
        generatedAt: new Date().toISOString(),
        modelUsed: AI_MODELS.GPT_4_TURBO,
        tokensUsed: 0, // Will be updated after generation
      },
      variations,
      hashtags,
      callToAction,
      sentiment,
    };
    
  } catch (error) {
    console.error('Content generation failed:', error);
    throw new Error(`Content generation failed: ${error.message}`);
  }
}

/**
 * Create enhanced prompt based on request
 */
function createEnhancedPrompt(request: ContentGenerationRequest): string {
  const promptParts = [
    `Generate ${request.contentType} content about: ${request.topic}`,
    `Tone: ${request.tone}`,
    `Platform: ${request.platform || 'general'}`,
    `Length: ${request.length || 'medium'}`,
  ];

  if (request.brandVoice) {
    promptParts.push(
      `Brand personality: ${request.brandVoice.personality}`,
      `Brand values: ${request.brandVoice.values.join(', ')}`,
      `Language style: ${request.brandVoice.language}`
    );
  }

  if (request.targetAudience) {
    promptParts.push(
      `Target audience: ${request.targetAudience.demographics.join(', ')}`,
      `Audience interests: ${request.targetAudience.interests.join(', ')}`,
      `Audience pain points: ${request.targetAudience.painPoints.join(', ')}`
    );
  }

  if (request.keywords && request.keywords.length > 0) {
    promptParts.push(`Keywords to include: ${request.keywords.join(', ')}`);
  }

  // Add platform-specific instructions
  const platformInstructions = getPlatformInstructions(request.platform);
  if (platformInstructions) {
    promptParts.push(platformInstructions);
  }

  return promptParts.join('\n');
}

/**
 * Generate primary content using GPT-4
 */
async function generatePrimaryContent(
  prompt: string,
  request: ContentGenerationRequest
): Promise<string> {
  return withRetry(async () => {
    const systemPrompt = `You are an expert content creator and copywriter. 
    Generate high-quality, engaging content that converts.
    
    Guidelines:
    - Write in a conversational, natural tone
    - Use clear, concise language
    - Include emotional triggers
    - Add value for the reader
    - Optimize for the specified platform
    - Include a clear call-to-action
    - Use storytelling when appropriate
    - Avoid jargon and clichés
    - Ensure content is original and plagiarism-free`;

    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4_TURBO,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: getMaxTokens(request.contentType, request.length),
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1,
    });

    const content = response.choices[0]?.message?.content || '';
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    return content;
  });
}

/**
 * Generate content variations
 */
async function generateContentVariations(
  primaryContent: string,
  request: ContentGenerationRequest
): Promise<string[]> {
  const variations = [];
  
  const variationPrompts = [
    'Rewrite this content to be more energetic and exciting',
    'Rewrite this content to be more professional and authoritative',
    'Rewrite this content to be more conversational and friendly',
    'Rewrite this content to focus more on benefits',
    'Rewrite this content to be more persuasive',
  ];

  for (let i = 0; i < 3; i++) {
    const variation = await withRetry(async () => {
      const response = await openai.chat.completions.create({
        model: AI_MODELS.GPT_4_TURBO,
        messages: [
          {
            role: 'system',
            content: 'Rewrite the given content following the instruction. Keep the core message but change the style as requested.'
          },
          {
            role: 'user',
            content: `${variationPrompts[i]}:\n\n${primaryContent}`
          }
        ],
        max_tokens: getMaxTokens(request.contentType, request.length),
        temperature: 0.8,
      });

      // Track cost
      costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

      return response.choices[0]?.message?.content || '';
    });

    variations.push(variation);
  }

  return variations;
}

/**
 * Generate relevant hashtags
 */
async function generateHashtags(
  content: string,
  request: ContentGenerationRequest
): Promise<string[]> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_3_5_TURBO,
      messages: [
        {
          role: 'system',
          content: 'Generate 5-10 relevant hashtags for the given content. Focus on trending and high-engagement hashtags. Return only the hashtags, one per line, without # symbols.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 100,
      temperature: 0.5,
    });

    const hashtags = response.choices[0]?.message?.content
      ?.split('\n')
      .map(tag => tag.trim().replace('#', ''))
      .filter(tag => tag.length > 0) || [];

    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    return hashtags;
  });
}

/**
 * Generate call-to-action
 */
async function generateCallToAction(
  content: string,
  request: ContentGenerationRequest
): Promise<string> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_3_5_TURBO,
      messages: [
        {
          role: 'system',
          content: 'Generate a compelling call-to-action for the given content. Make it specific, urgent, and action-oriented. Keep it under 15 words.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 50,
      temperature: 0.6,
    });

    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    return response.choices[0]?.message?.content?.trim() || '';
  });
}

/**
 * Analyze sentiment using GPT
 */
async function analyzeSentiment(content: string): Promise<"positive" | "neutral" | "negative"> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_3_5_TURBO,
      messages: [
        {
          role: 'system',
          content: 'Analyze the sentiment of the given content. Respond with only one word: positive, neutral, or negative.'
        },
        {
          role: 'user',
          content: content
        }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const sentiment = response.choices[0]?.message?.content?.toLowerCase().trim();
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    if (sentiment?.includes('positive')) return 'positive';
    if (sentiment?.includes('negative')) return 'negative';
    return 'neutral';
  });
}

/**
 * Analyze SEO score
 */
async function analyzeSEO(content: string, keywords: string[]): Promise<number> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_3_5_TURBO,
      messages: [
        {
          role: 'system',
          content: `Analyze the SEO quality of the given content. Consider:
          - Keyword density and placement
          - Readability and structure
          - Meta description potential
          - Internal linking opportunities
          - Content length appropriateness
          
          Rate the SEO quality from 0-100. Respond with only the number.`
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nKeywords: ${keywords.join(', ')}`
        }
      ],
      max_tokens: 10,
      temperature: 0,
    });

    const score = parseInt(response.choices[0]?.message?.content || '50');
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    return Math.max(0, Math.min(100, score));
  });
}

/**
 * Predict engagement using AI
 */
async function predictEngagement(
  content: string,
  request: ContentGenerationRequest
): Promise<number> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_3_5_TURBO,
      messages: [
        {
          role: 'system',
          content: `Predict the engagement potential of this content on a scale of 0-100.
          Consider:
          - Emotional appeal
          - Call-to-action strength
          - Relevance to target audience
          - Platform appropriateness
          - Visual potential
          
          Respond with only the number.`
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nPlatform: ${request.platform}\n\nContent Type: ${request.contentType}`
        }
      ],
      max_tokens: 10,
      temperature: 0.1,
    });

    const prediction = parseInt(response.choices[0]?.message?.content || '50');
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    return Math.max(0, Math.min(100, prediction));
  });
}

/**
 * Get platform-specific instructions
 */
function getPlatformInstructions(platform?: string): string {
  const instructions = {
    twitter: 'Keep under 280 characters. Use hashtags sparingly. Include mentions when relevant.',
    linkedin: 'Professional tone. Use industry-specific keywords. Include relevant hashtags.',
    instagram: 'Visual-first approach. Use 5-10 relevant hashtags. Include emoji naturally.',
    facebook: 'Conversational tone. Use 2-3 hashtags. Include questions to encourage engagement.',
    blog: 'Long-form content. Use headings and subheadings. Include internal links.',
    email: 'Personal tone. Clear subject line. Single call-to-action. Mobile-friendly formatting.',
  };

  return instructions[platform as keyof typeof instructions] || '';
}

/**
 * Get max tokens based on content type and length
 */
function getMaxTokens(contentType: string, length?: string): number {
  const baseTokens = {
    social_post: 100,
    blog_post: 2000,
    email: 500,
    ad_copy: 150,
    product_description: 300,
  };

  const multipliers = {
    short: 0.5,
    medium: 1,
    long: 2,
  };

  const base = baseTokens[contentType as keyof typeof baseTokens] || 500;
  const multiplier = multipliers[length as keyof typeof multipliers] || 1;

  return Math.floor(base * multiplier);
}

/**
 * Generate content in bulk
 */
export async function generateBulkContent(
  requests: ContentGenerationRequest[]
): Promise<ContentGenerationResult[]> {
  const results: ContentGenerationResult[] = [];
  
  // Process in parallel with rate limiting
  const batchSize = 3; // OpenAI rate limit consideration
  
  for (let i = 0; i < requests.length; i += batchSize) {
    const batch = requests.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(request => generateRealContent(request))
    );
    
    results.push(...batchResults);
    
    // Small delay between batches to respect rate limits
    if (i + batchSize < requests.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Optimize content for SEO
 */
export async function optimizeForSEO(
  content: string,
  targetKeywords: string[]
): Promise<string> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4_TURBO,
      messages: [
        {
          role: 'system',
          content: `Optimize the given content for SEO using the target keywords.
          Guidelines:
          - Include keywords naturally
          - Improve readability
          - Add meta description
          - Include internal linking suggestions
          - Maintain original message
          - Keep content engaging`
        },
        {
          role: 'user',
          content: `Content: ${content}\n\nTarget Keywords: ${targetKeywords.join(', ')}`
        }
      ],
      max_tokens: 2000,
      temperature: 0.3,
    });

    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);

    return response.choices[0]?.message?.content || content;
  });
}
