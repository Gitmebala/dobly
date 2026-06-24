// Network Effects System for Dobly AI Workers
// Creates self-reinforcing value loop through template sharing and cross-worker learning

import type { Workflow, WorkflowBlueprint } from '@/types/index';

export interface WorkflowTemplate extends WorkflowBlueprint {
  id?: string;
  vertical?: string;
  created_at?: string;
}

export interface NetworkInsight {
  id: string;
  workflowId: string;
  pattern: string;
  effectiveness: number;
  sampleSize: number;
  industry?: string;
  sharedAt: string;
  privacyLevel: 'anonymous' | 'aggregated' | 'detailed';
}

export interface TemplatePerformance {
  templateId: string;
  usageCount: number;
  successRate: number;
  avgExecutionTime: number;
  userRating?: number;
  improvements?: TemplateImprovement[];
}

export interface TemplateImprovement {
  id: string;
  author: string;
  description: string;
  effectiveness: number;
  approved: boolean;
}

export interface TemplateMarketplaceItem {
  template: WorkflowTemplate;
  author: {
    id: string;
    name: string;
    reputation: number;
    verified: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviews: number;
  };
  pricing: {
    type: 'free' | 'subscription' | 'one_time';
    amount?: number;
  };
}

class CrossWorkerLearning {
  private insights: Map<string, NetworkInsight[]> = new Map();
  private privacyPreservingAggregation: Map<string, AggregatedMetric> = new Map();

