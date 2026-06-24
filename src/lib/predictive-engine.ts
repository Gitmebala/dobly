// Predictive Work Initiation System for Dobly AI Workers
// Anticipates needs before they're expressed and prepares resources proactively

import type { Workflow } from '@/types/index';

export interface PredictionContext {
  userId: string;
  workflowId: string;
  currentTime: Date;
  recentActivity?: ActivitySummary[];
  businessContext?: BusinessContext;
}

export interface ActivitySummary {
  action: string;
  timestamp: Date;
  workflowId?: string;
  outcome?: 'success' | 'failure';
}

export interface BusinessContext {
  industry?: string;
  teamSize?: number;
  businessHours?: { start: string; end: string };
  timezone?: string;
  peakHours?: string[];
}

export interface PredictedNeed {
  id: string;
  type: 'preparation' | 'preemptive_action' | 'scheduled_task' | 'pattern_based';
  confidence: number;
  suggestedWorkflow: Partial<Workflow>;
  reason: string;
  urgency: 'low' | 'medium' | 'high';
  estimatedImpact: string;
}

export interface ScheduledTask {
  id: string;
  workflowId: string;
  schedule: CronExpression;
  lastRun?: Date;
  nextRun?: Date;
  enabled: boolean;
}

export interface CronExpression {
  minute?: string;
  hour?: string;
  dayOfMonth?: string;
  month?: string;
  dayOfWeek?: string;
}

export class PredictiveEngine {
  private predictionHistory: Map<string, PredictedNeed[]> = new Map();
  private activityPatterns: Map<string, ActivityPattern> = new Map();
  private scheduledTasks: Map<string, ScheduledTask> = new Map();

  async predictNeeds(context: PredictionContext): Promise<PredictedNeed[]> {
    const predictions: PredictedNeed[] = [];

    const scheduledPrediction = await this.checkScheduledTasks(context);
    if (scheduledPrediction) predictions.push(scheduledPrediction);

    const patternPrediction = await this.predictFromPatterns(context);
    if (patternPrediction) predictions.push(patternPrediction);

    const contextualPrediction = await this.predictFromContext(context);
    if (contextualPrediction) predictions.push(contextualPrediction);

    this.predictionHistory.set(context.userId, predictions);

    return predictions.sort((a, b) => {
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      const urgencyOrder = { high: 0, medium: 1, low: 2 };
      return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
    });
  }

  private async checkScheduledTasks(context: PredictionContext): Promise<PredictedNeed | null> {
    const tasks = Array.from(this.scheduledTasks.values()).filter(
      task => task.enabled && this.isTaskDue(task, context.currentTime)
    );

    if (tasks.length === 0) return null;

    const task = tasks[0];
    return {
      id: `scheduled-${task.id}`,
      type: 'scheduled_task',
      confidence: 0.95,
      suggestedWorkflow: { id: task.workflowId },
      reason: `Scheduled task ${task.schedule.minute || ''} ${task.schedule.hour || ''}`,
      urgency: 'high',
      estimatedImpact: 'Automated execution will save approximately 15 minutes of manual work'
    };
  }

  private isTaskDue(task: ScheduledTask, currentTime: Date): boolean {
    if (!task.schedule.hour || !task.schedule.minute) return false;

    const now = new Date(currentTime);
    const hour = task.schedule.hour === '*' ? true : now.getHours() === parseInt(task.schedule.hour);
    const minute = task.schedule.minute === '*' ? true : now.getMinutes() === parseInt(task.schedule.minute);

    return hour && minute;
  }

  private async predictFromPatterns(context: PredictionContext): Promise<PredictedNeed | null> {
    const pattern = this.activityPatterns.get(context.userId);
    if (!pattern || pattern.sequences.length < 3) return null;

    const lastActivity = context.recentActivity?.[0];
    if (!lastActivity) return null;

    const nextInSequence = this.predictNextActivity(pattern, lastActivity);
    if (!nextInSequence) return null;

    return {
      id: `pattern-${Date.now()}`,
      type: 'pattern_based',
      confidence: pattern.accuracy,
      suggestedWorkflow: nextInSequence.suggestedWorkflow,
      reason: `Based on your pattern: "${pattern.sequences[pattern.sequences.length - 1]}" typically follows "${lastActivity.action}"`,
      urgency: nextInSequence.urgency,
      estimatedImpact: 'Following established workflow reduces setup time by 70%'
    };
  }

