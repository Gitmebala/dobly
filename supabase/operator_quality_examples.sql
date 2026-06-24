create table if not exists public.operator_quality_examples (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  operator_id uuid references public.dobly_operators(id) on delete cascade,
  lane_id text not null,
  artifact_kind text not null,
  quality_level text not null check (quality_level in ('gold', 'acceptable', 'rejected')),
  title text not null,
  content jsonb not null default '{}'::jsonb,
  rationale text,
  tags jsonb not null default '[]'::jsonb,
  source_artifact_id uuid references public.software_execution_artifacts(id) on delete set null,
  source_feedback_id uuid references public.operator_chat_feedback(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists operator_quality_examples_user_lane_idx
  on public.operator_quality_examples(user_id, lane_id, artifact_kind, updated_at desc);

create index if not exists operator_quality_examples_operator_idx
  on public.operator_quality_examples(operator_id, quality_level, updated_at desc);

alter table public.operator_quality_examples enable row level security;

drop policy if exists "operator_quality_examples_owner_all" on public.operator_quality_examples;
create policy "operator_quality_examples_owner_all" on public.operator_quality_examples
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists operator_quality_examples_updated_at on public.operator_quality_examples;
create trigger operator_quality_examples_updated_at
before update on public.operator_quality_examples
for each row execute function public.set_updated_at();
