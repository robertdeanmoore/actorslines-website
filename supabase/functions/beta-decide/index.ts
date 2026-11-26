// Admin-only decisions on beta programme applications (WIP #269 P2).
//
//   POST { action, id, internal_note? }   Authorization: the admin's own session JWT
//   action: accept | reject | resend_invite | group_added | withdraw | reopen
//   -> 200 { ok: true, status, ... }   409 conflict (cap full, wrong state)   401 / 403 not an admin
//
// Authorisation: the caller's JWT is resolved with the anon key and the caller's profiles.role must be
// 'admin' (same pattern as the invite function). Every write then uses the service role; the browser
// has no write grant on status, decision or licence columns.
//
// accept: beta_accept RPC (advisory lock, 50-place cap, replay-safe) stores the grant intent; the
// licence itself is written later by beta_apply_grant when the invitee's account exists (D2), called
// from the invite function's accept step, or here at once for an applicant who already has an account.
//
// Secrets (names only): SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, BREVO_API_KEY,
// MAIL_FROM. Config (not a credential): BETA_PLAY_OPT_IN_URL, the Play opt-in link for the 4.6 email.
// No real sends happen until the function is deployed and an admin presses a button.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { BETA_CAP, REPLY_TO, SITE_URL } from "../beta-apply/policy.ts";
import {
  acceptanceEmail, acceptanceExistingAccountEmail, groupAddedEmail, rejectionEmail, type Email,
} from "./beta_text.ts";
import { acceptOutcome, formatExpiry, inviteLink, parseRequest } from "./decide_policy.ts";

const ALLOWED_ORIGINS = new Set(["https://actorslines.app", "https://www.actorslines.app"]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.has(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

async function sendEmail(to: string, email: Email): Promise<boolean> {
  const [fromName, fromEmail] =
    (Deno.env.get("MAIL_FROM") ?? "Actors Lines <hello@actorslines.app>")
      .match(/^(.*) <(.*)>$/)?.slice(1) ?? ["Actors Lines", "hello@actorslines.app"];
  try {
    const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": Deno.env.get("BREVO_API_KEY") ?? "", "Content-Type": "application/json" },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        replyTo: { email: REPLY_TO },
        to: [{ email: to }],
        subject: email.subject,
        textContent: email.text,
      }),
    });
    // Status only: the provider's response body can echo the recipient address.
    if (!resp.ok) console.error(`[beta-decide] brevo send failed status=${resp.status}`);
    return resp.ok;
  } catch {
    console.error("[beta-decide] brevo request threw");
    return false;
  }
}

type App = {
  id: number; name: string; email: string; google_email: string; status: string;
  existing_user: boolean; user_id: string | null; licence_id: number | null;
  group_email_sent_at: string | null;
};

