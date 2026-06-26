// supabase/functions/notify/index.ts
// Transactional email for booking events. Best-effort: callers ignore failures.
// Deploy: supabase functions deploy notify   (or via Supabase MCP)
// Secret:  supabase secrets set RESEND_API_KEY=...
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

type Event =
  | "enrollment_requested"
  | "enrollment_approved"
  | "booking_requested"
  | "booking_confirmed"
  | "booking_declined"
  | "booking_cancelled";

const SUBJECTS: Record<Event, string> = {
  enrollment_requested: "Nuova richiesta di iscrizione",
  enrollment_approved: "Iscrizione approvata",
  booking_requested: "Nuova richiesta di guida",
  booking_confirmed: "Guida confermata",
  booking_declined: "Guida rifiutata",
  booking_cancelled: "Guida annullata",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return new Response("method", { status: 405, headers: CORS });
  try {
    const { event, to, body } = (await req.json()) as { event: Event; to: string; body?: string };
    const subject = SUBJECTS[event];
    if (!subject || !to) return new Response("bad request", { status: 400, headers: CORS });

    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) return new Response("no provider", { status: 500, headers: CORS });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Patentedigitale <noreply@patentedigitale.it>",
        to,
        subject,
        html: `<p>${subject}.</p>${body ? `<p>${body}</p>` : ""}<p>— Patentedigitale.it</p>`,
      }),
    });
    if (!res.ok) return new Response(await res.text(), { status: 502, headers: CORS });
    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...CORS, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(String(e), { status: 500, headers: CORS });
  }
});
