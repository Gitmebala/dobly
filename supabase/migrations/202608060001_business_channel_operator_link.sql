-- business_channel_connections (phone numbers, WhatsApp numbers, etc.) had
-- no way to say "this number belongs to this coworker" - only user_id and
-- workspace_id. So a call to a provisioned Dobly number could never greet
-- as, or show up in the chat of, the specific coworker the owner actually
-- hired - it always fell through to a generic account-wide inbox instead,
-- breaking the core "hire a coworker, see everything it does in its chat"
-- promise the moment the channel was a phone call instead of the in-app
-- chat box.

alter table public.business_channel_connections
  add column if not exists operator_id uuid references public.dobly_operators(id) on delete set null;

create index if not exists business_channel_connections_operator_idx
  on public.business_channel_connections (operator_id);
