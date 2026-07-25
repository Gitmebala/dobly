import type { Metadata } from "next";
import VerticalLandingPage, { type VerticalLandingContent } from "@/components/landing/VerticalLandingPage";
import "@/components/landing/dobly-landing.css";

export const metadata: Metadata = {
  title: "Dobly for Ecommerce",
  description: "Hire coworkers that watch orders and inventory, follow up with customers, and reconcile payments so nothing slips between systems.",
};

const content: VerticalLandingContent = {
  kicker: "For ecommerce",
  headline: "Orders, inventory, and payments live in three different tabs.",
  headlineEm: "Dobly hires the coworker who watches all three.",
  dek: "Connect the store and the payment rail you already use. Describe the outcome you need and Dobly proposes an Operator that watches, flags, and follows up — approval-gated wherever money or a customer is involved.",
  roster: [
    { name: "Order & Inventory Operator", domain: "Operations", line: "Watches your connected store for stock drift and order exceptions, and flags mismatches before they become customer complaints.", icon: "PackageSearch" },
    { name: "Customer Follow-up Operator", domain: "Retention", line: "Sends post-purchase check-ins and review requests over WhatsApp or email, timed off the actual order, not a guess.", icon: "HeartHandshake" },
    { name: "Support Triage Operator", domain: "Support", line: "Classifies inbound questions, drafts a reply from what it actually knows, and escalates complaints instead of guessing.", icon: "Ticket" },
    { name: "Payment Reconciliation Operator", domain: "Finance", line: "Matches M-PESA and Paystack payments to open orders and flags the gaps. Never adjusts a record without your sign-off.", icon: "ReceiptText" },
  ],
  workRecord: {
    title: "Every exception, on one page.",
    body: "When something doesn't match — a payment with no order, a stock count that looks wrong — it shows up in the Operator's chat with the evidence attached, not buried in a spreadsheet tab you check on Fridays.",
  },
  manifesto: "The margin in ecommerce gets eaten by the exceptions nobody has time to chase: the payment that didn't match, the order that got missed. Dobly's job is to chase them before they cost you a customer.",
};

export default function EcommercePage() {
  return <VerticalLandingPage content={content} />;
}
