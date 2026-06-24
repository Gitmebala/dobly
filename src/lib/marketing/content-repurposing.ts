/**
 * Content Repurposing Automation for Marketing Department
 * Transforms long-form content into multiple formats for different platforms
 */

import { generateMarketingPosts } from "./post-generation";
import { generateMarketingVideo } from "./video-generation";

export interface ContentSource {
  id: string;
  type: "article" | "blog_post" | "whitepaper" | "case_study" | "webinar" | "podcast";
  title: string;
  content: string;
  author?: string;
  publishedAt?: string;
  tags: string[];
  targetAudience: string;
  keyTakeaways: string[];
  statistics?: {
    wordCount: number;
    readTime: number;
    engagement: number;
  };
}

export interface RepurposingRequest {
  source: ContentSource;
  targetFormats: ContentFormat[];
  platforms: string[];
  schedule?: {
    startDate: Date;
    frequency: "daily" | "weekly" | "monthly";
    count: number;
  };
  brandVoice?: any;
}

export interface ContentFormat {
  type: "social_post" | "carousel" | "infographic" | "video" | "newsletter" | "email" | "quote" | "thread";
  priority: number;
  variations: number;
}

export interface RepurposedContent {
  id: string;
  sourceId: string;
  format: string;
  platform?: string;
  content: any;
  scheduledDate?: Date;
  status: "draft" | "scheduled" | "published";
  engagementPrediction: number;
  createdAt: Date;
}

/**
 * Main content repurposing function
 */
export async function repurposeContent(
  request: RepurposingRequest
): Promise<RepurposedContent[]> {
  const results: RepurposedContent[] = [];

  // Step 1: Extract key insights from source content
  const insights = await extractContentInsights(request.source);
  
  // Step 2: Generate content for each format
  for (const format of request.targetFormats) {
    const content = await generateRepurposedContent(
      request.source,
      format,
      insights,
      request.platforms,
      request.brandVoice
    );
    
    results.push(...content);
  }
  
  // Step 3: Schedule content if requested
  if (request.schedule) {
    const scheduled = scheduleContent(results, request.schedule);
    return scheduled;
  }
  
  return results;
}

/**
 * Extract key insights from source content
 */
async function extractContentInsights(source: ContentSource): Promise<{
  keyPoints: string[];
  quotes: string[];
  statistics: string[];
  questions: string[];
  callToActions: string[];
}> {
  // In a real implementation, this would use AI to analyze the content
  const content = source.content.toLowerCase();
  
  // Extract key points (simplified)
  const sentences = source.content.split(/[.!?]+/);
  const keyPoints = sentences
    .filter(s => s.length > 20 && s.length < 100)
    .slice(0, 5)
    .map(s => s.trim());
  
  // Extract quotes (simplified - look for direct quotes)
  const quotes = sentences
    .filter(s => s.includes('"') || s.includes('"'))
    .slice(0, 3)
    .map(s => s.trim());
  
  // Extract statistics (look for numbers)
  const statistics = sentences
    .filter(s => /\d+%|\d+\s*(million|billion|thousand)/i.test(s))
    .slice(0, 3)
    .map(s => s.trim());
  
  // Generate questions from content
  const questions = [
    `What are the main insights from ${source.title}?`,
    `How can ${source.targetAudience} benefit from this?`,
    `What makes this approach unique?`,
  ];
  
  // Generate CTAs
  const callToActions = [
    "Read the full article to learn more",
    "Share your thoughts in the comments",
    "Download our free guide",
    "Book a consultation to discuss",
  ];

  return {
    keyPoints,
    quotes,
    statistics,
    questions,
    callToActions,
  };
}

/**
 * Generate repurposed content for specific format
 */
async function generateRepurposedContent(
  source: ContentSource,
  format: ContentFormat,
  insights: any,
  platforms: string[],
  brandVoice?: any
): Promise<RepurposedContent[]> {
  const results: RepurposedContent[] = [];

  switch (format.type) {
    case "social_post":
      for (const platform of platforms) {
        const posts = await generateSocialPosts(source, insights, platform, brandVoice);
        results.push(...posts);
      }
      break;
    
    case "carousel":
      const carousels = await generateCarouselContent(source, insights);
      results.push(...carousels);
      break;
    
    case "infographic":
      const infographics = await generateInfographicContent(source, insights);
      results.push(...infographics);
      break;
    
    case "video":
      const videos = await generateVideoContent(source, insights);
      results.push(...videos);
      break;
    
    case "newsletter":
      const newsletters = await generateNewsletterContent(source, insights);
      results.push(...newsletters);
      break;
    
    case "email":
      const emails = await generateEmailContent(source, insights);
      results.push(...emails);
      break;
    
    case "quote":
      const quotes = await generateQuoteContent(source, insights);
      results.push(...quotes);
      break;
    
    case "thread":
      const threads = await generateThreadContent(source, insights, platforms);
      results.push(...threads);
      break;
  }

  return results;
}

/**
 * Generate social media posts
 */
