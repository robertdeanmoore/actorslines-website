export default function PrivacyPage() {
  return (
    <article className="prose max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-brand">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: 21 July 2026</p>

      <h2 className="mt-6 font-semibold">What we collect</h2>
      <p className="text-sm text-gray-700 mt-2">
        When you register we store your email address, a display name you choose,
        and the content you create on this site (enhancement requests, comments and
        votes). We record when you last signed in. We do not collect your scripts or
        recordings — the Actors Lines app works entirely on your device, and sends us
        nothing at all unless you deliberately turn on the optional anonymous usage
        data described below.
      </p>

      <h2 className="mt-6 font-semibold">Anonymous app usage data (opt-in)</h2>
      <p className="text-sm text-gray-700 mt-2">
        The Actors Lines app has an <strong>off-by-default</strong> setting, “Share
        anonymous usage data.” It stays off — and the app sends us nothing — unless
        you turn it on. When it is on, the app sends anonymous information about which
        features and settings you use, the app version, and a rough device model (the
        same detail a crash report already includes). A random identifier is attached
        so events from one device can be grouped; it is <strong>not</strong> linked to
        your name, email, or any account — there is no account in the app — and you can
        reset it, or delete it entirely by turning the setting off, at any time.
      </p>
      <p className="text-sm text-gray-700 mt-2">
        We do <strong>not</strong> receive your scripts, recordings, character names,
        or anything you type through this usage data. The one exception is a
        “recognition problem” report: if the app mis-reads a scanned line or mishears a
        word, you can choose to report it — and you are always shown the exact short
        snippet of text before it is sent, and must tap Send. Nothing is sent without
        that per-report confirmation.
      </p>
      <p className="text-sm text-gray-700 mt-2">
        Because this data is anonymous and gathered only with your consent, we use it
        solely to understand which parts of the app are used and where recognition can
        be improved.
      </p>

      <h2 className="mt-6 font-semibold">How we use it</h2>
      <p className="text-sm text-gray-700 mt-2">
        Your email is used to verify your account, let you reset your password, and
        send you service messages (such as the inactivity warnings described below).
        Your display name appears next to your comments. Enhancement requests you
        submit are analysed — including by automated AI tooling — to produce
        development reports, and an approved summary may be shown to other members
        on the enhancement board. We never sell or share your data with third
        parties for marketing.
      </p>

      <h2 className="mt-6 font-semibold">Inactive accounts</h2>
      <p className="text-sm text-gray-700 mt-2">
        Accounts unused for 6 months are deleted, together with their data. We email
        a warning after about 5 months of inactivity and a final reminder 2 weeks
        later; signing in at any point keeps your account active.
      </p>

      <h2 className="mt-6 font-semibold">Your rights</h2>
      <p className="text-sm text-gray-700 mt-2">
        You can delete your account (and all its data) yourself at any time from
        your profile page. For access or correction requests, contact us at
        hello@actorslines.app.
      </p>

      <h2 className="mt-6 font-semibold">Where your data lives</h2>
      <p className="text-sm text-gray-700 mt-2">
        Account data is stored with Supabase (our database provider) and served via
        Cloudflare. Transactional email is sent via Brevo. Each processes data only
        on our instructions.
      </p>

      <h2 className="mt-6 font-semibold">Security</h2>
      <p className="text-sm text-gray-700 mt-2">
        Passwords are stored hashed, connections are encrypted, and we offer
        two-factor authentication — we strongly recommend enabling it on your
        profile page.
      </p>
    </article>
  );
}
