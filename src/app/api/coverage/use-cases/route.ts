import { NextResponse } from "next/server";
import { DOBLY_USE_CASES, getCoverageSummary } from "@/lib/use-case-coverage";

export async function GET() {
  return NextResponse.json({
    summary: getCoverageSummary(),
    useCases: DOBLY_USE_CASES,
  });
}
