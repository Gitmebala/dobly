import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bot, Boxes, Plus, Users } from "lucide-react";
import CoworkerRosterPanel from "@/components/dashboard/CoworkerRosterPanel";
import OperatorCreator from "@/components/dashboard/OperatorCreator";
import OperatorChatConsole from "@/components/dashboard/OperatorChatConsole";
import { listDoblyOperators, type OperatorWithLoops } from "@/lib/dobly-operators";
import { listOperatorChat } from "@/lib/operator-chat";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Coworkers" };


export default async function CoworkersPage({
  searchParams,
}: {
  searchParams?: Promise<{ operatorId?: string; create?: string; prompt?: string }>;
}) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { operatorId, create, prompt } = (await searchParams) ?? {};
  const operators = await listDoblyOperators({ userId: user.id }).catch((): OperatorWithLoops[] => []);
  const activeOperators = operators.filter((operator) => operator.status === "active");
  const primaryOperator =
    operators.find((operator) => operator.id === operatorId) ??
    activeOperators[0] ??
    operators[0] ??
    null;
  // A prompt arriving from the templates gallery (or any other deep link)
  // always means "start a new coworker" - without this, landing here with
  // ?prompt=... while the user already has coworkers would silently drop
  // the prompt and just open their existing chat instead.
  const creating = create === "true" || operators.length === 0 || Boolean(prompt);
  const primaryChat = !creating && primaryOperator
    ? await listOperatorChat({ userId: user.id, operatorId: primaryOperator.id, operator: primaryOperator }).catch(() => null)
    : null;

  return (
    <div className="coworker-console-page">
      <header className="coworker-console-header">
        <div>
          <h1>Coworkers</h1>
          <p>Your AI teammates that get work done.</p>
        </div>
        <div className="coworker-console-header-actions">
          <Link href="/dashboard/coworkers?create=true" className="primary"><Plus /> New coworker</Link>
        </div>
      </header>

      <div className="coworker-console-layout">
        <aside className="coworker-roster">
          <CoworkerRosterPanel operators={operators} activeOperatorId={!creating ? (primaryOperator?.id ?? null) : null} />
          <footer className="coworker-roster-footer">
            <Link href="/dashboard/workflows"><Boxes /> Loops</Link>
            <Link href="/dashboard/approvals"><Users /> Approvals</Link>
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
              {/* Next.js already URL-decodes searchParams values - decoding
                  again here would throw on a prompt containing a literal
                  "%" (e.g. "chase invoices, 50% deposits") and was an easy
                  mistake to make since most manual query-param handling in
                  this app does need an explicit decode. */}
              <div className="coworker-create-scroll"><OperatorCreator initialPrompt={prompt} /></div>
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
              channels={primaryChat.channels}
              knowledge={primaryChat.knowledge}
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
