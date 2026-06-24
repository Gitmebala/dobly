create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  kind text not null,
  title text not null,
  body text not null default '',
  href text null,
  severity text not null default 'info' check (severity in ('info', 'success', 'warning', 'error')),
  source_type text null,
  source_id uuid null,
  read_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (user_id, source_type, source_id, kind)
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, created_at desc) where read_at is null;
alter table public.notifications enable row level security;
drop policy if exists "Users can read own notifications" on public.notifications;
create policy "Users can read own notifications" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "Users can update own notifications" on public.notifications;
create policy "Users can update own notifications" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.dobly_notify_runtime_approval() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, workspace_id, kind, title, body, href, severity, source_type, source_id)
  values (new.user_id, new.workspace_id, 'approval', new.title, new.message, '/dashboard/approvals',
    case when new.risk_level = 'high' then 'warning' else 'info' end, 'runtime_approval', new.id)
  on conflict (user_id, source_type, source_id, kind) do nothing;
  return new;
end $$;

drop trigger if exists runtime_approval_notification on public.runtime_approvals;
create trigger runtime_approval_notification after insert on public.runtime_approvals
for each row when (new.status = 'pending') execute function public.dobly_notify_runtime_approval();

create or replace function public.dobly_notify_failed_run() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'failed' then return new; end if;
  if tg_op = 'UPDATE' and old.status is not distinct from new.status then return new; end if;
  insert into public.notifications(user_id, workspace_id, kind, title, body, href, severity, source_type, source_id)
  values (new.user_id, new.workspace_id, 'run_failed', coalesce(new.tool_label, 'Coworker run failed'),
    coalesce(new.error_message, new.summary, 'The run could not complete.'), '/dashboard/activity', 'error', 'software_execution_run', new.id)
  on conflict (user_id, source_type, source_id, kind) do nothing;
  return new;
end $$;

drop trigger if exists failed_run_notification on public.software_execution_runs;
create trigger failed_run_notification after insert or update of status on public.software_execution_runs
for each row execute function public.dobly_notify_failed_run();
