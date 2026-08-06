-- business_channel_connections only ever had workspace-scoped policies
-- (SELECT/INSERT/UPDATE/DELETE all require workspace_id is not null and
-- dobly_workspace_can_view/write(workspace_id)). A solo user's own rows
-- have workspace_id = null, so RLS blocked every read AND write for them -
-- the "Connect" flow in /dashboard/channels (phone, SMS, WhatsApp, email,
-- calendar, CRM, content tools) has been failing end to end for every
-- account that isn't in a multi-member workspace, which is the common
-- case. This matches the owner-policy convention already used for
-- workspace_tasks/workspace_projects/workspace_documents/workspace_inbox.

drop policy if exists "business_channel_connections: owner full access" on public.business_channel_connections;
create policy "business_channel_connections: owner full access" on public.business_channel_connections
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
