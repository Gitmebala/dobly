-- ============================================================
-- Dobly - Supabase Schema
-- SECURITY: Row Level Security enabled on ALL tables
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
-- Extends Supabase auth.users with app-specific data
create table if not exists public.profiles (
  id            uuid references auth.users(id) on delete cascade primary key,
  email         text not null,
  full_name     text,
  avatar_url    text,
  plan          text not null default 'free' check (plan in ('free', 'starter', 'operator', 'command', 'business', 'pro', 'agency')),
  notification_preference text default 'app' check (notification_preference in ('app', 'email', 'whatsapp')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  workflows_generated     integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles add column if not exists notification_preference text default 'app';
alter table public.profiles add column if not exists brain_view_enabled boolean default false;
alter table public.profiles add column if not exists brain_tooltip_seen boolean default false;
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'starter', 'operator', 'command', 'business', 'pro', 'agency'));

-- CRITICAL: Enable RLS - without this, any user can see any user's data
alter table public.profiles enable row level security;

-- Policy: users can only read their own profile
create policy "profiles: users read own"
  on public.profiles for select
  using (auth.uid() = id);

-- Policy: users can only update their own profile
create policy "profiles: users update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Policy: insert only on signup (handled by trigger)
create policy "profiles: insert on signup"
  on public.profiles for insert
  with check (auth.uid() = id);

