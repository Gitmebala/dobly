-- Dobly workspace membership and role model
-- Apply after supabase/dobly_operating_system_schema.sql

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'operator', 'analyst', 'viewer')),
  status text not null default 'active' check (status in ('active', 'invited', 'suspended', 'removed')),
  permissions jsonb not null default '{}'::jsonb,
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists workspace_members_user_status_idx
  on public.workspace_members(user_id, status, created_at desc);

create index if not exists workspace_members_workspace_status_idx
  on public.workspace_members(workspace_id, status, created_at asc);

alter table public.workspace_members enable row level security;

drop policy if exists "workspace_members_owner_or_member_read" on public.workspace_members;
create policy "workspace_members_owner_or_member_read"
  on public.workspace_members for select
  using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
    or auth.uid() = user_id
    or exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role in ('owner', 'admin', 'operator', 'analyst')
    )
  );

drop policy if exists "workspace_members_owner_or_admin_insert" on public.workspace_members;
create policy "workspace_members_owner_or_admin_insert"
  on public.workspace_members for insert
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role in ('owner', 'admin')
    )
  );

drop policy if exists "workspace_members_owner_or_admin_update" on public.workspace_members;
create policy "workspace_members_owner_or_admin_update"
  on public.workspace_members for update
  using (
    exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.workspaces
      where workspaces.id = workspace_members.workspace_id
        and workspaces.owner_user_id = auth.uid()
    )
    or exists (
      select 1 from public.workspace_members as wm
      where wm.workspace_id = workspace_members.workspace_id
        and wm.user_id = auth.uid()
        and wm.status = 'active'
        and wm.role in ('owner', 'admin')
    )
  );

create trigger workspace_members_updated_at
  before update on public.workspace_members
  for each row execute procedure public.set_updated_at();
