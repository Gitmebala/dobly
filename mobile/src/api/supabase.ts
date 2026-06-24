import { createClient, SupabaseClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { useAppStore, type User, type Workflow, type WorkflowRun, type Approval, type Connection } from '../store/app';

const OFFICE_DEPARTMENTS = [
  { id: 'reception', name: 'Reception' },
  { id: 'marketing', name: 'Marketing' },
  { id: 'sales', name: 'Sales' },
  { id: 'finance', name: 'Finance' },
  { id: 'support', name: 'Support' },
  { id: 'operations', name: 'Operations' },
  { id: 'admin', name: 'Admin' },
  { id: 'projects', name: 'Projects' },
  { id: 'hr', name: 'HR' },
  { id: 'growth', name: 'Growth' },
  { id: 'analytics', name: 'Analytics' },
  { id: 'compliance', name: 'Compliance' },
  { id: 'integrations', name: 'Integrations' },
  { id: 'training_room', name: 'Training Room' },
  { id: 'filing_cabinet', name: 'Filing Cabinet' },
  { id: 'general_manager', name: 'General Manager' },
  { id: 'boardroom', name: 'Boardroom' },
] as const;

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
  }

  if (!supabase) {
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: {
          getItem: async (key: string) => {
            const value = await SecureStore.getItemAsync(key);
            return value ?? null;
          },
          setItem: async (key: string, value: string) => {
            await SecureStore.setItemAsync(key, value);
          },
          removeItem: async (key: string) => {
            await SecureStore.deleteItemAsync(key);
          },
        },
      },
    });
  }
  return supabase;
}

// Auth
export async function signIn(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (data.user) {
    useAppStore.getState().setUser(data.user as User);
  }
  return data.user;
}

export async function signUp(email: string, password: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  const supabase = getSupabase();
  await supabase.auth.signOut();
  useAppStore.getState().logout();
}

export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  useAppStore.getState().setUser(user as User);
  return user as User;
}

// Workflows
export async function fetchWorkflows() {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('workflows')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
    
  if (error) throw error;
  useAppStore.getState().setWorkflows(data as Workflow[]);
  return data as Workflow[];
}

export async function fetchWorkflowRuns(limit = 20) {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('workflow_runs')
    .select('*')
    .eq('user_id', user.id)
    .order('started_at', { ascending: false })
    .limit(limit);
    
  if (error) throw error;
  useAppStore.getState().setRuns(data as WorkflowRun[]);
  return data as WorkflowRun[];
}

export async function fetchApprovals() {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('approvals')
    .select('*')
    .eq('user_id', user.id)
    .order('requested_at', { ascending: false });
    
  if (error) throw error;
  useAppStore.getState().setApprovals(data as Approval[]);
  return data as Approval[];
}

export async function fetchConnections() {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;
  if (!user) return [];
  
  const { data, error } = await supabase
    .from('connections')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
    
  if (error) throw error;
  useAppStore.getState().setConnections(data as Connection[]);
  return data as Connection[];
}

