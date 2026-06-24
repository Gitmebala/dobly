-- Dobly economic operating system
-- Safe to apply independently. Memory-vector additions are skipped until the
-- optional business_memory_items table exists.

create extension if not exists vector;

alter table if exists public.business_memory_items
  add column if not exists embedding vector(1536);

do $dobly_memory$
begin
  if to_regclass('public.business_memory_items') is not null then
    execute 'create index if not exists business_memory_items_embedding_idx
      on public.business_memory_items using ivfflat (embedding vector_cosine_ops)
      with (lists = 100)';

    execute $memory_function$
      create or replace function public.match_business_memory(
        p_user_id uuid,
        p_workspace_id uuid,
        p_embedding vector(1536),
        p_limit integer default 10
      ) returns table (id uuid, similarity double precision)
      language sql stable security definer set search_path = public as $function_body$
        select item.id, 1 - (item.embedding <=> p_embedding) as similarity
        from public.business_memory_items item
        where item.user_id = p_user_id
          and item.workspace_id is not distinct from p_workspace_id
          and item.embedding is not null
        order by item.embedding <=> p_embedding
        limit greatest(1, least(50, p_limit));
      $function_body$;
    $memory_function$;
  end if;
end;
$dobly_memory$;

create table if not exists public.billing_plan_versions (
  id uuid primary key default gen_random_uuid(),
  plan_id text not null,
  version integer not null,
  currency text not null default 'KES',
  monthly_price_minor bigint not null default 0 check (monthly_price_minor >= 0),
  annual_price_minor bigint not null default 0 check (annual_price_minor >= 0),
  operating_allowance_minor bigint not null default 0 check (operating_allowance_minor >= 0),
  entitlements jsonb not null default '{}'::jsonb,
  effective_from timestamptz not null default now(),
  retired_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (plan_id, version)
);

create table if not exists public.billing_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  market text not null default 'KE',
  currency text not null default 'KES',
  billing_email text null,
  phone_number text null,
  status text not null default 'active' check (status in ('active', 'grace', 'past_due', 'suspended', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_accounts_user_workspace_idx
  on public.billing_accounts (user_id, workspace_id) nulls not distinct;

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  billing_account_id uuid not null references public.billing_accounts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  plan_id text not null,
  plan_version integer not null default 1,
  provider text not null,
  provider_customer_id text null,
  provider_subscription_id text null,
  status text not null default 'pending' check (status in ('pending', 'active', 'grace', 'past_due', 'cancelled', 'expired')),
  current_period_start timestamptz null,
  current_period_end timestamptz null,
  cancel_at_period_end boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_subscriptions_provider_ref_idx
  on public.billing_subscriptions (provider, provider_subscription_id)
  where provider_subscription_id is not null;
create index if not exists billing_subscriptions_user_status_idx
  on public.billing_subscriptions (user_id, status, updated_at desc);

create table if not exists public.billing_payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  user_id uuid null references auth.users(id) on delete set null,
  workspace_id uuid null,
  plan_id text null,
  amount_minor bigint not null default 0,
  currency text not null default 'KES',
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  error_message text null,
  payload jsonb not null default '{}'::jsonb,
  processed_at timestamptz null,
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id)
);

create table if not exists public.billing_checkout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  provider text not null,
  reference text not null unique,
  plan_id text not null,
  amount_minor bigint not null check (amount_minor >= 0),
  currency text not null default 'KES',
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'expired', 'cancelled')),
  provider_checkout_id text null,
  provider_invoice_id text null,
  checkout_url text null,
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_checkout_sessions_user_created_idx
  on public.billing_checkout_sessions (user_id, created_at desc);

