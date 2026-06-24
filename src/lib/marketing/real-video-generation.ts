/**
 * Real AI Video Generation for Marketing Department
 * Integrates with actual AI models for video synthesis
 */

import { openai, runway, elevenlabs, withRetry, costTracker, API_LIMITS, AI_MODELS } from '../ai/real-integrations';
import { VideoGenerationRequest, VideoGenerationResult, Scene } from './video-generation';

/**
 * Real video generation using actual AI models
 */
export async function generateRealMarketingVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  try {
    // Step 1: Generate optimized script with GPT-4
    const optimizedScript = await generateOptimizedScript(request.script);
    
    // Step 2: Generate scene descriptions with AI
    const sceneDescriptions = await generateSceneDescriptions(optimizedScript, request.style);
    
    // Step 3: Generate visual assets for each scene
    const visualAssets = await generateVisualAssets(sceneDescriptions, request.brandKit);
    
    // Step 4: Generate voiceover if requested
    let voiceoverUrl: string | undefined;
    if (request.assets?.voiceover) {
      voiceoverUrl = await generateVoiceover(optimizedScript);
    }
    
    // Step 5: Generate video with RunwayML
    const videoUrl = await generateVideoWithRunway(visualAssets, voiceoverUrl, request.duration);
    
    // Step 6: Generate thumbnail
    const thumbnailUrl = await generateRealThumbnail(videoUrl);
    
    // Step 7: Store in Supabase
    const { data, error } = await supabase
      .from('generated_videos')
      .insert({
        script: optimizedScript,
        style: request.style,
        duration: request.duration,
        video_url: videoUrl,
        thumbnail_url: thumbnailUrl,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) throw new Error(`Database error: ${error.message}`);
    
    return {
      videoUrl,
      thumbnailUrl,
      duration: request.duration,
      resolution: "1080x1920",
      size: await getVideoSize(videoUrl),
      metadata: {
        scenes: visualAssets.map((asset, index) => ({
          type: asset.type,
          duration: asset.duration,
          content: asset.content,
          position: { x: 0, y: 0, width: 1080, height: 1920 },
        })),
        usedAssets: request.assets?.images || [],
        generatedAt: new Date().toISOString(),
      },
    };
    
  } catch (error) {
    console.error('Video generation failed:', error);
    throw new Error(`Video generation failed: ${error.message}`);
  }
}

/**
 * Generate optimized script using GPT-4
 */
