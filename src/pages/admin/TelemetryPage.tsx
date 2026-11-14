import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import { Badge } from "../../components/ui/Badge";
import { LoadingState } from "../../components/ui/States";

// Rows from the security-definer aggregate views (admin-only) + the raw reports table.
type EventCount = { event_name: string; total: number; installs: number; last_seen: string };
type ValueCount = {
  event_name: string;
  item: string | null;
  value: string | null;
  total: number;
  installs: number;
};
type SessionStats = {
  app_opens: number;
  active_installs: number;
  sessions: number;
  avg_duration_ms: number | null;
  max_duration_ms: number | null;
};
type ReportStatus = "new" | "triaged" | "resolved";
type Report = {
  id: number;
  install_id: string;
  kind: "ocr" | "speech";
  recognized_text: string | null;
  expected_text: string | null;
  engine: string | null;
  confidence: number | null;
  note: string | null;
  app_version: string | null;
  device_class: string | null;
  status: ReportStatus;
  received_at: string;
};

const card = "bg-white rounded-xl shadow-sm p-6";

function formatDuration(ms: number | null): string {
  if (ms == null || ms <= 0) return "—";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

export default function TelemetryPage() {
  const [counts, setCounts] = useState<EventCount[]>([]);
  const [values, setValues] = useState<ValueCount[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [sessions, setSessions] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [c, v, r, s] = await Promise.all([
      supabase.from("telemetry_event_counts").select("*"),
      supabase.from("telemetry_value_counts").select("*"),
      supabase
        .from("recognition_reports")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200),
      supabase.from("telemetry_session_stats").select("*").maybeSingle(),
    ]);
    setCounts((c.data as EventCount[]) ?? []);
    setValues((v.data as ValueCount[]) ?? []);
    setReports((r.data as Report[]) ?? []);
    setSessions((s.data as SessionStats) ?? null);
    setLoading(false);
  }
  useEffect(() => {
    void load();
  }, []);

  async function setStatus(id: number, status: ReportStatus) {
    setReports((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("recognition_reports").update({ status }).eq("id", id);
  }

  const totalEvents = counts.reduce((s, c) => s + c.total, 0);
  const installs = Math.max(0, ...counts.map((c) => c.installs));
  const newReports = reports.filter((r) => r.status === "new").length;

  const features = useMemo(
    () =>
      values
        .filter((v) => v.event_name === "feature_used" && v.item)
        .sort((a, b) => b.total - a.total),
    [values],
  );
  const settings = useMemo(
    () =>
      values
        .filter((v) => v.event_name === "setting_changed" && v.item)
        .sort((a, b) => b.total - a.total),
    [values],
  );

  if (isNightTheme()) {
    return (
      <Container size="page" className="al-members space-y-6">
        <div className="al-page-head">
          <h1 className="al-page-title">Usage telemetry</h1>
          <LinkButton to="/admin" variant="ghost">← Request queue</LinkButton>
        </div>
        <p className="text-sm text-fg-muted">
          Anonymous, opt-in data from the app. No accounts, names, or script content — install ids are
          random and user-resettable. Recognition reports carry only the short snippet a user chose to
          send. See the{" "}
          <Link to="/privacy" className="al-back-link">
            privacy policy
          </Link>
          .
        </p>

        {loading ? (
          <LoadingState label="Loading…" />
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatTile label="Events" value={totalEvents.toLocaleString()} />
              <StatTile label="Devices seen" value={installs.toLocaleString()} />
              <StatTile label="App opens" value={(sessions?.app_opens ?? 0).toLocaleString()} />
              <StatTile label="Avg session" value={formatDuration(sessions?.avg_duration_ms ?? null)} />
              <StatTile label="Reports" value={reports.length.toLocaleString()} />
              <StatTile label="New reports" value={newReports.toLocaleString()} />
            </div>

            <Card as="article">
              <h2 className="al-card__title">Features used</h2>
              <BarList
                rows={features.map((f) => ({
                  label: f.item ?? "—",
                  total: f.total,
                  sub: `${f.installs} device${f.installs === 1 ? "" : "s"}`,
                }))}
              />
            </Card>

            <Card as="article">
              <h2 className="al-card__title">Settings changed</h2>
              <BarList
                rows={settings.map((s) => ({
                  label: s.value ? `${s.item} → ${s.value}` : (s.item ?? "—"),
                  total: s.total,
                  sub: `${s.installs} device${s.installs === 1 ? "" : "s"}`,
                }))}
              />
            </Card>

            <Card as="article">
              <h2 className="al-card__title">
                Recognition reports{" "}
                <span className="text-sm font-normal text-fg-muted">({reports.length})</span>
              </h2>
              <div className="mt-3 space-y-3">
                {reports.length === 0 && <p className="text-sm text-fg-muted">No reports yet.</p>}
                {reports.map((r) => (
                  <ReportCard key={r.id} report={r} onStatus={setStatus} />
                ))}
              </div>
            </Card>
          </>
        )}
      </Container>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="flex-1 text-2xl font-bold text-brand">Usage telemetry</h1>
        <Link to="/admin" className="text-sm text-brand hover:underline">
          ← Request queue
        </Link>
      </div>
      <p className="text-xs text-gray-500">
        Anonymous, opt-in data from the app. No accounts, names, or script content — install ids are
        random and user-resettable. Recognition reports carry only the short snippet a user chose to
        send. See the{" "}
        <Link to="/privacy" className="text-brand hover:underline">
          privacy policy
        </Link>
        .
      </p>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatTile label="Events" value={totalEvents.toLocaleString()} />
            <StatTile label="Devices seen" value={installs.toLocaleString()} />
            <StatTile label="App opens" value={(sessions?.app_opens ?? 0).toLocaleString()} />
            <StatTile label="Avg session" value={formatDuration(sessions?.avg_duration_ms ?? null)} />
            <StatTile label="Reports" value={reports.length.toLocaleString()} />
            <StatTile label="New reports" value={newReports.toLocaleString()} />
          </div>

          <div className={card}>
            <h2 className="font-semibold text-gray-900">Features used</h2>
            <BarList
              rows={features.map((f) => ({
                label: f.item ?? "—",
                total: f.total,
                sub: `${f.installs} device${f.installs === 1 ? "" : "s"}`,
              }))}
            />
          </div>

          <div className={card}>
            <h2 className="font-semibold text-gray-900">Settings changed</h2>
            <BarList
              rows={settings.map((s) => ({
                label: s.value ? `${s.item} → ${s.value}` : (s.item ?? "—"),
                total: s.total,
                sub: `${s.installs} device${s.installs === 1 ? "" : "s"}`,
              }))}
            />
          </div>

          <div className={card}>
            <h2 className="font-semibold text-gray-900">
              Recognition reports{" "}
              <span className="text-sm font-normal text-gray-400">({reports.length})</span>
            </h2>
            <div className="mt-3 space-y-3">
              {reports.length === 0 && <p className="text-sm text-gray-500">No reports yet.</p>}
              {reports.map((r) => (
                <ReportCard key={r.id} report={r} onStatus={setStatus} />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  if (isNightTheme()) {
    return (
      <Card>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        <div className="text-sm text-fg-muted">{label}</div>
      </Card>
    );
  }
  return (
    <div className="bg-white rounded-xl shadow-sm px-4 py-3">
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

// Single-series magnitude: one brand hue, bars anchored to a shared max (sequential, not categorical).
function BarList({ rows }: { rows: { label: string; total: number; sub?: string }[] }) {
  if (rows.length === 0 && isNightTheme()) return <p className="mt-3 text-sm text-fg-muted">No data yet.</p>;
  if (rows.length === 0) return <p className="mt-3 text-sm text-gray-500">No data yet.</p>;
  const max = Math.max(...rows.map((r) => r.total), 1);
  if (isNightTheme()) {
    return (
      <div className="mt-3 space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-40 shrink-0 truncate text-sm" title={r.label}>
              {r.label}
            </div>
            <div className="flex-1 h-4 rounded bg-raised">
              <div
                className="h-4 rounded bg-fg"
                style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }}
              />
            </div>
            <div className="w-24 shrink-0 text-right text-sm text-fg-muted tabular-nums">
              {r.total.toLocaleString()}
              {r.sub ? ` · ${r.sub}` : ""}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-40 shrink-0 truncate text-sm text-gray-700" title={r.label}>
            {r.label}
          </div>
          <div className="flex-1 h-4 rounded bg-gray-100">
            <div
              className="h-4 rounded bg-brand"
              style={{ width: `${Math.max(4, (r.total / max) * 100)}%` }}
            />
          </div>
          <div className="w-24 shrink-0 text-right text-xs text-gray-500 tabular-nums">
            {r.total.toLocaleString()}
            {r.sub ? ` · ${r.sub}` : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

const statusChip: Record<ReportStatus, string> = {
  new: "bg-amber-100 text-amber-800",
  triaged: "bg-blue-100 text-blue-800",
  resolved: "bg-green-100 text-green-800",
};

function ReportCard({
  report: r,
  onStatus,
}: {
  report: Report;
  onStatus: (id: number, status: ReportStatus) => void;
}) {
  if (isNightTheme()) {
    return (
      <Card>
        <div className="flex items-center gap-2 text-sm text-fg-muted">
          <Badge tone="neutral">{r.kind}</Badge>
          {r.engine && <span>{r.engine}</span>}
          {r.confidence != null && <span>· conf {r.confidence.toFixed(2)}</span>}
          <span className="flex-1" />
          <span>{new Date(r.received_at).toLocaleString()}</span>
          <Badge tone={r.status === "new" ? "warn" : r.status === "triaged" ? "info" : "ok"}>
            {r.status}
          </Badge>
        </div>
        <div className="mt-2 text-sm">
          <div className="text-fg-muted">
            Recognised: <span className="text-fg">{r.recognized_text || "—"}</span>
          </div>
          {r.expected_text && (
            <div className="text-fg-muted">
              Should be: <span className="text-fg">{r.expected_text}</span>
            </div>
          )}
          {r.note && <div className="mt-1 text-fg-muted italic">“{r.note}”</div>}
        </div>
        <div className="mt-2 flex gap-2 text-sm">
          {(["new", "triaged", "resolved"] as ReportStatus[]).map((s) => (
            <Button key={s} variant="secondary" onClick={() => onStatus(r.id, s)} disabled={r.status === s}>
              {s}
            </Button>
          ))}
        </div>
        <div className="mt-1 text-sm text-fg-faint">
          {r.app_version} · {r.device_class}
        </div>
      </Card>
    );
  }
  return (
    <div className="rounded-lg border border-gray-100 p-3">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600 uppercase">
          {r.kind}
        </span>
        {r.engine && <span>{r.engine}</span>}
        {r.confidence != null && <span>· conf {r.confidence.toFixed(2)}</span>}
        <span className="flex-1" />
        <span>{new Date(r.received_at).toLocaleString()}</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${statusChip[r.status]}`}>
          {r.status}
        </span>
      </div>
      <div className="mt-2 text-sm">
        <div className="text-gray-500">
          Recognised: <span className="text-gray-900">{r.recognized_text || "—"}</span>
        </div>
        {r.expected_text && (
          <div className="text-gray-500">
            Should be: <span className="text-gray-900">{r.expected_text}</span>
          </div>
        )}
        {r.note && <div className="mt-1 text-gray-600 italic">“{r.note}”</div>}
      </div>
      <div className="mt-2 flex gap-2 text-xs">
        {(["new", "triaged", "resolved"] as ReportStatus[]).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(r.id, s)}
            disabled={r.status === s}
            className="rounded border border-gray-200 px-2 py-1 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          >
            {s}
          </button>
        ))}
      </div>
      <div className="mt-1 text-[10px] text-gray-300">
        {r.app_version} · {r.device_class}
      </div>
    </div>
  );
}
