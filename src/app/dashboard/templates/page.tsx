import { redirect } from "next/navigation";

// Dobly has no preset coworkers — describing the job in your own words
// is the product. The template gallery merged into the hiring flow.
export default function TemplatesPage() {
  redirect("/dashboard/coworkers?create=true");
}
