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
  plan          text not null default 'free' check (plan in ('free', 'starter', 'pro', 'agency')),
  notification_preference text default 'app' check (notification_preference in ('app', 'email', 'whatsapp')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  workflows_generated     integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.profiles add column if not exists notification_preference text default 'app';

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

create policy "connection_secrets: users read own"
  on public.connection_secrets for select
  using (
    exists (
      select 1 from public.connections
      where public.connections.id = connection_id
        and public.connections.user_id = auth.uid()
    )
  );

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
  channel           text not null check (channel in ('whatsapp', 'email')),
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
drop policy if exists "connection_secrets: users read own" on public.connection_secrets;
drop policy if exists "connection_secrets: users insert own" on public.connection_secrets;
drop policy if exists "connection_secrets: users update own" on public.connection_secrets;

drop policy if exists "job_queue: users read own" on public.job_queue;
drop policy if exists "job_queue: users insert own" on public.job_queue;
