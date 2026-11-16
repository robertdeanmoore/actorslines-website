import LegalTable from "../components/LegalTable";
import { LAST_UPDATED } from "../lib/legalMeta";
import { isNightTheme } from "../lib/theme";

// Night look: the al-legal rules in legal.css (unlayered, so they beat the legacy Tailwind colour
// utilities on the body text) restyle the page. Only the wrapper classes change.
const NIGHT_ARTICLE = "al-container al-container--prose al-doc al-legal";

// Text: pre-payment Privacy Policy v2 (Clarity 2026-11-14) with Holly's replacements (2026-11-14, PR 60 review
// 2026-11-16). No price, licence, refund or payment wording until payments launch.
// Markers "ROBERT-CONFIRM" and "PR60" flag sentences whose truth depends on an open item; see the PR description.

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
              AI service (Anthropic) and may be compared with other members&apos; requests
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
              <strong>Emails you send us</strong> to hello@actorslines.app, including asking for an invitation or a
              notify-list change
            </>,
            "To reply and keep a record",
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
      <p className={P}>
        You need to give us an email address and password to have an account. Without them we cannot provide it.
        Everything else is optional unless the table says it is needed to give you a feature you ask for.
      </p>
      {/* ROBERT-CONFIRM (Anthropic): this paragraph and the Anthropic rows assert automated AI processing through
          Robert's own Anthropic account (training setting and account terms unconfirmed). It must not say "not used to train". */}
      <p className={P}>
        We do <strong>not</strong> sell your information and do not use it for marketing. We do not use automated
        decision-making that has legal effects on you. Enhancement requests are analysed by automated AI tooling
        (Anthropic) to produce development reports, and may be compared with other members&apos; requests during that
        analysis (see &ldquo;Who else handles your information&rdquo;).
      </p>

      <h2 className="mt-6 font-semibold">What the Actors Lines app sends</h2>
      <p className={P}>
        Your scripts are stored on your phone, not uploaded to us. The same goes for your recordings and notes. (The
        separate Learn Lines page on the website is different: scripts you upload there are stored on our server, as the
        table above says.) The app connects to the internet to:
      </p>
      <ul className={UL}>
        <li>
          sign you in and check what access your account has (your email and password go to our account service,
          Supabase; redeeming a code sends the code);
        </li>
        <li>download voice and speech models from public GitHub releases when you ask (only the download request is sent);</li>
        <li>
          use your phone&apos;s speech recogniser to score your lines. Depending on your phone, your speech may be
          processed by the recogniser&apos;s provider (for example Google) rather than on the phone. We do not receive
          it;
        </li>
        <li>
          check for app updates (through Google Play, once the app is listed there) and a small public status file of
          ours (no personal data sent);
        </li>
        <li>
          send anonymous usage data, <strong>only if you turn it on</strong> (off by default). It contains which
          features you use, how often and how long, the app version, a rough device model and a random identifier not
          linked to your name, email or account. You can reset or switch it off at any time.
        </li>
      </ul>
      <p className={P}>
        The app uses Google&apos;s ML Kit libraries for document scanning, text recognition and the on-device AI. Your
        scans and text are processed on the phone, but ML Kit sends Google information such as device details, app
        version, performance and error data and installation identifiers (see Google&apos;s ML Kit data disclosure).
      </p>
      <p className={P}>
        <strong>Android backup.</strong> If Android&apos;s backup is on, Android copies the app&apos;s data (plays,
        scripts, notes, recordings) to your own Google account. We cannot see it. Your sign-in details and access record
        are left out.
      </p>

      <h2 className="mt-6 font-semibold">Who else handles your information (processors)</h2>
      <p className={P}>They act on our instructions, except where noted.</p>
      {/* ROBERT-CONFIRM (regions and mailbox provider): the "Where" column for Supabase, Brevo and Anthropic/GitHub is
          unverified (Holly B1); the hello@ mailbox provider is not yet named by Robert. */}
      <LegalTable
        caption="Who else handles your information"
        head={["Who", "What they do", "Data", "Where"]}
        rows={[
          [
            <strong key="s">Supabase</strong>,
            "Database, sign-in, file and functions hosting",
            "All account, access, script, request and notify data above",
            "The region of our Supabase project",
          ],
          [
            <strong key="m">Our email provider for hello@actorslines.app</strong>,
            "Holds emails you send us",
            "Sender address, content, headers",
            "Provider to be named",
          ],
          [
            <strong key="c">Cloudflare</strong>,
            "Website hosting and delivery; Turnstile bot check on sign-in, registration and request forms",
            "Visitor IP and browser data; Turnstile signals",
            "Global network",
          ],
          [
            <strong key="b">Brevo</strong>,
            "Sends our emails (verification, password reset, account warnings, invites, notify list)",
            "Your email address and the message",
            "EU",
          ],
          [
            <>
              <strong>Anthropic</strong> (AI service) and <strong>GitHub</strong>
            </>,
            "Request text you submit is passed to automated AI analysis run through GitHub Actions on our private repository, using our own Anthropic account. It may be compared with other members' requests",
            "The text of your request",
            "Outside the UK (United States)",
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
      <p className={P}>
        Some of these providers are outside the UK. Where so, transfers rely on the UK&apos;s approved safeguards
        (adequacy decisions or the International Data Transfer Addendum). Videos are explained in the &ldquo;Videos&rdquo;
        section below.
      </p>

      <h2 className="mt-6 font-semibold">How long we keep it</h2>
      {/* PR60: the 12-month lines for usage data, recognition reports and support threads are true only once
          migration 0027 is applied, the lifecycle function is redeployed and one purge run has succeeded. */}
      {/* PR60-FOLLOW-UP: the "removed within 90 days" lines (trusted devices, invitations) need Holly's follow-up purge migration. */}
      <ul className={UL}>
        <li>
          <strong>Account and Learn Lines data:</strong> until you delete your account (Profile page, deletes all its
          data) or the account is inactive for 6 months. We email a warning after about 5 months and a final reminder
          about 2 weeks later.
        </li>
        <li>
          <strong>Requests, comments and votes:</strong> until you delete your account or it is deleted for inactivity.
          Notes our AI service and we write about a request are kept with it and removed with it. Requests you have made
          public on the board, and the comments on them, stay visible while the request is live; comments you wrote stay
          without your name if you delete your account.
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
          <strong>Invitations:</strong> until used or expired, then removed within 90 days.
        </li>
        <li>
          <strong>Emails to us:</strong> while we help you, then deleted within 12 months; invitation requests we do not
          act on are deleted within 3 months.
        </li>
        <li>
          <strong>Email logs at Brevo:</strong> per Brevo&apos;s own policy.
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
        These are strictly necessary, so no cookie banner is needed. If we add analytics later we will ask first.
      </p>

      <h2 className="mt-6 font-semibold">Age</h2>
      <p className={P}>
        Actors Lines is for adults only (18 and over). We do not check ages, and we do not knowingly collect
        information from anyone under 18. If you think a child has given us information, email us and we will delete
        it.
      </p>

      <h2 className="mt-6 font-semibold">Videos</h2>
      <p className={P}>
        Our tutorial videos are hosted by YouTube. Videos use a click-to-play preview, so nothing is requested from
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
