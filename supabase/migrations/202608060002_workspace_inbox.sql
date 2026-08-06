-- /dashboard/inbox and /api/inbox have read and written to
-- public.workspace_inbox since it was built, but the table never
-- existed - GET silently returned an empty list (page.tsx only checked
-- `data`, never `error`) and POST/PATCH returned a 500. The inbox has
-- been silently unusable for every user since launch.

create table if not exists public.workspace_inbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  content text not null,
  detected_type text not null default 'note' check (detected_type in ('task', 'idea', 'note', 'follow_up')),
  status text not null default 'unsorted' check (status in ('unsorted', 'organized', 'archived')),
  destination text,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_inbox_user_status_idx on public.workspace_inbox (user_id, status, created_at desc);

drop trigger if exists set_updated_at on public.workspace_inbox;
create trigger set_updated_at before update on public.workspace_inbox
  for each row execute function public.dobly_set_updated_at();

alter table public.workspace_inbox enable row level security;

drop policy if exists "workspace_inbox: owner full access" on public.workspace_inbox;
create policy "workspace_inbox: owner full access" on public.workspace_inbox
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "Workspace members can view workspace_inbox" on public.workspace_inbox;
create policy "Workspace members can view workspace_inbox" on public.workspace_inbox
  for select using (workspace_id is not null and public.dobly_workspace_can_view(workspace_id));
drop policy if exists "Workspace operators can write workspace_inbox" on public.workspace_inbox;
create policy "Workspace operators can write workspace_inbox" on public.workspace_inbox
  for all using (workspace_id is not null and public.dobly_workspace_can_write(workspace_id))
  with check (workspace_id is not null and public.dobly_workspace_can_write(workspace_id));