  async recordExecution(
    workflowId: string,
    outcome: 'success' | 'failure' | 'partial',
    metrics: {
      executionTime?: number;
      stepsCompleted?: number;
      resourcesUsed?: Record<string, number>;
      industry?: string;
    }
  ): Promise<void> {
    const patternKey = this.extractPatternKey(workflowId);
    
    const insight: NetworkInsight = {
      id: `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      pattern: patternKey,
      effectiveness: outcome === 'success' ? 1 : outcome === 'partial' ? 0.5 : 0,
      sampleSize: 1,
      industry: metrics.industry,
      sharedAt: new Date().toISOString(),
      privacyLevel: 'aggregated'
    };

    const existingInsights = this.insights.get(patternKey) || [];
    this.insights.set(patternKey, [...existingInsights, insight]);

    this.updateAggregatedMetrics(patternKey, insight);
  }

  private extractPatternKey(workflowId: string): string {
    return workflowId.split('-')[0];
  }

  private updateAggregatedMetrics(patternKey: string, newInsight: NetworkInsight): void {
    const existing = this.privacyPreservingAggregation.get(patternKey);

    if (existing) {
      existing.totalSampleSize += 1;
      existing.effectivenessScore = 
        (existing.effectivenessScore * (existing.totalSampleSize - 1) + newInsight.effectiveness) 
        / existing.totalSampleSize;
      existing.outcomes[newInsight.effectiveness >= 0.5 ? 'success' : 'failure']++;
    } else {
      this.privacyPreservingAggregation.set(patternKey, {
        patternKey,
        effectivenessScore: newInsight.effectiveness,
        totalSampleSize: 1,
        outcomes: {
          success: newInsight.effectiveness >= 0.5 ? 1 : 0,
          failure: newInsight.effectiveness < 0.5 ? 1 : 0,
          partial: newInsight.effectiveness === 0.5 ? 1 : 0
        }
      });
    }
  }

  async getInsightsForWorkflow(workflowId: string): Promise<NetworkInsight[]> {
    const patternKey = this.extractPatternKey(workflowId);
    return this.insights.get(patternKey) || [];
  }

  async getAggregatedInsights(patternKey?: string): Promise<AggregatedMetric[]> {
    if (patternKey) {
      const metric = this.privacyPreservingAggregation.get(patternKey);
      return metric ? [metric] : [];
    }
    return Array.from(this.privacyPreservingAggregation.values());
  }
}

interface AggregatedMetric {
  patternKey: string;
  effectivenessScore: number;
  totalSampleSize: number;
  outcomes: { success: number; failure: number; partial: number };
}

export class TemplateMarketplace {
  private templates: Map<string, TemplateMarketplaceItem> = new Map();
  private crossWorkerLearning: CrossWorkerLearning;

  constructor() {
    this.crossWorkerLearning = new CrossWorkerLearning();
  }

  async publishTemplate(
    template: WorkflowTemplate,
    author: { id: string; name: string; reputation: number },
    pricing: { type: 'free' | 'subscription' | 'one_time'; amount?: number } = { type: 'free' }
  ): Promise<string> {
    const item: TemplateMarketplaceItem = {
      template,
      author: { ...author, verified: author.reputation > 100 },
      stats: { downloads: 0, rating: 0, reviews: 0 },
      pricing
    };

    const templateId = `marketplace-${Date.now()}`;
    this.templates.set(templateId, item);

    return templateId;
  }

  async getTemplate(templateId: string): Promise<TemplateMarketplaceItem | null> {
    return this.templates.get(templateId) || null;
  }

  async searchTemplates(query: {
    category?: string;
    industry?: string;
    priceType?: 'free' | 'subscription' | 'one_time';
    minRating?: number;
    sortBy?: 'popular' | 'rating' | 'recent';
  }): Promise<TemplateMarketplaceItem[]> {
    let results = Array.from(this.templates.values());

    if (query.category) {
      results = results.filter(t => 
        t.template.category?.toLowerCase().includes(query.category!.toLowerCase())
      );
    }

    if (query.industry) {
      results = results.filter(t =>
        t.template.vertical?.toLowerCase().includes(query.industry!.toLowerCase())
      );
    }

    if (query.priceType) {
      results = results.filter(t => t.pricing.type === query.priceType);
    }

    if (query.minRating) {
      results = results.filter(t => t.stats.rating >= query.minRating!);
    }

    switch (query.sortBy) {
      case 'popular':
        results.sort((a, b) => b.stats.downloads - a.stats.downloads);
        break;
      case 'rating':
        results.sort((a, b) => b.stats.rating - a.stats.rating);
        break;
      case 'recent':
        results.sort((a, b) => {
          const aTime = new Date(a.template.created_at || 0).getTime();
          const bTime = new Date(b.template.created_at || 0).getTime();
          return bTime - aTime;
        });
        break;
    }

    return results;
  }

  async recordTemplateUsage(templateId: string): Promise<void> {
    const item = this.templates.get(templateId);
    if (item) {
      item.stats.downloads++;
    }
  }

  async rateTemplate(templateId: string, rating: number): Promise<void> {
    const item = this.templates.get(templateId);
    if (item) {
      const totalRatings = item.stats.reviews;
      item.stats.rating = (item.stats.rating * totalRatings + rating) / (totalRatings + 1);
      item.stats.reviews++;
    }
  }

  async suggestImprovements(templateId: string): Promise<TemplateImprovement[]> {
    const item = this.templates.get(templateId);
    if (!item) return [];

    const insights = await this.crossWorkerLearning.getAggregatedInsights();
    const improvements: TemplateImprovement[] = [];

    for (const insight of insights) {
      if (insight.effectivenessScore > 0.8 && insight.totalSampleSize > 10) {
        improvements.push({
          id: `improvement-${Date.now()}`,
          author: 'Dobly AI',
          description: `Based on ${insight.totalSampleSize} executions, consider optimizing for better effectiveness`,
          effectiveness: insight.effectivenessScore,
          approved: false
        });
      }
    }

    return improvements;
  }
}

export class ReputationSystem {
  private reputations: Map<string, UserReputation> = new Map();

  async getReputation(userId: string): Promise<UserReputation> {
    return this.reputations.get(userId) || {
      userId,
      score: 0,
      tier: 'newcomer',
      badges: [],
      totalTemplates: 0,
      totalDownloads: 0,
      avgRating: 0,
      memberSince: new Date().toISOString()
    };
  }

  async updateReputation(
    userId: string,
    update: {
      templateCreated?: boolean;
      downloadCount?: number;
      ratingReceived?: number;
      qualityBonus?: number;
    }
  ): Promise<UserReputation> {
    const reputation = await this.getReputation(userId);

    if (update.templateCreated) reputation.totalTemplates++;
    if (update.downloadCount) reputation.totalDownloads += update.downloadCount;
    if (update.ratingReceived) {
      const totalRatings = reputation.avgRating * (reputation.totalTemplates - 1);
      reputation.avgRating = (totalRatings + update.ratingReceived) / reputation.totalTemplates;
    }
    if (update.qualityBonus) reputation.score += update.qualityBonus;

    reputation.score = this.calculateScore(reputation);
    reputation.tier = this.calculateTier(reputation.score);
    reputation.badges = this.calculateBadges(reputation);

    this.reputations.set(userId, reputation);
    return reputation;
  }

  private calculateScore(reputation: UserReputation): number {
    return (
      reputation.totalTemplates * 10 +
      reputation.totalDownloads * 0.1 +
      reputation.avgRating * 50
    );
  }

  private calculateTier(score: number): UserReputation['tier'] {
    if (score > 1000) return 'expert';
    if (score > 500) return 'professional';
    if (score > 100) return 'contributor';
    return 'newcomer';
  }

  private calculateBadges(reputation: UserReputation): string[] {
    const badges: string[] = [];
    if (reputation.totalTemplates >= 10) badges.push('prolific_creator');
    if (reputation.totalDownloads >= 1000) badges.push('popular');
    if (reputation.avgRating >= 4.5) badges.push('quality_expert');
    if (reputation.totalTemplates >= 50) badges.push('master_builder');
    return badges;
  }
}

interface UserReputation {
  userId: string;
  score: number;
  tier: 'newcomer' | 'contributor' | 'professional' | 'expert';
  badges: string[];
  totalTemplates: number;
  totalDownloads: number;
  avgRating: number;
  memberSince: string;
}

export const networkEffectsSystem = {
  marketplace: new TemplateMarketplace(),
  reputation: new ReputationSystem(),
  learning: new CrossWorkerLearning()
};

export async function recordWorkflowExecution(
  workflowId: string,
  outcome: 'success' | 'failure' | 'partial',
  metrics: {
    executionTime?: number;
    stepsCompleted?: number;
    industry?: string;
  }
): Promise<void> {
  await networkEffectsSystem.learning.recordExecution(workflowId, outcome, metrics);
}

export async function getTemplateRecommendations(
  currentWorkflow: Workflow,
  limit: number = 5
): Promise<WorkflowTemplate[]> {
  const searchResults = await networkEffectsSystem.marketplace.searchTemplates({
    industry: currentWorkflow.blueprint.category,
    sortBy: 'popular'
  });

  return searchResults.slice(0, limit).map(item => item.template);
}
