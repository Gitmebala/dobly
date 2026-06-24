// Business Health Dashboard and Analytics for Dobly AI Workers
// Unified view of all AI worker performance and business vital signs

export interface BusinessHealthMetrics {
  overallScore: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: string;
  dimensions: {
    automation: DimensionMetrics;
    efficiency: DimensionMetrics;
    reliability: DimensionMetrics;
    growth: DimensionMetrics;
  };
}

export interface DimensionMetrics {
  score: number;
  metrics: Record<string, number>;
  recentTrend: { date: string; value: number }[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'performance' | 'cost' | 'reliability' | 'opportunity';
  message: string;
  suggestedAction?: string;
  createdAt: string;
}

export interface WorkerPerformanceMetrics {
  workerId: string;
  workflowName: string;
  executions: {
    total: number;
    successful: number;
    failed: number;
    avgDuration: number;
  };
  reliability: number;
  lastExecution: string;
  nextScheduled?: string;
  costPerExecution?: number;
  businessImpact: {
    timeSaved: number;
    tasksAutomated: number;
    errorsPrevented: number;
  };
}

export interface CostAnalytics {
  period: { start: string; end: string };
  totalCost: number;
  costByWorkflow: Record<string, number>;
  costByConnector: Record<string, number>;
  projectedMonthlyCost: number;
  costOptimizationSuggestions: CostSuggestion[];
}

export interface CostSuggestion {
  id: string;
  workflowId: string;
  potentialSavings: number;
  description: string;
  impact: 'high' | 'medium' | 'low';
}

export interface DashboardData {
  businessHealth: BusinessHealthMetrics;
  topWorkers: WorkerPerformanceMetrics[];
  recentExecutions: ExecutionSummary[];
  alerts: Alert[];
  costSummary: CostAnalytics;
}

export interface ExecutionSummary {
  id: string;
  workflowName: string;
  status: 'success' | 'failed' | 'running';
  startedAt: string;
  duration?: number;
  error?: string;
}

export class BusinessHealthDashboard {
  private workerMetrics: Map<string, WorkerPerformanceMetrics> = new Map();
  private executionHistory: ExecutionSummary[] = [];
  private alerts: Alert[] = [];

  async getDashboardData(userId: string): Promise<DashboardData> {
    const businessHealth = await this.calculateBusinessHealth();
    const topWorkers = await this.getTopPerformers(userId);
    const costSummary = await this.calculateCostAnalytics();

    return {
      businessHealth,
      topWorkers,
      recentExecutions: this.executionHistory.slice(0, 10),
      alerts: this.alerts,
      costSummary
    };
  }

  async calculateBusinessHealth(): Promise<BusinessHealthMetrics> {
    const workers = Array.from(this.workerMetrics.values());

    const automationScore = workers.length > 0
      ? Math.min(100, workers.length * 10)
      : 0;

    const avgReliability = workers.length > 0
      ? workers.reduce((sum, w) => sum + w.reliability, 0) / workers.length
      : 100;

    const efficiencyScore = avgReliability * 0.7 + (100 - avgReliability) * 0.3;

    const growthScore = await this.calculateGrowthScore();

    const overallScore = Math.round(
      automationScore * 0.3 +
      efficiencyScore * 0.3 +
      avgReliability * 0.2 +
      growthScore * 0.2
    );

    return {
      overallScore,
      trend: this.calculateTrend(),
      lastUpdated: new Date().toISOString(),
      dimensions: {
        automation: {
          score: automationScore,
          metrics: {
            activeWorkers: workers.length,
            workflowsEnabled: workers.length
          },
          recentTrend: this.generateTrendData(automationScore),
          alerts: this.getAutomationAlerts(workers.length)
        },
        efficiency: {
          score: efficiencyScore,
          metrics: {
            avgReliability,
            avgDuration: workers.length > 0
              ? workers.reduce((sum, w) => sum + w.executions.avgDuration, 0) / workers.length
              : 0
          },
          recentTrend: this.generateTrendData(efficiencyScore),
          alerts: []
        },
        reliability: {
          score: avgReliability,
          metrics: {
            successRate: workers.length > 0
              ? workers.reduce((sum, w) => sum + (w.executions.successful / w.executions.total * 100), 0) / workers.length
              : 100,
            failureRate: workers.length > 0
              ? workers.reduce((sum, w) => sum + (w.executions.failed / w.executions.total * 100), 0) / workers.length
              : 0
          },
          recentTrend: this.generateTrendData(avgReliability),
          alerts: this.getReliabilityAlerts(workers)
        },
        growth: {
          score: growthScore,
          metrics: {
            weeklyExecutions: this.executionHistory.length,
            automationAdoption: Math.min(100, workers.length * 5)
          },
          recentTrend: this.generateTrendData(growthScore),
          alerts: []
        }
      }
    };
  }

