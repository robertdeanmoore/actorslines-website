// Invite-only registration.
//
// Actions:
//   { "action": "send",   "email": "..." }                                — admin only
//   { "action": "check",  "token": "..." }                                — public
//   { "action": "accept", "token": "...", "password": "...",
//     "displayName": "...", "turnstileToken": "..." }                     — public
//
// Secrets: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (already provisioned),
//          BREVO_API_KEY, MAIL_FROM (already provisioned, see lifecycle/index.ts),
//          TURNSTILE_SECRET_KEY (already provisioned, see dispatch/index.ts)

import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE_URL = "https://actorslines.app";

const cors = {
  "Access-Control-Allow-Origin": SITE_URL,
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const [fromName, fromEmail] =
    (Deno.env.get("MAIL_FROM") ?? "Actors Lines <hello@actorslines.app>")
      .match(/^(.*) <(.*)>$/)?.slice(1) ?? ["Actors Lines", "hello@actorslines.app"];
  const resp = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": Deno.env.get("BREVO_API_KEY") ?? "", "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      textContent: text,
    }),
  });
  if (!resp.ok) {
    const detail = await resp.text().catch(() => "");
    console.error(`[invite] brevo send failed to=${to} status=${resp.status} body=${detail.slice(0, 300)}`);
  }
  return resp.ok;
}

async function verifyTurnstile(token: unknown, remoteip?: string): Promise<boolean> {
  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) return false;
  if (typeof token !== "string" || token.length === 0) return false;
  const body = new URLSearchParams({ secret, response: token });
  if (remoteip) body.set("remoteip", remoteip);
  try {
    const resp = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    if (!resp.ok) return false;
    const result = await resp.json();
    return result.success === true;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const fail = (status: number, message: string) => {
    console.error(`[invite] ${status} ${message}`);
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  };

  let action: string | undefined;

  try {
    const body = await req.json();
    action = body.action;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "send") {
      const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
      if (!email || !email.includes("@")) return fail(400, "Valid email required");

      // Identify the caller and confirm they're an admin.
      const caller = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
      );
      const { data: { user } } = await caller.auth.getUser();
      if (!user) return fail(401, "Not signed in");
      const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
      if (profile?.role !== "admin") return fail(403, "Admin only");

      const token = crypto.randomUUID();
      const { error: insErr } = await admin.from("invites").insert({
        email, token, invited_by: user.id,
      });
      if (insErr) return fail(500, insErr.message);

      const link = `${SITE_URL}/invite/${token}`;
      const ok = await sendEmail(
        email,
        "You're invited to Actors Lines",
        `Hello,\n\nYou've been invited to join actorslines.app. Click the link below to ` +
        `create your account (this link works once and expires in 14 days):\n\n${link}\n\n— Actors Lines`,
      );
      if (!ok) return fail(502, "Could not send the invite email");

      console.log(`[invite] sent email=${email} by=${user.id}`);
      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "check") {
      const token = typeof body.token === "string" ? body.token : "";
      if (!token) return fail(400, "token required");
      const { data: invite } = await admin
        .from("invites").select("email, accepted_at, expires_at").eq("token", token).single();
      if (!invite) return new Response(JSON.stringify({ valid: false, reason: "not_found" }),
        { headers: { ...cors, "Content-Type": "application/json" } });
      if (invite.accepted_at) return new Response(JSON.stringify({ valid: false, reason: "used" }),
        { headers: { ...cors, "Content-Type": "application/json" } });
      if (new Date(invite.expires_at).getTime() < Date.now())
        return new Response(JSON.stringify({ valid: false, reason: "expired" }),
          { headers: { ...cors, "Content-Type": "application/json" } });
      return new Response(JSON.stringify({ valid: true, email: invite.email }),
        { headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (action === "accept") {
      const token = typeof body.token === "string" ? body.token : "";
      const password = typeof body.password === "string" ? body.password : "";
      const displayName = typeof body.displayName === "string" ? body.displayName.trim().slice(0, 40) : "";
      if (!token || password.length < 8) return fail(400, "token and an 8+ character password are required");

      const captchaOk = await verifyTurnstile(body.turnstileToken, req.headers.get("cf-connecting-ip") ?? undefined);
      if (Deno.env.get("TURNSTILE_SECRET_KEY") && !captchaOk) return fail(403, "Captcha verification failed");

      // Atomically claim the invite — a single UPDATE with these WHERE clauses affects at
      // most one row, so two simultaneous accepts of the same token can't both succeed.
      const { data: claimed, error: claimErr } = await admin
        .from("invites")
        .update({ accepted_at: new Date().toISOString() })
        .eq("token", token)
        .is("accepted_at", null)
        .gt("expires_at", new Date().toISOString())
        .select("id, email")
        .single();
      if (claimErr || !claimed) return fail(400, "This invite link is invalid, expired, or already used.");

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: claimed.email,
        password,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (createErr || !created.user) {
        // Best-effort: release the claim so the admin can resend if account creation failed.
        await admin.from("invites").update({ accepted_at: null }).eq("id", claimed.id);
        return fail(500, createErr?.message ?? "Could not create the account");
      }

      await admin.from("invites").update({ accepted_user_id: created.user.id }).eq("id", claimed.id);

      console.log(`[invite] accepted email=${claimed.email} user=${created.user.id}`);
      return new Response(JSON.stringify({ ok: true, email: claimed.email }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return fail(400, "Unknown action");
  } catch (e) {
    console.error(`[invite] unhandled error action=${action ?? "unknown"}`, e);
    return fail(500, e instanceof Error ? e.message : "Unexpected error");
  }
});
