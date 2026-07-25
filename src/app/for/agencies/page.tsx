import type { Metadata } from "next";
import VerticalLandingPage, { type VerticalLandingContent } from "@/components/landing/VerticalLandingPage";
import "@/components/landing/dobly-landing.css";

export const metadata: Metadata = {
  title: "Dobly for Agencies",
  description: "Hire coworkers that handle client reporting, onboarding, and follow-up so your team spends time on strategy, not busywork.",
};

const content: VerticalLandingContent = {
  kicker: "For agencies",
  headline: "Your account managers shouldn't be doing this by hand.",
  headlineEm: "Hire the coworker who does.",
  dek: "Client reporting, onboarding checklists, and invoice follow-up are outcomes, not headcount. Describe the job once and Dobly proposes the Operator who owns it.",
  roster: [
    { name: "Client Reporting Operator", domain: "Reporting", line: "Pulls the numbers from your connected sheets and docs and drafts the client-ready report on schedule.", icon: "FileText" },
    { name: "Onboarding Coordinator", domain: "Onboarding", line: "Runs the same new-client checklist every time: welcome message, kickoff doc, access requests, first-week check-in.", icon: "UserRoundPlus" },
    { name: "Invoice Follow-up Operator", domain: "Finance", line: "Watches for overdue invoices and drafts a respectful reminder. Anything money-related waits for your approval first.", icon: "CircleDollarSign" },
    { name: "Content Repurposer", domain: "Marketing", line: "Turns one piece of client content into channel-ready drafts, then routes them for your review before anything publishes.", icon: "Repeat2" },
  ],
  workRecord: {
    title: "Every client, one page each.",
    body: "Each Operator's chat is the record: what it sent, what it drafted, what it paused on and why. Open a client's coworker and read the account like a ledger, not a spreadsheet you have to rebuild every Friday.",
  },
  manifesto: "An agency's real constraint is attention, not headcount. Dobly takes the repeatable half of client work off your team's plate and hands back only the decisions that need a person.",
};

export default function AgenciesPage() {
  return <VerticalLandingPage content={content} />;
}
