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
const DAY_MS = 24 * 60 * 60 * 1000;

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
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(`[lifecycle] brevo send failed to=${to} subject="${subject}" status=${resp.status} body=${detail.slice(0, 300)}`);
  }
  return resp.ok;
}

Deno.serve(async (req) => {
  const auth = req.headers.get("x-lifecycle-secret");
  if (!auth || auth !== Deno.env.get("LIFECYCLE_SECRET")) {
    console.error("[lifecycle] forbidden: missing or invalid x-lifecycle-secret header");
    return new Response("forbidden", { status: 403 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const now = Date.now();
  const summary = {
    warned1: 0, warned2: 0, deleted: 0, errors: 0,
    compExtended: 0, compErrors: 0,
    licence1moWarned: 0, licence1wkWarned: 0, licenceWarnErrors: 0,
  };

  // Box Office: comp_rolling licences are rolling, not perpetual (golden principle #1, rules.md)
  // -- extend every active one to now + 1 year, every night, for as long as the holder remains
  // nominated. Stop running this (or revoke the licence) and it lapses on its own within a year;
  // nothing here re-grants a revoked or expired comp licence.
  const { data: compLicences, error: compQueryErr } = await admin
    .from("licences")
    .select("id")
    .eq("product_code", "comp_rolling")
    .eq("status", "active")
    .gt("ends_at", new Date(now).toISOString());
  if (compQueryErr) {
    console.error("[lifecycle] failed to query comp_rolling licences", compQueryErr);
  }
  for (const licence of compLicences ?? []) {
    const { error: extendErr } = await admin
      .from("licences")
      .update({ ends_at: new Date(now + 365 * 24 * 60 * 60 * 1000).toISOString() })
      .eq("id", licence.id);
    if (extendErr) {
      console.error(`[lifecycle] failed to extend comp_rolling licence id=${licence.id}`, extendErr);
      summary.compErrors++;
    } else {
      summary.compExtended++;
    }
  }

  // Box Office Phase 4: licence-expiry warnings -- distinct from the account-inactivity warnings
  // below (those are about signing in at all; these are about a specific paid/trial licence
  // lapsing). Each licence is warned at most once per milestone via warned_1mo_at/warned_1wk_at.
  const { data: expiringLicences, error: expiringQueryErr } = await admin
    .from("licences")
    .select("id, user_id, starts_at, ends_at, warned_1mo_at, warned_1wk_at, product_code")
    .eq("status", "active")
    .lt("ends_at", new Date(now + 31 * DAY_MS).toISOString())
    .gt("ends_at", new Date(now).toISOString());
  if (expiringQueryErr) {
    console.error("[lifecycle] failed to query expiring licences", expiringQueryErr);
  }
  for (const l of expiringLicences ?? []) {
    const { data: { user } } = await admin.auth.admin.getUserById(l.user_id);
    const email = user?.email;
    if (!email) continue;
    const endsAt = Date.parse(l.ends_at);
    const termMs = endsAt - Date.parse(l.starts_at);
    const accountLink = "https://actorslines.app/profile";
    try {
      // 1-month notice: skipped for terms under 31 days (e.g. trial_30d) -- "renews in a month"
      // makes no sense when the whole term barely exceeds a month.
      if (!l.warned_1mo_at && termMs > 31 * DAY_MS && endsAt - now <= 31 * DAY_MS) {
        const ok = await sendEmail(email, "Your Actors Lines licence renews in about a month",
          `Hello,\n\nYour ${l.product_code} licence is due to expire in about a month, on ` +
          `${new Date(l.ends_at).toDateString()}.\n\nSee your account page for details: ${accountLink}\n\n` +
          `Nothing is auto-billed -- if you'd like to continue, visit actorslines.app to renew.\n\n— Actors Lines`);
        if (ok) {
          await admin.from("licences").update({ warned_1mo_at: new Date().toISOString() }).eq("id", l.id);
          summary.licence1moWarned++;
        } else summary.licenceWarnErrors++;
      } else if (!l.warned_1wk_at && endsAt - now <= 7 * DAY_MS) {
        const ok = await sendEmail(email, "Your Actors Lines licence expires in about a week",
          `Hello,\n\nYour ${l.product_code} licence expires in about a week, on ` +
          `${new Date(l.ends_at).toDateString()}. After that you'll drop to the Free tier -- your ` +
          `plays and data stay exactly where they are, you just lose import/scan, audio-driven ` +
          `runs, and Selftape until you renew.\n\nSee your account page: ${accountLink}\n\n— Actors Lines`);
        if (ok) {
          await admin.from("licences").update({ warned_1wk_at: new Date().toISOString() }).eq("id", l.id);
          summary.licence1wkWarned++;
        } else summary.licenceWarnErrors++;
      }
    } catch (e) {
      console.error(`[lifecycle] failed processing expiring licence id=${l.id}`, e);
      summary.licenceWarnErrors++;
    }
  }

  const { data: profiles, error: queryErr } = await admin
    .from("profiles")
    .select("id, last_seen_at, inactivity_warned_1_at, inactivity_warned_2_at")
    .lt("last_seen_at", new Date(now - 5 * MONTH_MS).toISOString());
  if (queryErr) {
    console.error("[lifecycle] failed to query inactive profiles", queryErr);
  }

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
        console.log(`[lifecycle] deleted inactive account id=${p.id}`);
        summary.deleted++;
      }
    } catch (e) {
      console.error(`[lifecycle] failed processing profile id=${p.id} email=${email}`, e);
      summary.errors++;
    }
  }

  console.log("[lifecycle] run complete", summary);
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
