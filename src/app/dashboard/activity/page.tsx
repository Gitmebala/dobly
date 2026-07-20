import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  ListTodo,
  Network,
  Sparkles,
  Workflow,
} from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const sources = [
  { table: "workspace_tasks", type: "Task", href: "/dashboard/tasks", titleKey: "title", icon: ListTodo },
  { table: "workspace_projects", type: "Project", href: "/dashboard/projects", titleKey: "name", icon: FolderKanban },
  { table: "workspace_documents", type: "Document", href: "/dashboard/documents", titleKey: "title", icon: FileText },
  { table: "workflows", type: "Workflow", href: "/dashboard/workflows", titleKey: "title", icon: Workflow },
  { table: "coworkers", type: "Coworker", href: "/dashboard/coworkers", titleKey: "name", icon: Bot },
] as const;

type ActivityItem = {
  id: string;
  type: string;
  href: string;
  title: string;
  at: string | null;
};

export default async function ActivityPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const groups = await Promise.all(sources.map(async (source) => {
    const { data } = await supabase
      .from(source.table)
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(12);
    return (data ?? []).map((item: Record<string, unknown>): ActivityItem => ({
      id: String(item.id),
      type: source.type,
      href: source.type === "Workflow" ? `${source.href}/${item.id}` : source.href,
      title: String(item[source.titleKey] || source.type),
      at: item.updated_at ? String(item.updated_at) : item.created_at ? String(item.created_at) : null,
    }));
  }));

  const activity = groups.flat().sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 40);
  const today = new Date();
  const todayKey = today.toDateString();
  const todayItems = activity.filter((item) => item.at && new Date(item.at).toDateString() === todayKey);
  const typeCounts = Object.fromEntries(sources.map((source) => [source.type, activity.filter((item) => item.type === source.type).length]));
  const latest = activity[0] ?? null;

  return (
    <div className="ref-page activity-page">
      <header className="ref-header">
        <div>
          <div className="ref-greeting"><Activity size={16} /> Workspace history</div>
          <h1>Activity</h1>
          <p className="ref-subtitle">A readable record of what changed, who moved it, and what deserves attention next.</p>
        </div>
        <Link href="/dashboard/coworkers" className="ref-button"><Network size={16} /> Open coworkers</Link>
      </header>

      <section className="activity-summary">
        <Summary value={todayItems.length} label="Moved today" note="Across the workspace" />
        <Summary value={activity.length} label="Recent changes" note="Latest indexed work" />
        <Summary value={typeCounts.Coworker ?? 0} label="Coworkers changed" note="Created or updated" />
        <Summary value={latest?.at ? relativeTime(latest.at) : "Quiet"} label="Last movement" note={latest?.title ?? "Nothing recorded yet"} compact />
      </section>

      <div className="activity-layout">
        <main className="ref-card activity-stream">
          <div className="ref-section-title">
            <div><strong>Timeline</strong><small>Newest first</small></div>
            <span className="ref-pill">{activity.length}</span>
          </div>
          {activity.length ? (
            <div className="activity-timeline">
              {activity.map((item, index) => {
                const source = sources.find((candidate) => candidate.type === item.type);
                const Icon = source?.icon ?? Sparkles;
                const previous = activity[index - 1];
                const showDate = !previous || formatDay(previous.at) !== formatDay(item.at);
                return (
                  <div key={`${item.type}-${item.id}`}>
                    {showDate ? <div className="activity-day">{formatDay(item.at)}</div> : null}
                    <Link href={item.href} className="activity-event">
                      <span className="activity-event-icon"><Icon /></span>
                      <span className="activity-event-copy">
                        <strong>{item.title}</strong>
                        <small>{item.type} was created or updated</small>
                      </span>
                      <time>{item.at ? relativeTime(item.at) : "Recently"}</time>
                      <ArrowRight />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="activity-empty">
              <span><Sparkles /></span>
              <h2>Your workspace is ready to remember</h2>
              <p>Activity becomes useful when Dobly can connect a change to the coworker, project, document, or system that caused it.</p>
              <div className="activity-empty-actions">
                <Link href="/dashboard/create" className="ref-button primary">Create a coworker</Link>
                <Link href="/dashboard/inbox" className="ref-button">Capture something</Link>
              </div>
            </div>
          )}
        </main>

        <aside className="activity-rail">
          <section className="ref-card ref-panel">
            <strong>What Dobly tracks</strong>
            <div className="activity-source-list">
              {sources.map((source) => {
                const Icon = source.icon;
                return (
                  <Link href={source.href} key={source.type}>
                    <Icon />
                    <span><strong>{source.type}s</strong><small>{typeCounts[source.type] ?? 0} recent</small></span>
                    <ArrowRight />
                  </Link>
                );
              })}
            </div>
          </section>
          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>How to read this</strong><Clock3 /></div>
            <div className="activity-guide">
              <p><span>1</span> Every meaningful workspace change enters the timeline.</p>
              <p><span>2</span> Open an item to see its owner, context, and next action.</p>
              <p><span>3</span> Use the map to understand relationships, not only chronology.</p>
            </div>
          </section>
          <section className="ref-card ref-panel activity-calm">
            <CheckCircle2 />
            <strong>History stays inspectable</strong>
            <p>Dobly should never make the business feel like a black box.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Summary({ value, label, note, compact = false }: { value: number | string; label: string; note: string; compact?: boolean }) {
  return <div className="activity-summary-item" data-compact={compact}><strong>{value}</strong><span>{label}</span><small>{note}</small></div>;
}

function formatDay(value: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, { weekday: "long", month: "short", day: "numeric" }).format(date);
}

function relativeTime(value: string) {
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.max(1, Math.round(delta / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
