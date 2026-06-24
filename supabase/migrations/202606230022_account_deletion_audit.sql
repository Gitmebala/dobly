alter table public.account_deletion_requests
  drop constraint if exists account_deletion_requests_user_id_fkey;

alter table public.account_deletion_requests
  alter column user_id drop not null,
  alter column reason set default '';

comment on column public.account_deletion_requests.user_id is
  'Cleared after identity deletion so the operational audit does not retain a live user reference.';
