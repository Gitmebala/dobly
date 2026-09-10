-- Departments as first-class entities.
--
-- Before this migration a "department" was a hardcoded key in
-- src/lib/department-bundles.ts, referenced by loose `department_id text`
-- columns across office_events, office_tasks, communication_conversations and
-- friends. Nothing owned a department, nothing could be created at runtime, and
-- dobly_operators had no link to one at all.
--
-- Here departments become owned rows on a workspace. The bundle catalog stays,
-- but only as the seed template a real row is stamped from (slug + template_key),
-- the same way EMPLOYEE_TEMPLATES seeds a profile rather than being one.

create table if not exists public.departments (
  id uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,

  -- slug is the stable handle the legacy `department_id text` columns carry.
  -- Unique per workspace so those columns can be resolved back to a row.
  slug text not null,
  -- Which DEPARTMENT_BUNDLES entry this was stamped from, null for custom ones.
  template_key text,

  name text not null,
  outcome text not null default '',
  description text not null default '',

  status text not null default 'active'
    check (status in ('draft', 'active', 'paused', 'archived')),
  trust_level text not null default 'approval_required'
    check (trust_level in ('observe_only', 'approval_required', 'supervised', 'trusted')),
  autonomy_boundary text not null default '',

  -- Operating config carried over from the bundle, editable per workspace.
  work_type_ids text[] not null default array[]::text[],
  output_type_ids text[] not null default array[]::text[],
  standards text[] not null default array[]::text[],
  recommended_channel_ids text[] not null default array[]::text[],

  -- Spatial layer: position on the departments canvas. Null until placed, so
  -- the client can run its own layout for unplaced departments.
  canvas_x double precision,
  canvas_y double precision,
  accent_color text,

  metrics jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint departments_slug_per_workspace unique (workspace_id, slug)
);

create index if not exists departments_workspace_status_idx
  on public.departments(workspace_id, status, created_at desc);
create index if not exists departments_user_idx
  on public.departments(user_id);

-- Operators live in a department. Nullable: an operator can exist before it is
-- filed, and set null on delete so removing a department never destroys the
-- coworkers inside it.
alter table public.dobly_operators
  add column if not exists department_id uuid references public.departments(id) on delete set null;

create index if not exists dobly_operators_department_idx
  on public.dobly_operators(department_id, status);

create or replace function public.dobly_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists departments_set_updated_at on public.departments;
create trigger departments_set_updated_at
  before update on public.departments
  for each row execute function public.dobly_touch_updated_at();

-- RLS: same workspace view/write split every other workspace-scoped table uses.
alter table public.departments enable row level security;

drop policy if exists "Workspace members can view departments" on public.departments;
create policy "Workspace members can view departments"
  on public.departments for select
  using (public.dobly_workspace_can_view(workspace_id));

drop policy if exists "Workspace operators can write departments" on public.departments;
create policy "Workspace operators can write departments"
  on public.departments for all
  using (public.dobly_workspace_can_write(workspace_id))
  with check (public.dobly_workspace_can_write(workspace_id));

grant select, insert, update, delete on public.departments to authenticated;
grant all on public.departments to service_role;

-- Backfill. Workspaces that launched departments before this migration have
-- office_workers carrying a department slug but no department row to belong to,
-- which would render an empty departments canvas. Recreate a row per distinct
-- slug actually in use. Names mirror DEPARTMENT_BUNDLES; anything not in the
-- catalog (or a slug added later) falls back to a title-cased slug.
with catalog(slug, display_name) as (
  values
    ('reception', 'Reception'), ('sales', 'Sales'), ('marketing', 'Marketing'),
    ('creative', 'Creative'), ('support', 'Support'), ('finance', 'Finance'),
    ('engineering', 'Engineering'), ('operations', 'Operations'), ('admin', 'Admin'),
    ('projects', 'Projects'), ('hr', 'HR'), ('growth', 'Growth'),
    ('analytics', 'Analytics'), ('compliance', 'Compliance')
),
used as (
  -- distinct on keeps one row per (workspace, slug); the workspace owner is
  -- preferred as the attributed creator, else the earliest worker's owner.
  select distinct on (w.workspace_id, w.department_id)
    w.workspace_id,
    w.user_id,
    w.department_id as slug
  from public.office_workers w
  join public.workspaces ws on ws.id = w.workspace_id
  where w.workspace_id is not null
    and coalesce(w.department_id, '') <> ''
    and w.status <> 'archived'
  order by
    w.workspace_id,
    w.department_id,
    (w.user_id = ws.owner_user_id) desc,
    w.created_at asc
)
insert into public.departments (workspace_id, user_id, slug, template_key, name)
select
  used.workspace_id,
  used.user_id,
  used.slug,
  catalog.slug, -- null when the slug is not a known bundle
  coalesce(catalog.display_name, initcap(replace(used.slug, '_', ' ')))
from used
left join catalog on catalog.slug = used.slug
on conflict (workspace_id, slug) do nothing;
