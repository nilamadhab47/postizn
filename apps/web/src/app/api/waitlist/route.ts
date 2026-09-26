import { NextResponse } from "next/server";
import { Resend } from "resend";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    email?: string;
    company?: string;
  } | null;

  if (body?.company) {
    return NextResponse.json({ ok: true });
  }

  const email = body?.email?.trim().toLowerCase() ?? "";
  if (!EMAIL_RE.test(email) || email.length > 160) {
    return NextResponse.json({ message: "That email does not look right." }, { status: 400 });
  }

  const saved = await persist(email);
  const mailed = await notify(email);

  if (!saved && !mailed) {
    return NextResponse.json(
      { message: "Waitlist is not wired yet. Email us at " + CONTACT_EMAIL },
      { status: 503 },
    );
  }

  return NextResponse.json({ ok: true });
}

async function persist(email: string) {
  const api = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL;
  if (!api) return false;
  try {
    const res = await fetch(`${api.replace(/\/$/, "")}/waitlist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

async function notify(email: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return false;

  const resend = new Resend(key);
  const from = process.env.RESEND_FROM?.trim() || "postN <hello@postind.xyz>";
  const founder = process.env.WAITLIST_NOTIFY_EMAIL?.trim() || CONTACT_EMAIL;

  const jobs = [
    resend.emails.send({
      from,
      to: founder,
      replyTo: email,
      subject: `Waitlist: ${email}`,
      text: `${email} joined the ${SITE_NAME} waitlist.\n${SITE_URL}`,
    }),
  ];

  if (!from.includes("resend.dev")) {
    jobs.push(
      resend.emails.send({
        from,
        to: email,
        replyTo: founder,
        subject: "You're on the postN waitlist",
        text: `You're in. We'll mail you when postN opens — one composer for every platform your audience lives on, scheduled for the moment they're actually awake.\n\n${SITE_URL}`,
      }),
    );
  }

  const results = await Promise.all(jobs);
  return results.some((row) => !row.error);
}
