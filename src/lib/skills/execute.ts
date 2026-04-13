import { getDoblySkill } from "@/lib/skills/registry";
import type { DoblySkillContext } from "@/lib/skills/types";

export async function executeDoblySkill(skillKey: string, context: DoblySkillContext) {
  const skill = getDoblySkill(skillKey);
  if (!skill) {
    throw new Error(`Unknown Dobly skill: ${skillKey}`);
  }

  return skill.run(context);
}
