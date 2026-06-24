import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { ThemePreference } from '../theme';

// Types matching the web app
export interface User {
  id: string;
  email: string;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  status: 'draft' | 'active' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface WorkflowRun {
  id: string;
  workflow_id: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  started_at: string;
  finished_at?: string;
}

export interface Approval {
  id: string;
  workflow_id: string;
  requested_at: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Connection {
  id: string;
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
}

export interface Coworker {
  id: string;
  role: string;
  name: string;
  mission: string;
  desk: string;
  status: 'draft' | 'active' | 'paused' | 'archived';
  deployment_state: 'draft' | 'simulated' | 'shadow' | 'guarded_live' | 'delegated_live';
  health_score: number;
  trust_score: number;
  value_score: number;
  created_at: string;
  updated_at: string;
}

export interface Escalation {
  id: string;
  coworker_id: string;
  escalation_type: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'modified' | 'escalated_further';
  trust_level_at_time: number;
  created_at: string;
}

export interface Signal {
  id: string;
  coworker_id: string | null;
  signal_type: string;
  title: string;
  description: string;
  confidence: number;
  impact_level: 'low' | 'medium' | 'high' | 'critical' | null;
  status: 'new' | 'acknowledged' | 'in_progress' | 'resolved' | 'dismissed';
  detected_at: string;
}

export interface Briefing {
  id: string;
  briefing_type: 'morning' | 'evening' | 'risk_digest' | 'opportunity' | 'weekly_summary';
  business_status: string;
  what_happened: any[];
  what_matters: any[];
  dobly_recommendations: any[];
  needs_decision: any[];
  opportunities: any[];
  risks: any[];
  created_at: string;
  read_at: string | null;
}

export interface WorkspaceSnapshot {
  corePromise: string;
  focusReason: string;
  businessStatus: string;
  departments: Array<{
    id: string;
    name: string;
    status: 'quiet' | 'active' | 'needs_attention';
    activeWorkers: number;
    openTasks: number;
    latestEvent: string | null;
  }>;
  metrics: {
    activeSystems: number;
    waitingApprovals: number;
    pendingSignals: number;
    recentEvents?: number;
    integrationsNeedingAttention?: number;
  };
  whatNeedsAttention: string[];
  whatHappened: any[];
  doblyRecommendations: any[];
  needsDecision: any[];
  opportunities: any[];
  risks: any[];
}

interface AppState {
  user: User | null;
  isLoading: boolean;
  workflows: Workflow[];
  runs: WorkflowRun[];
  approvals: Approval[];
  connections: Connection[];
  coworkers: Coworker[];
  escalations: Escalation[];
  signals: Signal[];
  briefings: Briefing[];
  snapshot: WorkspaceSnapshot | null;
  themePreference: ThemePreference;
  
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setWorkflows: (workflows: Workflow[]) => void;
  setRuns: (runs: WorkflowRun[]) => void;
  setApprovals: (approvals: Approval[]) => void;
  setConnections: (connections: Connection[]) => void;
  setCoworkers: (coworkers: Coworker[]) => void;
  setEscalations: (escalations: Escalation[]) => void;
  setSignals: (signals: Signal[]) => void;
  setBriefings: (briefings: Briefing[]) => void;
  setSnapshot: (snapshot: WorkspaceSnapshot | null) => void;
  setThemePreference: (themePreference: ThemePreference) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  isLoading: true,
  workflows: [],
  runs: [],
  approvals: [],
  connections: [],
  coworkers: [],
  escalations: [],
  signals: [],
  briefings: [],
  snapshot: null,
  themePreference: 'system',
  
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
  setWorkflows: (workflows) => set({ workflows }),
  setRuns: (runs) => set({ runs }),
  setApprovals: (approvals) => set({ approvals }),
  setConnections: (connections) => set({ connections }),
  setCoworkers: (coworkers) => set({ coworkers }),
  setEscalations: (escalations) => set({ escalations }),
  setSignals: (signals) => set({ signals }),
  setBriefings: (briefings) => set({ briefings }),
  setSnapshot: (snapshot) => set({ snapshot }),
  setThemePreference: (themePreference) => set({ themePreference }),
  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ user: null, workflows: [], runs: [], approvals: [], connections: [], coworkers: [], escalations: [], signals: [], briefings: [], snapshot: null, themePreference: 'system' });
  },
}));
