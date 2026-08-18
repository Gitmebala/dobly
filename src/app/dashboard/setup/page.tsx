import { redirect } from "next/navigation";

// SetupWizardClient (deleted) was a pre-pivot "choose a launch engine" wizard
// with hardcoded first-operator presets (kenya_revenue_engine,
// client_onboarding, social_posts, ...) - a direct contradiction of the
// locked-in product decision that Dobly has NO preset coworker templates
// (see memory: dobly-product-vision, "user explicitly rejected preset
// roles"). It was still reachable via the command palette search index
// (id: "setup", keywords included "setup"), sitting right next to the real
// onboarding entry with overlapping keywords, so a user searching "setup"
// could easily land on the wrong, contradictory flow. Same fix already
// applied to /dashboard/create for the same underlying reason - land on the
// real hiring/onboarding flow instead of a stale template picker.
export default async function SetupPage() {
  redirect("/dashboard/onboarding");
}