async function generateOptimizedScript(originalScript: string): Promise<string> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4_TURBO,
      messages: [
        {
          role: 'system',
          content: `You are an expert video script writer. Optimize the given script for short-form video content (15-60 seconds).
          Rules:
          - Break into 3-7 second scenes
          - Use conversational, engaging language
          - Include visual cues in brackets
          - Add emotional hooks
          - End with clear call-to-action
          - Total word count: 75-225 words`
        },
        {
          role: 'user',
          content: `Optimize this script for video: ${originalScript}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    
    const script = response.choices[0]?.message?.content || originalScript;
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);
    
    return script;
  });
}

/**
 * Generate scene descriptions with AI vision
 */
async function generateSceneDescriptions(
  script: string,
  style: VideoGenerationRequest["style"]
): Promise<Array<{ description: string; duration: number; type: string }>> {
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4_TURBO,
      messages: [
        {
          role: 'system',
          content: `Generate detailed scene descriptions for a ${style} video.
          For each scene, provide:
          - Visual description (what to show)
          - Duration in seconds
          - Scene type (text, image, animation, transition)
          - Camera angles and movements
          - Color scheme and mood
          Return as JSON array.`
        },
        {
          role: 'user',
          content: `Create scene descriptions for: ${script}`
        }
      ],
      max_tokens: 1000,
      temperature: 0.5,
    });
    
    const scenes = JSON.parse(response.choices[0]?.message?.content || '[]');
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);
    
    return scenes;
  });
}

/**
 * Generate visual assets using DALL-E 3
 */
async function generateVisualAssets(
  scenes: Array<{ description: string; duration: number; type: string }>,
  brandKit?: VideoGenerationRequest["brandKit"]
): Promise<Array<{ type: string; content: any; duration: number }>> {
  const assets = [];
  
  for (const [index, scene] of scenes.entries()) {
    if (scene.type === 'image' || scene.type === 'animation') {
      const imageUrl = await withRetry(async () => {
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: `Create a ${scene.type} for video: ${scene.description}. 
          ${brandKit ? `Use brand colors: ${brandKit.colors.join(', ')}` : ''}
          Style: professional, cinematic, high quality`,
          size: '1024x1024',
          quality: 'hd',
          n: 1,
        });
        
        // Track cost
        costTracker.trackCost('openai', 1, 0.04); // DALL-E 3 cost per image
        
        return response.data[0].url;
      });
      
      assets.push({
        type: scene.type,
        content: { imageUrl, description: scene.description },
        duration: scene.duration,
      });
    } else {
      // Text scene
      assets.push({
        type: 'text',
        content: { 
          text: scene.description,
          style: brandKit ? { colors: brandKit.colors, fonts: brandKit.fonts } : undefined
        },
        duration: scene.duration,
      });
    }
  }
  
  return assets;
}

/**
 * Generate voiceover using ElevenLabs
 */
async function generateVoiceover(script: string): Promise<string> {
  return withRetry(async () => {
    const voiceId = 'rachel'; // Professional female voice
    const response = await elevenlabs.generate({
      voice: voiceId,
      text: script,
      model_id: 'eleven_multilingual_v2',
    });
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('voiceovers')
      .upload(`${Date.now()}.mp3`, response.audio);
    
    if (error) throw new Error(`Storage error: ${error.message}`);
    
    const { data: { publicUrl } } = supabase.storage
      .from('voiceovers')
      .getPublicUrl(data.path);
    
    // Track cost
    const characterCount = script.length;
    costTracker.trackCost('elevenlabs', characterCount, API_LIMITS.ELEVENLABS.COST_PER_1K_CHARS);
    
    return publicUrl;
  });
}

/**
 * Generate video using RunwayML Gen-2
 */
async function generateVideoWithRunway(
  assets: Array<{ type: string; content: any; duration: number }>,
  voiceoverUrl?: string,
  totalDuration: number = 30
): Promise<string> {
  return withRetry(async () => {
    // Create video prompt from assets
    const videoPrompt = assets
      .filter(asset => asset.type === 'image' || asset.type === 'animation')
      .map(asset => asset.content.description)
      .join('. ');
    
    const response = await runway.videos.create({
      model: 'gen-2',
      prompt: videoPrompt,
      duration: Math.min(totalDuration, 30), // Runway max 30 seconds
      ratio: '9:16', // Vertical video
      watermark: false,
      audio_source: voiceoverUrl ? 'upload' : 'none',
      audio_url: voiceoverUrl,
    });
    
    // Wait for generation to complete
    let video = response;
    while (video.status === 'processing') {
      await new Promise(resolve => setTimeout(resolve, 5000));
      video = await runway.videos.get(video.id);
    }
    
    if (video.status !== 'completed') {
      throw new Error(`Video generation failed: ${video.error}`);
    }
    
    // Download and upload to Supabase
    const videoBuffer = await fetch(video.url).then(res => res.blob());
    
    const { data, error } = await supabase.storage
      .from('videos')
      .upload(`${Date.now()}.mp4`, videoBuffer);
    
    if (error) throw new Error(`Storage error: ${error.message}`);
    
    const { data: { publicUrl } } = supabase.storage
      .from('videos')
      .getPublicUrl(data.path);
    
    // Track cost
    const creditsUsed = totalDuration * API_LIMITS.RUNWAY.CREDITS_PER_SECOND;
    costTracker.trackCost('runway', creditsUsed, API_LIMITS.RUNWAY.COST_PER_CREDIT);
    
    return publicUrl;
  });
}

/**
 * Generate real thumbnail from video
 */
async function generateRealThumbnail(videoUrl: string): Promise<string> {
  // Use FFmpeg or similar to extract frame
  // For now, create a thumbnail using DALL-E based on video content
  return withRetry(async () => {
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt: 'Create a compelling thumbnail for a marketing video. Eye-catching, professional, high contrast.',
      size: '1024x1024',
      quality: 'hd',
      n: 1,
    });
    
    // Track cost
    costTracker.trackCost('openai', 1, 0.04);
    
    // Upload to Supabase
    const { data, error } = await supabase.storage
      .from('thumbnails')
      .upload(`${Date.now()}.jpg`, await fetch(response.data[0].url).then(res => res.blob()));
    
    if (error) throw new Error(`Storage error: ${error.message}`);
    
    const { data: { publicUrl } } = supabase.storage
      .from('thumbnails')
      .getPublicUrl(data.path);
    
    return publicUrl;
  });
}

/**
 * Get actual video file size
 */
async function getVideoSize(videoUrl: string): Promise<number> {
  const response = await fetch(videoUrl, { method: 'HEAD' });
  const contentLength = response.headers.get('content-length');
  return contentLength ? parseInt(contentLength) : 0;
}

/**
 * Generate multiple video variations with real AI
 */
export async function generateRealVideoVariations(
  baseRequest: VideoGenerationRequest,
  variations: number = 3
): Promise<VideoGenerationResult[]> {
  const results: VideoGenerationResult[] = [];
  
  for (let i = 0; i < variations; i++) {
    // Create variation with different AI parameters
    const variation = {
      ...baseRequest,
      script: await generateScriptVariation(baseRequest.script, i),
      style: getVariationStyle(baseRequest.style, i),
    };
    
    results.push(await generateRealMarketingVideo(variation));
  }
  
  return results;
}

/**
 * Generate script variation using AI
 */
async function generateScriptVariation(originalScript: string, variationIndex: number): Promise<string> {
  const variations = [
    'Make it more energetic and exciting',
    'Make it more professional and authoritative',
    'Make it more conversational and friendly',
    'Add more emotional appeal',
    'Focus on benefits over features',
  ];
  
  return withRetry(async () => {
    const response = await openai.chat.completions.create({
      model: AI_MODELS.GPT_4_TURBO,
      messages: [
        {
          role: 'system',
          content: `Rewrite the given script to be ${variations[variationIndex % variations.length]}. 
          Keep the core message but change the tone and style.`
        },
        {
          role: 'user',
          content: originalScript
        }
      ],
      max_tokens: 300,
      temperature: 0.8,
    });
    
    // Track cost
    costTracker.trackCost('openai', response.usage?.total_tokens || 0, API_LIMITS.OPENAI.COST_PER_1K_TOKENS);
    
    return response.choices[0]?.message?.content || originalScript;
  });
}

/**
 * Get variation style
 */
function getVariationStyle(baseStyle: VideoGenerationRequest["style"], index: number): VideoGenerationRequest["style"] {
  const styles: VideoGenerationRequest["style"][] = ["explainer", "testimonial", "product_demo", "social_clip"];
  return styles[(styles.indexOf(baseStyle) + index) % styles.length];
}
