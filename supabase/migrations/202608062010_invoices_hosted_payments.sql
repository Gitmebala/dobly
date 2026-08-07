-- Two real problems found while building Dobly-hosted payment collection:
--
-- 1. src/lib/office/internal-tool-handlers.ts has been inserting into and
--    querying `invoices` using columns that never existed on this table
--    (user_id, invoice_number, customer_name, due_at) - every invoice
--    "creation" and overdue-payment check has been silently failing
--    (caught, reported as persisted:false, never actually saved) since
--    this was written. Adding the columns the code already assumes,
--    rather than rewriting every call site to force a pre-existing
--    customers row for a quick "draft an invoice for Jane" ask.
--
-- 2. `invoices` and `customers` only carry workspace_id, no user_id - the
--    same gap already found and fixed on dobly_operators,
--    business_channel_connections, etc. earlier this session. A solo
--    user's rows (workspace_id null) would have no direct owner
--    reference at all. Adding user_id directly, matching that
--    established fix pattern, before this table sees real traffic.

alter table public.customers
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

alter table public.invoices
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists invoice_number text,
  add column if not exists customer_name text,
  add column if not exists due_at timestamptz,
  -- Where the hosted payment link lives, and which rail generated it -
  -- 'intasend_hosted' for Dobly-hosted collection (no API keys required
  -- from the business), or the business's own connected provider id
  -- (mpesa, paystack) when they have one.
  add column if not exists checkout_url text,
  add column if not exists provider text;

create index if not exists customers_user_id_idx on public.customers (user_id);
create index if not exists invoices_user_id_idx on public.invoices (user_id);

drop policy if exists "customers: owner full access" on public.customers;
create policy "customers: owner full access" on public.customers
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "invoices: owner full access" on public.invoices;
create policy "invoices: owner full access" on public.invoices
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
