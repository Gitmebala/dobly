-- Dobly software execution runtime.
-- Durable run records, approval resume state, and versioned artifacts for MCP-backed software work.

CREATE TABLE IF NOT EXISTS software_execution_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  tool_id TEXT NOT NULL,
  tool_label TEXT NOT NULL,
  tool_family TEXT NOT NULL,
  task TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft',
      'needs_approval',
      'running',
      'completed',
      'failed',
      'not_configured',
      'cancelled'
    )
  ),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_required BOOLEAN NOT NULL DEFAULT FALSE,
  approved_at TIMESTAMPTZ,
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approval_note TEXT,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  output_schema JSONB,
  allowed_tools TEXT[],
  execution_result JSONB,
  summary TEXT,
  error_message TEXT,
  artifact_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS software_execution_artifacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  run_id UUID NOT NULL REFERENCES software_execution_runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'mcp_result' CHECK (
    kind IN ('summary', 'text', 'json', 'file', 'external_link', 'mcp_result')
  ),
  title TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  content JSONB NOT NULL DEFAULT '{}'::jsonb,
  external_url TEXT,
  storage_path TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS personal_watchers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (
    category IN ('markets', 'travel', 'health', 'calendar', 'subscriptions', 'bills', 'news', 'custom')
  ),
  strategy TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'manual',
  data_sources TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  trigger_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  notification_channels TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  last_run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  last_checked_at TIMESTAMPTZ,
  last_signal JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_label TEXT,
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  channel TEXT NOT NULL DEFAULT 'app' CHECK (channel IN ('app', 'email', 'whatsapp')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decision_note TEXT
);

CREATE TABLE IF NOT EXISTS runtime_audit_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES runtime_approvals(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  risk_level TEXT CHECK (risk_level IN ('low', 'medium', 'high')),
  actor_type TEXT NOT NULL DEFAULT 'system' CHECK (actor_type IN ('user', 'system', 'worker', 'provider')),
  actor_id TEXT,
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voice_call_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  provider_call_id TEXT,
  direction TEXT NOT NULL DEFAULT 'inbound' CHECK (direction IN ('inbound', 'outbound')),
  caller TEXT,
  callee TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'blocked', 'handed_off')),
  transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
  recording_url TEXT,
  abuse_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
  handoff JSONB,
  telemetry JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memory_update_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  source_run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'decision',
  scope TEXT NOT NULL DEFAULT 'global',
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.7,
  conflict_summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  decided_at TIMESTAMPTZ,
  decision_note TEXT,
  created_memory_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS research_dossiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '{}'::jsonb,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  findings JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  action_chain JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runtime_rollback_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  external_id TEXT,
  action_taken TEXT NOT NULL,
  rollback_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'executed', 'failed', 'not_supported')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS mcp_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  server_url TEXT NOT NULL,
  auth_token_ref TEXT,
  auth_token_encrypted TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'archived')),
  capability_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  risk_profile TEXT NOT NULL DEFAULT 'medium' CHECK (risk_profile IN ('low', 'medium', 'high')),
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_discovered_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mcp_discovered_tools (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES mcp_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  capability_hints TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, name)
);

