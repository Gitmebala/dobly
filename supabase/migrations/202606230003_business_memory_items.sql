-- Dobly Business Memory
-- Stores the business brain used by department workers, chatbots, voice agents,
-- automations, General Manager, and Boardroom.

create table if not exists public.business_memory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  scope text not null default 'global',
  title text not null,
  body text not null,
  tags text[] not null default '{}',
  source text not null default 'manual',
  confidence numeric not null default 1.0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_memory_items_kind_check check (
    kind in (
      'business_profile',
      'service',
      'product',
      'faq',
      'policy',
      'tone',
      'customer_note',
      'sales_rule',
      'support_rule',
      'finance_rule',
      'content_example',
      'decision',
      'escalation_rule'
    )
  ),
  constraint business_memory_items_scope_check check (
    scope in (
      'global',
      'reception',
      'sales',
      'marketing',
      'support',
      'finance',
      'operations',
      'general_manager',
      'boardroom'
    )
  ),
  constraint business_memory_items_confidence_check check (confidence >= 0 and confidence <= 1)
);

create index if not exists business_memory_items_user_scope_idx
  on public.business_memory_items (user_id, scope, kind, updated_at desc);

create index if not exists business_memory_items_tags_idx
  on public.business_memory_items using gin (tags);

create index if not exists business_memory_items_body_search_idx
  on public.business_memory_items using gin (
    to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
  );

alter table public.business_memory_items enable row level security;

drop policy if exists "Users can view their business memory"
  on public.business_memory_items;

create policy "Users can view their business memory"
  on public.business_memory_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can manage their business memory"
  on public.business_memory_items;

create policy "Users can manage their business memory"
  on public.business_memory_items
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
