create or replace function public.dobly_workspace_can_view(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.status <> 'archived' and (
      w.owner_user_id = auth.uid() or exists (
        select 1 from public.workspace_members m
        where m.workspace_id = w.id and m.user_id = auth.uid() and m.status = 'active'
      )
    )
  );
$$;

create or replace function public.dobly_workspace_can_write(p_workspace_id uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.workspaces w
    where w.id = p_workspace_id and w.status = 'active' and (
      w.owner_user_id = auth.uid() or exists (
        select 1 from public.workspace_members m
        where m.workspace_id = w.id and m.user_id = auth.uid() and m.status = 'active'
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
  table_name text;
  tables text[] := array[
    'workspace_tasks', 'workspace_projects', 'workspace_documents',
    'business_memory_items', 'dobly_operators', 'dobly_operator_loops',
    'software_execution_runs', 'software_execution_artifacts',
    'runtime_approvals', 'runtime_audit_events', 'operator_conversations',
    'operator_messages', 'operator_chat_messages', 'operator_chat_events'
  ];
begin
  foreach table_name in array tables loop
    if to_regclass('public.' || table_name) is not null and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and information_schema.columns.table_name = table_name and column_name = 'workspace_id'
    ) then
      execute format('alter table public.%I enable row level security', table_name);
      execute format('drop policy if exists "Workspace members can view %s" on public.%I', table_name, table_name);
      execute format('create policy "Workspace members can view %s" on public.%I for select using (workspace_id is not null and public.dobly_workspace_can_view(workspace_id))', table_name, table_name);
      execute format('drop policy if exists "Workspace operators can write %s" on public.%I', table_name, table_name);
      execute format('create policy "Workspace operators can write %s" on public.%I for all using (workspace_id is not null and public.dobly_workspace_can_write(workspace_id)) with check (workspace_id is not null and public.dobly_workspace_can_write(workspace_id))', table_name, table_name);
    end if;
  end loop;
end $$;
