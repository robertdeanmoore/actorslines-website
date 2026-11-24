import { Link } from "react-router-dom";
import MarketingHead from "../components/marketing/MarketingHead";
import LinkButton from "../components/ui/LinkButton";

const SUPPORT_EMAIL = "hello@actorslines.app";

export default function DeleteAccountPage() {
  return (
    <div className="al-mkt">
      <MarketingHead
        title="Delete your Actors Lines account"
        lead="You can delete your Actors Lines account and its server data yourself at any time."
      />

      <section className="al-mkt-group" aria-labelledby="al-delete-how">
        <h2 id="al-delete-how">How to delete your account</h2>
        <ol className="al-mkt-list">
          <li>
            Open your <Link to="/profile">Profile page</Link> (if you are not signed in, you will be asked to sign in
            first).
          </li>
          <li>
            In the <strong>Delete account</strong> section, select <strong>Delete my account…</strong> and confirm.
          </li>
          <li>
            If you have two-factor authentication (2FA) turned on, you will be asked for a current 6-digit code from
            your authenticator app before the account is deleted, even on a trusted browser.
          </li>
        </ol>
        <div className="al-mkt-actions">
          <LinkButton to="/profile">Go to Profile to delete account</LinkButton>
        </div>
        <p>
          <strong>Locked out of two-factor authentication or cannot sign in?</strong> Email us at{" "}
          <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a> from the email address on your account and ask us to
          delete your account.
        </p>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-delete-removed">
        <h2 id="al-delete-removed">What is deleted immediately</h2>
        <ul className="al-mkt-list">
          <li>
            <strong>Account and sign-in details:</strong> your sign-in record (<code>auth.users</code>), profile
            (email address and display name), two-factor authentication setup, and trusted-device tokens.
          </li>
          <li>
            <strong>Access records:</strong> the personal link between your account and any licence or trial record.
          </li>
          <li>
            <strong>Learn Lines website scripts:</strong> any scripts you uploaded to the website&apos;s Learn Lines
            tool, your line-learning progress, bookmarks, and script shares.
          </li>
          <li>
            <strong>Enhancement requests and votes:</strong> enhancement requests you submitted (including any published
            on the enhancement board, comments others made on them, message threads, and AI triage reports) and votes
            you cast.
          </li>
        </ul>
      </section>

      <section className="al-mkt-group" aria-labelledby="al-delete-retained">
        <h2 id="al-delete-retained">What is kept or stays on your phone</h2>
        <ul className="al-mkt-list">
          <li>
            <strong>Scripts, recordings and notes in the Android app:</strong> the Actors Lines app stores your plays,
            scripts, voice recordings and notes on your phone, not on our servers. Deleting your account does not erase
            data stored on your phone; to remove it, delete the plays in the app or uninstall the Actors Lines app (and
            remove any backup files you exported or saved to your own Google Drive backup).
          </li>
          <li>
            <strong>Free-trial abuse-prevention record (24 months):</strong> when a free trial starts we store a
            one-way coded version of your email address (a keyed HMAC hash, not the email address itself) and the trial
            start date in <code>trial_used</code>. If you delete your account we keep only that coded hash and trial
            start date for up to <strong>24 months</strong> from the trial start to prevent repeated free trials by
            deleting and re-creating an account, after which it is automatically deleted.
          </li>
          <li>
            <strong>Comments on other members&apos; requests:</strong> comments you wrote on other people&apos;s
            enhancement board posts stay on the board without your name.
          </li>
          <li>
            <strong>Optional anonymous app usage data:</strong> if you opted into sharing anonymous app usage data or
            sent a recognition problem report, those records carry a random device identifier that is not linked to your
            account, and are automatically deleted 12 months after collection.
          </li>
        </ul>
        <p>
          For full details, see our <Link to="/privacy">Privacy Policy</Link> or contact{" "}
          <a href={"mailto:" + SUPPORT_EMAIL}>{SUPPORT_EMAIL}</a>.
        </p>
      </section>
    </div>
  );
}
