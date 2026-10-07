export default function PrivacyPage() {
  return (
    <article className="prose max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-brand">Privacy Policy</h1>
      <p className="text-sm text-gray-500">Last updated: 7 October 2026</p>

      <h2 className="mt-6 font-semibold">What we collect</h2>
      <p className="text-sm text-gray-700 mt-2">
        When you register we store your email address, a display name you choose,
        and the content you create on this site (enhancement requests, comments and
        votes). We record when you last signed in. We do not collect your scripts,
        recordings or notes: we never receive them. They are stored on your phone, in
        backup or share files you create yourself, and (see below) in Android&apos;s own
        backup to your Google account if you have that turned on.
      </p>

      <h2 className="mt-6 font-semibold">What the Actors Lines app sends</h2>
      <p className="text-sm text-gray-700 mt-2">
        The app does not upload your scripts, recordings or notes. It does connect to the
        internet for these things:
      </p>
      <ul className="text-sm text-gray-700 mt-2 list-disc pl-6">
        <li>
          <strong>Signing in and your licence.</strong> If you sign in, the app sends your
          email address and password to our account service (Supabase) to sign you in, and
          checks or refreshes your licence with it. If you redeem a licence code, the code
          is sent to us to apply it. The sign-in screen may use Cloudflare Turnstile to check
          you are not a bot.
        </li>
        <li>
          <strong>Voice and speech models.</strong> Neural voices and speech-recognition
          models are downloaded when you ask for them, from public model releases on GitHub.
          Only the download request is sent.
        </li>
        <li>
          <strong>Speech recognition.</strong> Practice and Rehearse listen to your lines
          using your phone&apos;s speech-recognition service. Depending on your phone and
          that service&apos;s settings, your speech may be processed by the service&apos;s
          provider (for example Google) rather than on the phone itself.
        </li>
        <li>
          <strong>Update and service checks.</strong> The app may ask Google Play whether a
          newer version exists, and checks a small public status file of ours; no personal
          data is sent with either.
        </li>
        <li>
          <strong>Optional anonymous usage data</strong>, only if you turn it on (see below).
        </li>
      </ul>
      <p className="text-sm text-gray-700 mt-2">
        The app&apos;s AI features (such as memory links and import tidy-up) run on your
        phone&apos;s own on-device AI and send nothing to us.
      </p>
      <p className="text-sm text-gray-700 mt-2">
        <strong>Google ML Kit.</strong> Document scanning, text recognition and the on-device
        AI use Google&apos;s ML Kit libraries. Your scans and text are processed on the phone,
        but ML Kit itself sends Google information such as device details, the app version,
        performance and error data, and per-installation identifiers, as described on
        Google&apos;s ML Kit data disclosure page.
      </p>
      <p className="text-sm text-gray-700 mt-2">
        <strong>Android backup.</strong> If Android&apos;s backup is turned on for your phone,
        Android copies the app&apos;s data (including your plays, scripts, notes and
        recordings) to your own Google account, and restores it on a new phone. We cannot
        see that backup. Your sign-in details and licence are left out of it, so after a
        restore you sign in again.
      </p>

      <h2 className="mt-6 font-semibold">Anonymous app usage data (opt-in)</h2>
      <p className="text-sm text-gray-700 mt-2">
        The Actors Lines app has an <strong>off-by-default</strong> setting, “Share
        anonymous usage data.” It stays off, and no usage data is sent, unless you turn
        it on. When it is on, the app sends anonymous information about which
        features and settings you use, how often and how long you use the app, the app
        version, and a rough device model (the same detail a crash report already
        includes). A random identifier is attached
        so events from one device can be grouped; it is <strong>not</strong> linked to
        your name, email, or your account, and you can reset it, or delete it entirely
        by turning the setting off, at any time.
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
        later; signing in on actorslines.app keeps your account active.
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
