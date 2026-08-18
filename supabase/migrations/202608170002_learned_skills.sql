-- Real "teach a skill" system. Named dobly_learned_skills, deliberately not
-- reusing the name of the existing src/lib/skills/ system - that one is a
-- fixed, developer-authored library of ~19 hardcoded TypeScript functions
-- for the older workflow-definition execution engine, with no way for a
-- user to create a new one. This is the opposite: a user-owned, data-driven
-- table a coworker (or the user directly) can add rows to at runtime. Two
-- real creation paths, both honest about their own nature:
--   - "learned": captured verbatim from a browser-automation run that
--     actually succeeded (procedure.actions is the literal action sequence
--     that worked, replayed deterministically next time - not re-decided
--     by the LLM each run).
--   - "manual": the user describes the steps themselves through a step
--     builder; procedure is instructional text a coworker follows as
--     strong context, not a literal script (since there's no successful
--     recorded run to capture literally).
-- RLS: same owner-only pattern as every other table this session
-- (202608060004_operator_family_owner_rls.sql), for the same solo-user
-- reason.

CREATE TABLE IF NOT EXISTS dobly_learned_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID REFERENCES dobly_operators(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'learned')),
  procedure_kind TEXT NOT NULL DEFAULT 'instructions' CHECK (procedure_kind IN ('instructions', 'browser')),
  procedure JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_learned_skills_user ON dobly_learned_skills(user_id, status);
CREATE INDEX IF NOT EXISTS idx_learned_skills_operator ON dobly_learned_skills(operator_id);

ALTER TABLE dobly_learned_skills ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dobly_learned_skills: owner full access" ON public.dobly_learned_skills;
CREATE POLICY "dobly_learned_skills: owner full access" ON public.dobly_learned_skills
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
