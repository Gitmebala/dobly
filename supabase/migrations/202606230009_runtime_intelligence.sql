-- Dobly runtime intelligence extension
-- Adds first-class persistence for department, work type, output, trigger, trust,
-- memory scope, and capability state across durable runs, standards, records, and memory.

alter table if exists public.software_execution_runs
  add column if not exists department_id text,
  add column if not exists work_type_id text,
  add column if not exists output_type_id text,
  add column if not exists trigger_type_id text,
  add column if not exists trust_level_id text,
  add column if not exists memory_scope_id text,
  add column if not exists capability_state text;

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_department_id_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_department_id_check check (
    department_id is null or department_id in (
      'reception', 'sales', 'marketing', 'support', 'finance', 'operations', 'engineering_product', 'leadership', 'admin'
    )
  );

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_work_type_id_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_work_type_id_check check (
    work_type_id is null or work_type_id in (
      'communicate', 'research', 'create', 'coordinate', 'build', 'monitor', 'decide'
    )
  );

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_output_type_id_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_output_type_id_check check (
    output_type_id is null or output_type_id in (
      'message', 'task', 'alert', 'brief', 'document', 'presentation', 'spreadsheet_report',
      'image_design', 'video', 'code_context_package', 'approval_request'
    )
  );

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_trigger_type_id_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_trigger_type_id_check check (
    trigger_type_id is null or trigger_type_id in (
      'owner_request', 'inbound_signal', 'scheduled_trigger', 'threshold_alert',
      'workflow_handoff', 'external_event'
    )
  );

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_trust_level_id_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_trust_level_id_check check (
    trust_level_id is null or trust_level_id in (
      'informational', 'draft_propose', 'safe_auto_run', 'approval_required', 'human_only'
    )
  );

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_memory_scope_id_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_memory_scope_id_check check (
    memory_scope_id is null or memory_scope_id in (
      'run', 'department', 'workspace', 'customer', 'project', 'company'
    )
  );

alter table if exists public.software_execution_runs
  drop constraint if exists software_execution_runs_capability_state_check;
alter table if exists public.software_execution_runs
  add constraint software_execution_runs_capability_state_check check (
    capability_state is null or capability_state in ('live', 'assisted', 'planned')
  );

create index if not exists idx_software_execution_runs_department_created
  on public.software_execution_runs(department_id, created_at desc);

create index if not exists idx_software_execution_runs_output_type_created
  on public.software_execution_runs(output_type_id, created_at desc);

create index if not exists idx_software_execution_runs_trust_level_created
  on public.software_execution_runs(trust_level_id, created_at desc);

alter table if exists public.runtime_approvals
  add column if not exists department_id text,
  add column if not exists work_type_id text,
  add column if not exists output_type_id text,
  add column if not exists trust_level_id text;

alter table if exists public.office_events
  add column if not exists work_type_id text,
  add column if not exists output_type_id text,
  add column if not exists trust_level_id text,
  add column if not exists capability_state text;

alter table if exists public.standards
  add column if not exists department_id text,
  add column if not exists work_type_id text,
  add column if not exists output_type_id text,
  add column if not exists trigger_type_id text,
  add column if not exists trust_level_id text,
  add column if not exists memory_scope_id text,
  add column if not exists intent jsonb not null default '{}'::jsonb;

create index if not exists standards_department_idx
  on public.standards(user_id, department_id, is_active);

alter table if exists public.business_memory_items
  add column if not exists department_id text,
  add column if not exists work_type_id text,
  add column if not exists output_type_id text,
  add column if not exists trigger_type_id text,
  add column if not exists trust_level_id text,
  add column if not exists memory_scope_id text;

create index if not exists business_memory_items_department_idx
  on public.business_memory_items(user_id, department_id, updated_at desc);