Deno.serve(async (req) => {
  const cors = corsHeadersFor(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const json = (status: number, obj: unknown) =>
    new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
  const fail = (status: number, message: string) => {
    console.error(`[beta-decide] ${status} ${message}`);
    return json(status, { error: message });
  };
  if (req.method !== "POST") return fail(405, "Method not allowed");

  try {
    // 1. Who is calling? Nothing below runs for anyone but a signed-in admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const caller = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await caller.auth.getUser();
    if (!user) return fail(401, "Not signed in");
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return fail(403, "Admin only");

    // 2. What do they want?
    const parsed = parseRequest(await req.json().catch(() => null));
    if (!parsed.ok) return fail(400, parsed.error);
    const { action, id, note } = parsed;

    const { data: found, error: loadErr } = await admin
      .from("beta_applications")
      .select("id, name, email, google_email, status, existing_user, user_id, licence_id, group_email_sent_at")
      .eq("id", id).maybeSingle();
    if (loadErr) return fail(500, "Could not load the application");
    if (!found) return fail(404, "Application not found");
    const app = found as App;

    const expireOpenInvites = async () => {
      await admin.from("invites").update({ expires_at: new Date().toISOString() })
        .eq("email", app.email).is("accepted_at", null).gt("expires_at", new Date().toISOString());
    };

    // Creates a fresh single-use invite (14-day default expiry, the invite function's own rule) and
    // sends the acceptance email. Returns whether the email went out.
    const sendInvite = async (): Promise<boolean> => {
      await expireOpenInvites();
      const token = crypto.randomUUID();
      const { data: invite, error: invErr } = await admin.from("invites")
        .insert({ email: app.email, token, invited_by: user.id }).select("expires_at").single();
      if (invErr || !invite) {
        console.error(`[beta-decide] invite insert failed code=${invErr?.code ?? "unknown"}`);
        return false;
      }
      const email = acceptanceEmail({
        name: app.name, googleEmail: app.google_email, accountEmail: app.email,
        inviteLink: inviteLink(token), expiryDate: formatExpiry(invite.expires_at),
      });
      const sent = await sendEmail(app.email, email);
      if (sent) {
        await admin.from("beta_applications").update({
          invite_sent_at: new Date().toISOString(), decision_email_sent_at: new Date().toISOString(),
          invite_expires_at: invite.expires_at,
        }).eq("id", app.id);
      }
      return sent;
    };

    if (action === "accept") {
      const { data: result, error: rpcErr } = await admin.rpc("beta_accept", {
        p_id: app.id, p_admin: user.id, p_cap: BETA_CAP,
      });
      if (rpcErr) return fail(500, "Could not record the decision");
      const outcome = acceptOutcome(result);
      if (outcome.error) return fail(outcome.status, outcome.error);
      if (!outcome.proceed) return json(200, { ok: true, status: "approved", already: true });

      // An applicant who already has an account: no invite, the licence goes straight on (AC2.8).
      const { data: existing } = await admin.from("profiles").select("id").eq("email", app.email).limit(1).maybeSingle();
      if (existing) {
        const { error: grantErr } = await admin.rpc("beta_apply_grant", { p_application_id: app.id, p_user: existing.id });
        if (grantErr) {
          console.error("[beta-decide] grant for existing user failed");
          return json(200, { ok: true, status: "approved", email_sent: false, grant_applied: false });
        }
        const sent = await sendEmail(app.email, acceptanceExistingAccountEmail({
          name: app.name, googleEmail: app.google_email, accountEmail: app.email,
        }));
        if (sent) {
          await admin.from("beta_applications").update({ decision_email_sent_at: new Date().toISOString() }).eq("id", app.id);
        }
        return json(200, { ok: true, status: "approved", email_sent: sent, grant_applied: true });
      }

      const sent = await sendInvite();
      // EC2.1: a failed send leaves the application approved with invite_sent_at null; the admin
      // sees "Invite not sent" and can press Resend invite.
      return json(200, { ok: true, status: "approved", email_sent: sent });
    }

    if (action === "reject") {
      const { data: updated, error: upErr } = await admin.from("beta_applications").update({
        status: "rejected", decided_at: new Date().toISOString(), decided_by: user.id,
        reject_reason_internal: note,
      }).eq("id", app.id).eq("status", "pending").select("id");
      if (upErr) return fail(500, "Could not record the decision");
      if (!updated || updated.length === 0) {
        if (app.status === "rejected") return json(200, { ok: true, status: "rejected", already: true });
        return fail(409, "Only a pending application can be rejected");
      }
      // The internal note is never part of the email.
      const sent = await sendEmail(app.email, rejectionEmail({ name: app.name }));
      if (sent) {
        await admin.from("beta_applications").update({ decision_email_sent_at: new Date().toISOString() }).eq("id", app.id);
      }
      return json(200, { ok: true, status: "rejected", email_sent: sent });
    }

    if (action === "resend_invite") {
      if (app.status !== "approved") return fail(409, "Only an approved application can be sent an invite");
      if (app.user_id) return fail(409, "This person has already created their account");
      const { data: existing } = await admin.from("profiles").select("id").eq("email", app.email).limit(1).maybeSingle();
      if (existing) return fail(409, "This email already has an account; no invite is needed");
      const sent = await sendInvite();
      return json(sent ? 200 : 502, sent ? { ok: true, status: "approved", email_sent: true } : { error: "Could not send the invite email" });
    }

    if (action === "group_added") {
      if (app.status !== "approved") return fail(409, "Only an approved application can be added to the Group");
      if (app.group_email_sent_at) return json(200, { ok: true, status: "approved", already: true });
      const optIn = Deno.env.get("BETA_PLAY_OPT_IN_URL");
      if (!optIn) return fail(503, "The Google Play opt-in link is not configured yet");
      const sent = await sendEmail(app.email, groupAddedEmail({
        name: app.name, googleEmail: app.google_email, optInLink: optIn,
      }));
      if (!sent) return fail(502, "Could not send the Group email");
      await admin.from("beta_applications").update({
        group_added: true, group_email_sent_at: new Date().toISOString(),
      }).eq("id", app.id);
      return json(200, { ok: true, status: "approved", email_sent: true });
    }

    if (action === "withdraw") {
      if (app.status !== "approved" && app.status !== "pending") return fail(409, "Only a pending or approved application can be withdrawn");
      const { error: upErr } = await admin.from("beta_applications")
        .update({ status: "withdrawn", decided_at: new Date().toISOString(), decided_by: user.id })
        .eq("id", app.id).in("status", ["pending", "approved"]);
      if (upErr) return fail(500, "Could not record the decision");
      await expireOpenInvites();
      // The place is freed. A granted licence is revoked through the existing admin RPC, run with the
      // admin's own JWT so the audit trail names them. No email is sent (Robert writes personally).
      if (app.licence_id) {
        const { error: revErr } = await caller.rpc("admin_revoke_licence", {
          p_licence_id: app.licence_id, p_reason: `beta application #${app.id} withdrawn`,
        });
        if (revErr) {
          console.error("[beta-decide] licence revoke failed");
          return json(200, { ok: true, status: "withdrawn", licence_revoked: false });
        }
      }
      return json(200, { ok: true, status: "withdrawn", licence_revoked: Boolean(app.licence_id) });
    }

    // reopen: a rejected application goes back to Pending (EC2.7).
    const { data: reopened, error: reErr } = await admin.from("beta_applications")
      .update({ status: "pending", decided_at: null, decided_by: null })
      .eq("id", app.id).eq("status", "rejected").select("id");
    if (reErr) {
      // 23505: the same address already has a live application.
      return reErr.code === "23505" ? fail(409, "This address already has a live application") : fail(500, "Could not reopen");
    }
    if (!reopened || reopened.length === 0) return fail(409, "Only a rejected application can be reopened");
    return json(200, { ok: true, status: "pending" });
  } catch (e) {
    console.error("[beta-decide] unhandled error", e instanceof Error ? e.name : "unknown");
    return fail(500, "Unexpected error");
  }
});
