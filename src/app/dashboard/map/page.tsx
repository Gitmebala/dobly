import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  Network,
  Radar,
  Sparkles,
} from "lucide-react";
import { HomebaseGraph } from "@/components/dashboard/HomebaseGraph";
import { buildHomebaseDashboardData } from "@/lib/office/homebase";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function MapPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const office = await buildHomebaseDashboardData({ userId: user.id }).catch(() => null);
  const departments = office?.departments ?? [];
  const workers = office?.workers ?? [];
  const tasks = office?.tasks ?? [];
  const recentEvents = office?.recentEvents ?? [];
  const attentionRooms = departments.filter((room) => room.status === "needs_attention");
  const runningTasks = tasks.filter((task) => task.status === "running");
  const waitingTasks = tasks.filter((task) => task.status === "waiting_approval");

  return (
    <div className="ref-page map-page">
      <header className="ref-header map-page-header">
        <div>
          <div className="ref-greeting"><Network size={16} /> Living business model</div>
          <h1>Work map</h1>
          <p className="ref-subtitle">
            See how departments, coworkers, active work, and business signals connect in real time.
          </p>
        </div>
        <div className="map-header-actions">
          <Link href="/dashboard/states" className="ref-button"><Radar size={16} /> Watched states</Link>
          <Link href="/dashboard/create" className="ref-button primary"><Sparkles size={16} /> Add coworker</Link>
        </div>
      </header>

      <section className="map-overview">
        <MapMetric value={departments.filter((room) => room.activeWorkers > 0).length} label="Active rooms" icon={<Network />} />
        <MapMetric value={workers.filter((worker) => worker.status === "active").length} label="Working now" icon={<Bot />} />
        <MapMetric value={runningTasks.length} label="In motion" icon={<Sparkles />} />
        <MapMetric value={attentionRooms.length + waitingTasks.length} label="Needs you" icon={<AlertTriangle />} attention />
      </section>

      <div className="map-layout">
        <main className="map-main">
          <HomebaseGraph
            departments={departments}
            workers={workers}
            tasks={tasks}
            recentEvents={recentEvents}
          />
        </main>

        <aside className="map-rail">
          <section className="ref-card ref-panel">
            <div className="ref-between">
              <strong>Needs attention</strong>
              <span className="ref-pill amber">{attentionRooms.length + waitingTasks.length}</span>
            </div>
            <div className="map-rail-list">
              {attentionRooms.slice(0, 4).map((room) => (
                <Link href={`/dashboard/departments/${room.id}`} key={room.id}>
                  <span className="map-list-icon attention"><AlertTriangle /></span>
                  <span><strong>{room.name}</strong><small>{room.openTasks} open tasks · {room.approvalCount} approvals</small></span>
                  <ArrowRight />
                </Link>
              ))}
              {waitingTasks.slice(0, 3).map((task) => (
                <Link href="/dashboard/approvals" key={task.id}>
                  <span className="map-list-icon"><CheckCircle2 /></span>
                  <span><strong>{task.title}</strong><small>Waiting for your decision</small></span>
                  <ArrowRight />
                </Link>
              ))}
              {!attentionRooms.length && !waitingTasks.length ? (
                <div className="map-calm-state"><CheckCircle2 /><strong>The office is calm</strong><span>No intervention is required.</span></div>
              ) : null}
            </div>
          </section>

          <section className="ref-card ref-panel">
            <div className="ref-between"><strong>Working now</strong><Link href="/dashboard/tasks">All work</Link></div>
            <div className="map-rail-list">
              {runningTasks.slice(0, 5).map((task) => (
                <Link href="/dashboard/tasks" key={task.id}>
                  <span className="map-live-dot" />
                  <span><strong>{task.title}</strong><small>{task.workerKey} · {task.departmentId}</small></span>
                  <ArrowRight />
                </Link>
              ))}
              {!runningTasks.length ? <p className="ref-muted">Work in motion will appear here as coworkers begin executing.</p> : null}
            </div>
          </section>

          <section className="ref-card ref-panel map-legend">
            <strong>Reading the map</strong>
            <span><i data-kind="room" /> Rooms organize responsibility</span>
            <span><i data-kind="coworker" /> Coworkers own outcomes</span>
            <span><i data-kind="task" /> Tasks show work in motion</span>
            <span><i data-kind="attention" /> Bright edges need attention</span>
          </section>
        </aside>
      </div>
    </div>
  );
}

function MapMetric({
  value,
  label,
  icon,
  attention = false,
}: {
  value: number;
  label: string;
  icon: React.ReactNode;
  attention?: boolean;
}) {
  return (
    <div className="map-metric" data-attention={attention}>
      <span>{icon}</span>
      <strong>{value}</strong>
      <small>{label}</small>
    </div>
  );
}
