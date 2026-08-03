-- dobly_decide_runtime_approval has been silently failing on every single
-- call since it was introduced: it inserts the approval's run_id (a
-- durable_runtime_runs id) into job_queue.run_id, which is a foreign key to
-- workflow_runs specifically (202606230001_initial_schema.sql). That insert
-- always raised a foreign key violation, and because it happens inside the
-- same PL/pgSQL function as the status update, the whole transaction rolled
-- back - so no runtime approval has ever actually recorded a decision.
--
-- job_queue.run_id isn't needed for correctness here: the resume worker
-- (job-processor.ts, "runtime.approval_resume") re-fetches the approval by
-- id from the job payload and reads its own run reference out of that row,
-- never off job_queue.run_id. Pass null instead of the mismatched id.
--
-- src/lib/runtime/approvals.ts currently bypasses this RPC entirely and
-- replicates the same transition + enqueue in application code, because no
-- database access was available to apply this migration when the bug was
-- found and fixed (2026-08-03). Once this migration is applied, that
-- application-layer workaround can be reverted back to calling this RPC.

create or replace function public.dobly_decide_runtime_approval(
  p_approval_id uuid,
  p_user_id uuid,
  p_decision text,
  p_note text default null
)
returns public.runtime_approvals
language plpgsql
set search_path = public
as $$
declare
  v_approval public.runtime_approvals;
begin
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid approval decision';
  end if;

  update public.runtime_approvals
  set status = p_decision,
      decided_at = now(),
      decision_note = left(p_note, 2000)
  where id = p_approval_id and user_id = p_user_id and status = 'pending'
  returning * into v_approval;

  if v_approval.id is null then
    raise exception 'Approval not found or already decided';
  end if;

  if p_decision = 'approved' then
    insert into public.job_queue
      (type, workflow_id, run_id, user_id, payload, priority, idempotency_key)
    values
      ('runtime.approval_resume', null, null, p_user_id,
       jsonb_build_object('approvalId', v_approval.id), 35,
       'approval:' || v_approval.id::text)
    on conflict (idempotency_key) where idempotency_key is not null and status in ('pending', 'processing')
    do nothing;
  end if;

  return v_approval;
end;
$$;

revoke all on function public.dobly_decide_runtime_approval(uuid, uuid, text, text) from public;
grant execute on function public.dobly_decide_runtime_approval(uuid, uuid, text, text) to service_role;
