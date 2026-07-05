import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import type { EnhancementRequest } from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";

export default function MyRequestsPage() {
  const { session } = useAuth();
  const [requests, setRequests] = useState<EnhancementRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("enhancement_requests")
      .select("*")
      .eq("author_id", session!.user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setRequests((data as EnhancementRequest[]) ?? []);
        setLoading(false);
      });
  }, [session]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand">My requests</h1>
        <Link to="/requests/new"
          className="rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light">
          + New suggestion
        </Link>
      </div>
      <div className="mt-6 space-y-3">
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {!loading && requests.length === 0 && (
          <p className="text-sm text-gray-500">
            Nothing yet — got an idea that would make Actors Lines better?
          </p>
        )}
        {requests.map((r) => (
          <Link key={r.id} to={`/requests/${r.id}`}
            className="block bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <span className="flex-1 font-medium text-gray-900">{r.title}</span>
              <StatusBadge status={r.status} />
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Submitted {new Date(r.created_at).toLocaleDateString()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
