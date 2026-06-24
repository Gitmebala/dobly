create table if not exists public.outcome_contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  entity_type text not null check (entity_type in ('operator', 'coworker', 'runtime_command')),
  entity_id uuid null,
  title text not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'needs_review')),
  score numeric(5,4) not null default 0,
  summary text not null default '',
  contract jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists outcome_contracts_entity_idx
  on public.outcome_contracts(user_id, entity_type, entity_id, updated_at desc);

create index if not exists outcome_contracts_score_idx
  on public.outcome_contracts(user_id, status, score desc, updated_at desc);

create or replace function public.set_outcome_contracts_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_outcome_contracts_updated_at on public.outcome_contracts;
create trigger trg_outcome_contracts_updated_at
before update on public.outcome_contracts
for each row
execute function public.set_outcome_contracts_updated_at();
