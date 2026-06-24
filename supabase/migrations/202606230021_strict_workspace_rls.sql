create or replace function public.dobly_workspace_can_view(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.status <> 'archived'
      and (
        w.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.workspace_members m
          where m.workspace_id = w.id
            and m.user_id = auth.uid()
            and m.status = 'active'
        )
      )
  );
$$;

create or replace function public.dobly_workspace_can_write(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
set row_security = off
as $$
  select exists (
    select 1
    from public.workspaces w
    where w.id = p_workspace_id
      and w.status = 'active'
      and (
        w.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.workspace_members m
          where m.workspace_id = w.id
            and m.user_id = auth.uid()
            and m.status = 'active'
            and m.role in ('admin', 'operator')
        )
      )
  );
$$;

revoke all on function public.dobly_workspace_can_view(uuid) from public;
revoke all on function public.dobly_workspace_can_write(uuid) from public;
grant execute on function public.dobly_workspace_can_view(uuid) to authenticated, service_role;
grant execute on function public.dobly_workspace_can_write(uuid) to authenticated, service_role;

do $$
declare
  target record;
  existing_policy record;
begin
  for target in
    select columns.table_name
    from information_schema.columns
    join information_schema.tables
      on tables.table_schema = columns.table_schema
     and tables.table_name = columns.table_name
    where columns.table_schema = 'public'
      and columns.column_name = 'workspace_id'
      and tables.table_type = 'BASE TABLE'
      and columns.table_name not in ('workspaces', 'workspace_members', 'workspace_invitations')
  loop
    execute format('alter table public.%I enable row level security', target.table_name);

    for existing_policy in
      select policyname
      from pg_policies
      where schemaname = 'public' and tablename = target.table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        existing_policy.policyname,
        target.table_name
      );
    end loop;

    execute format(
      'create policy %I on public.%I for select to authenticated using (public.dobly_workspace_can_view(workspace_id))',
      'Active workspace members can view',
      target.table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.dobly_workspace_can_write(workspace_id))',
      'Workspace operators can insert',
      target.table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.dobly_workspace_can_write(workspace_id)) with check (public.dobly_workspace_can_write(workspace_id))',
      'Workspace operators can update',
      target.table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.dobly_workspace_can_write(workspace_id))',
      'Workspace operators can delete',
      target.table_name
    );
  end loop;
end
$$;

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

do $$
declare existing_policy record;
begin
  for existing_policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'workspaces'
  loop execute format('drop policy if exists %I on public.workspaces', existing_policy.policyname); end loop;
  for existing_policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'workspace_members'
  loop execute format('drop policy if exists %I on public.workspace_members', existing_policy.policyname); end loop;
  for existing_policy in select policyname from pg_policies where schemaname = 'public' and tablename = 'workspace_invitations'
  loop execute format('drop policy if exists %I on public.workspace_invitations', existing_policy.policyname); end loop;
end
$$;

create policy "Members can view their workspace" on public.workspaces
for select to authenticated using (public.dobly_workspace_can_view(id));
create policy "Users can create owned workspaces" on public.workspaces
for insert to authenticated with check (owner_user_id = auth.uid());
create policy "Workspace managers can update workspaces" on public.workspaces
for update to authenticated using (public.dobly_workspace_can_write(id))
with check (public.dobly_workspace_can_write(id));
create policy "Owners can delete workspaces" on public.workspaces
for delete to authenticated using (owner_user_id = auth.uid());

create policy "Members can view workspace membership" on public.workspace_members
for select to authenticated using (public.dobly_workspace_can_view(workspace_id));
create policy "Managers can add workspace members" on public.workspace_members
for insert to authenticated with check (public.dobly_workspace_can_write(workspace_id));
create policy "Managers can update workspace members" on public.workspace_members
for update to authenticated using (public.dobly_workspace_can_write(workspace_id))
with check (public.dobly_workspace_can_write(workspace_id));
create policy "Managers can remove workspace members" on public.workspace_members
for delete to authenticated using (public.dobly_workspace_can_write(workspace_id));

create policy "Managers can view workspace invitations" on public.workspace_invitations
for select to authenticated using (public.dobly_workspace_can_write(workspace_id));
create policy "Managers can create workspace invitations" on public.workspace_invitations
for insert to authenticated with check (
  public.dobly_workspace_can_write(workspace_id) and invited_by = auth.uid()
);
create policy "Managers can update workspace invitations" on public.workspace_invitations
for update to authenticated using (public.dobly_workspace_can_write(workspace_id))
with check (public.dobly_workspace_can_write(workspace_id));
create policy "Managers can revoke workspace invitations" on public.workspace_invitations
for delete to authenticated using (public.dobly_workspace_can_write(workspace_id));
