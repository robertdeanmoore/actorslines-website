export default function TermsPage() {
  return (
    <article className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm p-8">
      <h1 className="text-2xl font-bold text-brand">Terms of Use</h1>
      <p className="text-sm text-gray-500">Last updated: 5 July 2026</p>

      <ol className="list-decimal ml-5 mt-6 space-y-3 text-sm text-gray-700">
        <li>
          <strong>The service.</strong> actorslines.app provides information about
          the Actors Lines app, a members' knowledge base, and a community
          enhancement board. It is provided free of charge, as-is, without warranty.
        </li>
        <li>
          <strong>Your account.</strong> Keep your credentials secure and your
          registration email current. You are responsible for activity under your
          account. Accounts inactive for 6 months are removed (see the Privacy
          Policy).
        </li>
        <li>
          <strong>Your content.</strong> You keep ownership of what you post, but
          you grant us a licence to display it on the site and to use enhancement
          suggestions — including summaries derived from them — to improve Actors
          Lines, without payment or attribution.
        </li>
        <li>
          <strong>Acceptable use.</strong> No abuse, spam, unlawful content,
          impersonation, or attempts to disrupt the service. We may edit, hide or
          remove content and suspend accounts that break these rules.
        </li>
        <li>
          <strong>Suggestions are not commitments.</strong> Votes and reports on the
          enhancement board inform our roadmap; they do not oblige us to build
          anything, by any date.
        </li>
        <li>
          <strong>Changes.</strong> We may update these terms; material changes will
          be flagged on this page. Continued use after a change means acceptance.
        </li>
      </ol>
    </article>
  );
}
