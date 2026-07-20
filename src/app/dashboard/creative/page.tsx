import { redirect } from "next/navigation";

// Consolidated: this legacy surface merged into its canonical home.
export default function Page() {
  redirect("/dashboard");
}
