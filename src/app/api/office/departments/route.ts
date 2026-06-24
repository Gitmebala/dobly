import { NextResponse } from "next/server";
import { OFFICE_DEPARTMENTS, OFFICE_WORKER_TEMPLATES } from "@/lib/office/departments";

export async function GET() {
  return NextResponse.json({
    departments: OFFICE_DEPARTMENTS,
    workerTemplates: OFFICE_WORKER_TEMPLATES,
  });
}
