import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch {
    return null;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: ApiOptions = {}
): Promise<T> {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API error: ${response.status}`);
  }

  return response.json();
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'active' | 'paused' | 'draft';
  createdAt: string;
  lastRun?: string;
}

export interface DashboardData {
  businessHealth: {
    overallScore: number;
    trend: string;
    dimensions: {
      automation: { metrics: Record<string, number>; alerts: any[] };
      efficiency: { metrics: Record<string, number>; alerts: any[] };
      reliability: { metrics: Record<string, number>; alerts: any[] };
      growth: { metrics: Record<string, number>; alerts: any[] };
    };
  };
  topWorkers: Array<{
    workerId: string;
    workflowName: string;
    executions: { total: number; successful: number; failed: number; avgDuration: number };
    reliability: number;
    lastExecution: string;
    businessImpact: { timeSaved: number; tasksAutomated: number; errorsPrevented: number };
  }>;
  recentExecutions: Array<{
    id: string;
    workflowName: string;
    status: string;
    startedAt: string;
    duration?: number;
    error?: string;
  }>;
  alerts: any[];
  costSummary: {
    totalCost: number;
    projectedMonthlyCost: number;
  };
}

export const api = {
  workflows: {
    list: () => apiRequest<Workflow[]>('/api/workflows'),
    get: (id: string) => apiRequest<Workflow>(`/api/workflows/${id}`),
    create: (data: Partial<Workflow>) => apiRequest<Workflow>('/api/workflows', { method: 'POST', body: data }),
    update: (id: string, data: Partial<Workflow>) => apiRequest<Workflow>(`/api/workflows/${id}`, { method: 'PUT', body: data }),
    delete: (id: string) => apiRequest<void>(`/api/workflows/${id}`, { method: 'DELETE' }),
    run: (id: string) => apiRequest<{ runId: string }>(`/api/workflows/${id}/run`, { method: 'POST' }),
  },

  dashboard: {
    getMetrics: () => apiRequest<DashboardData>('/api/dashboard/metrics'),
  },

  approvals: {
    list: () => apiRequest<any[]>('/api/approvals'),
    approve: (id: string) => apiRequest<void>(`/api/approvals/${id}/approve`, { method: 'POST' }),
    reject: (id: string, reason?: string) => apiRequest<void>(`/api/approvals/${id}/reject`, { method: 'POST', body: { reason } }),
  },

  notifications: {
    list: () => apiRequest<any[]>('/api/notifications'),
    markRead: (id: string) => apiRequest<void>(`/api/notifications/${id}/read`, { method: 'POST' }),
    registerToken: (token: string) => apiRequest<void>('/api/notifications/register-token', { method: 'POST', body: { token } }),
  },
};

export async function getDashboardMetrics(): Promise<DashboardData> {
  return api.dashboard.getMetrics();
}

export async function runWorkflow(workflowId: string): Promise<string> {
  const result = await api.workflows.run(workflowId);
  return result.runId;
}

export async function approveAction(approvalId: string): Promise<void> {
  return api.approvals.approve(approvalId);
}

export async function rejectAction(approvalId: string, reason?: string): Promise<void> {
  return api.approvals.reject(approvalId, reason);
}