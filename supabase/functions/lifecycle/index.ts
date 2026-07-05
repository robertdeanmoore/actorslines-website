// Daily account-lifecycle job, called by the website repo's scheduled GitHub
// Action (which doubles as the Supabase free-tier keep-alive ping).
//
// Policy (stated in the privacy policy): accounts inactive for 6 months are
// deleted. Warning email at 5 months, second warning 2 weeks later, deletion
// 2 weeks after that. Any sign-in resets the clock (touch_last_seen()).
//
// Secrets: LIFECYCLE_SECRET (shared with the workflow), BREVO_API_KEY,
//          MAIL_FROM (e.g. "Actors Lines <hello@actorslines.app>")

import { createClient } from "jsr:@supabase/supabase-js@2";

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const [fromName, fromEmail] =
    (Deno.env.get("MAIL_FROM") ?? "Actors Lines <hello@actorslines.app>")
      .match(/^(.*) <(.*)>$/)?.slice(1) ?? ["Actors Lines", "hello@actorslines.app"];
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": Deno.env.get("BREVO_API_KEY") ?? "",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  return resp.ok;
}

Deno.serve(async (req) => {
  const auth = req.headers.get("x-lifecycle-secret");
  if (!auth || auth !== Deno.env.get("LIFECYCLE_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const now = Date.now();
  const summary = { warned1: 0, warned2: 0, deleted: 0, errors: 0 };

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, last_seen_at, inactivity_warned_1_at, inactivity_warned_2_at")
    .lt("last_seen_at", new Date(now - 5 * MONTH_MS).toISOString());

  for (const p of profiles ?? []) {
    const { data: { user } } = await admin.auth.admin.getUserById(p.id);
    const email = user?.email;
    if (!email) continue;
    const keepLink = "https://actorslines.app/login";
    try {
      if (!p.inactivity_warned_1_at) {
        const ok = await sendEmail(email, "Your Actors Lines account — are you still with us?",
          `Hello,\n\nYour actorslines.app account hasn't been used for about 5 months. ` +
          `Inactive accounts are removed after 6 months.\n\nTo keep your account, simply sign in: ${keepLink}\n\n` +
          `If you do nothing, we'll send one more reminder before your account and its data are deleted.\n\n— Actors Lines`);
        if (ok) {
          await admin.from("profiles").update({ inactivity_warned_1_at: new Date().toISOString() }).eq("id", p.id);
          summary.warned1++;
        } else summary.errors++;
      } else if (!p.inactivity_warned_2_at &&
                 now - Date.parse(p.inactivity_warned_1_at) > FORTNIGHT_MS) {
        const ok = await sendEmail(email, "Final reminder — your Actors Lines account will be deleted",
          `Hello,\n\nThis is the final reminder: your actorslines.app account will be permanently deleted ` +
          `in 2 weeks due to inactivity.\n\nTo keep it, just sign in: ${keepLink}\n\n— Actors Lines`);
        if (ok) {
          await admin.from("profiles").update({ inactivity_warned_2_at: new Date().toISOString() }).eq("id", p.id);
          summary.warned2++;
        } else summary.errors++;
      } else if (p.inactivity_warned_2_at &&
                 now - Date.parse(p.inactivity_warned_2_at) > FORTNIGHT_MS) {
        await admin.auth.admin.deleteUser(p.id); // cascades to profile + content FKs
        summary.deleted++;
      }
    } catch {
      summary.errors++;
    }
  }

  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
