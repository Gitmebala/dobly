-- workspace_tasks, workspace_projects, and workspace_documents never
-- existed as real tables. Every query against them from
-- /dashboard/tasks, /dashboard/projects, /dashboard/documents, the
-- activity feed, and search errored with "relation does not exist" on
-- every single call - silently, because the calling code only ever
-- checked `data`, never `error`, so it just rendered an empty state
-- forever. This creates the real tables with a schema that actually
-- supports project <-> task linkage, subtasks, dependencies, and
-- assigning a task to a human teammate OR an AI operator - the
-- assign-to-operator column is what lets a task become something Dobly
-- actually executes instead of only tracks.

create table if not exists public.workspace_projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  name text not null,
  description text not null default '',
  status text not null default 'active' check (status in ('active', 'paused', 'completed')),
  currency text not null default 'KES',
  budget_minor bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.workspace_projects(id) on delete set null,
  parent_task_id uuid references public.workspace_tasks(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'open' check (status in ('open', 'in_progress', 'blocked', 'completed')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  due_at timestamptz,
  completed_at timestamptz,
  assignee_user_id uuid references auth.users(id) on delete set null,
  assignee_operator_id uuid references public.dobly_operators(id) on delete set null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_tasks_single_assignee check (
    assignee_user_id is null or assignee_operator_id is null
  )
);

create table if not exists public.workspace_task_dependencies (
  task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  depends_on_task_id uuid not null references public.workspace_tasks(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (task_id, depends_on_task_id),
  constraint workspace_task_dependencies_no_self check (task_id <> depends_on_task_id)
);

create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  project_id uuid references public.workspace_projects(id) on delete set null,
  title text not null,
  content text not null default '',
  type text not null default 'note',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists workspace_projects_user_idx on public.workspace_projects (user_id);
create index if not exists workspace_projects_workspace_idx on public.workspace_projects (workspace_id);
create index if not exists workspace_tasks_user_idx on public.workspace_tasks (user_id);
create index if not exists workspace_tasks_workspace_idx on public.workspace_tasks (workspace_id);
create index if not exists workspace_tasks_project_idx on public.workspace_tasks (project_id);
create index if not exists workspace_tasks_parent_idx on public.workspace_tasks (parent_task_id);
create index if not exists workspace_tasks_assignee_user_idx on public.workspace_tasks (assignee_user_id);
create index if not exists workspace_tasks_assignee_operator_idx on public.workspace_tasks (assignee_operator_id);
create index if not exists workspace_documents_user_idx on public.workspace_documents (user_id);
create index if not exists workspace_documents_project_idx on public.workspace_documents (project_id);

create or replace function public.dobly_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.workspace_projects;
create trigger set_updated_at before update on public.workspace_projects
  for each row execute function public.dobly_set_updated_at();

drop trigger if exists set_updated_at on public.workspace_tasks;
create trigger set_updated_at before update on public.workspace_tasks
  for each row execute function public.dobly_set_updated_at();

drop trigger if exists set_updated_at on public.workspace_documents;
create trigger set_updated_at before update on public.workspace_documents
  for each row execute function public.dobly_set_updated_at();

-- Owner-scoped RLS: a row's own user_id can always read/write it. This
-- mirrors how every other user-owned table in this codebase behaves and
-- is what the admin client (which every server route already uses for
-- these tables) needs a real policy to sit alongside, rather than RLS
-- enabled with zero policies, which silently blocks everything.
alter table public.workspace_projects enable row level security;
alter table public.workspace_tasks enable row level security;
alter table public.workspace_task_dependencies enable row level security;
alter table public.workspace_documents enable row level security;

drop policy if exists "workspace_projects: owner full access" on public.workspace_projects;
create policy "workspace_projects: owner full access" on public.workspace_projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workspace_tasks: owner full access" on public.workspace_tasks;
create policy "workspace_tasks: owner full access" on public.workspace_tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "workspace_tasks: assignee can view and update" on public.workspace_tasks;
create policy "workspace_tasks: assignee can view and update" on public.workspace_tasks
  for select using (auth.uid() = assignee_user_id);

drop policy if exists "workspace_task_dependencies: owner full access" on public.workspace_task_dependencies;
create policy "workspace_task_dependencies: owner full access" on public.workspace_task_dependencies
  for all using (
    exists (select 1 from public.workspace_tasks t where t.id = task_id and t.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.workspace_tasks t where t.id = task_id and t.user_id = auth.uid())
  );

drop policy if exists "workspace_documents: owner full access" on public.workspace_documents;
create policy "workspace_documents: owner full access" on public.workspace_documents
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Fold these into the workspace-member policies too, same pattern as
-- 202608050001_workspace_rls.sql, now that the tables actually exist.
drop policy if exists "Workspace members can view workspace_projects" on public.workspace_projects;
create policy "Workspace members can view workspace_projects" on public.workspace_projects
  for select using (workspace_id is not null and public.dobly_workspace_can_view(workspace_id));
drop policy if exists "Workspace operators can write workspace_projects" on public.workspace_projects;
create policy "Workspace operators can write workspace_projects" on public.workspace_projects
  for all using (workspace_id is not null and public.dobly_workspace_can_write(workspace_id))
  with check (workspace_id is not null and public.dobly_workspace_can_write(workspace_id));

drop policy if exists "Workspace members can view workspace_tasks" on public.workspace_tasks;
create policy "Workspace members can view workspace_tasks" on public.workspace_tasks
  for select using (workspace_id is not null and public.dobly_workspace_can_view(workspace_id));
drop policy if exists "Workspace operators can write workspace_tasks" on public.workspace_tasks;
create policy "Workspace operators can write workspace_tasks" on public.workspace_tasks
  for all using (workspace_id is not null and public.dobly_workspace_can_write(workspace_id))
  with check (workspace_id is not null and public.dobly_workspace_can_write(workspace_id));

drop policy if exists "Workspace members can view workspace_documents" on public.workspace_documents;
create policy "Workspace members can view workspace_documents" on public.workspace_documents
  for select using (workspace_id is not null and public.dobly_workspace_can_view(workspace_id));
drop policy if exists "Workspace operators can write workspace_documents" on public.workspace_documents;
create policy "Workspace operators can write workspace_documents" on public.workspace_documents
  for all using (workspace_id is not null and public.dobly_workspace_can_write(workspace_id))
  with check (workspace_id is not null and public.dobly_workspace_can_write(workspace_id));

grant all on public.workspace_projects to authenticated, service_role;
grant all on public.workspace_tasks to authenticated, service_role;
grant all on public.workspace_task_dependencies to authenticated, service_role;
grant all on public.workspace_documents to authenticated, service_role;
