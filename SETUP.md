# SETUP — standing up actorslines.app, step by step

Follow these in order. Each step says **who** does it (You / Claude Code) and roughly how
long it takes. You only need a web browser and this PC. Nothing here requires programming —
where a terminal command is needed, it's given exactly, and you can also just ask Claude Code
to run it while you do the browser parts.

> **Where things stand**: all the code in this folder is already written. These steps connect
> it to the free services it runs on. Steps marked ✅ are already done.

---

## S0 — Tools on this PC (~10 min, You + Claude Code)

1. **Node.js** — may already be installed by Claude Code. To check, open PowerShell and run
   `node --version`. If it says "not recognized", run:
   `winget install OpenJS.NodeJS.LTS` and click **Yes** on the admin prompt.
2. **GitHub CLI** — run `winget install GitHub.cli`, then **close and reopen** the terminal
   and run `gh auth login`. Choose: **GitHub.com → HTTPS → Login with a web browser**, and
   follow the browser prompts. (This lets Claude Code create the website repository and set
   secrets for you.)
3. **Supabase CLI** — easiest via npm once Node is in:
   `npm install -g supabase`

## S1 — Create the Supabase project (~10 min, You)

Supabase provides the accounts system, 2FA and database. Free tier, no card needed.

1. Go to **supabase.com** → Start your project → sign up (easiest: "Continue with GitHub").
2. Click **New project**. Organisation: accept the default. Name: `actorslines`.
   **Database password**: click Generate, then save it somewhere safe (you rarely need it,
   but don't lose it). Region: **West EU (London)** or whatever is closest. Click **Create**.
3. Wait ~2 minutes while it provisions.
4. Collect three values (left sidebar → ⚙ **Project Settings** → **API**):
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (long text starting `eyJ…`)
   - **service_role** key (⚠️ secret — never goes in a public file)
5. Also note the **Reference ID** (Project Settings → General) — an 8-20 character code.

**Then tell Claude Code you've done it** and paste the Project URL + anon key. Claude Code
will: create `.env` from `.env.example`, link the project (`supabase link`), push the
database schema (`supabase db push`), and deploy the two edge functions.

6. **Auth settings** (left sidebar → **Authentication** → **URL Configuration**):
   - Site URL: `https://actorslines.app`
   - Add redirect URLs: `https://actorslines.app/*` and `http://localhost:5173/*`
7. **Make yourself admin** (after you've registered on the site in S5):
   ask Claude Code, or run in the dashboard's **SQL Editor**:
   `update profiles set role = 'admin' where id = (select id from auth.users where email = 'robertdeanmoore@gmail.com');`

## S2 — Local test run (~5 min, You + Claude Code)

With S1 done, Claude Code runs `npm install` and `npm run dev`, and gives you a
`http://localhost:5173` address. Open it, create an account with your real email, click the
confirmation link, sign in, and try enabling 2FA from your profile page (you'll need an
authenticator app on your phone — Google Authenticator or Microsoft Authenticator).

## S3 — Create the GitHub repository (~2 min, Claude Code)

Claude Code runs `gh repo create actorslines-website --public` and pushes the code. Nothing
for you to do (needs S0.2 done). The repo must be **public** — it contains no secrets, and
public repos get free CI minutes.

## S4 — Cloudflare (Workers) + your domain (~20 min, You)

**Note:** Cloudflare has merged classic "Pages" into a unified **Workers** deploy flow (it
builds and runs `npx wrangler deploy`, not the old Pages pipeline). The site's
`wrangler.jsonc` already tells it this is a static site, not server code — nothing extra
needed there.

1. Go to **dash.cloudflare.com** → sign up (free plan).
2. **Workers & Pages → Create → Connect to Git (or "Import a repository")** → authorise
   GitHub → pick `actorslines-website`.
3. On the "Set up your application" screen: **Build command** `npm run build` (should be
   pre-filled), **Deploy command** leave as `npx wrangler deploy`, Path `/` — leave defaults.
4. API token: leave as **"A new token will be created automatically"**.
5. **Variables and secrets**: add exactly (case-sensitive, `VITE_` not `VITA_` or similar —
   easy to fat-finger, and there's no way to rename afterwards, only delete and re-add):
   - `VITE_SUPABASE_URL` = your Project URL from S1 (e.g. `https://xxxx.supabase.co`)
   - `VITE_SUPABASE_ANON_KEY` = the anon public key from S1

   **Note (found Jul 2026):** Cloudflare has since split this — for a static-assets-only
   project like this one, the classic "Variables and secrets" panel now refuses *new*
   entries ("Variables cannot be added to a Worker that only has static assets"). The two
   above still work fine where they already are. Any **new** `VITE_*` build-time value
   (e.g. the Turnstile site key in S10) goes under a different panel: project →
   **Settings → Build → Build variables and secrets**.
6. Deploy. You'll get a `*.workers.dev` address — check the site loads and sign-in works.
7. **Attach your domain**: project → **Settings → Domains & Routes → Add → Custom Domain**
   → enter `actorslines.app`. If it's not already a Cloudflare zone, it'll guide you to add
   it — usually by changing your domain's **nameservers** at your registrar to the two
   Cloudflare gives you. DNS then moves to Cloudflare and wires itself up automatically.
   Propagation can take minutes to a day.
8. Repeat for `www.actorslines.app` if you want that to work too.
9. **After the domain is live**: add `https://actorslines.app/*` to Supabase →
   Authentication → URL Configuration → Redirect URLs (alongside the workers.dev one already
   there from S1.6).
10. **No "redeploy" button in this UI** — if you ever need to force a fresh build (e.g. after
    fixing a variable), the way to trigger one is simply pushing any commit to `main`.

## S5 — Register and become admin (~5 min, You)

On the live site: create your account, confirm the email, enable 2FA. Then do S1.7 so your
account is the admin — the **Admin** menu item appears when you next sign in.

## S6 — Wire the AI pipeline (~15 min, You + Claude Code)

This connects the website to the ActorsVoice repository's AI workflows.

1. **Claude subscription token**: in a terminal run `claude setup-token` and follow the
   browser prompt. Copy the token it prints (starts `sk-ant-oat…`).
2. **GitHub dispatch token**: github.com → your avatar → **Settings → Developer settings →
   Personal access tokens → Fine-grained tokens → Generate new token**. Name:
   `actorslines-dispatch`. Expiration: 1 year. Repository access: **Only select
   repositories → ActorsVoice**. Permissions → Repository permissions → **Contents:
   Read and write**. Generate, copy the token (starts `github_pat_…`).
3. **Hand both tokens to Claude Code**, which will store them (they never enter any repo):
   - On the **ActorsVoice** repo: secrets `CLAUDE_CODE_OAUTH_TOKEN`, `SUPABASE_URL`,
     `SUPABASE_SERVICE_ROLE_KEY` (via `gh secret set`).
   - On **Supabase**: `supabase secrets set GH_DISPATCH_TOKEN=… GH_REPO=robertdeanmoore/ActorsVoice`.
4. **Test**: submit a test enhancement request on the site. Within a few minutes an AI
   report should appear on that request's page in the Admin area. (Watch progress at
   github.com/robertdeanmoore/ActorsVoice → Actions tab.)

## S7 — Brevo email (~15 min, You) — needed before real users arrive

Brevo sends the inactivity-warning emails, and (recommended) the signup-confirmation emails
once you have real users — Supabase's built-in mailer is limited to ~2 emails/hour.

1. **brevo.com** → sign up free (300 emails/day).
2. Verify your sender: Brevo → Senders & Domains → add `actorslines.app` as a domain and
   follow its DNS instructions (you add a few records in Cloudflare's DNS page — copy-paste).
3. Get an **API key**: Brevo → profile menu → SMTP & API → **Generate a new API key**. Give
   it to Claude Code to run: `supabase secrets set BREVO_API_KEY=… MAIL_FROM="Actors Lines <hello@actorslines.app>"`.
4. Also generate a **lifecycle secret** (Claude Code invents a random string) and set it in
   both places: `supabase secrets set LIFECYCLE_SECRET=…` and
   `gh secret set LIFECYCLE_SECRET --repo robertdeanmoore/actorslines-website`, plus
   `gh secret set SUPABASE_URL` on the same repo.
5. (Recommended) Point Supabase auth emails at Brevo: Supabase dashboard → Authentication →
   **SMTP Settings** → enable custom SMTP with the values Brevo shows under SMTP & API →
   SMTP (host `smtp-relay.brevo.com`, port 587, your Brevo login + SMTP key).

## S8 — YouTube (whenever you like, You)

Upload tutorial videos to your YouTube channel; paste each video's normal watch link on its
own line in a knowledge-base article and it appears embedded.

## S9 — Later / optional

- **Decap CMS** (browser-based article editor): deferred — articles are plain markdown files
  for now; ask Claude Code to add an article, or edit on github.com directly.
- **Conversational AI refinement** of requests (the 2-week nag flow): designed for, not yet
  built — the message thread on each request is already in place.

## S10 — Cloudflare Turnstile (CAPTCHA) ✅ (done 8 Jul 2026)

Adds a "prove you're human" challenge to signup, login, password reset, and the "generate
AI report" button on enhancement requests. **Follow this order exactly** — doing the
Supabase step (10.5) before the code is deployed will lock you out of login.

1. ✅ Turnstile site created (dash.cloudflare.com → Turnstile → Add site, domain
   `actorslines.app`, Managed widget) — site key + secret key retrieved.
2. ✅ `VITE_TURNSTILE_SITE_KEY` set under project → **Settings → Build → Build variables
   and secrets** (not the older "Variables and secrets" panel — see the note in S4.5).
3. Confirm the widget renders on `https://actorslines.app/register` after the next deploy.
4. Give Claude Code the Secret Key to run
   `supabase secrets set TURNSTILE_SECRET_KEY=<secret key>`, then
   `supabase functions deploy dispatch` — gates the "generate AI report" button only,
   independent of Supabase Auth. Confirm that button still works afterwards.
5. **Only once 2–4 are confirmed live**, enable Supabase dashboard → **Authentication →
   Attack Protection** → CAPTCHA protection → Provider: Turnstile → paste the same Secret
   Key → Save. ⚠️ This is a single project-wide switch — it applies to signup, login,
   *and* password reset simultaneously. That's why the widget is on all three pages.
6. Test immediately: sign out and back in on the live site, then try "Forgot password".
   If you temporarily flip `REGISTRATION_ENABLED = true` to test signup, flip it back and
   redeploy afterwards.

## S11 — Box Office signing key (~15 min, You) — before Phase 1 goes live

The ES256 keypair that signs entitlement tokens and the sunset declaration. **The private key
never touches any repo or CI** — it lives only in your password manager and as a Supabase secret.

1. Generate the keypair (run locally, not in a shared shell — delete the files afterwards):
   ```
   openssl ecparam -name prime256v1 -genkey -noout -out entitlement-private.pem
   openssl pkcs8 -topk8 -nocrypt -in entitlement-private.pem -out entitlement-private-pkcs8.pem
   openssl ec -in entitlement-private.pem -pubout -out entitlement-public.pem
   ```
2. Base64-encode the PKCS8 private PEM onto one line (avoids multiline env var issues) and give
   it to Claude Code to set as a secret — it's shown once, then delete the local files:
   ```
   openssl base64 -A -in entitlement-private-pkcs8.pem
   ```
   `supabase secrets set ENTITLEMENT_SIGNING_KEY_B64=<the base64 output> ENTITLEMENT_KEY_ID=al-2026-1`
3. Copy `entitlement-public.pem`'s contents (the whole PEM, not base64'd) into the Android
   repo's verifier — this one is **not secret**, it's committed to the app. Ask Claude Code to
   wire it into `EntitlementManager`'s `PINNED_KEYS` list alongside `kid = "al-2026-1"`.
4. **Store the private PEM in your password manager** (not just the terminal history) — losing it
   means re-issuing as `al-2026-2` plus an app update, since there's no dual-key support yet.
5. **Also store a short sunset runbook right beside it**: what to run (sign
   `{"sunset": true, "iat": <now>}` with this same key), and where to publish it (the static
   GitHub location the app polls for the sunset failsafe — see
   `docs/monetization/entitlement-architecture.md` in the ActorsVoice repo). Tell one trusted
   person this entry exists — otherwise the sunset failsafe has a bus-factor of one.
6. `supabase db push` (applies `0018_box_office_phase1.sql` if not already applied), then
   `supabase functions deploy entitlement-token redeem-code lifecycle`.
7. Regenerate `docs/monetization/test-vectors.json` with the real key and re-commit it,
   byte-identical, to both repos (it currently carries throwaway Phase 0 test-keypair vectors).
8. Smoke test: sign in on the live site, open the browser console, and run
   `await fetch(import.meta.env.VITE_SUPABASE_URL + "/functions/v1/entitlement-token", { method: "POST", headers: { Authorization: "Bearer " + (await supabase.auth.getSession()).data.session.access_token } }).then(r => r.json())`
   — should return `{ token, ent, token_exp }` with no error.

---

## WIP #257 Phase 1 additions: enhancement-intake hardening and iPhone notify list (PR-A backend, PR-B site)

**Merging to `main` deploys the website** (Cloudflare builds `main`). PR-A (#35) has no site
changes, so merging it does not change the live site. Migrations and functions are NOT deployed
by a merge; they are separate gated steps. One ordered sequence (Holly's Group 3 order):

1. Merge PR-A #35 (no site change). Retarget PR-B #36 to `main`.
2. Set secrets (`supabase secrets set NAME=value`; values never in git). Both before any deploy:
   - `REQUEST_NOTIFY_EMAIL`: inbox that receives "new enhancement request" emails (Robert names
     it). If unset, `dispatch` skips the email (logged) and the request still saves.
   - `IP_HASH_SALT`: long random string. Salts the IP hash used only as a rate-limit bucket
     name. If unset, `notify-list` fails closed to one shared bucket; it never hashes without a salt.
   - Already present and reused: `TURNSTILE_SECRET_KEY`, `BREVO_API_KEY`, `MAIL_FROM`,
     `GH_DISPATCH_TOKEN`, `GH_REPO`.
3. Dry run of `0024` and `0025` on `origin/main`.
4. Robert's data-risk sign-off.
5. `supabase db push` (`0024_request_intake_hardening.sql`, then `0025_notify_signups.sql`). Both
   are additive. The client insert policy `requests_insert` is NOT touched yet, so the live form
   keeps working.
6. Deploy from `main` via the CLI, in this order: `supabase functions deploy dispatch`, then
   `supabase functions deploy notify-list`, then `supabase functions deploy lifecycle`.
   - `lifecycle` MUST be redeployed after `0025` is applied: it now calls
     `public.purge_notify_signups()` daily (service role) and reports `notifyPurged` /
     `notifyPurgeErrors` in its summary. Before `0025` exists that call fails and is only logged
     (`notifyPurgeErrors`); the other lifecycle steps are unaffected.
   - `lifecycle` MUST also be redeployed after `0027` (usage-data retention) is applied: it calls
     `public.purge_usage_data()` daily (service role), reports `usagePurged` / `usagePurgeErrors`,
     and deletes telemetry events and recognition reports older than 12 months and request messages
     12 months after the case closes. The first run after apply deletes the whole backlog; Slog's
     pre-count query is in the RobLife design doc. Before `0027` exists the call fails and is only
     logged.
   - The FIRST deploy of `notify-list` must be this CLI route, not the dashboard. `verify_jwt`
     stays ON (the default; do not pass `--no-verify-jwt`). The site calls it with
     `supabase.functions.invoke`, which sends the anon key as the bearer token, so signed-out
     visitors pass and random internet traffic is dropped at the gateway. The function still
     enforces Turnstile, rate limits and tokens.
7. Slog runs S1-S5 and S7-S9 (below).
8. Robert confirms the retention periods; Clarity wording is in.
9. Merge PR-B #36 (this deploys the site).
10. Slog runs S10 (must be 0).
11. Dry run of `0026`, then `supabase db push` for `0026`.
12. Slog runs S6.

### Slog checks

- **S1**: `dispatch` `submit-request` (signed in, valid Turnstile, valid fields) saves exactly one
  `enhancement_requests` row, sends the email to `REQUEST_NOTIFY_EMAIL`, starts triage
  (`triage_started: true`). Without a Turnstile token it returns 403 and saves nothing.
- **S2**: as a non-admin, the 4th `submit-request` inside one hour returns 429.
- **S3**: a request to `dispatch` and `notify-list` with `Origin: https://evil.example` gets back
  an `Access-Control-Allow-Origin` that is not `https://evil.example`.
- **S4**: record which client-IP header Supabase Edge actually delivers (`cf-connecting-ip` vs
  `x-forwarded-for`). With `IP_HASH_SALT` set, the `notify-ip:` bucket in `rate_limit_events` must
  be a 64-hex hash, not `shared`. If only `x-forwarded-for` arrives and it can be set by the
  client, report it to Holly (per-IP limit would be evadable; Turnstile and the global 100/hour
  limit still hold).
- **S5**: a signed-out browser on the live site can call `notify-list` `subscribe` without a 401
  (proves the verify_jwt + legacy anon key path). A request with no Authorization header gets 401
  at the gateway.
- **S6** (run after `0026` only): a direct REST `POST /rest/v1/enhancement_requests` with a
  signed-in user's JWT is denied.
- **S7**: a repeat `subscribe` of an already-listed address returns the same 200 `{ok:true}` as a
  new one, and sends no second email. Invalid email -> 400; no consent -> 400.
- **S8**: the confirm link sets `confirmed_at`. The unsubscribe link deletes the row (0 rows for
  that token afterwards). Malformed token -> 400; unknown or already-used token -> 404.
- **S9**: as anon and as a non-admin authenticated user: `select` on `notify_signups` and
  `rate_limit_events` returns nothing or is denied, and `rpc rate_limit_hit` and
  `rpc purge_notify_signups` are denied. An admin can select `notify_signups`.
- **S10** (read-only, before `0026`): `select count(*) from public.enhancement_requests where char_length(goal) > 2000 or char_length(where_in_app) > 300 or char_length(how_it_works) > 2000 or char_length(usage_frequency) > 100 or char_length(extra_notes) > 2000;`
  must return 0.

PR-B (`feature/wip257-intake-notify-site`) switches the form to `submit-request`, adds the
notify-list UI and privacy wording, and carries migration `0026` (drops `requests_insert`,
validates the length constraints).
