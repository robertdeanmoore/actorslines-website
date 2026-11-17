import { Link } from "react-router-dom";
import { LAST_UPDATED } from "../lib/legalMeta";
import { isNightTheme } from "../lib/theme";

// Night look: the al-legal rules in legal.css restyle the page. Only the wrapper classes change.
const NIGHT_ARTICLE = "al-container al-container--prose al-doc al-legal";

// Text: pre-payment Terms of Use v2 (Clarity 2026-11-14), Holly check 2026-11-14. No price, trial, licence,
// refund or payment wording until payments launch. "ROBERT-CONFIRM" marks sentences that need his confirmation.

const P = "text-sm text-gray-700 mt-2";
const UL = "text-sm text-gray-700 mt-2 list-disc pl-6";

export default function TermsPage() {
  const night = isNightTheme();
  return (
    <article className={night ? NIGHT_ARTICLE : "max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8"}>
      <h1 className={night ? "al-page-title" : "text-2xl font-bold text-brand"}>Terms of Use</h1>
      <p className={night ? "al-prose__meta" : "text-sm text-gray-500"}>Last updated: {LAST_UPDATED}</p>

      <h2 className="mt-6 font-semibold">1. Who we are</h2>
      <p className={P}>
        actorslines.app and the Actors Lines app are provided by Robert Dean Moore, trading as{" "}
        <strong>You Never Know Productions</strong>, a sole trader (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
      </p>
      <ul className={UL}>
        <li>Address: 12 Conifers, Hadleigh, Benfleet, Essex SS7 2JR</li>
        <li>
          Email: <a href="mailto:hello@actorslines.app">hello@actorslines.app</a>
        </li>
      </ul>

      <h2 className="mt-6 font-semibold">2. What Actors Lines is and how you get access</h2>
      <p className={P}>
        Actors Lines is an Android app for learning lines, with a companion website (a knowledge base, a Learn Lines page
        and an enhancement board). At the moment:
      </p>
      {/* ROBERT-CONFIRM: no charge today; accounts by invitation with sign-up closed; he issues invitations on request. */}
      <ul className={UL}>
        <li>
          Accounts are <strong>by invitation</strong>. Sign-up is closed.
        </li>
        <li>
          We do not charge for the website or for access to the app, and nothing is on sale.
        </li>
        <li>
          We may change, add or withdraw features, and may open or close invitations. Nothing here promises a feature, a
          length of access or an availability date.
        </li>
        <li>The Android app is not yet on Google Play.</li>
      </ul>

      <h2 className="mt-6 font-semibold">3. Your account</h2>
      <ul className={UL}>
        <li>
          You need an Actors Lines account (with a verified email) to use members&apos; features. Your account is for{" "}
          <strong>your own use</strong>. Do not share, lend, resell or give away your login.
        </li>
        <li>
          <strong>Adults only.</strong> Actors Lines is for people aged 18 or over. By creating an account you confirm
          you are 18 or over. We do not verify ages.
        </li>
        <li>Keep your password safe. You are responsible for activity under your account.</li>
        <li>
          If we have good reason to think an account is being shared or misused, we may contact you, and after a warning
          may suspend it.
        </li>
      </ul>

      <h2 className="mt-6 font-semibold">4. If something is wrong, and support</h2>
      {/* ROBERT-CONFIRM: the 3-working-day reply aim is a commitment he must keep. */}
      <p className={P}>
        Email <a href="mailto:hello@actorslines.app">hello@actorslines.app</a>. We aim to reply within 3 working days, and
        will try to put a fault right. Support covers the website, your account and the Android app. We do not promise
        the app will work on every phone. Your legal rights are not affected by these terms.
      </p>

      <h2 className="mt-6 font-semibold">5. Using the service</h2>
      {/* ANTHROPIC-GOLIVE-GATE: the Requests and AI bullet is true of an Anthropic API-key route only after ActorsVoice
          PR 72 is merged and the secrets are switched. It must not say "not used to train" (API-key default unverified). */}
      <ul className={UL}>
        <li>
          Learn Lines, the knowledge base, the enhancement board and requests: no abuse, spam, unlawful content,
          impersonation or attempts to disrupt the service. We may edit, hide or remove content and suspend accounts that
          break these rules.
        </li>
        <li>
          <strong>Your content.</strong> You keep ownership of scripts and posts. You give us the right to store and
          process them to run the service. For enhancement suggestions (and summaries made from them) you also give us a
          free licence to use them to improve Actors Lines, without payment or attribution.
        </li>
        <li>
          <strong>Scripts and copyright.</strong> Plays and scripts you scan or upload are usually someone else&apos;s
          copyright. You are responsible for having the right to use any script you put into Actors Lines for your own
          learning. We do not supply scripts.
        </li>
        <li>
          <strong>Requests and AI.</strong> The text of requests and enhancement suggestions is processed by an AI
          service (Anthropic) to help us analyse them, and may be compared with other members&apos; requests. See the{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </li>
        <li>
          <strong>Suggestions are not commitments.</strong> Votes and requests inform our roadmap; they do not oblige us
          to build anything by any date.
        </li>
        <li>
          <strong>Inactive accounts.</strong> Accounts unused for 6 months are deleted with their data; we email warnings
          first (see the <Link to="/privacy">Privacy Policy</Link>).
        </li>
      </ul>

      <h2 className="mt-6 font-semibold">6. Our responsibility to you</h2>
      <p className={P}>
        We are responsible for loss you suffer that is a foreseeable result of our breaking these terms or our
        negligence. We are not responsible for loss that was not foreseeable, or for business losses (the service is for
        personal use). Nothing here limits our liability for death or personal injury caused by negligence, for fraud, or
        for anything the law does not allow us to limit.
      </p>

      <h2 className="mt-6 font-semibold">7. Changes</h2>
      <p className={P}>
        We may update these terms. We will tell registered members of material changes by email or notice on the site
        before they apply.
      </p>

      <h2 className="mt-6 font-semibold">8. Ending</h2>
      <p className={P}>
        You can stop using the service and delete your account at any time from your Profile page. We may end an account
        for serious or repeated breach of these terms.
      </p>

      <h2 className="mt-6 font-semibold">9. Disputes and law</h2>
      <p className={P}>
        These terms are governed by the law of England and Wales. If you live in Scotland or Northern Ireland you may
        also bring a claim in your local courts. Courts of England and Wales have non-exclusive jurisdiction. We handle
        complaints at <a href="mailto:hello@actorslines.app">hello@actorslines.app</a> first.
      </p>

      <h2 className="mt-6 font-semibold">10. Privacy</h2>
      <p className={P}>
        See our <Link to="/privacy">Privacy Policy</Link> for how we use your information.
      </p>
    </article>
  );
}
