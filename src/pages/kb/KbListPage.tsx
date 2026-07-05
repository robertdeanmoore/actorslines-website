import { Link } from "react-router-dom";
import { kbArticles } from "../../lib/kb";

export default function KbListPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-brand">Knowledge base</h1>
      <p className="mt-2 text-sm text-gray-600">
        Rehearsal craft, line-learning technique, and getting the most from Actors Lines.
      </p>
      <div className="mt-6 space-y-4">
        {kbArticles.map((a) => (
          <Link key={a.slug} to={`/kb/${a.slug}`}
            className="block bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
            <h2 className="font-semibold text-brand">{a.title}</h2>
            {a.summary && <p className="mt-1 text-sm text-gray-600">{a.summary}</p>}
            {a.date && <p className="mt-2 text-xs text-gray-400">{a.date}</p>}
          </Link>
        ))}
        {kbArticles.length === 0 && (
          <p className="text-sm text-gray-500">No articles yet — check back soon.</p>
        )}
      </div>
    </div>
  );
}