async function generateSocialPosts(
  source: ContentSource,
  insights: any,
  platform: string,
  brandVoice?: any
): Promise<RepurposedContent[]> {
  const posts: RepurposedContent[] = [];

  // Generate multiple angles
  const angles = [
    {
      topic: `Key insight from ${source.title}`,
      keyPoints: insights.keyPoints.slice(0, 2),
      tone: "educational",
    },
    {
      topic: `Did you know? ${insights.statistics[0] || ''}`,
      keyPoints: insights.statistics.slice(0, 1),
      tone: "enthusiastic",
    },
    {
      topic: `Quote from ${source.author || 'our latest content'}`,
      keyPoints: insights.quotes.slice(0, 1),
      tone: "professional",
    },
  ];

  for (const angle of angles) {
    const postRequest = {
      topic: angle.topic,
      platforms: [{ type: platform as any, characterLimit: 280, format: "text" as any }],
      tone: angle.tone as any,
      targetAudience: source.targetAudience,
      keyPoints: angle.keyPoints,
      callToAction: insights.callToActions[0],
      hashtags: true,
      brandVoice,
    };

    const generatedPosts = await generateMarketingPosts(postRequest);
    
    for (const post of generatedPosts) {
      posts.push({
        id: `${source.id}-${platform}-${Date.now()}`,
        sourceId: source.id,
        format: "social_post",
        platform,
        content: post,
        status: "draft",
        engagementPrediction: post.engagementPrediction,
        createdAt: new Date(),
      });
    }
  }

  return posts;
}

/**
 * Generate carousel content
 */
async function generateCarouselContent(
  source: ContentSource,
  insights: any
): Promise<RepurposedContent[]> {
  const carousels: RepurposedContent[] = [];

  // Create 5-slide carousel
  const slides = [
    {
      title: source.title,
      content: "Hook slide with main question",
      type: "title",
    },
    {
      title: "The Problem",
      content: insights.keyPoints[0] || "Key problem statement",
      type: "content",
    },
    {
      title: "The Solution",
      content: insights.keyPoints[1] || "Solution overview",
      type: "content",
    },
    {
      title: "Key Results",
      content: insights.statistics[0] || "Important statistic",
      type: "statistic",
    },
    {
      title: "Next Steps",
      content: insights.callToActions[0] || "Call to action",
      type: "cta",
    },
  ];

  carousels.push({
    id: `${source.id}-carousel-${Date.now()}`,
    sourceId: source.id,
    format: "carousel",
    content: {
      slides,
      platform: "instagram",
      description: `Carousel based on ${source.title}`,
    },
    status: "draft",
    engagementPrediction: 0.7,
    createdAt: new Date(),
  });

  return carousels;
}

/**
 * Generate infographic content
 */
async function generateInfographicContent(
  source: ContentSource,
  insights: any
): Promise<RepurposedContent[]> {
  const infographics: RepurposedContent[] = [];

  const infographic = {
    title: source.title,
    subtitle: `Key insights for ${source.targetAudience}`,
    sections: [
      {
        type: "header",
        title: "Main Finding",
        content: insights.keyPoints[0] || "Key insight",
        visual: "chart",
      },
      {
        type: "statistic",
        title: "By the Numbers",
        content: insights.statistics.slice(0, 3),
        visual: "numbers",
      },
      {
        type: "process",
        title: "How It Works",
        content: insights.keyPoints.slice(1, 3),
        visual: "flowchart",
      },
      {
        type: "conclusion",
        title: "Takeaway",
        content: insights.callToActions[0],
        visual: "icon",
      },
    ],
    brandColors: ["#1DA1F2", "#14171A", "#657786", "#F5F8FA"],
  };

  infographics.push({
    id: `${source.id}-infographic-${Date.now()}`,
    sourceId: source.id,
    format: "infographic",
    content: infographic,
    status: "draft",
    engagementPrediction: 0.8,
    createdAt: new Date(),
  });

  return infographics;
}

/**
 * Generate video content
 */
async function generateVideoContent(
  source: ContentSource,
  insights: any
): Promise<RepurposedContent[]> {
  const videos: RepurposedContent[] = [];

  // Create script from key points
  const script = `
    ${insights.keyPoints[0] || "Introduction"}
    
    ${insights.keyPoints[1] || "Main point"}
    
    ${insights.statistics[0] || "Supporting data"}
    
    ${insights.callToActions[0] || "Call to action"}
  `;

  const videoRequest = {
    script,
    style: "explainer" as const,
    duration: 30,
    brandKit: {
      colors: ["#1DA1F2", "#14171A"],
      fonts: ["Arial", "Helvetica"],
    },
  };

  const video = await generateMarketingVideo(videoRequest);

  videos.push({
    id: `${source.id}-video-${Date.now()}`,
    sourceId: source.id,
    format: "video",
    content: video,
    status: "draft",
    engagementPrediction: 0.85,
    createdAt: new Date(),
  });

  return videos;
}

/**
 * Generate newsletter content
 */
