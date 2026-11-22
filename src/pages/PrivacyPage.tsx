import LegalTable from "../components/LegalTable";
import { LAST_UPDATED } from "../lib/legalMeta";
import { isNightTheme } from "../lib/theme";

// Night look: the al-legal rules in legal.css (unlayered, so they beat the legacy Tailwind colour
// utilities on the body text) restyle the page. Only the wrapper classes change.
const NIGHT_ARTICLE = "al-container al-container--prose al-doc al-legal";

// Text: pre-payment Privacy Policy v2 (Clarity 2026-11-14) with Holly's replacements (2026-11-14, PR 60 review
// 2026-11-16). No price, licence, refund or payment wording until payments launch.
// Markers "ROBERT-CONFIRM", "PR60" and the "-GOLIVE-GATE" markers flag sentences whose truth depends on an open item; see the PR description.

const P = "text-sm text-gray-700 mt-2";
const UL = "text-sm text-gray-700 mt-2 list-disc pl-6";

export default function PrivacyPage() {
  const night = isNightTheme();
  return (
    <article className={night ? NIGHT_ARTICLE : "prose max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8"}>
      <h1 className={night ? "al-page-title" : "text-2xl font-bold text-brand"}>Privacy Policy</h1>
      <p className={night ? "al-prose__meta" : "text-sm text-gray-500"}>Last updated: {LAST_UPDATED}</p>

      <h2 className="mt-6 font-semibold">Who we are</h2>
      <p className={P}>
        Actors Lines is made by Robert Dean Moore, trading as <strong>You Never Know Productions</strong>, a sole
        trader. In this policy &ldquo;we&rdquo; means him. We are the &ldquo;controller&rdquo; of your personal
        information under UK data protection law.
      </p>
      <ul className={UL}>
        {/* ROBERT-CONFIRM (ICO): the ICO register still shows 5 Lifstan Walk, Southend-On-Sea; Robert updates the entry. */}
        <li>Address: 12 Conifers, Hadleigh, Benfleet, Essex SS7 2JR</li>
        <li>
          Email: <a href="mailto:hello@actorslines.app">hello@actorslines.app</a>
        </li>
        <li>
          ICO: registered with the Information Commissioner&apos;s Office, registration reference ZA464293 (Mr Robert
          Dean Moore)
        </li>
      </ul>
      <p className={P}>
        If you want to see, correct or delete your information, email us at the support address above.
      </p>

      <h2 className="mt-6 font-semibold">What we collect, why, and our legal basis</h2>
      <LegalTable
        caption="What we collect, why, and our legal basis"
        head={["What", "Why", "Legal basis"]}
        rows={[
          [
            <>
              <strong>Account:</strong> email address, display name, password (stored hashed), when you last signed in
            </>,
            "To create and run your account, verify your email, reset your password",
            "Contract (providing the service you asked for)",
          ],
          [
            <>
              <strong>Two-factor details</strong> if you turn it on (authenticator setup held by our account service)
              and a <strong>&ldquo;trusted device&rdquo; record</strong> if you tick &ldquo;trust this device for 30
              days&rdquo;: a hashed token and your browser&apos;s user-agent text
            </>,
            "To keep your account secure",
            "Legitimate interests (account security)",
          ],
          [
            <>
              <strong>Access records:</strong> what access your account has, start and end dates, how it was given (for
              example by code or by us), and an audit trail of grants and redemptions
            </>,
            "To give you the features you are entitled to",
            "Contract",
          ],
          [
            <>
              <strong>Learn Lines scripts</strong> you upload to the website: title, your character name, the script
              text and your progress and bookmarks. If you share a script with another member, they can see it
            </>,
            "To provide the Learn Lines page",
            "Contract",
          ],
          [
            <>
              <strong>Enhancement requests, comments and votes</strong> you post on the site
            </>,
            "To run the enhancement board and plan improvements",
            "Contract / legitimate interests",
          ],
          [
            <>
              <strong>Support messages</strong> you send us (request messages). The text of a request is processed by an
              AI service (via OpenRouter) and may be compared with other members&apos; requests
            </>,
            "To answer you",
            "Legitimate interests; contract",
          ],
          [
            <>
              <strong>Optional anonymous app usage data</strong> (only if you turn it on in the app; see the app section)
            </>,
            "To see which features are used",
            "Consent",
          ],
          [
            <>
              <strong>Recognition problem reports</strong> you choose to send from the app, with the short snippet of
              text you see and confirm before sending
            </>,
            "To improve script reading",
            "Consent",
          ],
          [
            <>
              <strong>Invitation:</strong> your email address and a single-use invitation link with an expiry date
            </>,
            "To invite you to make an account. We got your address from you when you asked, or from the person who suggested you",
            "Legitimate interests",
          ],
          [
            <>
              <strong>Emails you send us</strong> to hello@actorslines.app, including asking for an invitation, asking
              to be told when the Android app is on Google Play, or asking us to change the iPhone notify list. They
              pass through Cloudflare (which forwards them) and arrive in a Gmail mailbox run by Google; we reply using
              Brevo
            </>,
            "To reply, keep a record and, if you asked, tell you once when the Android app is on Google Play",
            "Legitimate interests",
          ],
          [
            <>
              <strong>Waiting-list email</strong> if you join the iPhone notify list
            </>,
            "To tell you once if an iPhone version becomes available",
            "Consent",
          ],
          [
            <>
              <strong>Technical data:</strong> your IP address and browser details are seen by our hosting and security
              providers when you visit or sign in
            </>,
            "To run, secure and protect the site against abuse",
            "Legitimate interests",
          ],
        ]}
      />
      {/* TRIAL-USED-GOLIVE-GATE: the free-trial record paragraph and the "Free-trial record" retention bullet are true
          once migration 0028 is applied (trial_used table, keyed email hash, 24-month purge). Never call the hash
          anonymous (Holly 2026-11-17). */}
      <p className={P}>
        <strong>Free-trial record.</strong> When your free trial starts we store a one-way coded version of your email
        address (a keyed hash) and the start date. If you delete your account we keep only that code and date, for 24
        months from the trial start, then delete them. We do this to stop the free trial being used again by deleting
        and re-creating an account (our legitimate interest in preventing abuse). The code is not your email address
        and cannot be read back as one without a secret key that we hold, but because we could match it against an
        address, we treat it as personal information. You can object by emailing{" "}
        <a href="mailto:hello@actorslines.app">hello@actorslines.app</a>.
      </p>
      <p className={P}>
        You need to give us an email address and password to have an account. Without them we cannot provide it.
        Everything else is optional unless the table says it is needed to give you a feature you ask for.
      </p>
      {/* OPENROUTER-GOLIVE-GATE: this paragraph and the OpenRouter rows describe request analysis through OpenRouter
          (zero data retention required; hosts chosen from an approved list). True only after the OpenRouter triage build is live and
          Robert's OpenRouter dashboard settings are done (Holly ruling 2026-11-17, checklist steps 1-9). Do not write
          "never stored" or claim training status of the host: CSAM/safety screening retention exception exists. */}
      <p className={P}>
        We do <strong>not</strong> sell your information and do not use it for marketing. We do not use automated
        decision-making that has legal effects on you. Enhancement requests are analysed by an automated AI service
        (provided through OpenRouter and the AI model hosting providers it chooses from an approved list, which may be outside the UK, including the United States and Asia) to produce
        development reports, and may be compared with other members&apos; requests during that analysis (see &ldquo;Who else handles your
        information&rdquo;).
      </p>

      <h2 className="mt-6 font-semibold">What the Actors Lines app sends</h2>
      <p className={P}>
        Your scripts are stored on your phone, not uploaded to us. The same goes for your recordings and notes. The
        only script text that ever leaves the app to us is a recognition report you choose to send (see the table
        above); if you optionally connect your own OpenRouter account for Script Analysis, only the selected script
        context is sent directly from your phone to OpenRouter (never to us). (The separate Learn Lines page on the
        website is different: scripts you upload there are stored on our server, as the table above says.) The app
        connects to the internet to:
      </p>
      <ul className={UL}>
        <li>
          sign you in and check what access your account has (your email and password go to our account service,
          Supabase; redeeming a code sends the code; the sign-in screen shows a Cloudflare Turnstile check to confirm
          you are not a bot, which loads from our website and Cloudflare);
        </li>
        <li>download voice and speech models from public GitHub releases when you ask (only the download request is sent);</li>
        <li>
          use your phone&apos;s speech recogniser to score your lines. The app asks for the microphone permission for
          this. Depending on your phone, your speech may be
          processed by the recogniser&apos;s provider (for example Google) rather than on the phone. We do not receive
          it;
        </li>
        <li>
          <strong>Script Analysis (optional, Bring Your Own Key via OpenRouter):</strong> if you choose to connect
          your own OpenRouter account and run a Script Analysis query, only the selected script context and your prompt
          are sent directly from your device to OpenRouter (never to Actors Lines servers). Every request enforces
          strict Zero Data Retention (<code>zdr: true</code>, <code>data_collection: &quot;deny&quot;</code>,{" "}
          <code>allow_fallbacks: false</code>) so providers neither store nor train on your script. Optional web
          research for historical or dramatic context is off by default.
        </li>
        <li>
          check for app updates and a small public status file, currently hosted on GitHub (we send no account or
          personal data, but GitHub, like any web host, sees your phone&apos;s IP address and request details);
        </li>
        <li>
          send anonymous usage data, <strong>only if you turn it on</strong> (off by default). It contains which
          features you use, how often and how long, the app version, your phone&apos;s make, model and Android version and a random identifier not
          linked to your name, email or account. You can reset or switch it off at any time.
        </li>
      </ul>
      <p className={P}>
        The app uses Google&apos;s ML Kit libraries for document scanning, text recognition and the on-device AI. Your
        scans and text are processed on the phone, but ML Kit sends Google information such as device details, app
        version, performance and error data and installation identifiers (see Google&apos;s ML Kit data disclosure).
      </p>
      <p className={P}>
        <strong>Android backup.</strong> If Android&apos;s backup is on, Android copies the app&apos;s data (your plays,
        scripts and notes) to your own Google account. We cannot see it. Your sign-in details and access record, your
        anonymous usage ID, your OpenRouter API key (<code>openrouter.preferences_pb</code>, stored encrypted on your
        device), and your voice recordings are left out of Google cloud backup and device-to-device transfer, so after
        a restore or transfer you sign in and reconnect OpenRouter again, and your recordings are not restored from
        Google backup. If you move to a new phone using Android&apos;s phone-to-phone transfer, recordings may be
        copied across.
      </p>

      <h2 className="mt-6 font-semibold">Who else handles your information (processors)</h2>
      <p className={P}>
        Most act on our instructions. Google (Gmail, and your phone&apos;s Google services) and GitHub (when it records
        visits to public files) decide for themselves how they handle what they see.
      </p>
      {/* VERIFY (Supabase): the London claim rests on the project region setting; Robert or Kate confirm eu-west-2 in
          the Supabase dashboard. */}
      {/* OPENROUTER-GOLIVE-GATE (processors row below): true only after the OpenRouter triage build is live and
          Robert's dashboard settings are done. After PR 70 triage runs in the dispatch edge function and calls OpenRouter
          directly (no GitHub trigger), so GitHub has its own row for model downloads and the public status file (IP logs). Anthropic removed for the request-analysis role only; re-add if Anthropic is
          used for anything else with member data (it must not be). */}
      <LegalTable
        caption="Who else handles your information"
        head={["Who", "What they do", "Data", "Where"]}
        rows={[
          [
            <strong key="c">Cloudflare</strong>,
            "Website hosting and delivery; Turnstile bot check on sign-in, registration and request forms; receives emails sent to hello@actorslines.app and forwards them to our mailbox",
            "Visitor IP and browser data; Turnstile signals; the sender address, content and headers of emails to hello@",
            "Global network, including the United States",
          ],
          [
            <>
              <strong>Google</strong> (Gmail)
            </>,
            "Receives the emails Cloudflare forwards from hello@actorslines.app, and holds our replies, in a personal Google account used by the site's owner. Google decides how it handles that account under its own terms; it is not acting on our instructions",
            "Sender address, content, headers, our replies",
            "Google's servers worldwide, including the United States",
          ],
          [
            <strong key="b">Brevo</strong>,
            "Sends our emails (verification, password reset, account warnings, invites, notify list) and relays our replies from hello@",
            "Your email address, and the message, subject and send details",
            "European Union (France and Belgium). Brevo's group and sub-processors may also handle data in the United States and India under Brevo's data processing agreement",
          ],
          [
            <strong key="s">Supabase</strong>,
            "Database, sign-in, file and functions hosting",
            "All account, access, script, request and notify data above",
            "London, United Kingdom, with some support or sub-processor access possible from elsewhere",
          ],
          [
            <>
              <strong>OpenRouter</strong> (AI routing service) and the AI model hosting provider it uses
            </>,
            "The text of a request you submit is passed, with email addresses and phone numbers removed first, through OpenRouter (an AI routing service) to an AI model run by one of several AI model hosting providers from an approved list, which may be outside the UK, including the United States and Asia. It is sent from our database and functions service (Supabase). We set OpenRouter to use only hosts that state a zero-data-retention policy and do not collect data; OpenRouter or the host may still keep content briefly for abuse and safety screening. The text may be compared with other members' requests",
            "The text of your request (email addresses and phone numbers are removed first)",
            "Outside the UK, including the United States and Asia, depending on the host used",
          ],
          [
            <strong key="g">GitHub</strong>,
            "Hosts the public voice and speech model downloads and the small status file the app checks. It sees your phone's IP address and request details when the app fetches them",
            "IP address and request details only; no account, script or request data",
            "Outside the UK, mainly the United States",
          ],
          [
            <>
              <strong>Google</strong> (via your phone)
            </>,
            "Speech recognition, ML Kit, Android backup, app updates",
            "See the app section",
            "Your device and Google",
          ],
        ]}
      />
      {/* OPENROUTER-GOLIVE-GATE: "OpenRouter's data processing agreement" needs the DPA accepted and
          saved (Holly checklist step 8); the last sentence of the paragraph stays until the model host's own transfer
          mechanism is confirmed (step 9). If the DPA cannot be accepted, escalate to Holly: blocks go-live. */}
      <p className={P}>
        Some of these providers are outside the UK, mainly in the United States. Where your information goes outside the
        UK, the provider relies on a UK-approved safeguard: the UK Data Bridge (the UK extension to the Data Privacy
        Framework) where the provider is certified, or the International Data Transfer Addendum to the EU standard
        contractual clauses (Cloudflare, Supabase, GitHub, Brevo&apos;s data processing agreement and OpenRouter&apos;s data processing
        agreement). Our AI model hosts are chosen from an approved list and may be in the United States or Asia. OpenRouter&apos;s data processing agreement covers the transfer to OpenRouter. We send the hosts only the text of your request, with email addresses and phone numbers removed first, and only to hosts that state a zero-data-retention policy; we have not verified each host&apos;s transfer safeguard separately. Google (Gmail)
        uses its own safeguards under its terms. Videos are explained in the &ldquo;Videos&rdquo; section below.
      </p>

      <h2 className="mt-6 font-semibold">How long we keep it</h2>
      {/* PR60: the 12-month lines for usage data, recognition reports and support threads are true only once
          migration 0027 is applied, the lifecycle function is redeployed and one purge run has succeeded. */}
      {/* PR60-FOLLOW-UP: the "removed within 90 days" lines (trusted devices, invitations) need Holly's follow-up purge migration. */}
      <ul className={UL}>
        {/* INACTIVITY-LICENCE-EXEMPT-GOLIVE-GATE: this sentence is true only once the DEF190(b) exemption (index.ts, active non-trial licence, stamps cleared, clock from licence end) is deployed and Slog has checked it. Until then the previous wording stays. */}
        <li>
          <strong>Account and Learn Lines data:</strong> until you delete your account (Profile page, which deletes your
          account details, scripts and votes, except the free-trial record described below; see the next line for requests and comments) or the account has had no sign-in on the Actors Lines website for 6
          months and has no current licence. An account with a current licence (not a free trial) is not deleted for
          inactivity while the licence lasts; if the licence ends, the 6 months are counted from the day it ended or your
          last sign-in, whichever is later. We email a warning after about 5 months and a final reminder about 2 weeks later. Anonymous
          usage data is not linked to your account, so deleting your account does not remove it; it is deleted after 12
          months (see below).
        </li>
        {/* TRIAL-CHECK-GOLIVE-GATE: true once migration 0030 is applied (fail-closed trial check writes the
            internal ID and time on a check fault; the note is removed with the account). */}
        <li>
          <strong>Free-trial check records:</strong> if we cannot check whether an address has already had a free trial
          (a rare technical fault), we give no trial and keep a note of your account&apos;s internal ID and the time, with
          no name or email, so that we can fix it. It is deleted when you delete your account or it is deleted for
          inactivity.
        </li>
        <li>
          <strong>Requests, comments and votes:</strong> until you delete your account or it is deleted for inactivity.
          Deleting it deletes your requests, including any on the public board and the comments others made on them, the
          message threads on them, and the notes our AI service and we wrote about them. Votes you cast are deleted.
          Comments you wrote on other people&apos;s requests stay on the board without your name.
        </li>
        <li>
          <strong>Trusted-device records:</strong> expire after 30 days and are removed within 90 days.
        </li>
        <li>
          <strong>Waiting list:</strong> deleted if you do not confirm within 30 days; deleted no later than 12 months
          after signup; deleted at once when you unsubscribe.
        </li>
        <li>
          <strong>Anonymous usage data and recognition reports:</strong> deleted after 12 months from collection.
        </li>
        <li>
          <strong>Support messages:</strong> the messages on a request thread are deleted 12 months after we close the
          request. Threads on open requests are kept while we are helping you.
        </li>
        <li>
          <strong>Invitations:</strong> until used or expired, then removed within 90 days. Deleting your account does
          not remove an invitation record sooner.
        </li>
        <li>
          <strong>Emails to us:</strong> while we help you, then deleted within 12 months. Invitation requests we do not
          act on are deleted within 3 months. If you ask to be told when the Android app is on Google Play, we keep your
          email until we have told you, or for 12 months, whichever is first.
        </li>
        <li>
          <strong>Email logs at Brevo:</strong> Brevo keeps delivery records (recipient, subject, send time) for us as
          our processor. We do not control a fixed period beyond our account settings; ask us to delete yours.
        </li>
        {/* TRIAL-USED-GOLIVE-GATE: true once migration 0028 is applied. */}
        <li>
          <strong>Free-trial record:</strong> a coded version of your email address and the trial start date, kept for
          24 months from the trial start, even if you delete your account; then deleted.
        </li>
      </ul>

      <h2 className="mt-6 font-semibold">Your rights</h2>
      <p className={P}>
        You can ask to see, correct, delete or restrict your information, to move it to another service, and to object
        to our use of it where we rely on legitimate interests. Where we rely on consent, you can withdraw it at any
        time. Email us. We reply within one month. You can delete your account yourself from your Profile page.
      </p>
      <p className={P}>
        If you are unhappy, tell us first. You can also complain to the Information Commissioner&apos;s Office:
        ico.org.uk, 0303 123 1113.
      </p>

      <h2 className="mt-6 font-semibold">Cookies and local storage</h2>
      <p className={P}>
        The website sets <strong>no advertising or analytics cookies</strong> and we run no analytics script (our
        security policy only allows scripts from our own site and Cloudflare Turnstile). What it does store in your
        browser:
      </p>
      <ul className={UL}>
        <li>
          <strong>Sign-in session</strong> (local storage, set by our account library) so you stay signed in. Strictly
          necessary.
        </li>
        <li>
          <strong>Trusted-device token</strong> (local storage key <code>av_trusted_device</code>), only if you choose
          &ldquo;trust this device for 30 days&rdquo;.
        </li>
        <li>
          <strong>Cloudflare Turnstile</strong> may set its own cookie or storage while it checks you are not a bot.
        </li>
        <li>
          Our separate content-editing tool (admins only) sets short-lived secure cookies to sign in to GitHub.
          Visitors never get these.
        </li>
      </ul>
      <p className={P}>
        We do not show a cookie banner because we set no advertising or analytics cookies. If we add analytics later we
        will ask first.
      </p>

      <h2 className="mt-6 font-semibold">Age</h2>
      <p className={P}>
        Actors Lines is for adults only (18 and over). We do not check ages, and we do not knowingly collect
        information from anyone under 18. If you think a child has given us information, email us and we will delete
        it.
      </p>

      <h2 className="mt-6 font-semibold">Videos</h2>
      <p className={P}>
        Tutorial videos, when shown, are hosted by YouTube. Videos use a click-to-play preview, so nothing is requested from
        YouTube until you press play. When you do, the video loads from YouTube&apos;s privacy-enhanced domain
        (youtube-nocookie.com), YouTube receives your IP address and device details, and YouTube may set cookies or
        similar identifiers on your device. We do not receive that information. YouTube&apos;s use of it is covered by
        Google&apos;s privacy policy. If you would rather not use YouTube, the same topics are covered in our help
        articles.
      </p>

      <h2 className="mt-6 font-semibold">Security</h2>
      <p className={P}>
        Passwords are stored hashed, connections are encrypted, and we offer two-factor authentication on your Profile
        page. No system is perfectly secure. We will tell you and the ICO if a breach puts your rights at risk.
      </p>

      <h2 className="mt-6 font-semibold">Changes</h2>
      <p className={P}>
        We will update this page and its date when things change, and email registered members about material changes.
      </p>
    </article>
  );
}
