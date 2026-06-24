create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null check (role in ('admin', 'operator', 'analyst', 'viewer')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  invited_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_by uuid null references auth.users(id) on delete set null,
  accepted_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, email)
);

create index if not exists workspace_invitations_email_status_idx
  on public.workspace_invitations (lower(email), status, expires_at desc);

alter table public.workspace_invitations enable row level security;

drop policy if exists "Workspace managers can read invitations" on public.workspace_invitations;
create policy "Workspace managers can read invitations" on public.workspace_invitations for select
using (
  invited_by = auth.uid() or exists (
    select 1 from public.workspaces w where w.id = workspace_id and w.owner_user_id = auth.uid()
  )
);