CREATE TABLE IF NOT EXISTS custom_api_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  base_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'error', 'archived')),
  auth_type TEXT NOT NULL DEFAULT 'none' CHECK (auth_type IN ('none', 'bearer', 'api_key_header', 'api_key_query', 'basic')),
  auth_header_name TEXT,
  auth_query_name TEXT,
  auth_secret_encrypted TEXT,
  default_headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  capability_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  risk_profile TEXT NOT NULL DEFAULT 'medium' CHECK (risk_profile IN ('low', 'medium', 'high')),
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  allow_private_network BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_tested_at TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS custom_api_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES custom_api_connections(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  method TEXT NOT NULL DEFAULT 'POST' CHECK (method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  path_template TEXT NOT NULL DEFAULT '',
  query_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  body_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers_template JSONB NOT NULL DEFAULT '{}'::jsonb,
  input_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
  capability_hints TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  risk_level TEXT NOT NULL DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  approval_required BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(connection_id, name)
);

CREATE TABLE IF NOT EXISTS operator_proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'tested', 'deployed', 'archived')),
  proposal JSONB NOT NULL DEFAULT '{}'::jsonb,
  test_results JSONB NOT NULL DEFAULT '{}'::jsonb,
  deployed_operator_id UUID,
  deployed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dobly_operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'custom' CHECK (kind IN ('business', 'work', 'life', 'custom')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  mission TEXT NOT NULL,
  outcome TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT '',
  approval_mode TEXT NOT NULL DEFAULT 'approve_risky' CHECK (approval_mode IN ('ask_first', 'approve_risky', 'supervised', 'trusted')),
  capability_tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  connected_tool_ids TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  memory_policy JSONB NOT NULL DEFAULT '{}'::jsonb,
  guardrails JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dobly_operator_loops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  cadence TEXT NOT NULL DEFAULT 'event_based' CHECK (cadence IN ('manual', 'always_on', 'hourly', 'daily', 'weekly', 'market_open', 'event_based')),
  trigger TEXT NOT NULL DEFAULT '',
  playbook TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'archived')),
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_brain_traces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  tool_judgment JSONB NOT NULL DEFAULT '[]'::jsonb,
  missing_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  risk_assessment JSONB NOT NULL DEFAULT '{}'::jsonb,
  self_check JSONB NOT NULL DEFAULT '{}'::jsonb,
  memory_reasoning JSONB NOT NULL DEFAULT '{}'::jsonb,
  autonomy JSONB NOT NULL DEFAULT '{}'::jsonb,
  evaluation JSONB NOT NULL DEFAULT '{}'::jsonb,
  outcome JSONB NOT NULL DEFAULT '{}'::jsonb,
  intelligence_report JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  brain_trace_id UUID REFERENCES operator_brain_traces(id) ON DELETE SET NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded', 'failed', 'needs_approval', 'partial', 'cancelled')),
  summary TEXT NOT NULL,
  signals JSONB NOT NULL DEFAULT '{}'::jsonb,
  score NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_evaluation_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  expected TEXT NOT NULL,
  pass_condition TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'passed', 'failed', 'needs_review')),
  last_brain_trace_id UUID REFERENCES operator_brain_traces(id) ON DELETE SET NULL,
  last_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Operator Chat',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  summary TEXT NOT NULL DEFAULT '',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, operator_id)
);

