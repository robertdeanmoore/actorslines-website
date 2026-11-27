// Daily account-lifecycle job, called by the website repo's scheduled GitHub
// Action (which doubles as the Supabase free-tier keep-alive ping).
//
// Policy (stated in the privacy policy): accounts inactive for 6 months are
// deleted, unless they hold an active non-trial licence (DEF190 b; inactivity.ts). Warning email at 5 months, second warning 2 weeks later, deletion
// 2 weeks after that. Any sign-in resets the clock (touch_last_seen()).
//
// Secrets: LIFECYCLE_SECRET (shared with the workflow), BREVO_API_KEY,
//          MAIL_FROM (e.g. "Actors Lines <hello@actorslines.app>")

import { createClient } from "jsr:@supabase/supabase-js@2";
import { deleteInactiveUser } from "./delete_user.ts";
import { drainAttachmentDeletions, runBetaPurge, runUsagePurge } from "./purge.ts";
import { runTrialMaintenance } from "./trial_maintenance.ts";
import { runInactivity } from "./inactivity.ts";
import { secretMatches } from "./secret_compare.ts";
import { licenceDisplayName } from "./licence_text.ts";

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
    console.error(`[lifecycle] brevo send failed subject="${subject}" status=${resp.status} body=${detail.slice(0, 300)}`);
  }
  return resp.ok;
}

