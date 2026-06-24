/**
 * AI Video Generation for Marketing Department
 * Creates short-form videos from text content, images, and brand assets
 */

export interface VideoGenerationRequest {
  script: string;
  style: "explainer" | "testimonial" | "product_demo" | "social_clip";
  duration: number; // seconds
  brandKit?: {
    colors: string[];
    fonts: string[];
    logo?: string;
  };
  assets?: {
    images: string[];
    music?: string;
    voiceover?: boolean;
  };
}

export interface VideoGenerationResult {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  resolution: string;
  size: number;
  metadata: {
    scenes: Scene[];
    usedAssets: string[];
    generatedAt: string;
    renderMode?: "draft_package" | "rendered_asset";
    summary?: string;
  };
}

export interface Scene {
  type: "text" | "image" | "animation" | "transition";
  duration: number;
  content: unknown;
  position: { x: number; y: number; width: number; height: number };
}

function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

/**
 * Main video generation function
 */
export async function generateMarketingVideo(
  request: VideoGenerationRequest
): Promise<VideoGenerationResult> {
  // Step 1: Parse and optimize script
  const optimizedScript = optimizeScriptForVideo(request.script);
  
  // Step 2: Generate scenes
  const scenes = await generateScenes(optimizedScript, request.style);
  
  // Step 3: Apply brand styling
  const styledScenes = applyBrandStyling(scenes, request.brandKit);
  
  // Step 4: Generate video
  const videoUrl = await renderVideo(styledScenes, request.assets);
  
  // Step 5: Generate thumbnail
  const thumbnailUrl = await generateThumbnail(styledScenes, request);
  
  return {
    videoUrl,
    thumbnailUrl,
    duration: request.duration,
    resolution: "1080x1920", // Vertical for social
    size: JSON.stringify(styledScenes).length,
    metadata: {
      scenes: styledScenes,
      usedAssets: request.assets?.images || [],
      generatedAt: new Date().toISOString(),
      renderMode: "draft_package",
      summary: "Dobly produced a structured scene plan and thumbnail draft. Render the final asset through a connected video pipeline before external publishing.",
    },
  };
}

/**
 * Optimize script for video format
 */
function optimizeScriptForVideo(script: string): string {
  // Break into sentences
  const sentences = script.split(/[.!?]+/).filter(s => s.trim());
  
  // Optimize for reading speed (150 words per minute)
  const wordsPerMinute = 150;
  const targetWords = Math.floor((script.split(' ').length / 60) * wordsPerMinute);
  
  // Ensure each scene is 3-7 seconds
  const optimized = sentences
    .map((sentence, index) => {
      const words = sentence.split(' ').length;
      const duration = Math.max(3, Math.min(7, (words / wordsPerMinute) * 60));
      return {
        text: sentence.trim(),
        duration,
        sceneType: determineSceneType(sentence),
      };
    })
    .filter(scene => scene.text.length > 0);
  
  return JSON.stringify(optimized);
}

/**
 * Determine the type of scene based on content
 */
function determineSceneType(text: string): "text" | "image" | "animation" {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("show") || lowerText.includes("see") || lowerText.includes("look")) {
    return "image";
  }
  
  if (lowerText.includes("imagine") || lowerText.includes("picture") || lowerText.includes("visualize")) {
    return "animation";
  }
  
  return "text";
}

/**
 * Generate scenes from optimized script
 */
async function generateScenes(
  optimizedScript: string,
  style: VideoGenerationRequest["style"]
): Promise<Scene[]> {
  const scriptData = JSON.parse(optimizedScript);
  const scenes: Scene[] = [];
  
  for (const [index, scene] of scriptData.entries()) {
    const baseScene: Scene = {
      type: scene.sceneType,
      duration: scene.duration,
      content: scene.text,
      position: {
        x: 0,
        y: 0,
        width: 1080,
        height: 1920,
      },
    };
    
    // Add style-specific enhancements
    switch (style) {
      case "explainer":
        scenes.push(await createExplainerScene(baseScene, index));
        break;
      case "testimonial":
        scenes.push(await createTestimonialScene(baseScene, index));
        break;
      case "product_demo":
        scenes.push(await createProductDemoScene(baseScene, index));
        break;
      case "social_clip":
        scenes.push(await createSocialClipScene(baseScene, index));
        break;
    }
  }
  
  return scenes;
}

/**
 * Create explainer-style scene
 */
async function createExplainerScene(baseScene: Scene, index: number): Promise<Scene> {
  // Add animations and transitions for explainer videos
  return {
    ...baseScene,
    content: {
      ...baseScene.content,
      animation: index % 2 === 0 ? "slideInLeft" : "slideInRight",
      fontSize: 32,
      textAlign: "center",
    },
  };
}

/**
 * Create testimonial-style scene
 */
