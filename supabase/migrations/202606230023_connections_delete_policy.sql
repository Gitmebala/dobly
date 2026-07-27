-- connections had select/insert/update policies but no delete policy.
-- Under RLS a delete with no matching policy affects zero rows and returns
-- no error, so "Remove connection" reported success and the row came back
-- on reload. Grant users delete on their own connections.

drop policy if exists "connections: users delete own" on public.connections;
create policy "connections: users delete own"
  on public.connections for delete
  using (auth.uid() = user_id);

-- Every OAuth callback ran a plain INSERT, so reconnecting the same account
-- stacked duplicate rows (the "9 connected accounts" that were really one
-- Gmail connected repeatedly). Collapse existing duplicates, keeping the
-- most recently updated row per (user, provider, account).
with ranked as (
  select
    id,
    row_number() over (
      partition by user_id, provider, coalesce(account_identifier, '')
      order by updated_at desc, created_at desc
    ) as rn
  from public.connections
)
delete from public.connections
where id in (select id from ranked where rn > 1);

-- Then make the duplicate state unrepresentable so upserts have a conflict
-- target to key on.
create unique index if not exists connections_user_provider_account_idx
  on public.connections (user_id, provider, coalesce(account_identifier, ''));