async function generateNewsletterContent(
  source: ContentSource,
  insights: any
): Promise<RepurposedContent[]> {
  const newsletters: RepurposedContent[] = [];

  const newsletter = {
    subject: `Weekly Insight: ${source.title}`,
    preheader: insights.keyPoints[0] || "Key insight from our latest content",
    sections: [
      {
        type: "hero",
        title: source.title,
        content: "Brief introduction to the topic",
        image: "hero-image.jpg",
      },
      {
        type: "content",
        title: "Key Takeaways",
        content: insights.keyPoints.map((point: string) => `<li>${point}</li>`).join(''),
      },
      {
        type: "sidebar",
        title: "Quick Stats",
        content: insights.statistics.map((stat: string) => `<p>${stat}</p>`).join(''),
      },
      {
        type: "cta",
        title: "Read More",
        content: insights.callToActions[0],
        button: "Full Article",
      },
    ],
  };

  newsletters.push({
    id: `${source.id}-newsletter-${Date.now()}`,
    sourceId: source.id,
    format: "newsletter",
    content: newsletter,
    status: "draft",
    engagementPrediction: 0.6,
    createdAt: new Date(),
  });

  return newsletters;
}

/**
 * Generate email content
 */
async function generateEmailContent(
  source: ContentSource,
  insights: any
): Promise<RepurposedContent[]> {
  const emails: RepurposedContent[] = [];

  const email = {
    subject: `Insight: ${source.title}`,
    body: `
      <p>Hi there,</p>
      
      <p>I wanted to share this key insight from our latest content:</p>
      
      <blockquote>${insights.keyPoints[0] || "Key insight"}</blockquote>
      
      <p>${insights.keyPoints[1] || "Supporting point"}</p>
      
      <p>${insights.statistics[0] || "Important statistic"}</p>
      
      <p>${insights.callToActions[0]}</p>
      
      <p>Best regards,<br>Team</p>
    `,
    type: "promotion",
  };

  emails.push({
    id: `${source.id}-email-${Date.now()}`,
    sourceId: source.id,
    format: "email",
    content: email,
    status: "draft",
    engagementPrediction: 0.5,
    createdAt: new Date(),
  });

  return emails;
}

/**
 * Generate quote graphics
 */
async function generateQuoteContent(
  source: ContentSource,
  insights: any
): Promise<RepurposedContent[]> {
  const quotes: RepurposedContent[] = [];

  for (const quote of insights.quotes.slice(0, 3)) {
    const quoteGraphic = {
      text: quote,
      author: source.author || "Anonymous",
      source: source.title,
      style: "minimal",
      backgroundColor: "#1DA1F2",
      textColor: "#FFFFFF",
    };

    quotes.push({
      id: `${source.id}-quote-${Date.now()}`,
      sourceId: source.id,
      format: "quote",
      content: quoteGraphic,
      status: "draft",
      engagementPrediction: 0.6,
      createdAt: new Date(),
    });
  }

  return quotes;
}

/**
 * Generate thread content (Twitter/LinkedIn)
 */
async function generateThreadContent(
  source: ContentSource,
  insights: any,
  platforms: string[]
): Promise<RepurposedContent[]> {
  const threads: RepurposedContent[] = [];

  for (const platform of platforms) {
    if (platform === "twitter" || platform === "linkedin") {
      const thread = {
        tweets: [
          `1/${insights.keyPoints.length + 1} ${insights.keyPoints[0] || "Opening statement"}`,
          ...insights.keyPoints.slice(1).map((point: string, index: number) => 
            `${index + 2}/${insights.keyPoints.length + 1} ${point}`
          ),
          `${insights.keyPoints.length + 1}/${insights.keyPoints.length + 1} ${insights.callToActions[0]}`,
        ],
        platform,
      };

      threads.push({
        id: `${source.id}-thread-${platform}-${Date.now()}`,
        sourceId: source.id,
        format: "thread",
        platform,
        content: thread,
        status: "draft",
        engagementPrediction: 0.7,
        createdAt: new Date(),
      });
    }
  }

  return threads;
}

/**
 * Schedule content over time
 */
function scheduleContent(
  content: RepurposedContent[],
  schedule: {
    startDate: Date;
    frequency: "daily" | "weekly" | "monthly";
    count: number;
  }
): RepurposedContent[] {
  const scheduled = [...content];
  const interval = schedule.frequency === "daily" ? 1 : schedule.frequency === "weekly" ? 7 : 30;
  
  scheduled.forEach((item, index) => {
    const daysToAdd = index * interval;
    const scheduledDate = new Date(schedule.startDate);
    scheduledDate.setDate(scheduledDate.getDate() + daysToAdd);
    
    item.scheduledDate = scheduledDate;
    item.status = "scheduled";
  });

  return scheduled.slice(0, schedule.count);
}

/**
 * Batch repurpose multiple content sources
 */
export async function batchRepurposeContent(
  sources: ContentSource[],
  defaultFormats: ContentFormat[],
  platforms: string[]
): Promise<RepurposedContent[]> {
  const allResults: RepurposedContent[] = [];

  for (const source of sources) {
    const request: RepurposingRequest = {
      source,
      targetFormats: defaultFormats,
      platforms,
    };

    const results = await repurposeContent(request);
    allResults.push(...results);
  }

  return allResults;
}
