import type { Metadata } from "next";
import VerticalLandingPage, { type VerticalLandingContent } from "@/components/landing/VerticalLandingPage";
import "@/components/landing/dobly-landing.css";

export const metadata: Metadata = {
  title: "Dobly for Service Businesses",
  description: "Hire coworkers that answer, book, remind, and follow up so a missed call never becomes a missed customer.",
};

const content: VerticalLandingContent = {
  kicker: "For service businesses",
  headline: "A missed call is a missed customer.",
  headlineEm: "Dobly hires the coworker who never misses one.",
  dek: "Clinics, salons, and consultancies run on bookings and follow-through. Describe how you want inbound handled and Dobly proposes the Operator: what it answers, what it books, and what it hands to you.",
  roster: [
    { name: "Reception Operator", domain: "Front desk", line: "Answers calls, WhatsApp, and website chat, qualifies the request, and books straight into your calendar.", icon: "PhoneCall" },
    { name: "Appointment Reminder Operator", domain: "Scheduling", line: "Confirms bookings, sends reminders before the appointment, and handles reschedules without a back-and-forth.", icon: "CalendarClock" },
    { name: "Customer Recovery Operator", domain: "Retention", line: "Follows up after the service, requests a review, and tracks satisfaction trends so problems surface early.", icon: "Smile" },
    { name: "Payment Follow-up Operator", domain: "Finance", line: "Sends a payment link over M-PESA or Paystack and follows up on anything unpaid. Escalates instead of guessing on disputes.", icon: "CircleDollarSign" },
  ],
  workRecord: {
    title: "Every booking, one page each.",
    body: "Read a customer's whole history the way you'd flip back through a diary: what they asked for, what got booked, what the Operator paused on before it reached you.",
  },
  manifesto: "Service businesses lose revenue in the gaps between the phone ringing and the calendar updating. Dobly closes that gap and only interrupts you for the calls that actually need a person.",
};

export default function ServicesPage() {
  return <VerticalLandingPage content={content} />;
}