// Build workspace snapshot from data (matching web app logic)
export async function fetchWorkspaceSnapshot() {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;

  if (!user) {
    return null;
  }

  try {
    const [eventsResult, tasksResult, workersResult, signalsResult, connectionsResult] = await Promise.all([
      supabase
        .from('office_events')
        .select('*')
        .eq('user_id', user.id)
        .order('occurred_at', { ascending: false })
        .limit(40),
      supabase
        .from('office_tasks')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['queued', 'running', 'waiting_approval', 'failed'])
        .order('created_at', { ascending: false })
        .limit(40),
      supabase
        .from('office_workers')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['active', 'shadow'])
        .order('updated_at', { ascending: false }),
      supabase
        .from('signals')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['new', 'acknowledged', 'in_progress'])
        .limit(10),
      supabase
        .from('connections')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['expired', 'error'])
        .limit(10),
    ]);

    if (!eventsResult.error && !tasksResult.error && !workersResult.error) {
      const events = eventsResult.data || [];
      const tasks = tasksResult.data || [];
      const workers = workersResult.data || [];
      const signals = signalsResult.data || [];
      const connections = connectionsResult.data || [];
      const waitingApproval = tasks.filter((task: any) => task.status === 'waiting_approval');
      const failedTasks = tasks.filter((task: any) => task.status === 'failed');
      const highSignals = signals.filter((signal: any) =>
        ['high', 'critical'].includes(String(signal.impact_level || signal.severity || '')),
      );

      const whatNeedsAttention = [
        ...waitingApproval.slice(0, 4).map((task: any) => String(task.title || 'Action needs approval')),
        ...failedTasks.slice(0, 3).map((task: any) => String(task.title || 'Worker task failed')),
        ...highSignals.slice(0, 3).map((signal: any) => String(signal.title || 'High priority signal')),
        ...connections.slice(0, 3).map((connection: any) => `${String(connection.provider)} connection needs attention`),
      ];

      const snapshot = {
        corePromise: `${workers.length} office workers active`,
        focusReason:
          whatNeedsAttention[0] ||
          events[0]?.summary ||
          events[0]?.title ||
          'Dobly is watching conversations, content, money, and operations.',
        businessStatus:
          whatNeedsAttention.length > 3
            ? 'Business needs attention'
            : whatNeedsAttention.length > 0
              ? 'Business has items to review'
              : 'Business is running',
        departments: OFFICE_DEPARTMENTS.map((department) => {
          const departmentEvents = events.filter((event: any) => event.department_id === department.id);
          const departmentTasks = tasks.filter((task: any) => task.department_id === department.id);
          const departmentWorkers = workers.filter((worker: any) => worker.department_id === department.id);
          const needsAttention =
            departmentTasks.some((task: any) => ['waiting_approval', 'failed'].includes(String(task.status))) ||
            departmentEvents.some((event: any) => ['high', 'critical'].includes(String(event.risk_level)));

          return {
            id: department.id,
            name: department.name,
            status: (needsAttention
              ? 'needs_attention'
              : departmentEvents.length || departmentWorkers.length
                ? 'active'
                : 'quiet') as 'quiet' | 'active' | 'needs_attention',
            activeWorkers: departmentWorkers.length,
            openTasks: departmentTasks.length,
            latestEvent: departmentEvents[0]?.title || null,
          };
        }),
        metrics: {
          activeSystems: workers.length,
          waitingApprovals: waitingApproval.length,
          pendingSignals: signals.length,
          recentEvents: events.length,
          integrationsNeedingAttention: connections.length,
        },
        whatNeedsAttention,
        whatHappened: events.slice(0, 8).map((event: any) => event.summary || event.title).filter(Boolean),
        doblyRecommendations: [],
        needsDecision: waitingApproval,
        opportunities: signals.filter((signal: any) =>
          /growth|demand|opportunity/i.test(String(signal.signal_type || signal.title || '')),
        ),
        risks: [...highSignals, ...failedTasks].slice(0, 8),
      };

      useAppStore.getState().setSnapshot(snapshot);
      useAppStore.getState().setCoworkers(
        workers.map((worker: any) => ({
          id: worker.id,
          role: worker.runtime_kind,
          name: worker.name,
          mission: worker.mission,
          desk: worker.department_id,
          status: worker.status === 'shadow' ? 'active' : worker.status,
          deployment_state: worker.status === 'shadow' ? 'shadow' : 'guarded_live',
          health_score: Number(worker.health_score || 0.5),
          trust_score: Number(worker.trust_score || 0.5),
          value_score: 0.5,
          created_at: worker.created_at,
          updated_at: worker.updated_at,
        })),
      );
      useAppStore.getState().setEscalations(waitingApproval as any[]);
      useAppStore.getState().setSignals(signals as any[]);

      return snapshot;
    }
  } catch {
    // Fall through to the older Dobly tables while the office schema is being applied.
  }
  
  // Fetch briefings
  const { data: briefings, error: briefingsError } = await supabase
    .from('briefings')
    .select('*')
    .eq('briefing_type', 'morning')
    .order('created_at', { ascending: false })
    .limit(1);

  if (briefingsError && briefingsError.code !== 'PGRST116') throw briefingsError;

  // Fetch coworkers
  const { data: coworkers, error: coworkersError } = await supabase
    .from('coworkers')
    .select('*')
    .eq('status', 'active')
    .order('updated_at', { ascending: false });

  if (coworkersError) throw coworkersError;

  // Fetch escalations
  const { data: escalations, error: escalationsError } = await supabase
    .from('escalations')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(10);

  if (escalationsError) throw escalationsError;

  // Fetch signals
  const { data: signals, error: signalsError } = await supabase
    .from('signals')
    .select('*')
    .in('status', ['new', 'acknowledged', 'in_progress'])
    .order('detected_at', { ascending: false })
    .limit(10);

  if (signalsError) throw signalsError;

  const latestBriefing = briefings?.[0];
  
  const snapshot = {
    corePromise: `${coworkers?.length || 0} office workers active`,
    departments: [],
    whatNeedsAttention: latestBriefing?.what_matters as string[] || [
      'Customer Desk answered 14 enquiries and booked 3 appointments before 9:40 AM.',
      'Finance Desk recovered one overdue payment and queued one discount decision for review.',
      'Growth Desk noticed repeat demand for a service you do not currently sell.',
    ],
    whatHappened: latestBriefing?.what_happened as string[] || [],
    doblyRecommendations: latestBriefing?.dobly_recommendations as any[] || [],
    needsDecision: latestBriefing?.needs_decision as any[] || [],
    opportunities: latestBriefing?.opportunities as any[] || [],
    risks: latestBriefing?.risks as any[] || [],
    businessStatus: latestBriefing?.business_status || 'Business is okay',
    metrics: {
      activeSystems: coworkers?.length || 0,
      waitingApprovals: escalations?.length || 0,
      pendingSignals: signals?.length || 0,
      recentEvents: 0,
      integrationsNeedingAttention: 0,
    },
    focusReason: latestBriefing?.what_happened?.[0] as string ||
      'Dobly is holding the line on customer replies, payment follow-up, and internal coordination.',
  };

  useAppStore.getState().setSnapshot(snapshot);
  useAppStore.getState().setCoworkers(coworkers || []);
  useAppStore.getState().setEscalations(escalations || []);
  useAppStore.getState().setSignals(signals || []);

  return snapshot;
}

