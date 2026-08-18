import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap, Globe, ListChecks, Plus } from "lucide-react";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { listLearnedSkills } from "@/lib/learned-skills";
import { SkillRowActions } from "@/components/dashboard/SkillRowActions";

export const metadata = { title: "Skills" };

export default async function SkillsPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const skills = await listLearnedSkills({ userId: user.id }).catch(() => []);

  return (
    <div className="workflows-page mx-auto max-w-5xl space-y-4">
      <section className="card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.24em] text-text-dim">Skills</div>
            <h1 className="mt-2 font-display text-2xl font-bold tracking-tight text-text">What your coworkers have learned</h1>
            <p className="mt-2 text-sm leading-6 text-text-muted">
              A skill is a way of doing something Dobly can reuse — either steps you describe, or an actual browser procedure it ran successfully once.
            </p>
          </div>
          <Link href="/dashboard/skills/new" className="ref-button">
            <Plus className="h-4 w-4" />
            Teach a skill
          </Link>
        </div>
      </section>

      {skills.length === 0 ? (
        <section className="card text-center">
          <div className="mx-auto mb-3 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-accent-dim text-accent">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h2 className="font-display text-xl font-semibold text-text">No skills yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-muted">
            Teach Dobly a procedure — either describe the steps, or point it at a real website and it can save what worked.
          </p>
          <Link href="/dashboard/skills/new" className="ref-button mt-4">Teach a skill</Link>
        </section>
      ) : (
        <section className="home-list">
          {skills.map((skill) => (
            <div key={skill.id} className="home-list-row loop-row">
              <span className="home-list-main loop-row-link">
                <strong>{skill.name}</strong>
                <small>
                  {skill.procedure_kind === "browser" ? <Globe className="inline h-3 w-3" /> : <ListChecks className="inline h-3 w-3" />}{" "}
                  {skill.source === "learned" ? "Learned from a real run" : "Taught manually"}
                  {skill.description ? ` · ${skill.description}` : ""}
                  {skill.usage_count > 0 ? ` · used ${skill.usage_count}×` : ""}
                </small>
              </span>
              <span className="home-list-meta">
                <SkillRowActions skillId={skill.id} procedureKind={skill.procedure_kind} />
              </span>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
