import { redirect } from "next/navigation";

// Automations and workflows were the same concept twice. Loops live
// under /dashboard/workflows now.
export default function AutomationsPage() {
  redirect("/dashboard/workflows");
}
