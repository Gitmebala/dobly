-- dobly_operators, runtime_approvals, software_execution_runs,
-- dobly_operator_loops, operator_messages, operator_chat_events, and
-- software_execution_artifacts all share the same gap: only a
-- workspace-scoped policy set (workspace_id is not null and
-- dobly_workspace_can_view/write(...)), no owner policy. Every current
-- read/write of these goes through the admin client, which is why this
-- hasn't broken visibly yet the way business_channel_connections did -
-- but it is the same root cause that already produced two real bugs
-- today (dobly_operators blocking the channel-operator-link ownership
-- check, runtime_approvals/software_execution_runs blocking the
-- notifications page). Closing it at the schema level so a future
-- regular-client read of any of these doesn't silently fail the same
-- way, instead of relying on every call site remembering to use admin.

drop policy if exists "dobly_operators: owner full access" on public.dobly_operators;
create policy "dobly_operators: owner full access" on public.dobly_operators
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "runtime_approvals: owner full access" on public.runtime_approvals;
create policy "runtime_approvals: owner full access" on public.runtime_approvals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "software_execution_runs: owner full access" on public.software_execution_runs;
create policy "software_execution_runs: owner full access" on public.software_execution_runs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "dobly_operator_loops: owner full access" on public.dobly_operator_loops;
create policy "dobly_operator_loops: owner full access" on public.dobly_operator_loops
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "operator_messages: owner full access" on public.operator_messages;
create policy "operator_messages: owner full access" on public.operator_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "operator_chat_events: owner full access" on public.operator_chat_events;
create policy "operator_chat_events: owner full access" on public.operator_chat_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "software_execution_artifacts: owner full access" on public.software_execution_artifacts;
create policy "software_execution_artifacts: owner full access" on public.software_execution_artifacts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
