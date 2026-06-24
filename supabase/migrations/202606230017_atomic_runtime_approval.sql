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
      ('runtime.approval_resume', null, v_approval.run_id, p_user_id,
       jsonb_build_object('approvalId', v_approval.id), 35,
       'approval:' || v_approval.id::text);
  end if;

  return v_approval;
end;
$$;

revoke all on function public.dobly_decide_runtime_approval(uuid, uuid, text, text) from public;
grant execute on function public.dobly_decide_runtime_approval(uuid, uuid, text, text) to service_role;
