import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import {
  BETA_CAP,
  BETA_STATUS_LABELS,
  placesLeft,
  type BetaApplication,
  type BetaStatus,
} from "../../lib/beta";
import { Container } from "../../components/ui/Layout";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import Badge from "../../components/ui/Badge";
import Table from "../../components/ui/Table";
import { ErrorState, LoadingState, EmptyState } from "../../components/ui/States";

const STATUS_TONE: Record<BetaStatus, "neutral" | "ok" | "danger" | "warn"> = {
  pending: "neutral",
  approved: "ok",
  rejected: "danger",
  withdrawn: "warn",
};

const FILTERS: (BetaStatus | "all")[] = ["all", "pending", "approved", "rejected", "withdrawn"];

export default function AdminBetaListPage() {
  const [rows, setRows] = useState<BetaApplication[]>([]);
  const [filter, setFilter] = useState<BetaStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [approvedCount, setApprovedCount] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    setLoadError(null);
    let q = supabase.from("beta_applications").select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    q.then(({ data, error }) => {
      if (error) {
        setLoadError(error.message);
      } else {
        setRows((data as BetaApplication[]) ?? []);
      }
      setLoading(false);
    });
  }, [filter]);

  useEffect(() => {
    supabase.from("beta_applications").select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .then(({ count }) => setApprovedCount(count ?? 0));
  }, []);

  const needle = search.trim().toLowerCase();
  const visible = needle
    ? rows.filter(
        (r) =>
          r.name.toLowerCase().includes(needle) ||
          r.email.toLowerCase().includes(needle) ||
          r.town.toLowerCase().includes(needle),
      )
    : rows;

  return (
    <Container size="page" className="al-members">
      <h1 className="al-page-title">Admin — beta applications</h1>
      <p className="al-panel-text">
        {approvedCount === null
          ? "Counting places…"
          : `${approvedCount} of ${BETA_CAP} places used, ${placesLeft(approvedCount)} left.`}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button key={f} variant={filter === f ? "primary" : "secondary"}
            aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : BETA_STATUS_LABELS[f]}
          </Button>
        ))}
      </div>
      <div className="mt-4">
        <label className="al-field__label" htmlFor="beta-search">Search</label>
        <input id="beta-search" className="al-control" type="search" value={search}
          placeholder="Name, email or town"
          onChange={(e) => setSearch(e.target.value)} />
      </div>
      <div className="mt-6">
        {loading && <LoadingState label="Loading…" />}
        {!loading && loadError && (
          <ErrorState message={loadError} />
        )}
        {!loading && !loadError && visible.length === 0 && (
          <EmptyState title="No applications here." />
        )}
        {!loading && !loadError && visible.length > 0 && (
          <Table
            caption="Beta applications"
            captionHidden
            label="Beta applications"
          >
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Town</th>
                <th scope="col">Actor type</th>
                <th scope="col">Company</th>
                <th scope="col">Applied</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/admin/beta/${r.id}`}>{r.name}</Link>
                    {r.existing_user && <> <Badge tone="info">Existing account</Badge></>}
                    {r.reapplied && <> <Badge tone="warn">Re-applied</Badge></>}
                  </td>
                  <td>{r.town}</td>
                  <td>{r.actor_type === "professional" ? "Professional" : "Amateur"}</td>
                  <td>{r.in_company && r.company_name ? r.company_name : "-"}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td><Badge tone={STATUS_TONE[r.status]}>{BETA_STATUS_LABELS[r.status]}</Badge></td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
      <div className="mt-8">
        <LinkButton to="/admin" variant="secondary">← Back to admin</LinkButton>
      </div>
    </Container>
  );
}
