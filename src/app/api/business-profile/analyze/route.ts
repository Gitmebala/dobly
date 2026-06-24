import { NextRequest, NextResponse } from "next/server";
import { getRequestIp } from "@/lib/api-security";
import { generateBusinessProfileDraft } from "@/lib/anthropic";
import { rateLimits } from "@/lib/rate-limit";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { businessProfileAnalyzeSchema } from "@/lib/validations";

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractFallback(html: string, websiteUrl: string, businessName?: string) {
  const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() ?? businessName ?? "";
  const metaDescription =
    html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)?.[1]?.trim() ??
    null;
  const phones = Array.from(
    new Set((html.match(/\+?\d[\d\s().-]{7,}\d/g) ?? []).map((value) => value.trim()))
  ).slice(0, 3);
  const emails = Array.from(
    new Set((html.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? []).map((value) => value.trim()))
  ).slice(0, 3);

  return {
    business_name: title || "Business profile",
    business_type: null,
    website_url: websiteUrl,
    description: metaDescription,
    locations: [],
    opening_hours: null,
    contact_details: {
      email: emails[0] ?? null,
      phone: phones[0] ?? null,
      address: null,
    },
    brand_voice: null,
    faq_entries: [],
    policies: [],
    source_urls: [websiteUrl],
    context_summary: metaDescription ?? "Drafted from the public website. Review and complete before using it in live agents.",
  };
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = rateLimits.business(user.id || getRequestIp(req));
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many business analysis requests." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = businessProfileAnalyzeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.errors[0]?.message ?? "Enter a valid website URL." },
      { status: 400 }
    );
  }

  const { website_url, business_name } = parsed.data;

  try {
    const response = await fetch(website_url, {
      headers: {
        "User-Agent": "DoblyBot/1.0 (+https://dobly.io)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Website fetch failed.");
    }

    const html = await response.text();
    const websiteContent = stripHtml(html).slice(0, 16000);

    let draft: Record<string, unknown>;
    try {
      draft = await generateBusinessProfileDraft({
        userId: user.id,
        websiteUrl: website_url,
        businessName: business_name,
        websiteContent,
      });
    } catch {
      draft = extractFallback(html, website_url, business_name);
    }

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to analyze website." },
      { status: 500 }
    );
  }
}
