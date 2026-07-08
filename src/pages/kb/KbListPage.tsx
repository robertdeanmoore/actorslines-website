import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { kbArticles } from "../../lib/kb";

export default function KbListPage() {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return kbArticles;
    return kbArticles.filter(
      (a) => a.title.toLowerCase().includes(q) || a.summary.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-brand">Knowledge base</h1>
      <p className="mt-2 text-sm text-gray-600">
        Rehearsal craft, line-learning technique, and getting the most from Actors Lines.
      </p>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search help topics…"
        className="mt-4 w-full rounded-lg border border-gray-300 px-4 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-brand/40"
      />
      <div className="mt-6 space-y-4">
        {filtered.map((a) => (
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
        {kbArticles.length > 0 && filtered.length === 0 && (
          <p className="text-sm text-gray-500">No help topics match "{query}".</p>
        )}
      </div>
    </div>
  );
}
