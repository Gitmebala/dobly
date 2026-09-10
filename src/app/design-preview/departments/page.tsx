// No-auth preview of the departments canvas, wired with mock data. Exists so
// the spatial view can be eyeballed without a live Supabase session — never
// linked from product navigation, dev-only. Mirrors the pattern in
// src/app/design-preview/page.tsx.
import DepartmentCanvas, {
  type CanvasDepartment,
} from "@/app/dashboard/departments/DepartmentCanvas";
import "@/app/dashboard/reference-app.css";

// Alternating source exercises both link targets: office workers deep-link into
// the department page, custom-hired operators into the coworker page.
function operators(prefix: string, entries: Array<[string, string, string]>) {
  return entries.map(([name, status, mission], index) => ({
    id: `${prefix}-${index}`,
    name,
    status,
    mission,
    approval_mode: "approve_risky",
    last_run_at: new Date(Date.now() - index * 3600000).toISOString(),
    source: (index % 2 === 0 ? "office_worker" : "operator") as
      | "office_worker"
      | "operator",
  }));
}

const mockDepartments: CanvasDepartment[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "reception",
    name: "Reception",
    outcome: "Answer, qualify, book, and route every inbound customer moment.",
    status: "active",
    trust_level: "approval_required",
    accent_color: "var(--app-rust)",
    canvas_x: -320,
    canvas_y: -180,
    operators: operators("rec", [
      ["Front Desk", "active", "Answer inbound calls and route them"],
      ["Booking Bot", "active", "Turn enquiries into calendar bookings"],
      ["Missed Call Recovery", "paused", "Call back every missed number"],
    ]),
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    slug: "sales",
    name: "Sales",
    outcome: "Qualify leads, follow up, and keep pipeline work moving.",
    status: "active",
    trust_level: "supervised",
    accent_color: "var(--app-green)",
    canvas_x: 300,
    canvas_y: -200,
    operators: operators("sal", [
      ["Alex", "active", "Sales follow-ups and lead qualification"],
      ["Proposal Chaser", "active", "Chase unsigned proposals"],
      ["CRM Janitor", "draft", "Keep pipeline records clean"],
      ["Quote Builder", "active", "Draft quotes from call notes"],
    ]),
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    slug: "finance",
    name: "Finance",
    outcome: "Invoice, reconcile, and chase what is owed.",
    status: "active",
    trust_level: "approval_required",
    accent_color: "var(--app-gold)",
    canvas_x: 340,
    canvas_y: 260,
    operators: operators("fin", [
      ["Invoice Runner", "active", "Raise and send invoices"],
      ["Dunning Bot", "active", "Chase overdue payments politely"],
    ]),
  },
  {
    id: "44444444-4444-4444-4444-444444444444",
    slug: "support",
    name: "Support",
    outcome: "Resolve customer issues before they escalate.",
    status: "paused",
    trust_level: "observe_only",
    accent_color: "var(--app-wood)",
    canvas_x: -340,
    canvas_y: 280,
    operators: operators("sup", [
      ["Maya", "active", "Customer support across WhatsApp and email"],
    ]),
  },
  {
    id: "55555555-5555-5555-5555-555555555555",
    slug: "growth",
    name: "Growth",
    outcome: "Find the next channel and prove it works.",
    status: "active",
    trust_level: "supervised",
    accent_color: "var(--app-clay)",
    canvas_x: 0,
    canvas_y: 400,
    operators: operators("gro", [
      ["Nia", "paused", "Weekly competitor and market research"],
      ["Content Engine", "active", "Draft and schedule posts"],
      ["Experiment Tracker", "active", "Log every growth test and its result"],
    ]),
  },
  {
    id: "66666666-6666-6666-6666-666666666666",
    slug: "operations",
    name: "Operations",
    outcome: "Keep the work flowing and nothing silently dropped.",
    status: "active",
    trust_level: "trusted",
    accent_color: "var(--app-stone-text)",
    canvas_x: 0,
    canvas_y: -420,
    operators: operators("ops", [
      ["Dispatcher", "active", "Route work to the right coworker"],
      ["SLA Watch", "active", "Escalate anything past its deadline"],
    ]),
  },
];

export default function DepartmentsCanvasPreview() {
  const coworkerCount = mockDepartments.reduce(
    (total, department) => total + department.operators.length,
    0,
  );

  return (
    // Wrapped in the real shell classes so the preview inherits the same
    // palette and typography as production. Without this the preview rendered
    // on globals.css tokens and silently disagreed with the actual dashboard.
    <div className="dashboard-shell app-shell">
      <div className="dept-page">
        <header className="dept-page-header">
          <div>
            <span className="dept-page-kicker">Homebase</span>
            <h1>Departments</h1>
            <p>
              {mockDepartments.length} departments · {coworkerCount} coworkers.
              Drag to arrange, scroll to zoom, click a department to look
              inside.
            </p>
          </div>
        </header>

        {/* Draggable so the interaction can be felt, but nothing is saved. */}
        <DepartmentCanvas
          departments={mockDepartments}
          canEdit
          persist={false}
        />
      </div>
    </div>
  );
}
