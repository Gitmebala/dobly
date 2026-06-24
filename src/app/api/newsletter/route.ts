import { NextResponse } from "next/server";
import { Resend } from "resend";
import { z } from "zod";

const requestSchema = z.object({
  email: z.string().trim().email().max(254),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    return NextResponse.json({ error: "Newsletter service is not configured." }, { status: 503 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const email = parsed.data.email;
  const result = await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to: "hello@dobly.io",
    subject: "New Dobly newsletter request",
    text: `${email} requested Dobly product updates from the landing page.`,
    replyTo: email,
  });

  if (result.error) {
    return NextResponse.json({ error: "Could not submit your request." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
