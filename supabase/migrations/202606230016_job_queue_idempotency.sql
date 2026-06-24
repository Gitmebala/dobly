alter table if exists public.job_queue add column if not exists idempotency_key text;

update public.job_queue
set idempotency_key = payload->>'dedupeKey'
where idempotency_key is null and payload ? 'dedupeKey';

create unique index if not exists job_queue_active_idempotency_idx
  on public.job_queue (idempotency_key)
  where idempotency_key is not null and status in ('pending', 'processing');
