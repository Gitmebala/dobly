export interface StarterTemplate {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  category: string;
  type?: "agent" | "automation"; // Add type to differentiate
}

const AGENT_TEMPLATES: StarterTemplate[] = [
  {
    id: "lead-qualifier",
    title: "Lead qualifier",
    summary: "Screen inbound calls and route high-intent prospects to sales.",
    category: "Sales",
    type: "agent",
    prompt:
      "An agent that answers sales calls, asks qualifying questions about the prospect's needs and budget, scores their intent level, and either schedules a demo or transfers them to a sales rep.",
  },
  {
    id: "support-triage",
    title: "Support triage",
    summary: "Handle common questions and escalate complex issues.",
    category: "Support",
    type: "agent",
    prompt:
      "A support agent that answers customer calls, troubleshoots common issues using our knowledge base, collects ticket details, and escalates to a specialist when needed.",
  },
  {
    id: "appointment-reminder",
    title: "Appointment reminder",
    summary: "Call patients to confirm appointments 24 hours before.",
    category: "Healthcare",
    type: "agent",
    prompt:
      "An agent that calls patients 24 hours before their scheduled appointments, confirms they're still coming, answers basic questions, and reschedules if needed.",
  },
  {
    id: "billing-agent",
    title: "Billing agent",
    summary: "Answer payment questions and process billing requests.",
    category: "Finance",
    type: "agent",
    prompt:
      "A billing agent that handles customer calls about invoices, processes payment inquiries, explains charges, issues refunds when appropriate, and escalates disputes.",
  },
];

const AUTOMATION_TEMPLATES: StarterTemplate[] = [
  {
    id: "weekly-life-reset",
    title: "Weekly life reset",
    summary: "Start each week with one clear summary instead of remembering everything yourself.",
    category: "Personal",
    type: "automation",
    prompt:
      "Every Sunday at 7pm, send me a summary of next week's calendar, unpaid bills, upcoming birthdays, and my top priorities for Monday.",
  },
  {
    id: "bill-reminders",
    title: "Bill reminders",
    summary: "Stop relying on memory for payments that matter.",
    category: "Life admin",
    type: "automation",
    prompt:
      "Three days before any bill is due, send me a reminder with the amount, due date, and payment link, then follow up again on the due date if I have not marked it done.",
  },
  {
    id: "booking-reminders",
    title: "Booking reminders",
    summary: "Keep appointments moving without manual chasing.",
    category: "Appointments",
    type: "automation",
    prompt:
      "When someone books an appointment, send a confirmation immediately, send a reminder 24 hours before, and notify me if they do not confirm.",
  },
  {
    id: "daily-owner-report",
    title: "Daily owner report",
    summary: "End the day with one clear summary instead of checking five tools.",
    category: "Reporting",
    type: "automation",
    prompt:
      "Every day at 6pm, collect today's orders, payments, support activity, and urgent issues and send me one clear summary email.",
  },
  {
    id: "important-email-brief",
    title: "Important email brief",
    summary: "See what matters without living in your inbox.",
    category: "Personal",
    type: "automation",
    prompt:
      "Every morning at 7am, send me a short summary of any important emails from the last 24 hours and flag anything that needs a reply today.",
  },
  {
    id: "new-lead-intake",
    title: "New lead intake",
    summary: "Respond fast when a prospect fills in your form.",
    category: "Sales",
    type: "automation",
    prompt:
      "When someone fills in my contact form, send them a welcome email, add them to my CRM, and alert me in Slack.",
  },
  {
    id: "content-distribution",
    title: "Content distribution",
    summary: "Post once, then let Dobly handle the rest.",
    category: "Creator",
    type: "automation",
    prompt:
      "When I publish a new article or video, create social post drafts, send my team a summary, and add it to my weekly content tracker.",
  },
  {
    id: "invoice-after-service",
    title: "Invoice after service",
    summary: "Finish the job and let Dobly handle the next admin step.",
    category: "Finance",
    type: "automation",
    prompt:
      "When a service job is marked complete, create an invoice, email it to the client, and remind me if it has not been paid after 3 days.",
  },
];

export const STARTER_TEMPLATES: StarterTemplate[] = [...AGENT_TEMPLATES, ...AUTOMATION_TEMPLATES];
