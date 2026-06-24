import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bot, Boxes, Building2, Plus, Users } from "lucide-react";
import OperatorCreator from "@/components/dashboard/OperatorCreator";
import OperatorChatConsole from "@/components/dashboard/OperatorChatConsole";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { listOperatorChat } from "@/lib/operator-chat";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CoworkersPage({
  searchParams,
}: {
  searchParams?: Promise<{ operatorId?: string; create?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { operatorId, create } = (await searchParams) ?? {};
  const operators = await listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []);
  const activeOperators = operators.filter((operator) => operator.status === "active");
  const primaryOperator =
    operators.find((operator) => operator.id === operatorId) ??
    activeOperators[0] ??
    operators[0] ??
    null;
  const creating = create === "true" || operators.length === 0;
  const primaryChat = !creating && primaryOperator
    ? await listOperatorChat({ userId: user.id, operatorId: primaryOperator.id, operator: primaryOperator }).catch(() => null)
    : null;

  return (
    <div className="coworker-console-page">
      <header className="coworker-console-header">
        <div>
          <h1>Coworkers</h1>
          <p>{activeOperators.length} active / {operators.length} total</p>
        </div>
        <div className="coworker-console-header-actions">
          <Link href="/dashboard/departments"><Building2 /> Departments</Link>
          <Link href="/dashboard/coworkers?create=true" className="primary"><Plus /> New coworker</Link>
        </div>
      </header>

      <div className="coworker-console-layout">
        <aside className="coworker-roster">
          <div className="coworker-roster-heading">
            <span>Team</span>
            <strong>{operators.length}</strong>
          </div>

          <nav className="coworker-roster-list" aria-label="Coworkers">
            {operators.map((operator) => (
              <CoworkerRosterItem key={operator.id} operator={operator} active={!creating && primaryOperator?.id === operator.id} />
            ))}
            {!operators.length ? (
              <div className="coworker-roster-empty">
                <Bot />
                <strong>No coworkers yet</strong>
                <span>Create the first role you want handled.</span>
              </div>
            ) : null}
          </nav>

          <footer className="coworker-roster-footer">
            <Link href="/dashboard/departments"><Building2 /> Departments</Link>
            <Link href="/dashboard/pods"><Boxes /> Pods</Link>
            <Link href="/dashboard/team"><Users /> People</Link>
          </footer>
        </aside>

        <main className="coworker-active-workspace">
          {creating ? (
            <section className="coworker-create-workspace">
              <header>
                <div>
                  <span>New coworker</span>
                  <h2>What should this coworker own?</h2>
                </div>
                {operators.length ? <Link href={`/dashboard/coworkers?operatorId=${primaryOperator?.id ?? ""}`}><ArrowLeft /> Back to team</Link> : null}
              </header>
              <div className="coworker-create-scroll"><OperatorCreator /></div>
            </section>
          ) : primaryChat ? (
            <OperatorChatConsole
              operator={primaryChat.operator}
              conversation={primaryChat.conversation}
              messages={primaryChat.messages}
              events={primaryChat.events}
              feedback={primaryChat.feedback}
              recentRuns={primaryChat.recentRuns}
              artifacts={primaryChat.artifacts}
              approvals={primaryChat.approvals}
              voiceRecords={primaryChat.voiceRecords}
              memoryProposals={primaryChat.memoryProposals}
            />
          ) : (
            <section className="coworker-workspace-unavailable">
              <Bot />
              <h2>{primaryOperator?.name ?? "Coworker"}</h2>
              <p>The conversation is temporarily unavailable. The coworker and its saved work remain intact.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

function CoworkerRosterItem({ operator, active }: { operator: OperatorWithLoops; active: boolean }) {
  const loops = operator.loops ?? [];
  return (
    <Link
      href={`/dashboard/coworkers?operatorId=${encodeURIComponent(operator.id)}`}
      className="coworker-roster-item"
      data-active={active}
    >
      <span className="coworker-roster-avatar"><Bot /></span>
      <span className="coworker-roster-copy">
        <strong>{operator.name}</strong>
        <small>{operator.mission}</small>
        <em>{loops.length} loop{loops.length === 1 ? "" : "s"}</em>
      </span>
      <i data-status={operator.status} aria-label={operator.status} />
    </Link>
  );
}