  private async calculateGrowthScore(): Promise<number> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const thisWeekCount = this.executionHistory.filter(
      e => new Date(e.startedAt) >= weekAgo
    ).length;

    const lastWeekCount = this.executionHistory.filter(
      e => new Date(e.startedAt) >= twoWeeksAgo && new Date(e.startedAt) < weekAgo
    ).length;

    if (lastWeekCount === 0) return thisWeekCount > 0 ? 80 : 50;

    const growthRate = ((thisWeekCount - lastWeekCount) / lastWeekCount) * 100;
    return Math.min(100, Math.max(0, 50 + growthRate));
  }

  private calculateTrend(): 'improving' | 'stable' | 'declining' {
    return 'stable';
  }

  private generateTrendData(currentValue: number): { date: string; value: number }[] {
    const trend: { date: string; value: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const variance = (Math.random() - 0.5) * 10;
      trend.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(0, Math.min(100, currentValue + variance + (6 - i) * 2))
      });
    }
    return trend;
  }

  private getAutomationAlerts(workerCount: number): Alert[] {
    const alerts: Alert[] = [];
    if (workerCount < 3) {
      alerts.push({
        id: `alert-automation-${Date.now()}`,
        severity: 'info',
        category: 'opportunity',
        message: 'Consider adding more automation workers to maximize time savings',
        createdAt: new Date().toISOString()
      });
    }
    return alerts;
  }

  private getReliabilityAlerts(workers: WorkerPerformanceMetrics[]): Alert[] {
    const alerts: Alert[] = [];
    const failingWorkers = workers.filter(w => w.reliability < 80);

    for (const worker of failingWorkers) {
      alerts.push({
        id: `alert-reliability-${worker.workerId}`,
        severity: 'warning',
        category: 'reliability',
        message: `${worker.workflowName} has ${worker.executions.failed} failed executions`,
        suggestedAction: 'Review error logs and adjust workflow parameters',
        createdAt: new Date().toISOString()
      });
    }

    return alerts;
  }

  async getTopPerformers(userId: string, limit: number = 5): Promise<WorkerPerformanceMetrics[]> {
    const workers = Array.from(this.workerMetrics.values());
    return workers
      .sort((a, b) => b.reliability - a.reliability)
      .slice(0, limit);
  }

  async recordExecution(summary: ExecutionSummary): Promise<void> {
    this.executionHistory.unshift(summary);
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(0, 100);
    }

    const worker = this.workerMetrics.get(summary.workflowName);
    if (worker) {
      worker.executions.total++;
      if (summary.status === 'success') {
        worker.executions.successful++;
      } else if (summary.status === 'failed') {
        worker.executions.failed++;
      }
      worker.lastExecution = summary.startedAt;
      worker.reliability = (worker.executions.successful / worker.executions.total) * 100;
    }
  }

  async calculateCostAnalytics(): Promise<CostAnalytics> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const recentExecutions = this.executionHistory.filter(
      e => new Date(e.startedAt) >= weekAgo
    );

    const totalCost = recentExecutions.length * 0.01;

    return {
      period: {
        start: weekAgo.toISOString(),
        end: now.toISOString()
      },
      totalCost,
      costByWorkflow: {},
      costByConnector: {},
      projectedMonthlyCost: totalCost * 4.33,
      costOptimizationSuggestions: []
    };
  }

  async addWorkerMetrics(metrics: WorkerPerformanceMetrics): Promise<void> {
    this.workerMetrics.set(metrics.workerId, metrics);
  }

  async dismissAlert(alertId: string): Promise<boolean> {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index >= 0) {
      this.alerts.splice(index, 1);
      return true;
    }
    return false;
  }
}

export const businessHealthDashboard = new BusinessHealthDashboard();

export async function getDashboardMetrics(userId: string): Promise<DashboardData> {
  return businessHealthDashboard.getDashboardData(userId);
}

export async function getWorkerMetrics(workerId: string): Promise<WorkerPerformanceMetrics | null> {
  return null;
}

export async function exportMetricsReport(
  userId: string,
  format: 'json' | 'csv' = 'json'
): Promise<string> {
  const data = await businessHealthDashboard.getDashboardData(userId);

  if (format === 'json') {
    return JSON.stringify(data, null, 2);
  }

  return '';
}