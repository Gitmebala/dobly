create or replace function public.dobly_decide_workflow_approval(
  p_approval_id uuid,
  p_user_id uuid,
  p_decision text,
  p_note text default null
)
returns public.approvals
language plpgsql
set search_path = public
as $$
declare
  v_approval public.approvals;
  v_workflow_id uuid;
  v_run_id uuid;
begin
  if p_decision not in ('approved', 'rejected') then raise exception 'Invalid approval decision'; end if;
  update public.approvals
  set status = p_decision, decided_at = now(), decision_note = left(p_note, 2000)
  where id = p_approval_id and user_id = p_user_id and status = 'pending'
  returning * into v_approval;
  if v_approval.id is null then raise exception 'Approval not found or already decided'; end if;

  v_workflow_id := nullif(v_approval.metadata->'resume'->>'workflowId', '')::uuid;
  v_run_id := nullif(v_approval.metadata->'resume'->>'runId', '')::uuid;
  if p_decision = 'approved' and v_workflow_id is not null then
    insert into public.job_queue (type, workflow_id, user_id, payload, priority, idempotency_key)
    values ('approval.resume', v_workflow_id, p_user_id, jsonb_build_object('approvalId', v_approval.id), 40, 'workflow-approval:' || v_approval.id::text);
  elsif p_decision = 'rejected' and v_run_id is not null then
    update public.workflow_runs set status = 'failed', finished_at = now(), error_message = 'Approval rejected. Dobly stopped before the guarded step ran.'
    where id = v_run_id and user_id = p_user_id;
  end if;
  return v_approval;
end;
$$;

revoke all on function public.dobly_decide_workflow_approval(uuid, uuid, text, text) from public;
grant execute on function public.dobly_decide_workflow_approval(uuid, uuid, text, text) to service_role;