CREATE TABLE IF NOT EXISTS operator_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES operator_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'operator', 'system', 'approval', 'artifact', 'run')),
  body TEXT NOT NULL,
  intent TEXT NOT NULL DEFAULT 'instruction' CHECK (intent IN ('instruction', 'status', 'direction_change', 'approval', 'artifact', 'run_update', 'memory', 'system')),
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  job_id UUID REFERENCES job_queue(id) ON DELETE SET NULL,
  approval_id UUID REFERENCES runtime_approvals(id) ON DELETE SET NULL,
  artifact_id UUID REFERENCES software_execution_artifacts(id) ON DELETE SET NULL,
  brain_trace_id UUID REFERENCES operator_brain_traces(id) ON DELETE SET NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_chat_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES operator_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES operator_messages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  run_id UUID REFERENCES software_execution_runs(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (
    event_type IN (
      'user_input',
      'voice_transcript',
      'thinking_started',
      'plan_created',
      'tool_selected',
      'tool_call_requested',
      'tool_call_completed',
      'risk_checked',
      'approval_requested',
      'approval_decided',
      'artifact_created',
      'artifact_revised',
      'memory_proposed',
      'handoff_requested',
      'feedback_received',
      'run_queued',
      'run_completed',
      'run_failed',
      'system_note'
    )
  ),
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  visibility TEXT NOT NULL DEFAULT 'user_visible' CHECK (visibility IN ('user_visible', 'internal')),
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'success', 'warning', 'danger')),
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS operator_chat_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES operator_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES operator_messages(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE SET NULL,
  operator_id UUID NOT NULL REFERENCES dobly_operators(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('good', 'bad', 'correction', 'preference', 'bug', 'handoff')),
  body TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_software_execution_runs_user_created
  ON software_execution_runs(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_software_execution_runs_workspace_created
  ON software_execution_runs(workspace_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_software_execution_runs_status
  ON software_execution_runs(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_software_execution_artifacts_run_version
  ON software_execution_artifacts(run_id, version DESC);

CREATE INDEX IF NOT EXISTS idx_personal_watchers_user_status
  ON personal_watchers(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_approvals_user_status
  ON runtime_approvals(user_id, status, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_audit_events_user_created
  ON runtime_audit_events(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_voice_call_records_user_created
  ON voice_call_records(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_memory_update_proposals_user_status
  ON memory_update_proposals(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_research_dossiers_user_created
  ON research_dossiers(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_runtime_rollback_records_user_status
  ON runtime_rollback_records(user_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_connections_user_status
  ON mcp_connections(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_mcp_discovered_tools_user_connection
  ON mcp_discovered_tools(user_id, connection_id);

CREATE INDEX IF NOT EXISTS idx_custom_api_connections_user_status
  ON custom_api_connections(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_custom_api_actions_user_connection
  ON custom_api_actions(user_id, connection_id);

CREATE INDEX IF NOT EXISTS idx_operator_proposals_user_status
  ON operator_proposals(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dobly_operators_user_status
  ON dobly_operators(user_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dobly_operators_workspace_status
  ON dobly_operators(workspace_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_dobly_operator_loops_operator_status
  ON dobly_operator_loops(operator_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_brain_traces_operator_created
  ON operator_brain_traces(operator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_outcomes_operator_created
  ON operator_outcomes(operator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_evaluation_scenarios_operator_status
  ON operator_evaluation_scenarios(operator_id, status, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_conversations_operator_updated
  ON operator_conversations(operator_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_messages_conversation_created
  ON operator_messages(conversation_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_operator_messages_operator_created
  ON operator_messages(operator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_chat_events_conversation_created
  ON operator_chat_events(conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_operator_chat_feedback_operator_created
  ON operator_chat_feedback(operator_id, created_at DESC);

ALTER TABLE software_execution_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_execution_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_watchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_update_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_dossiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE runtime_rollback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE mcp_discovered_tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_api_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_api_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobly_operators ENABLE ROW LEVEL SECURITY;
ALTER TABLE dobly_operator_loops ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_brain_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_outcomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_evaluation_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_chat_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE operator_chat_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own software execution runs" ON software_execution_runs;
CREATE POLICY "Users can read own software execution runs"
  ON software_execution_runs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own software execution runs" ON software_execution_runs;
CREATE POLICY "Users can insert own software execution runs"
  ON software_execution_runs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own software execution runs" ON software_execution_runs;
CREATE POLICY "Users can update own software execution runs"
  ON software_execution_runs FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own software execution artifacts" ON software_execution_artifacts;
CREATE POLICY "Users can read own software execution artifacts"
  ON software_execution_artifacts FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own software execution artifacts" ON software_execution_artifacts;
CREATE POLICY "Users can insert own software execution artifacts"
  ON software_execution_artifacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own personal watchers" ON personal_watchers;
CREATE POLICY "Users can read own personal watchers"
  ON personal_watchers FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own personal watchers" ON personal_watchers;
CREATE POLICY "Users can insert own personal watchers"
  ON personal_watchers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own personal watchers" ON personal_watchers;
CREATE POLICY "Users can update own personal watchers"
  ON personal_watchers FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own runtime approvals" ON runtime_approvals;
CREATE POLICY "Users can read own runtime approvals"
  ON runtime_approvals FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own runtime approvals" ON runtime_approvals;
CREATE POLICY "Users can insert own runtime approvals"
  ON runtime_approvals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own runtime approvals" ON runtime_approvals;
CREATE POLICY "Users can update own runtime approvals"
  ON runtime_approvals FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own runtime audit events" ON runtime_audit_events;
CREATE POLICY "Users can read own runtime audit events"
  ON runtime_audit_events FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own runtime audit events" ON runtime_audit_events;
CREATE POLICY "Users can insert own runtime audit events"
  ON runtime_audit_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own voice call records" ON voice_call_records;
CREATE POLICY "Users can read own voice call records" ON voice_call_records FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own voice call records" ON voice_call_records;
CREATE POLICY "Users can insert own voice call records" ON voice_call_records FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own voice call records" ON voice_call_records;
CREATE POLICY "Users can update own voice call records" ON voice_call_records FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own memory proposals" ON memory_update_proposals;
CREATE POLICY "Users can read own memory proposals" ON memory_update_proposals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own memory proposals" ON memory_update_proposals;
CREATE POLICY "Users can insert own memory proposals" ON memory_update_proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own memory proposals" ON memory_update_proposals;
CREATE POLICY "Users can update own memory proposals" ON memory_update_proposals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own research dossiers" ON research_dossiers;
CREATE POLICY "Users can read own research dossiers" ON research_dossiers FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own research dossiers" ON research_dossiers;
CREATE POLICY "Users can insert own research dossiers" ON research_dossiers FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own rollback records" ON runtime_rollback_records;
CREATE POLICY "Users can read own rollback records" ON runtime_rollback_records FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own rollback records" ON runtime_rollback_records;
CREATE POLICY "Users can insert own rollback records" ON runtime_rollback_records FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own rollback records" ON runtime_rollback_records;
CREATE POLICY "Users can update own rollback records" ON runtime_rollback_records FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own MCP connections" ON mcp_connections;
CREATE POLICY "Users can read own MCP connections" ON mcp_connections FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own MCP connections" ON mcp_connections;
CREATE POLICY "Users can insert own MCP connections" ON mcp_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own MCP connections" ON mcp_connections;
CREATE POLICY "Users can update own MCP connections" ON mcp_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own MCP discovered tools" ON mcp_discovered_tools;
CREATE POLICY "Users can read own MCP discovered tools" ON mcp_discovered_tools FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own MCP discovered tools" ON mcp_discovered_tools;
CREATE POLICY "Users can insert own MCP discovered tools" ON mcp_discovered_tools FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own MCP discovered tools" ON mcp_discovered_tools;
CREATE POLICY "Users can update own MCP discovered tools" ON mcp_discovered_tools FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own custom API connections" ON custom_api_connections;
CREATE POLICY "Users can read own custom API connections" ON custom_api_connections FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own custom API connections" ON custom_api_connections;
CREATE POLICY "Users can insert own custom API connections" ON custom_api_connections FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own custom API connections" ON custom_api_connections;
CREATE POLICY "Users can update own custom API connections" ON custom_api_connections FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own custom API actions" ON custom_api_actions;
CREATE POLICY "Users can read own custom API actions" ON custom_api_actions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own custom API actions" ON custom_api_actions;
CREATE POLICY "Users can insert own custom API actions" ON custom_api_actions FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own custom API actions" ON custom_api_actions;
CREATE POLICY "Users can update own custom API actions" ON custom_api_actions FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator proposals" ON operator_proposals;
CREATE POLICY "Users can read own Operator proposals" ON operator_proposals FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator proposals" ON operator_proposals;
CREATE POLICY "Users can insert own Operator proposals" ON operator_proposals FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Operator proposals" ON operator_proposals;
CREATE POLICY "Users can update own Operator proposals" ON operator_proposals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Dobly operators" ON dobly_operators;
CREATE POLICY "Users can read own Dobly operators" ON dobly_operators FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Dobly operators" ON dobly_operators;
CREATE POLICY "Users can insert own Dobly operators" ON dobly_operators FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Dobly operators" ON dobly_operators;
CREATE POLICY "Users can update own Dobly operators" ON dobly_operators FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Dobly operator loops" ON dobly_operator_loops;
CREATE POLICY "Users can read own Dobly operator loops" ON dobly_operator_loops FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Dobly operator loops" ON dobly_operator_loops;
CREATE POLICY "Users can insert own Dobly operator loops" ON dobly_operator_loops FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Dobly operator loops" ON dobly_operator_loops;
CREATE POLICY "Users can update own Dobly operator loops" ON dobly_operator_loops FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator brain traces" ON operator_brain_traces;
CREATE POLICY "Users can read own Operator brain traces" ON operator_brain_traces FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator brain traces" ON operator_brain_traces;
CREATE POLICY "Users can insert own Operator brain traces" ON operator_brain_traces FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Operator brain traces" ON operator_brain_traces;
CREATE POLICY "Users can update own Operator brain traces" ON operator_brain_traces FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator outcomes" ON operator_outcomes;
CREATE POLICY "Users can read own Operator outcomes" ON operator_outcomes FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator outcomes" ON operator_outcomes;
CREATE POLICY "Users can insert own Operator outcomes" ON operator_outcomes FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Operator outcomes" ON operator_outcomes;
CREATE POLICY "Users can update own Operator outcomes" ON operator_outcomes FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator eval scenarios" ON operator_evaluation_scenarios;
CREATE POLICY "Users can read own Operator eval scenarios" ON operator_evaluation_scenarios FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator eval scenarios" ON operator_evaluation_scenarios;
CREATE POLICY "Users can insert own Operator eval scenarios" ON operator_evaluation_scenarios FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Operator eval scenarios" ON operator_evaluation_scenarios;
CREATE POLICY "Users can update own Operator eval scenarios" ON operator_evaluation_scenarios FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator conversations" ON operator_conversations;
CREATE POLICY "Users can read own Operator conversations" ON operator_conversations FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator conversations" ON operator_conversations;
CREATE POLICY "Users can insert own Operator conversations" ON operator_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Operator conversations" ON operator_conversations;
CREATE POLICY "Users can update own Operator conversations" ON operator_conversations FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator messages" ON operator_messages;
CREATE POLICY "Users can read own Operator messages" ON operator_messages FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator messages" ON operator_messages;
CREATE POLICY "Users can insert own Operator messages" ON operator_messages FOR INSERT WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can update own Operator messages" ON operator_messages;
CREATE POLICY "Users can update own Operator messages" ON operator_messages FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator chat events" ON operator_chat_events;
CREATE POLICY "Users can read own Operator chat events" ON operator_chat_events FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator chat events" ON operator_chat_events;
CREATE POLICY "Users can insert own Operator chat events" ON operator_chat_events FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own Operator chat feedback" ON operator_chat_feedback;
CREATE POLICY "Users can read own Operator chat feedback" ON operator_chat_feedback FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own Operator chat feedback" ON operator_chat_feedback;
CREATE POLICY "Users can insert own Operator chat feedback" ON operator_chat_feedback FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION set_software_execution_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS software_execution_runs_set_updated_at ON software_execution_runs;
CREATE TRIGGER software_execution_runs_set_updated_at
  BEFORE UPDATE ON software_execution_runs
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS personal_watchers_set_updated_at ON personal_watchers;
CREATE TRIGGER personal_watchers_set_updated_at
  BEFORE UPDATE ON personal_watchers
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS voice_call_records_set_updated_at ON voice_call_records;
CREATE TRIGGER voice_call_records_set_updated_at
  BEFORE UPDATE ON voice_call_records
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS mcp_connections_set_updated_at ON mcp_connections;
CREATE TRIGGER mcp_connections_set_updated_at
  BEFORE UPDATE ON mcp_connections
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS mcp_discovered_tools_set_updated_at ON mcp_discovered_tools;
CREATE TRIGGER mcp_discovered_tools_set_updated_at
  BEFORE UPDATE ON mcp_discovered_tools
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS custom_api_connections_set_updated_at ON custom_api_connections;
CREATE TRIGGER custom_api_connections_set_updated_at
  BEFORE UPDATE ON custom_api_connections
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS custom_api_actions_set_updated_at ON custom_api_actions;
CREATE TRIGGER custom_api_actions_set_updated_at
  BEFORE UPDATE ON custom_api_actions
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS operator_proposals_set_updated_at ON operator_proposals;
CREATE TRIGGER operator_proposals_set_updated_at
  BEFORE UPDATE ON operator_proposals
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS dobly_operators_set_updated_at ON dobly_operators;
CREATE TRIGGER dobly_operators_set_updated_at
  BEFORE UPDATE ON dobly_operators
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS dobly_operator_loops_set_updated_at ON dobly_operator_loops;
CREATE TRIGGER dobly_operator_loops_set_updated_at
  BEFORE UPDATE ON dobly_operator_loops
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS operator_conversations_set_updated_at ON operator_conversations;
CREATE TRIGGER operator_conversations_set_updated_at
  BEFORE UPDATE ON operator_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();

DROP TRIGGER IF EXISTS operator_evaluation_scenarios_set_updated_at ON operator_evaluation_scenarios;
CREATE TRIGGER operator_evaluation_scenarios_set_updated_at
  BEFORE UPDATE ON operator_evaluation_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION set_software_execution_updated_at();