export async function decideOfficeTask(taskId: string, decision: 'approved' | 'rejected' | 'cancelled') {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;

  if (!user) {
    throw new Error('No authenticated user');
  }

  const nextStatus = decision === 'approved' ? 'queued' : 'cancelled';
  const { data, error } = await supabase
    .from('office_tasks')
    .update({
      status: nextStatus,
      decision_note: null,
      decided_at: new Date().toISOString(),
    })
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('office_events').insert({
    user_id: user.id,
    workspace_id: (data as any).workspace_id ?? null,
    department_id: (data as any).department_id,
    worker_kind: (data as any).runtime_kind ?? 'system',
    event_type: decision === 'approved' ? 'worker.action_approved' : 'worker.action_rejected',
    source: 'mobile.owner_decision',
    entity_type: 'office_task',
    entity_id: taskId,
    title: `${decision === 'approved' ? 'Approved' : 'Rejected'}: ${(data as any).title}`,
    summary: null,
    payload: { taskId, decision },
    risk_level: (data as any).risk_level ?? 'medium',
  });

  return data;
}

export async function runOfficeTask(taskId: string) {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;

  if (!user) {
    throw new Error('No authenticated user');
  }

  const { data: task, error: taskError } = await supabase
    .from('office_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('user_id', user.id)
    .single();

  if (taskError) throw taskError;

  await supabase
    .from('office_tasks')
    .update({ status: 'running', started_at: new Date().toISOString(), last_error: null })
    .eq('id', taskId)
    .eq('user_id', user.id);

  const toolName = String((task as any).tool_name || '');
  const result = {
    mode: toolName ? 'mobile_external_dispatch_recorded' : 'mobile_internal_action',
    toolName: toolName || null,
    message: toolName
      ? 'Mobile recorded the execution request. Web runtime can perform webhook-backed external execution.'
      : 'Mobile completed the internal Homebase task.',
    executedAt: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('office_tasks')
    .update({
      status: 'completed',
      completed_at: new Date().toISOString(),
      result,
    })
    .eq('id', taskId)
    .eq('user_id', user.id)
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('office_events').insert({
    user_id: user.id,
    workspace_id: (task as any).workspace_id ?? null,
    department_id: (task as any).department_id,
    worker_kind: (task as any).runtime_kind ?? 'system',
    event_type: 'worker.action_executed',
    source: 'mobile.office_runtime',
    entity_type: 'office_task',
    entity_id: taskId,
    title: `Executed: ${(task as any).title}`,
    summary: result.message,
    payload: { taskId, result },
    risk_level: (task as any).risk_level ?? 'medium',
  });

  return data;
}

export async function createGeneralManagerBriefing() {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;
  const snapshot = useAppStore.getState().snapshot;

  if (!user) {
    throw new Error('No authenticated user');
  }

  const priorities = snapshot?.whatNeedsAttention?.slice(0, 5) || [];
  const decisions = ((snapshot?.needsDecision as any[]) || []).slice(0, 5);
  const risks = ((snapshot?.risks as any[]) || []).slice(0, 5);

  const payload = {
    kind: 'general_manager_briefing',
    generatedAt: new Date().toISOString(),
    businessStatus: snapshot?.businessStatus || 'Business is running',
    focusReason: snapshot?.focusReason || priorities[0] || 'Dobly is watching the office.',
    priorities,
    decisions,
    risks,
    metrics: snapshot?.metrics || {},
  };

  const { data, error } = await supabase
    .from('office_events')
    .insert({
      user_id: user.id,
      department_id: 'general_manager',
      worker_kind: 'agent',
      event_type: 'briefing.created',
      source: 'mobile.general_manager',
      entity_type: 'general_manager_briefing',
      title: `GM briefing: ${payload.businessStatus}`,
      summary: payload.focusReason,
      payload,
      risk_level: risks.length > 0 ? 'medium' : 'low',
    })
    .select('*')
    .single();

  if (error) throw error;
  await fetchWorkspaceSnapshot();
  return data;
}

export async function createBoardroomReport(strategicQuestion?: string) {
  const supabase = getSupabase();
  const user = useAppStore.getState().user;
  const snapshot = useAppStore.getState().snapshot;

  if (!user) {
    throw new Error('No authenticated user');
  }

  const payload = {
    kind: 'boardroom_report',
    generatedAt: new Date().toISOString(),
    strategicQuestion: strategicQuestion || 'What should the owner focus on next?',
    members: [
      { role: 'CFO', finding: 'Review money-related risks and overdue decisions.', signal: snapshot?.metrics?.waitingApprovals || 0 },
      { role: 'CRO', finding: 'Watch lead and sales movement for stalled opportunities.', signal: snapshot?.metrics?.pendingSignals || 0 },
      { role: 'CMO', finding: 'Turn high-performing content and demand signals into repeatable campaigns.', signal: snapshot?.opportunities?.length || 0 },
      { role: 'COO', finding: 'Keep operational exceptions visible before they become customer-facing failures.', signal: snapshot?.risks?.length || 0 },
      { role: 'CSO', finding: snapshot?.focusReason || 'Focus on the highest-leverage decision in the office.', signal: 1 },
    ],
    ownerDecisions: ((snapshot?.needsDecision as any[]) || []).slice(0, 5),
  };

  const { data, error } = await supabase
    .from('office_events')
    .insert({
      user_id: user.id,
      department_id: 'boardroom',
      worker_kind: 'agent',
      event_type: 'briefing.created',
      source: 'mobile.boardroom',
      entity_type: 'boardroom_report',
      title: 'Boardroom report created',
      summary: payload.strategicQuestion,
      payload,
      risk_level: payload.ownerDecisions.length > 0 ? 'medium' : 'low',
    })
    .select('*')
    .single();

  if (error) throw error;
  await fetchWorkspaceSnapshot();
  return data;
}

function buildWorkspaceSnapshot(data: {
  workflows: Workflow[];
  runs: WorkflowRun[];
  approvals: Approval[];
  connections: Connection[];
}) {
  const activeCount = data.workflows.filter(w => w.status === 'active').length;
  const failedToday = data.runs.filter(r => 
    r.status === 'failed' && 
    new Date(r.started_at).toDateString() === new Date().toDateString()
  ).length;
  const pendingApprovals = data.approvals.filter(a => a.status === 'pending').length;
  const reconnectNeeded = data.connections.filter(c => c.status === 'error').length;
  
  const needsAttention: string[] = [];
  if (failedToday > 0) needsAttention.push(`${failedToday} workflow ${failedToday === 1 ? 'run' : 'runs'} failed today`);
  if (pendingApprovals > 0) needsAttention.push(`${pendingApprovals} approval ${pendingApprovals === 1 ? 'request' : 'requests'} waiting`);
  if (reconnectNeeded > 0) needsAttention.push(`${reconnectNeeded} connection ${reconnectNeeded === 1 ? 'needs' : 'need'} reconnect`);
  
  return {
    corePromise: `${activeCount} active systems running`,
    focusReason: needsAttention.length > 0 
      ? needsAttention.join('. ') + '. Review to keep operations smooth.'
      : `${data.workflows.length} systems ready to work. All clear.`,
    metrics: {
      activeSystems: activeCount,
      ranToday: data.runs.filter(r => 
        new Date(r.started_at).toDateString() === new Date().toDateString()
      ).length,
      waitingApprovals: pendingApprovals,
      reconnectNeeded,
    },
    whatNeedsAttention: needsAttention,
  };
}

// Run workflow
export async function runWorkflow(workflowId: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('run-workflow', {
    body: { workflowId },
  });
  if (error) throw error;
  return data;
}

// Approve/Reject
export async function decideApproval(approvalId: string, decision: 'approve' | 'reject') {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('decide-approval', {
    body: { approvalId, decision },
  });
  if (error) throw error;
  return data;
}

// Generate new workflow from prompt
export async function generateWorkflow(prompt: string) {
  const supabase = getSupabase();
  const { data, error } = await supabase.functions.invoke('generate', {
    body: { prompt },
  });
  if (error) throw error;
  return data;
}
