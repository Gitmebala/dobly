-- Dobly Business Channels
-- Apply this after the main Homebase schema to track phone, SMS, WhatsApp,
-- email, calendar, CRM, and content-tool setup state.

create table if not exists public.business_channel_connections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null,
  display_name text not null,
  external_identifier text null,
  status text not null default 'verification_required',
  setup_mode text null,
  capabilities text[] not null default '{}',
  user_steps text[] not null default '{}',
  dobly_steps text[] not null default '{}',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_channel_connections_status_check check (
    status in (
      'not_connected',
      'verification_required',
      'approval_pending',
      'ready_to_test',
      'live',
      'needs_attention'
    )
  ),
  constraint business_channel_connections_channel_check check (
    channel_id in (
      'business_phone',
      'business_sms',
      'whatsapp_business',
      'business_email',
      'website_chat',
      'calendar',
      'crm',
      'content_tools'
    )
  )
);

create unique index if not exists business_channel_connections_unique_channel
  on public.business_channel_connections (
    user_id,
    coalesce(workspace_id, '00000000-0000-0000-0000-000000000000'::uuid),
    channel_id,
    coalesce(external_identifier, '')
  );

create index if not exists business_channel_connections_user_status_idx
  on public.business_channel_connections (user_id, status);

alter table public.business_channel_connections enable row level security;

drop policy if exists "Users can view their business channel connections"
  on public.business_channel_connections;

create policy "Users can view their business channel connections"
  on public.business_channel_connections
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their business channel connections"
  on public.business_channel_connections;

create policy "Users can manage their business channel connections"
  on public.business_channel_connections
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
