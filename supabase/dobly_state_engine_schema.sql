-- ============================================================
-- Dobly State Engine Schema
-- Apply after supabase/dobly_operating_system_schema.sql
-- ============================================================

create extension if not exists "uuid-ossp";

create table if not exists public.operating_states (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  coworker_id uuid references public.office_workers(id) on delete set null,
  title text not null,
  objective text not null,
  desired_condition text not null,
  state_type text not null default 'custom' check (state_type in ('sla', 'risk', 'coverage', 'throughput', 'quality', 'financial', 'custom')),
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  health_status text not null default 'unknown' check (health_status in ('healthy', 'watching', 'at_risk', 'breached', 'recovering', 'unknown')),
  target_metric text,
  target_config jsonb not null default '{}'::jsonb,
  watch_config jsonb not null default '{}'::jsonb,
  action_playbook jsonb not null default '{}'::jsonb,
  approval_policy jsonb not null default '{}'::jsonb,
  last_evaluated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.state_evaluations (
  id uuid primary key default uuid_generate_v4(),
  state_id uuid not null references public.operating_states(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  health_status text not null check (health_status in ('healthy', 'watching', 'at_risk', 'breached', 'recovering', 'unknown')),
  health_score numeric(5,2) not null default 0.50,
  pressure_score numeric(5,2) not null default 0.00,
  drift_summary text,
  evidence jsonb not null default '{}'::jsonb,
  recommended_action text,
  evaluated_at timestamptz not null default now()
);

create table if not exists public.pressure_events (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  state_id uuid references public.operating_states(id) on delete set null,
  coworker_id uuid references public.office_workers(id) on delete set null,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  pressure_score numeric(5,2) not null default 0.00,
  title text not null,
  summary text not null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved', 'dismissed')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists public.action_candidates (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  desk_id uuid references public.desks(id) on delete set null,
  state_id uuid references public.operating_states(id) on delete set null,
  coworker_id uuid references public.office_workers(id) on delete set null,
  title text not null,
  summary text not null,
  action_kind text not null default 'custom' check (action_kind in ('notify', 'task', 'simulate', 'approval', 'workflow', 'message', 'custom')),
  execution_mode text not null default 'observe' check (execution_mode in ('observe', 'simulate', 'supervised', 'autonomous')),
  risk_level text not null default 'medium' check (risk_level in ('low', 'medium', 'high', 'critical')),
  confidence numeric(5,2) not null default 0.50,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'approved', 'executing', 'completed', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists operating_states_workspace_idx on public.operating_states(workspace_id, status, updated_at desc);
create index if not exists operating_states_desk_idx on public.operating_states(desk_id, status);
create index if not exists state_evaluations_state_idx on public.state_evaluations(state_id, evaluated_at desc);
create index if not exists pressure_events_workspace_idx on public.pressure_events(workspace_id, status, created_at desc);
create index if not exists pressure_events_state_idx on public.pressure_events(state_id, status);
create index if not exists action_candidates_workspace_idx on public.action_candidates(workspace_id, status, created_at desc);
create index if not exists action_candidates_state_idx on public.action_candidates(state_id, status);
