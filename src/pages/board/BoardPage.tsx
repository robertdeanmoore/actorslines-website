import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { RequestStatus } from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";

export interface BoardPostStats {
  id: number;
  request_id: number;
  summary: string;
  published_at: string;
  status: RequestStatus;
  up_votes: number;
  down_votes: number;
  comment_count: number;
  my_vote: number | null;
}

export default function BoardPage() {
  const [posts, setPosts] = useState<BoardPostStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("board_posts_with_stats")
      .select("*")
      .order("published_at", { ascending: false })
      .then(({ data }) => {
        setPosts((data as BoardPostStats[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">Enhancement board</h1>
        <Link to="/requests/new"
          className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light">
          + Suggest one
        </Link>
      </div>
      <p className="mt-2 text-sm text-gray-600">
        Ideas from actors like you, under consideration for Actors Lines. Vote for
        the ones you'd use — it directly shapes what gets built next.
      </p>
      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && posts.length === 0 && (
          <p className="text-sm text-gray-500">Nothing on the board yet.</p>
        )}
        {posts.map((p) => (
          <Link key={p.id} to={`/board/${p.id}`}
            className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <p className="text-sm text-gray-800">{p.summary}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
              <span title="Thumbs up">👍 {p.up_votes}</span>
              <span title="Thumbs down">👎 {p.down_votes}</span>
              <span>💬 {p.comment_count}</span>
              <span className="flex-1" />
              <StatusBadge status={p.status} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