Deno.serve(async (req) => {
  const auth = req.headers.get("x-lifecycle-secret");
  if (!(await secretMatches(auth, Deno.env.get("LIFECYCLE_SECRET")))) {
    console.error("[lifecycle] forbidden: missing or invalid x-lifecycle-secret header");
    return new Response("forbidden", { status: 403 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const now = Date.now();

  // Retention dry run (WIP #269 AC5.4): `?dry_run=1` counts what the beta/attachment purge WOULD
  // delete and returns at once. Nothing is deleted, no email is sent, no other step runs.
  if (new URL(req.url).searchParams.get("dry_run") === "1") {
    const dry = await runBetaPurge((name, args) => admin.rpc(name, args), new Date(now), true);
    if (dry.errorCode) console.error(`[lifecycle] beta purge dry run failed code=${dry.errorCode}`);
    return new Response(JSON.stringify({ dryRun: true, wouldDelete: dry.totals, errorCode: dry.errorCode }), {
      status: dry.errorCode ? 500 : 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const summary = {
    warned1: 0, warned2: 0, deleted: 0, errors: 0, inactivityExempt: 0,
    compExtended: 0, compErrors: 0,
    licence1moWarned: 0, licence1wkWarned: 0, licenceWarnErrors: 0,
    notifyPurged: 0, notifyPurgeErrors: 0,
    trialMaintenance: null as unknown,
    usagePurged: { telemetry_events: 0, recognition_reports: 0, request_messages: 0, trusted_devices: 0, invites: 0 }, usagePurgeErrors: 0,
    betaPurged: { rejected_applications: 0, attachments: 0 }, attachmentFilesRemoved: 0, betaPurgeErrors: 0,
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
    .not("user_id", "is", null) // orphaned (account deleted, DEF555): no holder, must lapse, not be extended
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
    .not("user_id", "is", null) // orphaned licences (account deleted, DEF555) have nobody to warn
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
          `Hello,\n\nYour ${licenceDisplayName(l.product_code)} is due to expire in about a month, on ` +
          `${new Date(l.ends_at).toDateString()}.\n\nSee your account page for details: ${accountLink}\n\n` +
          `Nothing is auto-billed -- if you'd like to continue, visit actorslines.app to renew.\n\n— Actors Lines`);
        if (ok) {
          await admin.from("licences").update({ warned_1mo_at: new Date().toISOString() }).eq("id", l.id);
          summary.licence1moWarned++;
        } else summary.licenceWarnErrors++;
      } else if (!l.warned_1wk_at && endsAt - now <= 7 * DAY_MS) {
        const ok = await sendEmail(email, "Your Actors Lines licence expires in about a week",
          `Hello,\n\nYour ${licenceDisplayName(l.product_code)} expires in about a week, on ` +
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

  // Inactivity warnings and deletion (DEF190 option b): accounts with an active, non-trial licence
  // are exempt; see inactivity.ts and migration 0032.
  await runInactivity({
    now,
    listInactive: (cutoffIso, from, to) =>
      admin.rpc("lifecycle_inactive_profiles", { p_cutoff: cutoffIso }).range(from, to),
    hasActiveLicence: (id) => admin.rpc("lifecycle_has_active_licence", { p_user: id }),
    getEmail: async (id) => (await admin.auth.admin.getUserById(id)).data?.user?.email,
    sendEmail,
    updateProfile: async (id, patch) => !(await admin.from("profiles").update(patch).eq("id", id)).error,
    deleteUser: (id) => deleteInactiveUser(admin.auth.admin, id),
  }, summary);

  // iPhone notify list (WIP #257): delete signups past their retention window
  // (12 months, or 30 days if never confirmed). public.purge_notify_signups() is service_role only.
  const { data: purged, error: purgeErr } = await admin.rpc("purge_notify_signups");
  if (purgeErr) {
    console.error(`[lifecycle] notify purge failed code=${purgeErr.code ?? "unknown"}`);
    summary.notifyPurgeErrors++;
  } else {
    summary.notifyPurged = typeof purged === "number" ? purged : 0;
  }

  // Retention (WIP #257 B2): anonymous usage data and recognition reports 12 months from
  // collection; support messages 12 months after the case closes; expired trusted-device and
  // invitation records removed well inside the 90 days the Privacy page states. public.purge_usage_data() is
  // service_role only and returns counts, never content.
  const usage = await runUsagePurge((name, args) => admin.rpc(name, args));
  summary.usagePurged = usage.totals;
  if (usage.errorCode) {
    console.error(`[lifecycle] usage purge failed code=${usage.errorCode}`);
    summary.usagePurgeErrors++;
  }

  // Beta programme retention (WIP #269 P5.2, migration 0042): rejected applications 6 months after
  // the decision, attachments 90 days after the request closes. Their database rows go first (a trigger
  // queues each storage path), then the queued files are removed through the Storage API. Counts only.
  const beta = await runBetaPurge((name, args) => admin.rpc(name, args), new Date(now), false);
  summary.betaPurged = beta.totals;
  if (beta.errorCode) {
    console.error(`[lifecycle] beta purge failed code=${beta.errorCode}`);
    summary.betaPurgeErrors++;
  }
  const drained = await drainAttachmentDeletions(
    (name, args) => admin.rpc(name, args),
    (paths) => admin.storage.from("request-attachments").remove(paths),
  );
  summary.attachmentFilesRemoved = drained.removed;
  if (drained.errorCode) {
    console.error(`[lifecycle] attachment file removal failed code=${drained.errorCode}`);
    summary.betaPurgeErrors++;
  }

  // Trial-check upkeep (WIP #262, DEF555): retry fail-closed trial checks, count-only alert to the
  // existing notify address, 90-day purge of trial_check_failed, 24-month purge of trial_used.
  summary.trialMaintenance = await runTrialMaintenance({
    rpc: (name, args) => admin.rpc(name, args),
    countUnresolved: () => admin.from("trial_check_failed").select("user_id", { count: "exact", head: true }),
    sendAlert: async (subject, body) => {
      const notify = Deno.env.get("REQUEST_NOTIFY_EMAIL");
      if (!notify) {
        console.error("[lifecycle] REQUEST_NOTIFY_EMAIL not configured; trial-check alert not sent");
        return false;
      }
      return await sendEmail(notify, subject, body).catch(() => false);
    },
    now: () => new Date(),
  });

  console.log("[lifecycle] run complete", summary);
  return new Response(JSON.stringify(summary), {
    headers: { "Content-Type": "application/json" },
  });
});
