import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createHostedInvoicePaymentLink } from "@/lib/intasend";
import type { ApiError } from "@/types";

// Lets the business owner (not only a coworker's tool call) create an
// invoice and get a real, shareable payment link directly - no mpesa or
// paystack merchant account required, since Dobly is the merchant of
// record on this path (see createHostedInvoicePaymentLink).

const createInvoiceSchema = z.object({
  customerName: z.string().min(1).max(120),
  customerEmail: z.string().email(),
  amount: z.number().positive(),
  currency: z.string().length(3).default("KES"),
  notes: z.string().max(500).optional().nullable(),
});

export async function GET() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ invoices: [], error: "Could not load invoices." }, { status: 200 });
  }

  return NextResponse.json({ invoices: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json<ApiError>({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json<ApiError>({ error: parsed.error.errors[0]?.message ?? "Invalid invoice request." }, { status: 400 });
  }

  const invoiceNumber = `DOB-${Date.now().toString(36).toUpperCase()}`;
  const dueAt = new Date(Date.now() + 14 * 24 * 60 * 60_000).toISOString();

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      user_id: user.id,
      invoice_number: invoiceNumber,
      customer_name: parsed.data.customerName,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      status: "draft",
      due_at: dueAt,
      notes: parsed.data.notes ?? null,
    })
    .select("*")
    .single();

  if (error || !invoice) {
    return NextResponse.json<ApiError>({ error: "Could not save the invoice." }, { status: 500 });
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
    const link = await createHostedInvoicePaymentLink({
      invoiceId: invoice.id,
      userId: user.id,
      amount: parsed.data.amount,
      currency: parsed.data.currency.toUpperCase(),
      customerEmail: parsed.data.customerEmail,
      customerName: parsed.data.customerName,
      description: `Invoice ${invoiceNumber}`,
      successUrl: `${appUrl}/dashboard/tasks`,
    });
    return NextResponse.json({ invoice: { ...invoice, checkout_url: link.url }, checkoutUrl: link.url });
  } catch (linkError) {
    return NextResponse.json({
      invoice,
      checkoutUrl: null,
      warning: linkError instanceof Error
        ? `Invoice saved, but the payment link could not be generated: ${linkError.message}`
        : "Invoice saved, but the payment link could not be generated.",
    });
  }
}