create table if not exists public.business_profiles (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null unique references public.profiles(id) on delete cascade,
  business_name    text not null,
  business_type    text,
  website_url      text,
  description      text,
  locations        text[] not null default '{}',
  opening_hours    text,
  contact_details  jsonb not null default '{}'::jsonb,
  brand_voice      text,
  faq_entries      jsonb not null default '[]'::jsonb,
  policies         text[] not null default '{}',
  source_urls      text[] not null default '{}',
  context_summary  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.business_profiles enable row level security;

create policy "business_profiles: users read own"
  on public.business_profiles for select
  using (auth.uid() = user_id);

create policy "business_profiles: users insert own"
  on public.business_profiles for insert
  with check (auth.uid() = user_id);

create policy "business_profiles: users update own"
  on public.business_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── workflows ────────────────────────────────────────────────────────────────
create table if not exists public.workflows (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  title           text not null,
  description     text not null default '',
  prompt          text not null,
  blueprint       jsonb not null,
  status          text not null default 'active' check (status in ('active', 'paused', 'draft')),
  runs_count      integer not null default 0,
  time_saved_minutes integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.workflows add column if not exists trigger_type text;
alter table public.workflows add column if not exists webhook_path text unique;
alter table public.workflows add column if not exists last_run_at timestamptz;

-- CRITICAL: Enable RLS
alter table public.workflows enable row level security;

-- Policy: users see ONLY their own workflows
create policy "workflows: users read own"
  on public.workflows for select
  using (auth.uid() = user_id);

-- Policy: users create their own workflows
create policy "workflows: users insert own"
  on public.workflows for insert
  with check (auth.uid() = user_id);

-- Policy: users update only their own workflows
create policy "workflows: users update own"
  on public.workflows for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Policy: users delete only their own workflows
create policy "workflows: users delete own"
  on public.workflows for delete
  using (auth.uid() = user_id);

-- Workflow runs store every execution attempt and step-level results.
create table if not exists public.workflow_runs (
  id              uuid primary key default uuid_generate_v4(),
  workflow_id     uuid not null references public.workflows(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  status          text not null check (status in ('running', 'awaiting_approval', 'success', 'failed')),
  trigger_type    text not null check (trigger_type in ('manual', 'webhook', 'schedule')),
  trigger_payload jsonb not null default '{}'::jsonb,
  step_results    jsonb not null default '[]'::jsonb,
  error_message   text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

alter table public.workflow_runs enable row level security;

create policy "workflow_runs: users read own"
  on public.workflow_runs for select
  using (auth.uid() = user_id);

create policy "workflow_runs: service inserts"
  on public.workflow_runs for insert
  with check (auth.uid() = user_id);

create policy "workflow_runs: service updates own"
  on public.workflow_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── usage_logs ───────────────────────────────────────────────────────────────
-- Track API usage per user for rate limiting / plan enforcement
create table if not exists public.usage_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  action      text not null, -- 'generate_workflow', 'run_workflow', etc.
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

alter table public.usage_logs enable row level security;

create policy "usage_logs: users read own"
  on public.usage_logs for select
  using (auth.uid() = user_id);

create policy "usage_logs: users insert own"
  on public.usage_logs for insert
  with check (auth.uid() = user_id);

-- ─── Indexes ─────────────────────────────────────────────────────────────────
create index if not exists workflows_user_id_idx on public.workflows(user_id);
create index if not exists business_profiles_user_id_idx on public.business_profiles(user_id);
create index if not exists workflows_created_at_idx on public.workflows(created_at desc);
create index if not exists workflows_webhook_path_idx on public.workflows(webhook_path);
create index if not exists usage_logs_user_id_action_idx on public.usage_logs(user_id, action);
create index if not exists usage_logs_created_at_idx on public.usage_logs(created_at desc);
create index if not exists workflow_runs_workflow_started_idx on public.workflow_runs(workflow_id, started_at desc);

-- ─── Triggers ────────────────────────────────────────────────────────────────

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger business_profiles_updated_at
  before update on public.business_profiles
  for each row execute procedure public.set_updated_at();

create trigger workflows_updated_at
  before update on public.workflows
  for each row execute procedure public.set_updated_at();

-- ─── Monthly usage reset helper ──────────────────────────────────────────────
-- Called by the generate API to check + increment usage
create or replace function public.get_monthly_workflow_count(p_user_id uuid)
returns integer as $$
declare
  v_count integer;
begin
  select count(*)::integer
  into v_count
  from public.usage_logs
  where user_id = p_user_id
    and action = 'generate_workflow'
    and created_at >= date_trunc('month', now());
  return coalesce(v_count, 0);
end;
$$ language plpgsql security definer;

-- ============================================================
-- Dobly Milestone 1 Platform Core
-- ============================================================

create table if not exists public.workflow_versions (
  id              uuid primary key default uuid_generate_v4(),
  workflow_id     uuid not null references public.workflows(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  version_number  integer not null,
  title           text not null,
  description     text not null default '',
  blueprint       jsonb not null,
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  unique (workflow_id, version_number)
);

alter table public.workflow_versions enable row level security;

create policy "workflow_versions: users read own"
  on public.workflow_versions for select
  using (auth.uid() = user_id);

create policy "workflow_versions: users insert own"
  on public.workflow_versions for insert
  with check (auth.uid() = user_id);

create policy "workflow_versions: users update own"
  on public.workflow_versions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.workflow_run_events (
  id              uuid primary key default uuid_generate_v4(),
  workflow_id     uuid not null references public.workflows(id) on delete cascade,
  run_id          uuid not null references public.workflow_runs(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  event_type      text not null,
  event_data      jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

alter table public.workflow_run_events enable row level security;

create policy "workflow_run_events: users read own"
  on public.workflow_run_events for select
  using (auth.uid() = user_id);

create policy "workflow_run_events: users insert own"
  on public.workflow_run_events for insert
  with check (auth.uid() = user_id);

create table if not exists public.connections (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  provider            text not null,
  label               text not null,
  status              text not null default 'pending' check (status in ('pending', 'active', 'expired', 'error')),
  account_identifier  text,
  scopes              text[] not null default '{}',
  metadata            jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.connections enable row level security;

create policy "connections: users read own"
  on public.connections for select
  using (auth.uid() = user_id);

create policy "connections: users insert own"
  on public.connections for insert
  with check (auth.uid() = user_id);

create policy "connections: users update own"
  on public.connections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.connection_secrets (
  id                      uuid primary key default uuid_generate_v4(),
  connection_id           uuid not null unique references public.connections(id) on delete cascade,
  encrypted_access_token  text,
  encrypted_refresh_token text,
  encrypted_secret        text,
  expires_at              timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

alter table public.connection_secrets enable row level security;

create policy "connection_secrets: service role read only"
  on public.connection_secrets for select
  using (auth.role() = 'service_role');

create policy "connection_secrets: users insert own"
  on public.connection_secrets for insert
  with check (
    exists (
      select 1 from public.connections
      where public.connections.id = connection_id
        and public.connections.user_id = auth.uid()
    )
  );

create policy "connection_secrets: users update own"
  on public.connection_secrets for update
  using (
    exists (
      select 1 from public.connections
      where public.connections.id = connection_id
        and public.connections.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.connections
      where public.connections.id = connection_id
        and public.connections.user_id = auth.uid()
    )
  );

create table if not exists public.job_queue (
  id              uuid primary key default uuid_generate_v4(),
  type            text not null,
  workflow_id     uuid references public.workflows(id) on delete cascade,
  run_id          uuid references public.workflow_runs(id) on delete cascade,
  user_id         uuid references public.profiles(id) on delete cascade,
  payload         jsonb not null default '{}'::jsonb,
  status          text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'dead_letter')),
  priority        integer not null default 100,
  attempts        integer not null default 0,
  max_attempts    integer not null default 5,
  available_at    timestamptz not null default now(),
  locked_by       text,
  locked_at       timestamptz,
  last_error      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.job_queue enable row level security;

create policy "job_queue: users read own"
  on public.job_queue for select
  using (auth.uid() = user_id);

create policy "job_queue: users insert own"
  on public.job_queue for insert
  with check (auth.uid() = user_id);

create index if not exists workflow_versions_workflow_version_idx on public.workflow_versions(workflow_id, version_number desc);
create index if not exists workflow_run_events_run_created_idx on public.workflow_run_events(run_id, created_at asc);
create index if not exists connections_user_provider_idx on public.connections(user_id, provider);
create index if not exists job_queue_status_available_idx on public.job_queue(status, available_at, priority);

create trigger connections_updated_at
  before update on public.connections
  for each row execute procedure public.set_updated_at();

create trigger connection_secrets_updated_at
  before update on public.connection_secrets
  for each row execute procedure public.set_updated_at();

create table if not exists public.connection_verifications (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  connection_id     uuid not null references public.connections(id) on delete cascade,
  provider          text not null,
  channel           text not null check (channel in ('whatsapp', 'email', 'sms')),
  verification_type text not null check (verification_type in ('otp', 'email_link')),
  destination       text not null,
  code_hash         text,
  token_hash        text,
  status            text not null default 'pending' check (status in ('pending', 'verified', 'expired', 'cancelled')),
  attempts          integer not null default 0,
  expires_at        timestamptz not null,
  verified_at       timestamptz,
  metadata          jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.connection_verifications enable row level security;

create policy "connection_verifications: users read own"
  on public.connection_verifications for select
  using (auth.uid() = user_id);

create policy "connection_verifications: users insert own"
  on public.connection_verifications for insert
  with check (auth.uid() = user_id);

create policy "connection_verifications: users update own"
  on public.connection_verifications for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists connection_verifications_connection_idx
  on public.connection_verifications(connection_id, created_at desc);

create index if not exists connection_verifications_status_expires_idx
  on public.connection_verifications(status, expires_at);

create trigger connection_verifications_updated_at
  before update on public.connection_verifications
  for each row execute procedure public.set_updated_at();

create table if not exists public.approvals (
  id            uuid primary key default uuid_generate_v4(),
  workflow_id   uuid not null references public.workflows(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  run_id        uuid references public.workflow_runs(id) on delete set null,
  title         text not null,
  message       text not null,
  action_label  text,
  risk_level    text not null default 'medium' check (risk_level in ('low', 'medium', 'high')),
  channel       text not null default 'app' check (channel in ('app', 'email', 'whatsapp')),
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'expired')),
  metadata      jsonb not null default '{}'::jsonb,
  requested_at  timestamptz not null default now(),
  decided_at    timestamptz,
  decision_note text
);

alter table public.approvals enable row level security;

create policy "approvals: users read own"
  on public.approvals for select
  using (auth.uid() = user_id);

create policy "approvals: users insert own"
  on public.approvals for insert
  with check (auth.uid() = user_id);

create policy "approvals: users update own"
  on public.approvals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists approvals_user_status_idx
  on public.approvals(user_id, status, requested_at desc);

create trigger job_queue_updated_at
  before update on public.job_queue
  for each row execute procedure public.set_updated_at();

  -- ============================================================
  -- Dobly Security Hardening
  -- Tighten sensitive tables so only server-side service-role flows write secrets,
  -- and queue entries. Service role bypasses RLS; end-user clients do not.

-- ============================================================
-- Dobly Coworker Platform Core
-- Agents, automations, knowledge, reports, and reusable templates
-- ============================================================

create table if not exists public.agents (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  workspace_id        uuid,
  workflow_id         uuid references public.workflows(id) on delete set null,
  name                text not null,
  role                text not null,
  objective           text not null,
  category            text not null default 'general',
  audience_type       text not null default 'both' check (audience_type in ('personal', 'business', 'both')),
  status              text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  persona_config      jsonb not null default '{}'::jsonb,
  autonomy_mode       text not null default 'guarded' check (autonomy_mode in ('supervised', 'guarded', 'delegated')),
  approval_policy_id  uuid,
  default_report_style text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.agents enable row level security;

drop policy if exists "agents: users read own" on public.agents;
create policy "agents: users read own"
  on public.agents for select
  using (auth.uid() = user_id);

drop policy if exists "agents: users insert own" on public.agents;
create policy "agents: users insert own"
  on public.agents for insert
  with check (auth.uid() = user_id);

drop policy if exists "agents: users update own" on public.agents;
create policy "agents: users update own"
  on public.agents for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "agents: users delete own" on public.agents;
create policy "agents: users delete own"
  on public.agents for delete
  using (auth.uid() = user_id);

create table if not exists public.agent_memory (
  id            uuid primary key default uuid_generate_v4(),
  agent_id      uuid not null references public.agents(id) on delete cascade,
  memory_type   text not null check (memory_type in ('preference', 'fact', 'working_context', 'watchlist', 'instruction')),
  key           text not null,
  value         jsonb not null default '{}'::jsonb,
  source        text,
  confidence    numeric(3,2),
  expires_at    timestamptz,
  updated_at    timestamptz not null default now(),
  unique (agent_id, memory_type, key)
);

alter table public.agent_memory enable row level security;

drop policy if exists "agent_memory: users read own" on public.agent_memory;
create policy "agent_memory: users read own"
  on public.agent_memory for select
  using (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

drop policy if exists "agent_memory: users insert own" on public.agent_memory;
create policy "agent_memory: users insert own"
  on public.agent_memory for insert
  with check (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

drop policy if exists "agent_memory: users update own" on public.agent_memory;
create policy "agent_memory: users update own"
  on public.agent_memory for update
  using (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

create table if not exists public.automations (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  workspace_id      uuid,
  agent_id          uuid references public.agents(id) on delete set null,
  workflow_id       uuid references public.workflows(id) on delete set null,
  name              text not null,
  goal              text not null,
  status            text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  trigger_type      text not null default 'manual' check (trigger_type in ('manual', 'schedule', 'webhook', 'event', 'threshold')),
  trigger_config    jsonb not null default '{}'::jsonb,
  condition_config  jsonb not null default '{}'::jsonb,
  delivery_config   jsonb not null default '{}'::jsonb,
  schedule_config   jsonb not null default '{}'::jsonb,
  last_run_at       timestamptz,
  next_run_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.automations enable row level security;

drop policy if exists "automations: users read own" on public.automations;
create policy "automations: users read own"
  on public.automations for select
  using (auth.uid() = user_id);

drop policy if exists "automations: users insert own" on public.automations;
create policy "automations: users insert own"
  on public.automations for insert
  with check (auth.uid() = user_id);

drop policy if exists "automations: users update own" on public.automations;
create policy "automations: users update own"
  on public.automations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "automations: users delete own" on public.automations;
create policy "automations: users delete own"
  on public.automations for delete
  using (auth.uid() = user_id);

create table if not exists public.automation_steps (
  id             uuid primary key default uuid_generate_v4(),
  automation_id  uuid not null references public.automations(id) on delete cascade,
  position       integer not null,
  step_type      text not null check (step_type in ('research', 'reason', 'tool_action', 'message', 'approval', 'report', 'browser', 'api')),
  label          text not null,
  config         jsonb not null default '{}'::jsonb,
  enabled        boolean not null default true,
  unique (automation_id, position)
);

alter table public.automation_steps enable row level security;

drop policy if exists "automation_steps: users read own" on public.automation_steps;
create policy "automation_steps: users read own"
  on public.automation_steps for select
  using (
    exists (
      select 1 from public.automations
      where public.automations.id = automation_id
        and public.automations.user_id = auth.uid()
    )
  );

drop policy if exists "automation_steps: users insert own" on public.automation_steps;
create policy "automation_steps: users insert own"
  on public.automation_steps for insert
  with check (
    exists (
      select 1 from public.automations
      where public.automations.id = automation_id
        and public.automations.user_id = auth.uid()
    )
  );

drop policy if exists "automation_steps: users update own" on public.automation_steps;
create policy "automation_steps: users update own"
  on public.automation_steps for update
  using (
    exists (
      select 1 from public.automations
      where public.automations.id = automation_id
        and public.automations.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.automations
      where public.automations.id = automation_id
        and public.automations.user_id = auth.uid()
    )
  );

create table if not exists public.knowledge_bases (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  workspace_id  uuid,
  name          text not null,
  description   text,
  visibility    text not null default 'private' check (visibility in ('private', 'workspace')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.knowledge_bases enable row level security;

drop policy if exists "knowledge_bases: users read own" on public.knowledge_bases;
create policy "knowledge_bases: users read own"
  on public.knowledge_bases for select
  using (auth.uid() = user_id);

drop policy if exists "knowledge_bases: users insert own" on public.knowledge_bases;
create policy "knowledge_bases: users insert own"
  on public.knowledge_bases for insert
  with check (auth.uid() = user_id);

drop policy if exists "knowledge_bases: users update own" on public.knowledge_bases;
create policy "knowledge_bases: users update own"
  on public.knowledge_bases for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.knowledge_items (
  id                 uuid primary key default uuid_generate_v4(),
  knowledge_base_id  uuid not null references public.knowledge_bases(id) on delete cascade,
  source_type        text not null check (source_type in ('file', 'url', 'note', 'connection_sync')),
  title              text not null,
  content_ref        text,
  raw_text           text,
  metadata           jsonb not null default '{}'::jsonb,
  tags               text[] not null default '{}',
  last_synced_at     timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

alter table public.knowledge_items enable row level security;

drop policy if exists "knowledge_items: users read own" on public.knowledge_items;
create policy "knowledge_items: users read own"
  on public.knowledge_items for select
  using (
    exists (
      select 1 from public.knowledge_bases
      where public.knowledge_bases.id = knowledge_base_id
        and public.knowledge_bases.user_id = auth.uid()
    )
  );

drop policy if exists "knowledge_items: users insert own" on public.knowledge_items;
create policy "knowledge_items: users insert own"
  on public.knowledge_items for insert
  with check (
    exists (
      select 1 from public.knowledge_bases
      where public.knowledge_bases.id = knowledge_base_id
        and public.knowledge_bases.user_id = auth.uid()
    )
  );

drop policy if exists "knowledge_items: users update own" on public.knowledge_items;
create policy "knowledge_items: users update own"
  on public.knowledge_items for update
  using (
    exists (
      select 1 from public.knowledge_bases
      where public.knowledge_bases.id = knowledge_base_id
        and public.knowledge_bases.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.knowledge_bases
      where public.knowledge_bases.id = knowledge_base_id
        and public.knowledge_bases.user_id = auth.uid()
    )
  );

create table if not exists public.agent_knowledge_base_access (
  id                 uuid primary key default uuid_generate_v4(),
  agent_id           uuid not null references public.agents(id) on delete cascade,
  knowledge_base_id  uuid not null references public.knowledge_bases(id) on delete cascade,
  access_mode        text not null default 'read' check (access_mode in ('read', 'read_write')),
  unique (agent_id, knowledge_base_id)
);

alter table public.agent_knowledge_base_access enable row level security;

drop policy if exists "agent_kb_access: users read own" on public.agent_knowledge_base_access;
create policy "agent_kb_access: users read own"
  on public.agent_knowledge_base_access for select
  using (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

drop policy if exists "agent_kb_access: users insert own" on public.agent_knowledge_base_access;
create policy "agent_kb_access: users insert own"
  on public.agent_knowledge_base_access for insert
  with check (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

create table if not exists public.agent_connections (
  id                   uuid primary key default uuid_generate_v4(),
  agent_id             uuid not null references public.agents(id) on delete cascade,
  connection_id        uuid not null references public.connections(id) on delete cascade,
  access_mode          text not null default 'read' check (access_mode in ('read', 'write', 'read_write')),
  allowed_capabilities text[] not null default '{}',
  is_primary           boolean not null default false,
  unique (agent_id, connection_id)
);

alter table public.agent_connections enable row level security;

drop policy if exists "agent_connections: users read own" on public.agent_connections;
create policy "agent_connections: users read own"
  on public.agent_connections for select
  using (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

drop policy if exists "agent_connections: users insert own" on public.agent_connections;
create policy "agent_connections: users insert own"
  on public.agent_connections for insert
  with check (
    exists (
      select 1 from public.agents
      where public.agents.id = agent_id
        and public.agents.user_id = auth.uid()
    )
  );

create table if not exists public.reports (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  agent_id        uuid references public.agents(id) on delete set null,
  automation_id   uuid references public.automations(id) on delete set null,
  workflow_id     uuid references public.workflows(id) on delete set null,
  run_id          uuid references public.workflow_runs(id) on delete set null,
  report_type     text not null,
  title           text not null,
  body            text not null,
  delivery_status text,
  created_at      timestamptz not null default now()
);

alter table public.reports enable row level security;

drop policy if exists "reports: users read own" on public.reports;
create policy "reports: users read own"
  on public.reports for select
  using (auth.uid() = user_id);

drop policy if exists "reports: users insert own" on public.reports;
create policy "reports: users insert own"
  on public.reports for insert
  with check (auth.uid() = user_id);

create table if not exists public.templates (
  id                        uuid primary key default uuid_generate_v4(),
  slug                      text not null unique,
  name                      text not null,
  audience_type             text not null default 'both' check (audience_type in ('personal', 'business', 'both')),
  category                  text not null,
  prompt_seed               text not null,
  default_agent_config      jsonb not null default '{}'::jsonb,
  default_automation_config jsonb not null default '{}'::jsonb,
  required_connections      text[] not null default '{}',
  required_knowledge_types  text[] not null default '{}',
  created_at                timestamptz not null default now()
);

alter table public.templates enable row level security;

drop policy if exists "templates: users read" on public.templates;
create policy "templates: users read"
  on public.templates for select
  using (auth.uid() is not null);

create index if not exists agents_user_status_idx on public.agents(user_id, status, updated_at desc);
create index if not exists automations_user_status_idx on public.automations(user_id, status, updated_at desc);
create index if not exists knowledge_bases_user_idx on public.knowledge_bases(user_id, updated_at desc);
create index if not exists reports_user_created_idx on public.reports(user_id, created_at desc);

create trigger agents_updated_at
  before update on public.agents
  for each row execute procedure public.set_updated_at();

create trigger automations_updated_at
  before update on public.automations
  for each row execute procedure public.set_updated_at();

create trigger knowledge_bases_updated_at
  before update on public.knowledge_bases
  for each row execute procedure public.set_updated_at();

create trigger knowledge_items_updated_at
  before update on public.knowledge_items
  for each row execute procedure public.set_updated_at();
  -- ============================================================
drop policy if exists "connection_secrets: users read own" on public.connection_secrets;
drop policy if exists "connection_secrets: users insert own" on public.connection_secrets;
drop policy if exists "connection_secrets: users update own" on public.connection_secrets;

drop policy if exists "job_queue: users read own" on public.job_queue;
drop policy if exists "job_queue: users insert own" on public.job_queue;

-- ============================================================
-- COWORKER BUILDER SYSTEM
-- ============================================================

-- ─── coworkers ────────────────────────────────────────────────────────────────
-- First-class AI coworker objects (not just workflows)
create table if not exists public.coworkers (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete set null,

  -- Core identity
  role                text not null,  -- Reception, Collections, Support, Growth Research, Operations Coordinator
  name                text not null,
  mission             text not null,
  description         text,

  -- Desk assignment
  desk                text not null,  -- customer_desk, finance_desk, support_desk, operations_desk
  desk_scope          jsonb not null default '{}'::jsonb,  -- What this desk owns

  -- Standards and behavior
  standards           jsonb not null default '{}'::jsonb,  -- Service level promises
  tone                text not null default 'professional',  -- professional, casual, formal, warm
  personality         jsonb not null default '{}'::jsonb,  -- Personality traits

  -- Memory and context
  memory_scope        jsonb not null default '{}'::jsonb,  -- What this coworker remembers
  context_bindings    jsonb not null default '{}'::jsonb,  -- Connections to business memory

  -- Permissions and boundaries
  permissions         jsonb not null default '{}'::jsonb,  -- What it can do
  approval_boundaries jsonb not null default '{}'::jsonb,  -- When it must ask
  escalation_rules    jsonb not null default '{}'::jsonb,  -- When to escalate

  -- Tools and capabilities
  tools               text[] not null default '{}',  -- Available tools
  tool_permissions    jsonb not null default '{}'::jsonb,

  -- Success metrics
  success_metrics     jsonb not null default '{}'::jsonb,  -- KPIs
  target_outcomes     text[] not null default '{}',

  -- Operating parameters
  operating_hours     jsonb not null default '{"24/7": true}'::jsonb,
  autonomy_level      text not null default 'supervised' check (autonomy_level in ('supervised', 'guarded', 'delegated')),

  -- Deployment state
  deployment_state    text not null default 'draft' check (deployment_state in ('draft', 'simulated', 'shadow', 'guarded_live', 'delegated_live')),
  deployment_stage    jsonb not null default '{}'::jsonb,  -- Stage-specific config

  -- Learning and improvement
  learning_loop       jsonb not null default '{}'::jsonb,  -- How it improves
  version             integer not null default 1,

  -- Status
  status              text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  health_score        numeric(3,2) default 0.50,  -- 0.00 to 1.00
  trust_score         numeric(3,2) default 0.50,  -- 0.00 to 1.00
  value_score         numeric(3,2) default 0.50,  -- 0.00 to 1.00

  -- Metadata
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  last_deployed_at    timestamptz,
  last_health_check   timestamptz
);

alter table public.coworkers enable row level security;

create policy "coworkers: users read own"
  on public.coworkers for select
  using (auth.uid() = user_id);

create policy "coworkers: users insert own"
  on public.coworkers for insert
  with check (auth.uid() = user_id);

create policy "coworkers: users update own"
  on public.coworkers for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "coworkers: users delete own"
  on public.coworkers for delete
  using (auth.uid() = user_id);

create index if not exists coworkers_user_role_idx on public.coworkers(user_id, role, status);
create index if not exists coworkers_desk_idx on public.coworkers(desk, status);
create index if not exists coworkers_deployment_idx on public.coworkers(deployment_state, updated_at desc);

-- ─── standards ────────────────────────────────────────────────────────────────
-- Service level standards that coworkers must maintain
create table if not exists public.standards (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  coworker_id         uuid references public.coworkers(id) on delete cascade,

  -- Standard definition
  name                text not null,
  description         text,
  category            text not null,  -- response_time, quality, escalation, communication, payment
  promise             text not null,  -- Natural language promise

  -- Measurement
  metric              text not null,  -- response_time_seconds, resolution_rate, satisfaction_score
  target_value        numeric not null,
  unit                text,  -- seconds, percent, score

  -- Conditions
  applies_to          jsonb not null default '{}'::jsonb,  -- When this standard applies
  exceptions          jsonb not null default '{}'::jsonb,  -- Edge cases

  -- Enforcement
  enforcement_mode     text not null default 'soft' check (enforcement_mode in ('soft', 'hard', 'monitor')),
  escalation_threshold jsonb not null default '{}'::jsonb,

  -- Status
  is_active           boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

alter table public.standards enable row level security;

create policy "standards: users read own"
  on public.standards for select
  using (auth.uid() = user_id);

create policy "standards: users insert own"
  on public.standards for insert
  with check (auth.uid() = user_id);

create policy "standards: users update own"
  on public.standards for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "standards: users delete own"
  on public.standards for delete
  using (auth.uid() = user_id);

create index if not exists standards_user_category_idx on public.standards(user_id, category, is_active);
create index if not exists standards_coworker_idx on public.standards(coworker_id, is_active);

-- ─── operating_specs ────────────────────────────────────────────────────────────
-- Compiled agent specifications (deterministic + hybrid paths)
create table if not exists public.operating_specs (
  id                  uuid primary key default uuid_generate_v4(),
  coworker_id         uuid not null references public.coworkers(id) on delete cascade,
  version             integer not null,

  -- Compiled spec
  spec_type           text not null check (spec_type in ('deterministic', 'hybrid', 'agent')),
  spec                jsonb not null,  -- The compiled specification

  -- Path breakdown
  deterministic_paths jsonb not null default '[]'::jsonb,  -- Fully deterministic flows
  agent_nodes         jsonb not null default '[]'::jsonb,  -- Points requiring AI judgment
  fallback_paths      jsonb not null default '[]'::jsonb,  -- Alternative paths

  -- Execution config
  retry_policy        jsonb not null default '{}'::jsonb,
  timeout_config      jsonb not null default '{}'::jsonb,
  checkpoint_config   jsonb not null default '{}'::jsonb,

  -- Observation hooks
  observation_hooks   jsonb not null default '[]'::jsonb,  -- Where to observe
  memory_writes       jsonb not null default '[]'::jsonb,  -- What to remember

  -- Validation
  is_valid            boolean not null default true,
  validation_errors   jsonb not null default '[]'::jsonb,

  -- Metadata
  created_at          timestamptz not null default now(),
  created_by_prompt   text,  -- The prompt that generated this spec
  is_current          boolean not null default true
);

alter table public.operating_specs enable row level security;

create policy "operating_specs: users read own"
  on public.operating_specs for select
  using (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = operating_specs.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create policy "operating_specs: users insert own"
  on public.operating_specs for insert
  with check (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = operating_specs.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create index if not exists operating_specs_coworker_version_idx on public.operating_specs(coworker_id, version desc);
create index if not exists operating_specs_current_idx on public.operating_specs(coworker_id, is_current) where is_current = true;

-- ─── simulations ───────────────────────────────────────────────────────────────
-- Simulation results for testing coworkers before deployment
create table if not exists public.simulations (
  id                  uuid primary key default uuid_generate_v4(),
  coworker_id         uuid not null references public.coworkers(id) on delete cascade,
  operating_spec_id   uuid references public.operating_specs(id) on delete set null,

  -- Scenario
  scenario_name       text not null,
  scenario_type       text not null,  -- common, hard, custom, edge_case
  scenario_input      jsonb not null,

  -- Simulation result
  actions_taken       jsonb not null default '[]'::jsonb,
  decisions_made      jsonb not null default '[]'::jsonb,
  tools_used          jsonb not null default '[]'::jsonb,

  -- Assessment
  outcome             text not null,  -- success, failure, escalation, uncertain
  confidence          numeric(3,2),  -- 0.00 to 1.00
  risk_level          text check (risk_level in ('low', 'medium', 'high')),

  -- Strengths and weaknesses
  strengths           jsonb not null default '[]'::jsonb,
  weaknesses          jsonb not null default '[]'::jsonb,
  escalation_points   jsonb not null default '[]'::jsonb,

  -- Metadata
  created_at          timestamptz not null default now(),
  created_by          uuid references public.profiles(id) on delete set null
);

alter table public.simulations enable row level security;

create policy "simulations: users read own"
  on public.simulations for select
  using (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = simulations.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create policy "simulations: users insert own"
  on public.simulations for insert
  with check (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = simulations.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create index if not exists simulations_coworker_idx on public.simulations(coworker_id, created_at desc);
create index if not exists simulations_type_idx on public.simulations(scenario_type, outcome);

-- ─── shadow_mode_runs ──────────────────────────────────────────────────────────
-- Shadow mode: coworker observes and drafts but doesn't act
create table if not exists public.shadow_mode_runs (
  id                  uuid primary key default uuid_generate_v4(),
  coworker_id         uuid not null references public.coworkers(id) on delete cascade,

  -- Input
  event_type          text not null,
  event_data          jsonb not null,

  -- What Dobly would have done
  proposed_action      jsonb not null,
  proposed_message    text,
  reasoning           text,

  -- Owner comparison
  owner_action        jsonb,
  owner_approved      boolean,
  owner_feedback      text,

  -- Learning
  was_correct         boolean,
  learning_signal     jsonb,

  -- Metadata
  created_at          timestamptz not null default now()
);

alter table public.shadow_mode_runs enable row level security;

create policy "shadow_mode_runs: users read own"
  on public.shadow_mode_runs for select
  using (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = shadow_mode_runs.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create policy "shadow_mode_runs: users insert own"
  on public.shadow_mode_runs for insert
  with check (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = shadow_mode_runs.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create index if not exists shadow_mode_runs_coworker_idx on public.shadow_mode_runs(coworker_id, created_at desc);

-- ─── coworker_health ───────────────────────────────────────────────────────────
-- Health snapshots for scoring coworker performance
create table if not exists public.coworker_health (
  id                  uuid primary key default uuid_generate_v4(),
  coworker_id         uuid not null references public.coworkers(id) on delete cascade,

  -- Scores
  autonomy_score      numeric(3,2),  -- 0.00 to 1.00
  trust_score         numeric(3,2),  -- 0.00 to 1.00
  quality_score       numeric(3,2),  -- 0.00 to 1.00
  value_score         numeric(3,2),  -- 0.00 to 1.00

  -- Metrics
  response_speed      numeric,  -- average in seconds
  resolution_rate     numeric,  -- percentage
  escalation_rate     numeric,  -- percentage
  override_rate       numeric,  -- percentage
  conversion_rate     numeric,  -- percentage

  -- Business outcomes
  revenue_captured    numeric,
  revenue_recovered   numeric,
  time_saved_hours    numeric,

  -- Issues
  recent_mistakes     jsonb not null default '[]'::jsonb,
  top_improvements    jsonb not null default '[]'::jsonb,

  -- Health state
  health_state        text not null check (health_state in ('learning', 'reliable', 'needs_review', 'over_escalating', 'under_escalating', 'underperforming')),

  -- Metadata
  period_start        timestamptz not null,
  period_end          timestamptz not null,
  created_at          timestamptz not null default now()
);

alter table public.coworker_health enable row level security;

create policy "coworker_health: users read own"
  on public.coworker_health for select
  using (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = coworker_health.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create policy "coworker_health: users insert own"
  on public.coworker_health for insert
  with check (
    exists (
      select 1 from public.coworkers
      where public.coworkers.id = coworker_health.coworker_id
        and public.coworkers.user_id = auth.uid()
    )
  );

create index if not exists coworker_health_coworker_idx on public.coworker_health(coworker_id, period_end desc);

-- ─── briefings ────────────────────────────────────────────────────────────────
-- Owner briefings generated from operational state
create table if not exists public.briefings (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,

  -- Briefing type
  briefing_type       text not null check (briefing_type in ('morning', 'evening', 'risk_digest', 'opportunity', 'weekly_summary')),

  -- Content
  business_status     text not null,  -- "Business is okay" / "Needs attention"
  what_happened       jsonb not null default '[]'::jsonb,  -- Key events
  what_matters        jsonb not null default '[]'::jsonb,  -- What needs attention
  what_changed        jsonb not null default '[]'::jsonb,  -- Changes since last
  dobly_recommendations jsonb not null default '[]'::jsonb,
  needs_decision      jsonb not null default '[]'::jsonb,
  opportunities       jsonb not null default '[]'::jsonb,
  risks               jsonb not null default '[]'::jsonb,

  -- Metrics summary
  metrics_summary     jsonb not null default '{}'::jsonb,

  -- Metadata
  period_start        timestamptz,
  period_end          timestamptz,
  created_at          timestamptz not null default now(),
  read_at             timestamptz
);

alter table public.briefings enable row level security;

create policy "briefings: users read own"
  on public.briefings for select
  using (auth.uid() = user_id);

create policy "briefings: users insert own"
  on public.briefings for insert
  with check (auth.uid() = user_id);

create policy "briefings: users update own"
  on public.briefings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists briefings_user_type_idx on public.briefings(user_id, briefing_type, created_at desc);
create index if not exists briefings_unread_idx on public.briefings(user_id) where read_at is null;

-- ─── signals ─────────────────────────────────────────────────────────────────
-- Proactive signals detected by Dobly
create table if not exists public.signals (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  coworker_id         uuid references public.coworkers(id) on delete set null,

  -- Signal type
  signal_type         text not null check (signal_type in ('churn_risk', 'demand_signal', 'supplier_issue', 'quality_issue', 'collections_gap', 'unusual_pattern', 'growth_opportunity')),

  -- Signal content
  title               text not null,
  description         text not null,
  confidence          numeric(3,2),  -- 0.00 to 1.00

  -- Evidence
  evidence            jsonb not null default '[]'::jsonb,
  affected_entities   jsonb not null default '[]'::jsonb,  -- customers, suppliers, etc.

  -- Impact assessment
  impact_level        text check (impact_level in ('low', 'medium', 'high', 'critical')),
  estimated_impact    jsonb not null default '{}'::jsonb,

  -- Recommended action
  recommended_action  text,
  action_type         text check (action_type in ('review', 'approve', 'investigate', 'ignore')),

  -- Status
  status              text not null default 'new' check (status in ('new', 'acknowledged', 'in_progress', 'resolved', 'dismissed')),

  -- Metadata
  detected_at         timestamptz not null default now(),
  resolved_at         timestamptz,
  created_at          timestamptz not null default now()
);

alter table public.signals enable row level security;

create policy "signals: users read own"
  on public.signals for select
  using (auth.uid() = user_id);

create policy "signals: users insert own"
  on public.signals for insert
  with check (auth.uid() = user_id);

create policy "signals: users update own"
  on public.signals for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists signals_user_type_idx on public.signals(user_id, signal_type, status, detected_at desc);
create index if not exists signals_unresolved_idx on public.signals(user_id) where status not in ('resolved', 'dismissed');

-- ─── decisions ────────────────────────────────────────────────────────────────
-- Decision learning capture for training judgment
create table if not exists public.decisions (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  coworker_id         uuid references public.coworkers(id) on delete set null,

  -- Context
  situation_type      text not null,  -- discount_decision, escalation_decision, refund_decision
  context             jsonb not null,  -- Full context of the decision

  -- What Dobly recommended
  dobly_recommendation jsonb not null,
  dobly_confidence    numeric(3,2),

  -- What the owner chose
  owner_choice        jsonb not null,
  owner_reasoning     text,

  -- Outcome
  outcome             text not null,  -- success, partial, failure
  outcome_metrics     jsonb not null default '{}'::jsonb,

  -- Learning
  pattern_extracted   jsonb,
  should_automate     boolean,
  automation_conditions jsonb,

  -- Metadata
  created_at          timestamptz not null default now(),
  outcome_at          timestamptz
);

alter table public.decisions enable row level security;

create policy "decisions: users read own"
  on public.decisions for select
  using (auth.uid() = user_id);

create policy "decisions: users insert own"
  on public.decisions for insert
  with check (auth.uid() = user_id);

create policy "decisions: users update own"
  on public.decisions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists decisions_user_type_idx on public.decisions(user_id, situation_type, created_at desc);
create index if not exists decisions_coworker_idx on public.decisions(coworker_id, created_at desc);

-- ─── escalations ──────────────────────────────────────────────────────────────
-- Escalations with trust ramp tracking
create table if not exists public.escalations (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  coworker_id         uuid references public.coworkers(id) on delete set null,

  -- Escalation context
  escalation_type     text not null check (escalation_type in ('approval', 'human_review', 'risk', 'failure', 'uncertainty')),
  reason              text not null,
  context             jsonb not null,

  -- Trust ramp info
  trust_level_at_time numeric(3,2),  -- 0.00 to 1.00
  autonomy_level      text,  -- What autonomy level when escalated

  -- Owner action
  owner_action        text check (owner_action in ('approved', 'rejected', 'modified', 'escalated_further')),
  owner_feedback      text,
  action_taken_at     timestamptz,

  -- Learning
  was_correct_escalation boolean,
  learning_signal     jsonb,

  -- Status
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'modified', 'escalated_further')),

  -- Metadata
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

alter table public.escalations enable row level security;

create policy "escalations: users read own"
  on public.escalations for select
  using (auth.uid() = user_id);

create policy "escalations: users insert own"
  on public.escalations for insert
  with check (auth.uid() = user_id);

create policy "escalations: users update own"
  on public.escalations for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ─── account_deletion_requests ────────────────────────────────────────────────
-- Track account deletion requests and reasons for improvement
create table if not exists public.account_deletion_requests (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  email               text not null,
  reason              text not null,
  requested_at        timestamptz not null default now(),
  processed_at        timestamptz,
  processed_by        uuid references auth.users(id),
  notes               text
);

alter table public.account_deletion_requests enable row level security;

create policy "account_deletion_requests: users read own"
  on public.account_deletion_requests for select
  using (auth.uid() = user_id);

create policy "account_deletion_requests: users insert own"
  on public.account_deletion_requests for insert
  with check (auth.uid() = user_id);

create policy "account_deletion_requests: service role all"
  on public.account_deletion_requests for all
  using (auth.role() = 'service_role');

create index if not exists escalations_user_idx on public.escalations(user_id, created_at desc);
create index if not exists escalations_coworker_idx on public.escalations(coworker_id, created_at desc);
create index if not exists escalations_status_idx on public.escalations(status, created_at desc);

-- ─── voice_commands ────────────────────────────────────────────────────────────
-- Voice command logs for analytics and learning
create table if not exists public.voice_commands (
  id                  uuid primary key default uuid_generate_v4(),
  user_id             uuid not null references public.profiles(id) on delete cascade,

  -- Command content
  transcript           text not null,
  action              text,
  target              text,

  -- Processing
  processed_at        timestamptz not null,
  success             boolean not null default true,
  error_message       text,

  -- Metadata
  created_at          timestamptz not null default now()
);

alter table public.voice_commands enable row level security;

create policy "voice_commands: users read own"
  on public.voice_commands for select
  using (auth.uid() = user_id);

create policy "voice_commands: users insert own"
  on public.voice_commands for insert
  with check (auth.uid() = user_id);

create index if not exists voice_commands_user_idx on public.voice_commands(user_id, created_at desc);
create index if not exists voice_commands_action_idx on public.voice_commands(action, created_at desc);

-- Triggers for updated_at
create trigger coworkers_updated_at
  before update on public.coworkers
  for each row execute procedure public.set_updated_at();

create trigger standards_updated_at
  before update on public.standards
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- Dobly Pods
-- Public product object for modular digital helpers. Pods compose
-- only the capabilities each requested job needs.
-- ============================================================

create table if not exists public.pods (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  name              text not null,
  label             text not null,
  purpose           text not null,
  source_prompt     text not null,
  audience          text not null default 'both' check (audience in ('personal', 'business', 'both')),
  mode              text not null default 'draft' check (mode in ('draft', 'supervised', 'active', 'paused', 'archived')),
  status            text not null default 'draft' check (status in ('draft', 'supervised', 'active', 'paused', 'archived')),
  spec              jsonb not null,
  readiness_score   integer not null default 0 check (readiness_score >= 0 and readiness_score <= 100),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table public.pods enable row level security;

drop policy if exists "pods: users read own" on public.pods;
create policy "pods: users read own"
  on public.pods for select
  using (auth.uid() = user_id);

drop policy if exists "pods: users insert own" on public.pods;
create policy "pods: users insert own"
  on public.pods for insert
  with check (auth.uid() = user_id);

drop policy if exists "pods: users update own" on public.pods;
create policy "pods: users update own"
  on public.pods for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "pods: users delete own" on public.pods;
create policy "pods: users delete own"
  on public.pods for delete
  using (auth.uid() = user_id);

create table if not exists public.pod_versions (
  id              uuid primary key default uuid_generate_v4(),
  pod_id          uuid not null references public.pods(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  version_number  integer not null,
  spec            jsonb not null,
  change_summary  text not null default '',
  status          text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  created_at      timestamptz not null default now(),
  unique (pod_id, version_number)
);

alter table public.pod_versions enable row level security;

drop policy if exists "pod_versions: users read own" on public.pod_versions;
create policy "pod_versions: users read own"
  on public.pod_versions for select
  using (auth.uid() = user_id);

drop policy if exists "pod_versions: users insert own" on public.pod_versions;
create policy "pod_versions: users insert own"
  on public.pod_versions for insert
  with check (auth.uid() = user_id);

create table if not exists public.pod_activity_events (
  id          uuid primary key default uuid_generate_v4(),
  pod_id      uuid not null references public.pods(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  event_type  text not null,
  event_data  jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

alter table public.pod_activity_events enable row level security;

drop policy if exists "pod_activity_events: users read own" on public.pod_activity_events;
create policy "pod_activity_events: users read own"
  on public.pod_activity_events for select
  using (auth.uid() = user_id);

drop policy if exists "pod_activity_events: users insert own" on public.pod_activity_events;
create policy "pod_activity_events: users insert own"
  on public.pod_activity_events for insert
  with check (auth.uid() = user_id);

create table if not exists public.pod_runs (
  id              uuid primary key default uuid_generate_v4(),
  pod_id          uuid not null references public.pods(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  status          text not null default 'running' check (status in ('running', 'awaiting_approval', 'success', 'failed')),
  trigger_type    text not null default 'manual',
  trigger_payload jsonb not null default '{}'::jsonb,
  result          jsonb not null default '{}'::jsonb,
  error_message   text,
  started_at      timestamptz not null default now(),
  finished_at     timestamptz
);

alter table public.pod_runs enable row level security;

drop policy if exists "pod_runs: users read own" on public.pod_runs;
create policy "pod_runs: users read own"
  on public.pod_runs for select
  using (auth.uid() = user_id);

drop policy if exists "pod_runs: users insert own" on public.pod_runs;
create policy "pod_runs: users insert own"
  on public.pod_runs for insert
  with check (auth.uid() = user_id);

drop policy if exists "pod_runs: users update own" on public.pod_runs;
create policy "pod_runs: users update own"
  on public.pod_runs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists pods_user_updated_idx on public.pods(user_id, updated_at desc);
create index if not exists pods_user_status_idx on public.pods(user_id, status, updated_at desc);
create index if not exists pod_versions_pod_version_idx on public.pod_versions(pod_id, version_number desc);
create index if not exists pod_activity_pod_created_idx on public.pod_activity_events(pod_id, created_at desc);
create index if not exists pod_runs_pod_started_idx on public.pod_runs(pod_id, started_at desc);

create trigger pods_updated_at
  before update on public.pods
  for each row execute procedure public.set_updated_at();
