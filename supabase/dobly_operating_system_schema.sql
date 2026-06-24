-- ============================================================
-- Dobly Operating System Schema Extension
-- Apply after supabase/schema.sql
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.workspaces (
  id uuid primary key default uuid_generate_v4(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  region text default 'KE',
  timezone text not null default 'Africa/Nairobi',
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  current_trust_stage integer not null default 1 check (current_trust_stage between 1 and 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.desks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  key text not null,
  name text not null,
  description text,
  desk_type text not null check (desk_type in ('customer', 'finance', 'sales', 'operations', 'marketing', 'hr', 'legal', 'research', 'custom')),
  status text not null default 'active' check (status in ('active', 'paused', 'draft', 'archived')),
  autonomy_mode text not null default 'supervised' check (autonomy_mode in ('supervised', 'guarded', 'delegated')),
  approval_risk_threshold text not null default 'medium' check (approval_risk_threshold in ('low', 'medium', 'high')),
  goal text,
  owner_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, key)
);

create table if not exists public.standards (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  name text not null,
  promise text not null,
  metric_name text,
  target_value text,
  escalation_rule text,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operating_specs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  source_prompt text not null,
  compiled_goal text not null,
  operating_model text not null check (operating_model in ('automation', 'agent', 'hybrid', 'report')),
  version_number integer not null default 1,
  spec jsonb not null default '{}'::jsonb,
  compiler_notes jsonb not null default '{}'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  channel_preferences text[] not null default '{}',
  tags text[] not null default '{}',
  relationship_summary text,
  churn_risk_score numeric(5,2) default 0,
  lifetime_value numeric(14,2) default 0,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  desk_id uuid references public.desks(id) on delete set null,
  channel text not null check (channel in ('whatsapp', 'email', 'sms', 'voice', 'web', 'instagram', 'internal')),
  external_thread_id text,
  sentiment text,
  status text not null default 'open' check (status in ('open', 'waiting_customer', 'waiting_internal', 'closed')),
  summary text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  source text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost')),
  value_estimate numeric(14,2),
  owner_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  external_invoice_id text,
  status text not null default 'issued' check (status in ('issued', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
  amount numeric(14,2) not null default 0,
  currency text not null default 'KES',
  due_date date,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_cases (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  conversation_id uuid,
  source_channel text not null,
  status text not null default 'open' check (status in ('open', 'waiting_customer', 'waiting_internal', 'resolved', 'closed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  title text not null,
  summary text not null,
  next_action text,
  resolution_summary text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists support_cases_workspace_status_idx
  on public.support_cases(workspace_id, status, priority, created_at desc);

create table if not exists public.finance_records (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  conversation_id uuid,
  source_channel text not null,
  record_type text not null check (record_type in ('payment_notice', 'invoice_followup', 'finance_message', 'reconciliation_gap')),
  status text not null default 'needs_review' check (status in ('needs_review', 'matched', 'queued_followup', 'resolved', 'ignored')),
  amount numeric(14,2),
  currency text not null default 'KES',
  summary text not null,
  next_action text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_records_workspace_status_idx
  on public.finance_records(workspace_id, status, record_type, created_at desc);

create table if not exists public.operations_items (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  conversation_id uuid,
  source_channel text not null,
  status text not null default 'open' check (status in ('open', 'blocked', 'in_progress', 'done', 'cancelled')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  title text not null,
  summary text not null,
  next_action text,
  owner_label text,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operations_items_workspace_status_idx
  on public.operations_items(workspace_id, status, priority, created_at desc);

create table if not exists public.signals (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  signal_type text not null check (signal_type in ('growth', 'risk', 'churn', 'cash_flow', 'demand', 'operations', 'supplier', 'custom')),
  title text not null,
  summary text not null,
  recommendation text,
  confidence numeric(5,2) default 0,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  surfaced_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.briefings (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  briefing_type text not null check (briefing_type in ('morning', 'daily', 'weekly', 'incident', 'return_from_absence')),
  title text not null,
  summary text not null,
  body jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  acknowledged_at timestamptz
);

create table if not exists public.operation_feed_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  operating_spec_id uuid references public.operating_specs(id) on delete set null,
  entity_type text,
  entity_id uuid,
  headline text not null,
  detail text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  event_time timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.escalations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  operating_spec_id uuid references public.operating_specs(id) on delete set null,
  title text not null,
  summary text not null,
  recommendation text,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'decided', 'dismissed')),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.decisions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  decision_type text not null,
  context jsonb not null default '{}'::jsonb,
  chosen_action text,
  chosen_by uuid references public.profiles(id) on delete set null,
  source text not null check (source in ('owner', 'agent', 'rule', 'system')),
  outcome_summary text,
  created_at timestamptz not null default now()
);

create table if not exists public.memory_items (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  memory_scope text not null check (memory_scope in ('workspace', 'desk', 'customer', 'supplier', 'conversation', 'system')),
  subject_type text,
  subject_id uuid,
  summary text not null,
  confidence numeric(5,2) default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.learned_rules (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  rule_name text not null,
  rule_type text not null check (rule_type in ('deterministic', 'decision_heuristic', 'timing', 'tone', 'escalation')),
  trigger_pattern jsonb not null default '{}'::jsonb,
  action_pattern jsonb not null default '{}'::jsonb,
  confidence numeric(5,2) default 0,
  times_observed integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Homebase office kernel
-- This layer powers the office map, the mobile snapshot, and the
-- automation/bot/agent dispatch model.
-- ============================================================

create table if not exists public.office_workers (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id text not null,
  worker_key text not null,
  name text not null,
  runtime_kind text not null check (runtime_kind in ('automation', 'bot', 'agent')),
  mission text not null,
  status text not null default 'draft' check (status in ('draft', 'shadow', 'active', 'paused', 'archived')),
  autonomy_mode text not null default 'supervised' check (autonomy_mode in ('supervised', 'guarded', 'delegated')),
  required_tools text[] not null default '{}',
  permissions jsonb not null default '{}'::jsonb,
  approval_policy jsonb not null default '{}'::jsonb,
  memory_scope jsonb not null default '{}'::jsonb,
  health_score numeric(5,2) not null default 0.50,
  trust_score numeric(5,2) not null default 0.50,
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, workspace_id, worker_key)
);

create table if not exists public.office_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id text,
  worker_id uuid references public.office_workers(id) on delete set null,
  worker_kind text not null default 'system' check (worker_kind in ('automation', 'bot', 'agent', 'system')),
  event_type text not null,
  source text not null,
  entity_type text,
  entity_id text,
  title text not null,
  summary text,
  payload jsonb not null default '{}'::jsonb,
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists office_events_user_time_idx
  on public.office_events(user_id, occurred_at desc);

create index if not exists office_events_workspace_department_idx
  on public.office_events(workspace_id, department_id, occurred_at desc);

create table if not exists public.office_tasks (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  source_event_id uuid references public.office_events(id) on delete set null,
  department_id text not null,
  worker_key text not null,
  runtime_kind text not null check (runtime_kind in ('automation', 'bot', 'agent', 'system')),
  title text not null,
  summary text not null,
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'queued' check (status in ('queued', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
  approval_required boolean not null default true,
  tool_name text,
  tool_payload jsonb not null default '{}'::jsonb,
  result jsonb not null default '{}'::jsonb,
  decision_note text,
  decided_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  max_attempts integer not null default 3,
  next_run_at timestamptz,
  locked_by text,
  locked_at timestamptz,
  last_heartbeat_at timestamptz,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.office_tasks add column if not exists attempt_count integer not null default 0;
alter table public.office_tasks add column if not exists max_attempts integer not null default 3;
alter table public.office_tasks add column if not exists next_run_at timestamptz;
alter table public.office_tasks add column if not exists locked_by text;
alter table public.office_tasks add column if not exists locked_at timestamptz;
alter table public.office_tasks add column if not exists last_heartbeat_at timestamptz;
alter table public.office_tasks add column if not exists agent_run_id uuid;

create index if not exists office_tasks_user_status_idx
  on public.office_tasks(user_id, status, created_at desc);

create index if not exists office_tasks_workspace_department_idx
  on public.office_tasks(workspace_id, department_id, created_at desc);

-- Always-on office worker support:
-- queued office_tasks are durable work items. A server/cron process calls
-- /api/internal/office-worker with WORKER_SECRET to process them even when
-- the owner has no browser or mobile app connected.
create index if not exists office_tasks_always_on_queue_idx
  on public.office_tasks(status, next_run_at asc, created_at asc)
  where status = 'queued';

create index if not exists office_tasks_running_lease_idx
  on public.office_tasks(status, locked_at asc)
  where status = 'running';

create table if not exists public.office_agent_runs (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  office_task_id uuid not null references public.office_tasks(id) on delete cascade,
  office_worker_id uuid references public.office_workers(id) on delete set null,
  state text not null default 'queued' check (state in ('queued', 'gathering_context', 'planning', 'validating', 'acting', 'evaluating', 'completed', 'escalated', 'failed')),
  goal text not null,
  goal_status text not null default 'not_started' check (goal_status in ('not_started', 'in_progress', 'resolved', 'blocked')),
  runtime_kind text not null default 'agent' check (runtime_kind in ('automation', 'bot', 'agent', 'system')),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  context_pack jsonb not null default '{}'::jsonb,
  planner_output jsonb not null default '{}'::jsonb,
  validation_result jsonb not null default '{}'::jsonb,
  execution_result jsonb not null default '{}'::jsonb,
  evaluation_result jsonb not null default '{}'::jsonb,
  memory_summary jsonb not null default '{}'::jsonb,
  reasoning_summary text,
  outcome_type text check (outcome_type in ('resolved', 'escalated', 'failed', 'waiting', 'prepared')),
  confidence_score integer,
  model_used text,
  iterations integer not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists office_agent_runs_task_idx
  on public.office_agent_runs(office_task_id, created_at desc);

create index if not exists office_agent_runs_user_state_idx
  on public.office_agent_runs(user_id, state, created_at desc);

create table if not exists public.office_agent_steps (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.office_agent_runs(id) on delete cascade,
  office_task_id uuid not null references public.office_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  step_number integer not null,
  stage text not null check (stage in ('context', 'plan', 'validate', 'act', 'evaluate', 'learn', 'escalate')),
  step_type text not null check (step_type in ('observation', 'reasoning', 'decision', 'tool_call', 'tool_result', 'summary', 'system')),
  summary text not null,
  input jsonb not null default '{}'::jsonb,
  output jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists office_agent_steps_run_step_idx
  on public.office_agent_steps(run_id, step_number asc);

create table if not exists public.office_agent_confidence_log (
  id uuid primary key default uuid_generate_v4(),
  run_id uuid not null references public.office_agent_runs(id) on delete cascade,
  office_task_id uuid not null references public.office_tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  action_proposed text not null,
  confidence_score integer not null check (confidence_score >= 0 and confidence_score <= 100),
  confidence_reason text,
  decision text not null check (decision in ('acted', 'escalated', 'prepared', 'blocked')),
  created_at timestamptz not null default now()
);

create index if not exists office_agent_confidence_log_run_idx
  on public.office_agent_confidence_log(run_id, created_at desc);

create table if not exists public.office_business_observations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  run_id uuid references public.office_agent_runs(id) on delete set null,
  office_task_id uuid references public.office_tasks(id) on delete set null,
  category text not null,
  observation text not null,
  source text not null default 'office_agent',
  confidence integer not null default 50 check (confidence >= 0 and confidence <= 100),
  evidence_count integer not null default 1,
  owner_confirmed boolean not null default false,
  promoted_to_knowledge boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists office_business_observations_user_category_idx
  on public.office_business_observations(user_id, category, created_at desc);

create table if not exists public.external_action_executions (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  office_task_id uuid references public.office_tasks(id) on delete set null,
  provider text not null,
  tool_name text,
  status text not null default 'prepared' check (status in ('prepared', 'completed', 'needs_connection', 'unsupported', 'failed')),
  request_payload jsonb not null default '{}'::jsonb,
  response_payload jsonb not null default '{}'::jsonb,
  summary text,
  idempotency_key text,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists external_action_executions_user_time_idx
  on public.external_action_executions(user_id, created_at desc);

create index if not exists external_action_executions_task_idx
  on public.external_action_executions(office_task_id, created_at desc);

create table if not exists public.communication_conversations (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  channel text not null check (channel in ('sms', 'whatsapp', 'email', 'website_chat', 'voice')),
  external_thread_id text not null,
  contact_identifier text not null,
  contact_name text,
  department_id text not null default 'reception',
  intent text not null default 'general',
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'waiting_customer', 'waiting_owner', 'closed')),
  summary text,
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, channel, external_thread_id)
);

create index if not exists communication_conversations_user_time_idx
  on public.communication_conversations(user_id, last_message_at desc);

create index if not exists communication_conversations_workspace_department_idx
  on public.communication_conversations(workspace_id, department_id, status, last_message_at desc);

create table if not exists public.communication_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references public.communication_conversations(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  office_task_id uuid references public.office_tasks(id) on delete set null,
  channel text not null check (channel in ('sms', 'whatsapp', 'email', 'website_chat', 'voice')),
  direction text not null check (direction in ('inbound', 'outbound')),
  sender text not null check (sender in ('customer', 'dobly', 'owner', 'system')),
  from_identifier text not null,
  to_identifier text,
  body text not null,
  status text not null default 'received' check (status in ('received', 'drafted', 'waiting_approval', 'queued', 'sent', 'failed')),
  provider_message_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists communication_messages_conversation_time_idx
  on public.communication_messages(conversation_id, created_at asc);

create index if not exists communication_messages_task_idx
  on public.communication_messages(office_task_id);

create table if not exists public.content_items (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  department_id text not null default 'marketing',
  source_event_id uuid references public.office_events(id) on delete set null,
  title text not null,
  body text,
  channel text not null,
  status text not null default 'draft' check (status in ('idea', 'draft', 'needs_review', 'approved', 'scheduled', 'published', 'failed', 'archived')),
  scheduled_for timestamptz,
  published_at timestamptz,
  campaign_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.social_accounts (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null,
  account_label text not null,
  external_account_id text,
  connection_id uuid references public.connections(id) on delete set null,
  status text not null default 'active' check (status in ('active', 'expired', 'error', 'paused')),
  scopes text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.integration_health_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  connection_id uuid references public.connections(id) on delete set null,
  provider text not null,
  severity text not null default 'info' check (severity in ('info', 'warning', 'critical')),
  title text not null,
  summary text,
  recovery_action text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

alter table public.office_workers enable row level security;
alter table public.office_events enable row level security;
alter table public.office_tasks enable row level security;
alter table public.office_agent_runs enable row level security;
alter table public.office_agent_steps enable row level security;
alter table public.office_agent_confidence_log enable row level security;
alter table public.office_business_observations enable row level security;
alter table public.external_action_executions enable row level security;
alter table public.communication_conversations enable row level security;
alter table public.communication_messages enable row level security;
alter table public.customers enable row level security;
alter table public.leads enable row level security;
alter table public.invoices enable row level security;
alter table public.support_cases enable row level security;
alter table public.finance_records enable row level security;
alter table public.operations_items enable row level security;
alter table public.content_items enable row level security;
alter table public.social_accounts enable row level security;
alter table public.integration_health_events enable row level security;

drop policy if exists "office_workers_owner_all" on public.office_workers;
create policy "office_workers_owner_all" on public.office_workers
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "office_events_owner_all" on public.office_events;
create policy "office_events_owner_all" on public.office_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "office_tasks_owner_all" on public.office_tasks;
create policy "office_tasks_owner_all" on public.office_tasks
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "office_agent_runs_owner_all" on public.office_agent_runs;
create policy "office_agent_runs_owner_all" on public.office_agent_runs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "office_agent_steps_owner_all" on public.office_agent_steps;
create policy "office_agent_steps_owner_all" on public.office_agent_steps
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "office_agent_confidence_log_owner_all" on public.office_agent_confidence_log;
create policy "office_agent_confidence_log_owner_all" on public.office_agent_confidence_log
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "office_business_observations_owner_all" on public.office_business_observations;
create policy "office_business_observations_owner_all" on public.office_business_observations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "external_action_executions_owner_all" on public.external_action_executions;
create policy "external_action_executions_owner_all" on public.external_action_executions
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "communication_conversations_owner_all" on public.communication_conversations;
create policy "communication_conversations_owner_all" on public.communication_conversations
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "communication_messages_owner_all" on public.communication_messages;
create policy "communication_messages_owner_all" on public.communication_messages
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "customers_workspace_owner_all" on public.customers;
create policy "customers_workspace_owner_all" on public.customers
  for all using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = customers.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = customers.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  );

drop policy if exists "leads_workspace_owner_all" on public.leads;
create policy "leads_workspace_owner_all" on public.leads
  for all using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = leads.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = leads.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  );

drop policy if exists "invoices_workspace_owner_all" on public.invoices;
create policy "invoices_workspace_owner_all" on public.invoices
  for all using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = invoices.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = invoices.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  );

drop policy if exists "support_cases_workspace_owner_all" on public.support_cases;
create policy "support_cases_workspace_owner_all" on public.support_cases
  for all using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = support_cases.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = support_cases.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  );

drop policy if exists "finance_records_workspace_owner_all" on public.finance_records;
create policy "finance_records_workspace_owner_all" on public.finance_records
  for all using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = finance_records.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = finance_records.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  );

drop policy if exists "operations_items_workspace_owner_all" on public.operations_items;
create policy "operations_items_workspace_owner_all" on public.operations_items
  for all using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = operations_items.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = operations_items.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
  );

drop policy if exists "content_items_owner_all" on public.content_items;
create policy "content_items_owner_all" on public.content_items
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "social_accounts_owner_all" on public.social_accounts;
create policy "social_accounts_owner_all" on public.social_accounts
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "integration_health_events_owner_all" on public.integration_health_events;
create policy "integration_health_events_owner_all" on public.integration_health_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
