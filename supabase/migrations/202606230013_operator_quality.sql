CREATE TABLE IF NOT EXISTS operator_quality_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE UNIQUE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_quality_signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('good', 'bad', 'correction', 'preference', 'bug', 'handoff')),
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_quality_profiles_user_operator
  ON operator_quality_profiles(user_id, operator_id);

CREATE INDEX IF NOT EXISTS idx_operator_quality_signals_operator_created
  ON operator_quality_signals(operator_id, created_at DESC);

ALTER TABLE operator_quality_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_quality_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own operator quality profiles" ON operator_quality_profiles;
CREATE POLICY "Users can read own operator quality profiles"
  ON operator_quality_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own operator quality profiles" ON operator_quality_profiles;
CREATE POLICY "Users can insert own operator quality profiles"
  ON operator_quality_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own operator quality profiles" ON operator_quality_profiles;
CREATE POLICY "Users can update own operator quality profiles"
  ON operator_quality_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own operator quality signals" ON operator_quality_signals;
CREATE POLICY "Users can read own operator quality signals"
  ON operator_quality_signals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own operator quality signals" ON operator_quality_signals;
CREATE POLICY "Users can insert own operator quality signals"
  ON operator_quality_signals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_operator_quality_profiles_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operator_quality_profiles_updated_at ON operator_quality_profiles;
CREATE TRIGGER trg_operator_quality_profiles_updated_at
BEFORE UPDATE ON operator_quality_profiles
FOR EACH ROW
EXECUTE FUNCTION set_operator_quality_profiles_updated_at();
