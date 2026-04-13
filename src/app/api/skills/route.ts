import { NextResponse } from "next/server";
import { listDoblySkills } from "@/lib/skills/registry";

export async function GET() {
  return NextResponse.json({
    skills: listDoblySkills(),
  });
}
