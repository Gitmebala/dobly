import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface WorkflowRun {
  id: string;
  workflowId: string;
  workflowName: string;
  status: 'pending' | 'running' | 'success' | 'failed';
  triggerType: 'manual' | 'schedule' | 'webhook' | 'event';
  startedAt: string;
  finishedAt?: string;
  errorMessage?: string;
  stepsCompleted: number;
  totalSteps: number;
  requiresApproval?: boolean;
  approvalMessage?: string;
}

export interface Worker {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'paused' | 'error';
  lastRun?: string;
  reliability: number;
  executionsToday: number;
  timeSaved: number;
}

export interface Notification {
  id: string;
  type: 'approval' | 'completion' | 'failure' | 'alert' | 'insight';
  title: string;
  body: string;
  workflowId?: string;
  runId?: string;
  createdAt: string;
  read: boolean;
  actionUrl?: string;
}

export interface BusinessHealth {
  score: number;
  trend: 'up' | 'down' | 'stable';
  activeWorkers: number;
  tasksToday: number;
  timeSavedToday: number;
  pendingApprovals: number;
}

interface AppState {
  workers: Worker[];
  recentRuns: WorkflowRun[];
  notifications: Notification[];
  businessHealth: BusinessHealth;
  apiKey: string | null;
  notificationsEnabled: boolean;
  soundEnabled: boolean;
  autoApproveMinor: boolean;
  
  setWorkers: (workers: Worker[]) => void;
  addWorker: (worker: Worker) => void;
  updateWorkerStatus: (id: string, status: Worker['status']) => void;
  
  addRun: (run: WorkflowRun) => void;
  updateRun: (id: string, updates: Partial<WorkflowRun>) => void;
  clearRuns: () => void;
  
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  
  setBusinessHealth: (health: BusinessHealth) => void;
  setApiKey: (key: string | null) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setAutoApproveMinor: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      workers: [],
      recentRuns: [],
      notifications: [],
      businessHealth: {
        score: 0,
        trend: 'stable',
        activeWorkers: 0,
        tasksToday: 0,
        timeSavedToday: 0,
        pendingApprovals: 0,
      },
      apiKey: null,
      notificationsEnabled: true,
      soundEnabled: true,
      autoApproveMinor: false,

      setWorkers: (workers) => set({ workers }),
      addWorker: (worker) => set((state) => ({ workers: [worker, ...state.workers] })),
      updateWorkerStatus: (id, status) =>
        set((state) => ({
          workers: state.workers.map((w) => (w.id === id ? { ...w, status } : w)),
        })),

      addRun: (run) =>
        set((state) => ({
          recentRuns: [run, ...state.recentRuns].slice(0, 50),
        })),
      updateRun: (id, updates) =>
        set((state) => ({
          recentRuns: state.recentRuns.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        })),
      clearRuns: () => set({ recentRuns: [] }),

      addNotification: (notification) =>
        set((state) => ({
          notifications: [notification, ...state.notifications].slice(0, 100),
        })),
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      clearNotifications: () => set({ notifications: [] }),

      setBusinessHealth: (health) => set({ businessHealth: health }),
      setApiKey: (key) => set({ apiKey: key }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setAutoApproveMinor: (enabled) => set({ autoApproveMinor: enabled }),
    }),
    {
      name: 'dobly-mobile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        apiKey: state.apiKey,
        notificationsEnabled: state.notificationsEnabled,
        soundEnabled: state.soundEnabled,
        autoApproveMinor: state.autoApproveMinor,
      }),
    }
  )
);