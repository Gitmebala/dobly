import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = { title: "Workflow templates" };

// Not a separate templates engine - each card is a real starting prompt for
// the same coworker-hiring flow every other path in the app already uses
// (OperatorHandleBar's propose/review/hire), just curated and pre-filled so
// a visitor coming from the marketing site's "See workflow templates" link
// (VerticalLandingPage.tsx) lands somewhere real instead of a 404. Deep-link
// via /dashboard/coworkers?prompt=... - see OperatorCreator.tsx.
const TEMPLATES = [
  {
    title: "Reception & booking",
    summary: "Answers WhatsApp and phone messages, and books appointments on your calendar.",
    prompt: "Handle WhatsApp and phone reception, answer customer questions, and book appointments on my calendar. Ask before anything unusual.",
  },
  {
    title: "Invoice follow-up",
    summary: "Watches for overdue invoices and drafts respectful reminders.",
    prompt: "Watch for overdue invoices, draft a respectful reminder for each, and ask before sending or escalating anything.",
  },
  {
    title: "Inbound lead qualification",
    summary: "Qualifies new leads and logs them in your CRM before the first outreach.",
    prompt: "Handle new inbound leads, qualify them, log them in the CRM, and ask before sending the first outreach.",
  },
  {
    title: "Social content",
    summary: "Drafts weekly social posts from your ideas and waits for approval to publish.",
    prompt: "Create weekly social media posts from my ideas, prepare captions and images, and ask before publishing anything.",
  },
  {
    title: "Price & market watcher",
    summary: "Tracks competitor prices or market signals and alerts you when something moves.",
    prompt: "Watch competitor prices and my stock strategy every day, and alert me when something changes.",
  },
  {
    title: "Website support chatbot",
    summary: "Answers visitor questions from your knowledge base and escalates what it doesn't know.",
    prompt: "Build a website chatbot that answers customer questions about our products and hours, and escalates anything it doesn't know.",
  },
  {
    title: "Weekly research brief",
    summary: "Researches competitors or a topic and summarizes findings into a brief.",
    prompt: "Research my competitors every week and summarize the findings into a short brief with sources.",
  },
  {
    title: "CAD & design revisions",
    summary: "Produces and revises product design concepts from a brief.",
    prompt: "Design CAD prototypes for new product ideas and handle revision requests, keeping prior versions.",
  },
] as const;

export default async function WorkflowTemplatesPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?next=%2Fdashboard%2Fworkflows%2Ftemplates");

  return (
    <div className="workflows-page mx-auto max-w-5xl space-y-4">
      <section className="card">
        <Link href="/dashboard/workflows" className="btn-ghost mb-4 inline-flex">
          <ArrowLeft className="h-4 w-4" />
          Back to Loops
        </Link>
        <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Workflow templates</div>
        <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">Start from a real job, not a blank page</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-text-muted">
          Each card is a real starting brief. Pick one, Dobly proposes the coworker and the loops that would run it — you
          review and adjust everything before anyone is hired.
        </p>
      </section>

      <section className="grid gap-3 sm:grid-cols-2">
        {TEMPLATES.map((template) => (
          <Link
            key={template.title}
            href={`/dashboard/coworkers?prompt=${encodeURIComponent(template.prompt)}`}
            className="premium-tile flex flex-col gap-2 transition hover:border-accent/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="font-display text-base font-semibold text-text">{template.title}</div>
              <ArrowRight className="h-4 w-4 shrink-0 text-text-dim" />
            </div>
            <p className="text-sm leading-6 text-text-muted">{template.summary}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
