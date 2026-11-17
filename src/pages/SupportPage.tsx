import { Link } from "react-router-dom";
import MarketingHead from "../components/marketing/MarketingHead";
import LinkButton from "../components/ui/LinkButton";

const SUPPORT_EMAIL = "hello@actorslines.app";

export default function SupportPage() {
  return (
    <div className="al-mkt">
      <MarketingHead title="Support" />

      <section className="al-mkt-group" aria-labelledby="al-support-guides">
        <h2 id="al-support-guides">Start with the guides</h2>
        <p>Most questions are answered in our help articles, with no account needed.</p>
        <div className="al-mkt-actions">
          <LinkButton to="/kb">Read the knowledge base</LinkButton>
          <Link to="/faq">Frequently asked questions</Link>
          {/* Video tutorials link omitted until /tutorials has videos */}
        </div>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-support-email">
        <h2 id="al-support-email">Email us</h2>
        <p>
          <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>
        </p>
        <p>
          Use this for: a problem with the app, signing in or an invitation, a password you cannot
          reset, or a question about your data (see, correct or delete it).
        </p>
        <p>
          We aim to reply within <strong>3 working days</strong> (Monday to Friday, not bank
          holidays). It is a small team, so please include:
        </p>
        <ul className="al-mkt-list">
          <li>what you were trying to do and what happened;</li>
          <li>your phone make and model, and the app version (About screen in the app);</li>
          <li>the email address on your account. Never send your password.</li>
        </ul>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-support-feature">
        <h2 id="al-support-feature">Suggest a feature</h2>
        <p>
          Signed-in members can use the <Link to="/requests/new">Suggest an enhancement</Link> form
          to tell us what would help, then follow it on <Link to="/requests">My requests</Link>.
          Good suggestions say the problem you have, where in the app it happens and how you imagine
          it working. You can also vote on other members&apos; ideas on the{" "}
          <Link to="/board">Enhancement board</Link>.
        </p>
        <ul className="al-mkt-list">
          <li>Suggestions are not commitments to build anything by any date.</li>
          <li>
            The text is processed by an AI service (Anthropic) to help us analyse it, and may be
            compared with other members&apos; suggestions. See our{" "}
            <Link to="/privacy">privacy policy</Link>.
          </li>
          <li>The form is for ideas. For a fault or an account problem, email us instead.</li>
        </ul>
        <p>
          Not signed in? <Link to="/login">Sign in</Link> (accounts are by invitation) or{" "}
          <a href={"mailto:" + SUPPORT_EMAIL}>email us</a> your idea.
        </p>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-support-account">
        <h2 id="al-support-account">Your account and data</h2>
        <ul className="al-mkt-list">
          <li>Reset password: sign-in page, &quot;Forgot password&quot;.</li>
          <li>Delete your account and its data: Profile page.</li>
          <li>
            Questions about privacy:{" "}
            <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>, or see the{" "}
            <Link to="/privacy">privacy policy</Link>.
          </li>
        </ul>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-support-notyet">
        <h2 id="al-support-notyet">Not yet</h2>
        <p>
          Actors Lines is Android only. There is no iPhone version. Use the notify form on the{" "}
          <Link to="/">home page</Link> if you want one email if that changes.
        </p>
      </section>
    </div>
  );
}
