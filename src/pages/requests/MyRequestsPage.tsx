import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import type { EnhancementRequest } from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import { StatusBadge as UiStatusBadge } from "../../components/ui/Badge";
import LinkButton from "../../components/ui/LinkButton";
import { LoadingState, EmptyState } from "../../components/ui/States";

export default function MyRequestsPage() {
  const { session } = useAuth();
  const night = isNightTheme();
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

  return night ? (
    <Container size="detail" className="al-members">
      <div className="al-page-head">
        <h1 className="al-page-title">My requests</h1>
        <LinkButton to="/requests/new">+ New suggestion</LinkButton>
      </div>
      <div className="mt-6">
        {loading && <LoadingState label="Loading…" />}
        {!loading && requests.length === 0 && (
          <EmptyState title="Nothing yet — got an idea that would make Actors Lines better?" />
        )}
      </div>
      {requests.length > 0 && (
        <ul className="al-card-list">
          {requests.map((r) => (
            <Card key={r.id} as="li" to={`/requests/${r.id}`} title={r.title}>
              <div className="mt-2 flex items-center gap-3">
                <UiStatusBadge status={r.status} />
                <span className="text-sm">
                  Submitted {new Date(r.created_at).toLocaleDateString()}
                </span>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </Container>
  ) : (
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
