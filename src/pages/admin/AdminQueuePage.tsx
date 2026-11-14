import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { EnhancementRequest, RequestStatus } from "../../lib/types";
import { STATUS_LABELS } from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import { StatusBadge as UiStatusBadge } from "../../components/ui/Badge";
import { LoadingState, EmptyState } from "../../components/ui/States";

const FILTERS: (RequestStatus | "all")[] = [
  "all", "submitted", "reported", "published", "planned", "implemented",
  "closed", "rejected",
];

export default function AdminQueuePage() {
  const [requests, setRequests] = useState<EnhancementRequest[]>([]);
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q = supabase.from("enhancement_requests").select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    q.then(({ data }) => {
      setRequests((data as EnhancementRequest[]) ?? []);
      setLoading(false);
    });
  }, [filter]);

  if (isNightTheme()) {
    // Night look: same filter state, query effect, handlers and link targets as the legacy block below.
    return (
      <Container size="page" className="al-members">
        <section>
          <h1 className="al-page-title">Admin — request queue</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button key={f} variant={filter === f ? "primary" : "secondary"}
                aria-pressed={filter === f} onClick={() => setFilter(f)}>
                {f === "all" ? "All" : STATUS_LABELS[f]}
              </Button>
            ))}
          </div>
          <div className="mt-6">
            {loading && <LoadingState label="Loading…" />}
            {!loading && requests.length === 0 && (
              <EmptyState title="No requests in this state." />
            )}
            {requests.length > 0 && (
              <ul className="al-card-list">
                {requests.map((r) => (
                  <Card key={r.id} as="li" to={`/admin/requests/${r.id}`} title={r.title}>
                    <div className="mt-2 flex items-center gap-3">
                      <UiStatusBadge status={r.status} />
                      <span className="text-sm">
                        {new Date(r.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Card>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="al-section__title">Admin resources</h2>
          <p className="mt-1 text-sm al-panel-text">
            Knowledge-base articles are edited via Decap CMS (signs in with GitHub) at{" "}
            <code>/cms/</code>. User accounts (view, reset password, delete) are managed in
            Supabase's own dashboard — neither can be embedded here (both block being framed for
            security), so both open in a new tab.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton to="/admin/invites" variant="secondary">
              Invites →
            </LinkButton>
            <LinkButton to="/admin/licences" variant="secondary">
              Box office →
            </LinkButton>
            <LinkButton to="/admin/telemetry" variant="secondary">
              Usage telemetry →
            </LinkButton>
            <LinkButton href="/cms/" newTab variant="secondary">
              Manage knowledge base (GitHub) →
            </LinkButton>
            <LinkButton href="https://supabase.com/dashboard/project/dicywovaxxuwnkidinpn/auth/users" newTab variant="secondary">
              Manage users (Supabase) →
            </LinkButton>
          </div>
        </section>
      </Container>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <section>
        <h1 className="text-2xl font-bold text-brand">Admin — request queue</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                filter === f ? "bg-brand text-white" : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}>
              {f === "all" ? "All" : STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="mt-6 space-y-2">
          {loading && <p className="text-sm text-gray-500">Loading…</p>}
          {!loading && requests.length === 0 && (
            <p className="text-sm text-gray-500">No requests in this state.</p>
          )}
          {requests.map((r) => (
            <Link key={r.id} to={`/admin/requests/${r.id}`}
              className="flex items-center gap-3 bg-white rounded-lg shadow-sm px-4 py-3 hover:shadow-md transition-shadow">
              <span className="text-xs text-gray-400 w-10">#{r.id}</span>
              <span className="flex-1 text-sm font-medium text-gray-900">{r.title}</span>
              <span className="text-xs text-gray-400">
                {new Date(r.created_at).toLocaleDateString()}
              </span>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold text-brand">Admin resources</h2>
        <p className="mt-1 text-xs text-gray-400">
          Knowledge-base articles are edited via Decap CMS (signs in with GitHub) at{" "}
          <code>/cms/</code>. User accounts (view, reset password, delete) are managed in
          Supabase's own dashboard — neither can be embedded here (both block being framed for
          security), so both open in a new tab.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            to="/admin/invites"
            className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Invites →
          </Link>
          <Link
            to="/admin/licences"
            className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Box office →
          </Link>
          <Link
            to="/admin/telemetry"
            className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Usage telemetry →
          </Link>
          <a
            href="/cms/"
            target="_blank" rel="noreferrer"
            className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Manage knowledge base (GitHub) →
          </a>
          <a
            href="https://supabase.com/dashboard/project/dicywovaxxuwnkidinpn/auth/users"
            target="_blank" rel="noreferrer"
            className="rounded-md bg-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-300"
          >
            Manage users (Supabase) →
          </a>
        </div>
      </section>
    </div>
  );
}
