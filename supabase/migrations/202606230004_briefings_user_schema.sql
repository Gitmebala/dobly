-- Brings older workspace-based briefing installs up to the current user-based app contract.
-- Safe to run more than once in the Supabase SQL editor.

alter table public.briefings
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists business_status text,
  add column if not exists what_happened jsonb not null default '[]'::jsonb,
  add column if not exists what_matters jsonb not null default '[]'::jsonb,
  add column if not exists what_changed jsonb not null default '[]'::jsonb,
  add column if not exists dobly_recommendations jsonb not null default '[]'::jsonb,
  add column if not exists needs_decision jsonb not null default '[]'::jsonb,
  add column if not exists opportunities jsonb not null default '[]'::jsonb,
  add column if not exists risks jsonb not null default '[]'::jsonb,
  add column if not exists metrics_summary jsonb not null default '{}'::jsonb,
  add column if not exists period_start timestamptz,
  add column if not exists period_end timestamptz,
  add column if not exists created_at timestamptz default now(),
  add column if not exists read_at timestamptz;

update public.briefings b
set
  user_id = coalesce(b.user_id, w.owner_user_id),
  business_status = coalesce(b.business_status, b.summary, b.title),
  created_at = coalesce(b.created_at, b.generated_at, now()),
  read_at = coalesce(b.read_at, b.acknowledged_at)
from public.workspaces w
where b.workspace_id = w.id
  and (b.user_id is null or b.business_status is null or b.created_at is null);

create index if not exists idx_briefings_user_created_at
  on public.briefings(user_id, created_at desc);

create index if not exists idx_briefings_user_type_created_at
  on public.briefings(user_id, briefing_type, created_at desc);
