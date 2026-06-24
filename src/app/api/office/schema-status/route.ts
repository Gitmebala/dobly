import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/server";

const REQUIRED_TABLES = ["office_events", "office_tasks", "office_workers"];

export async function GET() {
  const supabase = createAdminSupabaseClient();
  const checks = await Promise.all(
    REQUIRED_TABLES.map(async (table) => {
      const { error } = await supabase.from(table).select("id").limit(1);
      return {
        table,
        exists: !error,
        error: error?.message ?? null,
      };
    }),
  );

  const missing = checks.filter((check) => !check.exists).map((check) => check.table);

  return NextResponse.json({
    ready: missing.length === 0,
    missing,
    checks,
    setupSql: "supabase/dobly_operating_system_schema.sql",
    message:
      missing.length === 0
        ? "Homebase office schema is installed."
        : "Apply supabase/dobly_operating_system_schema.sql in Supabase SQL editor, then refresh the Supabase schema cache.",
  });
}