create table if not exists public.billing_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  currency text not null default 'KES',
  available_minor bigint not null default 0 check (available_minor >= 0),
  reserved_minor bigint not null default 0 check (reserved_minor >= 0),
  lifetime_funded_minor bigint not null default 0 check (lifetime_funded_minor >= 0),
  lifetime_spent_minor bigint not null default 0 check (lifetime_spent_minor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_wallets_user_workspace_idx
  on public.billing_wallets (user_id, workspace_id) nulls not distinct;

create table if not exists public.billing_wallet_ledger (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.billing_wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  entry_type text not null check (entry_type in ('fund', 'debit', 'refund', 'adjustment', 'expiry')),
  amount_minor bigint not null,
  balance_after_minor bigint not null check (balance_after_minor >= 0),
  source text not null,
  idempotency_key text not null unique,
  external_reference text null,
  expires_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_wallet_ledger_wallet_created_idx
  on public.billing_wallet_ledger (wallet_id, created_at desc);

create table if not exists public.billing_usage_reservations (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.billing_wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  run_id uuid null,
  job_id uuid null,
  coworker_id uuid null,
  capability text not null,
  provider text not null,
  estimated_minor bigint not null check (estimated_minor >= 0),
  actual_minor bigint null check (actual_minor is null or actual_minor >= 0),
  status text not null default 'reserved' check (status in ('reserved', 'settled', 'released', 'expired')),
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null default (now() + interval '2 hours'),
  created_at timestamptz not null default now(),
  settled_at timestamptz null
);

create index if not exists billing_usage_reservations_wallet_status_idx
  on public.billing_usage_reservations (wallet_id, status, expires_at);

create table if not exists public.billing_usage_events (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid null references public.billing_usage_reservations(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  run_id uuid null,
  job_id uuid null,
  coworker_id uuid null,
  capability text not null,
  provider text not null,
  provider_model text null,
  quantity numeric not null default 1 check (quantity >= 0),
  unit text not null default 'action',
  estimated_cost_minor bigint not null default 0,
  actual_cost_minor bigint not null default 0,
  customer_cost_minor bigint not null default 0,
  status text not null check (status in ('succeeded', 'failed', 'cancelled', 'estimated')),
  provider_request_id text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_usage_events_user_created_idx
  on public.billing_usage_events (user_id, created_at desc);
create index if not exists billing_usage_events_provider_created_idx
  on public.billing_usage_events (provider, created_at desc);

create table if not exists public.billing_cost_catalog (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  capability text not null,
  provider_model text not null default '',
  unit text not null,
  currency text not null default 'KES',
  cost_per_unit_minor numeric not null check (cost_per_unit_minor >= 0),
  minimum_cost_minor bigint not null default 0 check (minimum_cost_minor >= 0),
  markup_bps integer not null default 0 check (markup_bps >= 0),
  market text not null default 'GLOBAL',
  effective_from timestamptz not null default now(),
  effective_to timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists billing_cost_catalog_lookup_idx
  on public.billing_cost_catalog (capability, market, effective_from desc);

create table if not exists public.billing_spending_policies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid null,
  monthly_cap_minor bigint null check (monthly_cap_minor is null or monthly_cap_minor >= 0),
  per_action_confirmation_minor bigint not null default 50000 check (per_action_confirmation_minor >= 0),
  auto_top_up_enabled boolean not null default false,
  auto_top_up_amount_minor bigint not null default 0 check (auto_top_up_amount_minor >= 0),
  auto_top_up_trigger_minor bigint not null default 0 check (auto_top_up_trigger_minor >= 0),
  pause_nonessential_at_percent integer not null default 95 check (pause_nonessential_at_percent between 1 and 100),
  hard_stop boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists billing_spending_policies_user_workspace_idx
  on public.billing_spending_policies (user_id, workspace_id) nulls not distinct;

create table if not exists public.billing_provider_accounts (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  market text not null default 'GLOBAL',
  currency text not null default 'KES',
  status text not null default 'inactive' check (status in ('inactive', 'sandbox', 'active', 'degraded', 'disabled')),
  funding_mode text not null default 'pay_as_you_go' check (funding_mode in ('free_allowance', 'pay_as_you_go', 'prepaid', 'connected_customer')),
  balance_minor bigint null,
  low_balance_threshold_minor bigint null,
  maximum_top_up_minor bigint null,
  last_balance_check_at timestamptz null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, market)
);

insert into public.billing_plan_versions
  (plan_id, version, currency, monthly_price_minor, annual_price_minor, operating_allowance_minor, entitlements)
values
  ('free', 1, 'KES', 0, 0, 5000, '{"trial":true,"paid_rails":false}'::jsonb),
  ('starter', 1, 'KES', 400000, 3840000, 80000, '{"market":"KE"}'::jsonb),
  ('operator', 1, 'KES', 1000000, 9600000, 250000, '{"market":"KE"}'::jsonb),
  ('command', 1, 'KES', 2500000, 24000000, 700000, '{"market":"KE"}'::jsonb)
on conflict (plan_id, version) do nothing;

insert into public.billing_provider_accounts
  (provider, market, currency, status, funding_mode, metadata)
values
  ('intasend', 'KE', 'KES', 'inactive', 'pay_as_you_go', '{"purpose":"primary_checkout"}'::jsonb),
  ('mpesa', 'KE', 'KES', 'inactive', 'pay_as_you_go', '{"purpose":"local_collection_and_renewal"}'::jsonb),
  ('paystack', 'KE', 'KES', 'inactive', 'pay_as_you_go', '{"purpose":"regional_checkout_fallback"}'::jsonb),
  ('africas_talking', 'KE', 'KES', 'inactive', 'prepaid', '{"purpose":"local_sms_and_voice"}'::jsonb),
  ('stripe', 'GLOBAL', 'USD', 'inactive', 'pay_as_you_go', '{"purpose":"international_checkout_fallback"}'::jsonb)
on conflict (provider, market) do nothing;

alter table public.billing_plan_versions enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.billing_subscriptions enable row level security;
alter table public.billing_payment_events enable row level security;
alter table public.billing_checkout_sessions enable row level security;
alter table public.billing_wallets enable row level security;
alter table public.billing_wallet_ledger enable row level security;
alter table public.billing_usage_reservations enable row level security;
alter table public.billing_usage_events enable row level security;
alter table public.billing_cost_catalog enable row level security;
alter table public.billing_spending_policies enable row level security;
alter table public.billing_provider_accounts enable row level security;

drop policy if exists "Billing plans are readable" on public.billing_plan_versions;
create policy "Billing plans are readable" on public.billing_plan_versions for select using (true);

drop policy if exists "Users read own billing accounts" on public.billing_accounts;
create policy "Users read own billing accounts" on public.billing_accounts for select using (auth.uid() = user_id);
drop policy if exists "Users read own checkout sessions" on public.billing_checkout_sessions;
create policy "Users read own checkout sessions" on public.billing_checkout_sessions for select using (auth.uid() = user_id);
drop policy if exists "Users read own subscriptions" on public.billing_subscriptions;
create policy "Users read own subscriptions" on public.billing_subscriptions for select using (auth.uid() = user_id);
drop policy if exists "Users read own wallets" on public.billing_wallets;
create policy "Users read own wallets" on public.billing_wallets for select using (auth.uid() = user_id);
drop policy if exists "Users read own wallet ledger" on public.billing_wallet_ledger;
create policy "Users read own wallet ledger" on public.billing_wallet_ledger for select using (auth.uid() = user_id);
drop policy if exists "Users read own usage reservations" on public.billing_usage_reservations;
create policy "Users read own usage reservations" on public.billing_usage_reservations for select using (auth.uid() = user_id);
drop policy if exists "Users read own billing usage" on public.billing_usage_events;
create policy "Users read own billing usage" on public.billing_usage_events for select using (auth.uid() = user_id);
drop policy if exists "Users manage own spending policies" on public.billing_spending_policies;
create policy "Users manage own spending policies" on public.billing_spending_policies
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.dobly_fund_wallet(
  p_user_id uuid,
  p_workspace_id uuid,
  p_amount_minor bigint,
  p_source text,
  p_idempotency_key text,
  p_external_reference text default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.billing_wallets
language plpgsql security definer set search_path = public as $$
declare
  v_wallet public.billing_wallets;
  v_inserted uuid;
begin
  if p_amount_minor <= 0 then raise exception 'Funding amount must be positive'; end if;

  insert into public.billing_wallets (user_id, workspace_id)
  values (p_user_id, p_workspace_id)
  on conflict do nothing;

  select * into v_wallet from public.billing_wallets
  where user_id = p_user_id and workspace_id is not distinct from p_workspace_id
  for update;

  insert into public.billing_wallet_ledger
    (wallet_id, user_id, workspace_id, entry_type, amount_minor, balance_after_minor, source, idempotency_key, external_reference, metadata)
  values
    (v_wallet.id, p_user_id, p_workspace_id, 'fund', p_amount_minor, v_wallet.available_minor + p_amount_minor, p_source, p_idempotency_key, p_external_reference, p_metadata)
  on conflict (idempotency_key) do nothing
  returning id into v_inserted;

  if v_inserted is not null then
    update public.billing_wallets set
      available_minor = available_minor + p_amount_minor,
      lifetime_funded_minor = lifetime_funded_minor + p_amount_minor,
      updated_at = now()
    where id = v_wallet.id returning * into v_wallet;
  end if;

  return v_wallet;
end;
$$;

create or replace function public.dobly_reserve_usage(
  p_user_id uuid,
  p_workspace_id uuid,
  p_capability text,
  p_provider text,
  p_estimated_minor bigint,
  p_idempotency_key text,
  p_run_id uuid default null,
  p_job_id uuid default null,
  p_coworker_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.billing_usage_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_wallet public.billing_wallets;
  v_reservation public.billing_usage_reservations;
begin
  if p_estimated_minor < 0 then raise exception 'Estimated amount cannot be negative'; end if;

  insert into public.billing_wallets (user_id, workspace_id)
  values (p_user_id, p_workspace_id)
  on conflict do nothing;

  select * into v_wallet from public.billing_wallets
  where user_id = p_user_id and workspace_id is not distinct from p_workspace_id
  for update;

  select * into v_reservation from public.billing_usage_reservations
  where idempotency_key = p_idempotency_key;
  if found then return v_reservation; end if;

  if v_wallet.available_minor - v_wallet.reserved_minor < p_estimated_minor then
    raise exception 'DOBLY_INSUFFICIENT_OPERATING_CAPACITY';
  end if;

  insert into public.billing_usage_reservations
    (wallet_id, user_id, workspace_id, run_id, job_id, coworker_id, capability, provider, estimated_minor, idempotency_key, metadata)
  values
    (v_wallet.id, p_user_id, p_workspace_id, p_run_id, p_job_id, p_coworker_id, p_capability, p_provider, p_estimated_minor, p_idempotency_key, p_metadata)
  returning * into v_reservation;

  update public.billing_wallets set reserved_minor = reserved_minor + p_estimated_minor, updated_at = now()
  where id = v_wallet.id;
  return v_reservation;
end;
$$;

create or replace function public.dobly_settle_usage(
  p_reservation_id uuid,
  p_actual_minor bigint,
  p_status text default 'succeeded',
  p_provider_request_id text default null,
  p_metadata jsonb default '{}'::jsonb
) returns public.billing_usage_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_reservation public.billing_usage_reservations;
  v_wallet public.billing_wallets;
begin
  if p_actual_minor < 0 then raise exception 'Actual amount cannot be negative'; end if;
  select * into v_reservation from public.billing_usage_reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_reservation.status = 'settled' then return v_reservation; end if;
  if v_reservation.status <> 'reserved' then raise exception 'Reservation is not active'; end if;

  select * into v_wallet from public.billing_wallets where id = v_reservation.wallet_id for update;
  if v_wallet.available_minor - greatest(0, v_wallet.reserved_minor - v_reservation.estimated_minor) < p_actual_minor then
    raise exception 'DOBLY_INSUFFICIENT_OPERATING_CAPACITY';
  end if;

  update public.billing_wallets set
    available_minor = available_minor - p_actual_minor,
    reserved_minor = greatest(0, reserved_minor - v_reservation.estimated_minor),
    lifetime_spent_minor = lifetime_spent_minor + p_actual_minor,
    updated_at = now()
  where id = v_wallet.id returning * into v_wallet;

  insert into public.billing_wallet_ledger
    (wallet_id, user_id, workspace_id, entry_type, amount_minor, balance_after_minor, source, idempotency_key, external_reference, metadata)
  values
    (v_wallet.id, v_reservation.user_id, v_reservation.workspace_id, 'debit', -p_actual_minor, v_wallet.available_minor,
     'usage_settlement', 'settlement:' || v_reservation.id::text, p_provider_request_id, p_metadata)
  on conflict (idempotency_key) do nothing;

  insert into public.billing_usage_events
    (reservation_id, user_id, workspace_id, run_id, job_id, coworker_id, capability, provider,
     estimated_cost_minor, actual_cost_minor, customer_cost_minor, status, provider_request_id, metadata)
  values
    (v_reservation.id, v_reservation.user_id, v_reservation.workspace_id, v_reservation.run_id, v_reservation.job_id,
     v_reservation.coworker_id, v_reservation.capability, v_reservation.provider, v_reservation.estimated_minor,
     p_actual_minor, p_actual_minor, p_status, p_provider_request_id, p_metadata);

  update public.billing_usage_reservations set
    actual_minor = p_actual_minor, status = 'settled', settled_at = now(), metadata = metadata || p_metadata
  where id = v_reservation.id returning * into v_reservation;
  return v_reservation;
end;
$$;

create or replace function public.dobly_release_usage(
  p_reservation_id uuid,
  p_reason text default 'released'
) returns public.billing_usage_reservations
language plpgsql security definer set search_path = public as $$
declare
  v_reservation public.billing_usage_reservations;
begin
  select * into v_reservation from public.billing_usage_reservations where id = p_reservation_id for update;
  if not found then raise exception 'Reservation not found'; end if;
  if v_reservation.status <> 'reserved' then return v_reservation; end if;

  update public.billing_wallets set
    reserved_minor = greatest(0, reserved_minor - v_reservation.estimated_minor), updated_at = now()
  where id = v_reservation.wallet_id;
  update public.billing_usage_reservations set
    status = 'released', settled_at = now(), metadata = metadata || jsonb_build_object('release_reason', p_reason)
  where id = p_reservation_id returning * into v_reservation;
  return v_reservation;
end;
$$;

create or replace function public.dobly_release_expired_reservations()
returns integer
language plpgsql security definer set search_path = public as $$
declare
  v_count integer;
begin
  with expired as (
    select wallet_id, sum(estimated_minor)::bigint as amount
    from public.billing_usage_reservations
    where status = 'reserved' and expires_at < now()
    group by wallet_id
  )
  update public.billing_wallets wallet set
    reserved_minor = greatest(0, wallet.reserved_minor - expired.amount),
    updated_at = now()
  from expired where wallet.id = expired.wallet_id;

  update public.billing_usage_reservations set
    status = 'expired', settled_at = now(), metadata = metadata || '{"release_reason":"reservation_expired"}'::jsonb
  where status = 'reserved' and expires_at < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.dobly_fund_wallet(uuid, uuid, bigint, text, text, text, jsonb) from public;
revoke all on function public.dobly_reserve_usage(uuid, uuid, text, text, bigint, text, uuid, uuid, uuid, jsonb) from public;
revoke all on function public.dobly_settle_usage(uuid, bigint, text, text, jsonb) from public;
revoke all on function public.dobly_release_usage(uuid, text) from public;
revoke all on function public.dobly_release_expired_reservations() from public;
do $dobly_memory_permissions$
begin
  if to_regprocedure('public.match_business_memory(uuid,uuid,vector,integer)') is not null then
    execute 'revoke all on function public.match_business_memory(uuid, uuid, vector, integer) from public';
  end if;
end;
$dobly_memory_permissions$;
