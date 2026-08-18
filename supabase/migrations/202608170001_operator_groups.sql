-- Group conversations: multiple coworkers visible in one shared room, not
-- just 1:1 chat. Real gap confirmed by grep before writing this - no
-- operator-to-operator or group messaging mechanism existed anywhere in
-- the codebase (the closest thing, createConversationReply in anthropic.ts,
-- is a generic "system prompt + message history -> reply" primitive with
-- no group/member concept at all). RLS follows the exact owner-only
-- pattern from 202608060004_operator_family_owner_rls.sql (auth.uid() =
-- user_id, no workspace_id branch) specifically because a workspace-scoped
-- policy is the root cause that already locked out solo users twice on
-- sibling tables - not repeating that here.

CREATE TABLE IF NOT EXISTS dobly_operator_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dobly_operator_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES dobly_operator_groups(id) ON DELETE CASCADE,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, operator_id)
);

CREATE TABLE IF NOT EXISTS dobly_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES dobly_operator_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'operator', 'system')),
  operator_id UUID REFERENCES dobly_operators(id) ON DELETE SET NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_groups_user ON dobly_operator_groups(user_id, status);
CREATE INDEX IF NOT EXISTS idx_operator_group_members_group ON dobly_operator_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_operator_group_members_operator ON dobly_operator_group_members(operator_id);
CREATE INDEX IF NOT EXISTS idx_group_messages_group_created ON dobly_group_messages(group_id, created_at);

ALTER TABLE dobly_operator_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobly_operator_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobly_group_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dobly_operator_groups: owner full access" ON public.dobly_operator_groups;
CREATE POLICY "dobly_operator_groups: owner full access" ON public.dobly_operator_groups
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dobly_operator_group_members: owner full access" ON public.dobly_operator_group_members;
CREATE POLICY "dobly_operator_group_members: owner full access" ON public.dobly_operator_group_members
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "dobly_group_messages: owner full access" ON public.dobly_group_messages;
CREATE POLICY "dobly_group_messages: owner full access" ON public.dobly_group_messages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
