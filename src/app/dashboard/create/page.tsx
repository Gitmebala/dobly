import { redirect } from "next/navigation";

// Dobly has no preset coworkers. Creating always means hiring: describe
// the job in your own words and Dobly proposes the person. The old
// template picker contradicted that model, so this route lands on the
// hiring flow itself.
export default async function CreatePage({
  searchParams,
}: {
  searchParams?: Promise<{ kind?: string; prompt?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const target = params.prompt
    ? `/dashboard/coworkers?create=true&prompt=${encodeURIComponent(params.prompt)}`
    : "/dashboard/coworkers?create=true";
  redirect(target);
}