  private predictNextActivity(
    pattern: ActivityPattern,
    lastActivity: ActivitySummary
  ): { suggestedWorkflow: Partial<Workflow>; urgency: 'low' | 'medium' | 'high' } | null {
    for (const sequence of pattern.sequences) {
      if (sequence.follows === lastActivity.action) {
        return {
          suggestedWorkflow: sequence.triggersWorkflow ? { id: sequence.triggersWorkflow } : {},
          urgency: sequence.urgency
        };
      }
    }
    return null;
  }

  private async predictFromContext(context: PredictionContext): Promise<PredictedNeed | null> {
    const hour = context.currentTime.getHours();
    const dayOfWeek = context.currentTime.getDay();

    if (dayOfWeek === 1 && hour === 9) {
      return {
        id: `context-monday-morning-${Date.now()}`,
        type: 'preemptive_action',
        confidence: 0.85,
        suggestedWorkflow: { title: 'Weekly Planning Workflow' },
        reason: 'Monday morning planning typically improves weekly productivity by 25%',
        urgency: 'medium',
        estimatedImpact: 'Proactive planning improves team alignment and reduces meeting time'
      };
    }

    if (context.businessContext?.peakHours) {
      const isPeakHour = context.businessContext.peakHours.includes(`${hour}:00`);
      if (isPeakHour) {
        return {
          id: `context-peak-prep-${Date.now()}`,
          type: 'preparation',
          confidence: 0.75,
          suggestedWorkflow: { title: 'Peak Hour Preparation' },
          reason: 'Preparing resources before peak hours reduces response time by 40%',
          urgency: 'low',
          estimatedImpact: 'Faster response times during busy period improves customer satisfaction'
        };
      }
    }

    return null;
  }

  async recordActivity(userId: string, activity: ActivitySummary): Promise<void> {
    let pattern = this.activityPatterns.get(userId);
    if (!pattern) {
      pattern = { sequences: [], accuracy: 0.5 };
      this.activityPatterns.set(userId, pattern);
    }

    const lastActivity = this.getLastActivity(userId);
    if (lastActivity && lastActivity.action !== activity.action) {
      pattern.sequences.push({
        triggers: lastActivity.action,
        follows: lastActivity.action,
        triggersWorkflow: activity.workflowId,
        frequency: 1,
        urgency: 'medium'
      });
    }

    if (pattern.sequences.length > 0) {
      pattern.accuracy = Math.min(0.95, pattern.accuracy + 0.05);
    }
  }

  private getLastActivity(userId: string): ActivitySummary | null {
    return null;
  }

  async scheduleTask(
    userId: string,
    workflowId: string,
    schedule: CronExpression
  ): Promise<string> {
    const taskId = `task-${Date.now()}`;
    this.scheduledTasks.set(taskId, {
      id: taskId,
      workflowId,
      schedule,
      enabled: true,
      lastRun: undefined,
      nextRun: this.calculateNextRun(schedule)
    });
    return taskId;
  }

  private calculateNextRun(schedule: CronExpression): Date {
    const now = new Date();
    const next = new Date(now);

    if (schedule.hour) {
      next.setHours(parseInt(schedule.hour), parseInt(schedule.minute || '0'), 0, 0);
      if (next <= now) next.setDate(next.getDate() + 1);
    }

    return next;
  }

  async cancelScheduledTask(taskId: string): Promise<boolean> {
    return this.scheduledTasks.delete(taskId);
  }
}

interface ActivityPattern {
  sequences: Array<{
    triggers: string;
    follows: string;
    triggersWorkflow?: string;
    frequency: number;
    urgency: 'low' | 'medium' | 'high';
  }>;
  accuracy: number;
}

export const predictiveEngine = new PredictiveEngine();

export async function getPredictedNeeds(
  userId: string,
  workflowId: string
): Promise<PredictedNeed[]> {
  const context: PredictionContext = {
    userId,
    workflowId,
    currentTime: new Date()
  };

  return predictiveEngine.predictNeeds(context);
}

export async function recordUserActivity(
  userId: string,
  action: string,
  workflowId?: string
): Promise<void> {
  await predictiveEngine.recordActivity(userId, {
    action,
    timestamp: new Date(),
    workflowId
  });
}