async function createTestimonialScene(baseScene: Scene, index: number): Promise<Scene> {
  // Add quote formatting and person attribution
  return {
    ...baseScene,
    type: "text",
    content: {
      ...baseScene.content,
      prefix: '"',
      suffix: '"',
      fontSize: 28,
      attribution: index === 0 ? "Happy Customer" : undefined,
    },
  };
}

/**
 * Create product demo scene
 */
async function createProductDemoScene(baseScene: Scene, index: number): Promise<Scene> {
  // Add product highlights and features
  return {
    ...baseScene,
    type: index % 2 === 0 ? "text" : "image",
    content: {
      ...baseScene.content,
      highlight: true,
      bulletPoints: baseScene.text.split(",").map(t => t.trim()),
    },
  };
}

/**
 * Create social media clip scene
 */
async function createSocialClipScene(baseScene: Scene, index: number): Promise<Scene> {
  // Add trendy effects and quick cuts
  return {
    ...baseScene,
    content: {
      ...baseScene.content,
      fontSize: 36,
      fontWeight: "bold",
      animation: "bounce",
      emoji: getRandomEmoji(),
    },
  };
}

/**
 * Apply brand styling to scenes
 */
function applyBrandStyling(
  scenes: Scene[],
  brandKit?: VideoGenerationRequest["brandKit"]
): Scene[] {
  if (!brandKit) return scenes;
  
  return scenes.map(scene => ({
    ...scene,
    content: {
      ...scene.content,
      colors: brandKit.colors,
      fonts: brandKit.fonts,
      logo: brandKit.logo,
    },
  }));
}

/**
 * Render final video from scenes
 */
async function renderVideo(
  scenes: Scene[],
  assets?: VideoGenerationRequest["assets"]
): Promise<string> {
  void assets;
  return `dobly://video-plan/${Date.now()}?scenes=${scenes.length}`;
}

/**
 * Generate thumbnail from video
 */
async function generateThumbnail(
  scenes: Scene[],
  request: VideoGenerationRequest,
): Promise<string> {
  const hero = String(scenes[0]?.content ?? request.script).slice(0, 96);
  const primary = request.brandKit?.colors?.[0] ?? "#101828";
  const secondary = request.brandKit?.colors?.[1] ?? "#1D4ED8";
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stop-color="${primary}"/>
          <stop offset="100%" stop-color="${secondary}"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)"/>
      <rect x="72" y="132" width="936" height="1656" rx="44" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)"/>
      <text x="120" y="240" fill="#ffffff" font-size="42" font-family="Arial, Helvetica, sans-serif" font-weight="700">Dobly Video Draft</text>
      <text x="120" y="320" fill="rgba(255,255,255,0.86)" font-size="28" font-family="Arial, Helvetica, sans-serif">${request.style.replace(/_/g, " ")}</text>
      <foreignObject x="120" y="420" width="840" height="900">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family:Arial,Helvetica,sans-serif;color:white;font-size:54px;line-height:1.2;font-weight:700;">
          ${hero}
        </div>
      </foreignObject>
      <text x="120" y="1680" fill="rgba(255,255,255,0.82)" font-size="28" font-family="Arial, Helvetica, sans-serif">${scenes.length} scenes • ${request.duration}s planned runtime</text>
    </svg>
  `.trim();
  return svgToDataUrl(svg);
}

/**
 * Get random emoji for social clips
 */
function getRandomEmoji(): string {
  const emojis = ["🚀", "✨", "🎯", "💡", "🔥", "⚡", "🎉", "💪"];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

/**
 * Generate multiple video variations for A/B testing
 */
export async function generateVideoVariations(
  baseRequest: VideoGenerationRequest,
  variations: number = 3
): Promise<VideoGenerationResult[]> {
  const results: VideoGenerationResult[] = [];
  
  for (let i = 0; i < variations; i++) {
    const variation = {
      ...baseRequest,
      // Slightly modify script for each variation
      script: modifyScriptForVariation(baseRequest.script, i),
      style: getRandomStyle(),
    };
    
    results.push(await generateMarketingVideo(variation));
  }
  
  return results;
}

/**
 * Modify script for A/B testing variations
 */
function modifyScriptForVariation(script: string, variation: number): string {
  const modifications = [
    // Variation 1: More energetic language
    script.replace(/\b(good|nice|okay)\b/gi, "amazing"),
    // Variation 2: More direct call-to-action
    script.replace(/\b(consider|think about)\b/gi, "get"),
    // Variation 3: Question format
    script.replace(/\./g, "? Ready to transform?"),
  ];
  
  return modifications[variation % modifications.length] || script;
}

/**
 * Get random video style for variations
 */
function getRandomStyle(): VideoGenerationRequest["style"] {
  const styles: VideoGenerationRequest["style"][] = ["explainer", "testimonial", "product_demo", "social_clip"];
  return styles[Math.floor(Math.random() * styles.length)];
}
