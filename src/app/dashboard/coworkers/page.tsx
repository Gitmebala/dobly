import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Bot, Boxes, Plus, Users } from "lucide-react";
import CoworkerSwitcher from "@/components/dashboard/CoworkerSwitcher";
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

  // The old layout kept a permanent ~240px roster column beside every
  // coworker's chat, always, whether anyone needed to switch coworkers
  // or not - a second sidebar next to the app's own global nav, before
  // the actual conversation even started. A coworker's chat is meant
  // to read as a workspace you enter, not a dashboard section with a
  // directory bolted to its side. When a coworker is open, this page
  // now renders almost nothing of its own - just a compact switcher
  // bar - and lets OperatorChatConsole's own thread be the dominant
  // surface, full width.
  return (
    <div className="coworker-console-page">
      {creating ? (
        <>
          <header className="coworker-console-header">
            <div>
              <h1>Coworkers</h1>
              <p>Your AI teammates that get work done.</p>
            </div>
          </header>
          <main className="coworker-active-workspace">
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
          </main>
        </>
      ) : (
        <main className="coworker-active-workspace coworker-active-workspace-full">
          <div className="coworker-switcher-bar">
            <CoworkerSwitcher operators={operators} activeOperator={primaryOperator} />
            <div className="coworker-switcher-links">
              <Link href="/dashboard/workflows"><Boxes aria-hidden="true" /> Loops</Link>
              <Link href="/dashboard/approvals"><Users aria-hidden="true" /> Approvals</Link>
              <Link href="/dashboard/coworkers?create=true" className="primary"><Plus aria-hidden="true" /> New coworker</Link>
            </div>
          </div>
          {primaryChat ? (
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
      )}
    </div>
  );
}
