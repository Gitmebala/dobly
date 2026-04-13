export interface StarterTemplate {
  id: string;
  title: string;
  summary: string;
  prompt: string;
  category: string;
}

export const STARTER_TEMPLATES: StarterTemplate[] = [
  {
    id: "weekly-life-reset",
    title: "Weekly life reset",
    summary: "Start each week with one clear summary instead of remembering everything yourself.",
    category: "Personal",
    prompt:
      "Every Sunday at 7pm, send me a summary of next week's calendar, unpaid bills, upcoming birthdays, and my top priorities for Monday.",
  },
  {
    id: "bill-reminders",
    title: "Bill reminders",
    summary: "Stop relying on memory for payments that matter.",
    category: "Life admin",
    prompt:
      "Three days before any bill is due, send me a reminder with the amount, due date, and payment link, then follow up again on the due date if I have not marked it done.",
  },
  {
    id: "booking-reminders",
    title: "Booking reminders",
    summary: "Keep appointments moving without manual chasing.",
    category: "Appointments",
    prompt:
      "When someone books an appointment, send a confirmation immediately, send a reminder 24 hours before, and notify me if they do not confirm.",
  },
  {
    id: "daily-owner-report",
    title: "Daily owner report",
    summary: "End the day with one clear summary instead of checking five tools.",
    category: "Reporting",
    prompt:
      "Every day at 6pm, collect today's orders, payments, support activity, and urgent issues and send me one clear summary email.",
  },
  {
    id: "important-email-brief",
    title: "Important email brief",
    summary: "See what matters without living in your inbox.",
    category: "Personal",
    prompt:
      "Every morning at 7am, send me a short summary of any important emails from the last 24 hours and flag anything that needs a reply today.",
  },
  {
    id: "new-lead-intake",
    title: "New lead intake",
    summary: "Respond fast when a prospect fills in your form.",
    category: "Sales",
    prompt:
      "When someone fills in my contact form, send them a welcome email, add them to my CRM, and alert me in Slack.",
  },
  {
    id: "content-distribution",
    title: "Content distribution",
    summary: "Post once, then let Dobly handle the rest.",
    category: "Creator",
    prompt:
      "When I publish a new article or video, create social post drafts, send my team a summary, and add it to my weekly content tracker.",
  },
  {
    id: "invoice-after-service",
    title: "Invoice after service",
    summary: "Finish the job and let Dobly handle the next admin step.",
    category: "Finance",
    prompt:
      "When a service job is marked complete, create an invoice, email it to the client, and remind me if it has not been paid after 3 days.",
  },
];
