-- Dobly Usage Events
-- Tracks billable/limited product usage for plan enforcement.

create table if not exists public.usage_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  metric text not null,
  quantity numeric not null default 1,
  source text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint usage_events_metric_check check (
    metric in (
      'ai_actions',
      'automation_runs',
      'chatbot_conversations',
      'voice_minutes',
      'sms_messages',
      'whatsapp_conversations',
      'memory_items',
      'workers',
      'operators',
      'loops',
      'connectors',
      'storage_gb',
      'departments',
      'business_channels'
    )
  ),
  constraint usage_events_quantity_check check (quantity >= 0)
);

create index if not exists usage_events_user_metric_idx
  on public.usage_events (user_id, metric, created_at desc);

alter table public.usage_events enable row level security;

drop policy if exists "Users can view their usage events"
  on public.usage_events;

create policy "Users can view their usage events"
  on public.usage_events
  for select
  using (auth.uid() = user_id);
