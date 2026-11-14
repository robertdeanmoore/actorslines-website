import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { supabase } from "../../lib/supabase";
import type {
  AiReport, BoardPost, DevNote, EnhancementRequest, Plan, RequestMessage, RequestStatus,
} from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import { Badge, StatusBadge as UiStatusBadge } from "../../components/ui/Badge";
import Callout from "../../components/ui/Callout";
import { Field, Input, Textarea } from "../../components/ui/Field";
import { LoadingState } from "../../components/ui/States";

export default function AdminRequestPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [request, setRequest] = useState<EnhancementRequest | null>(null);
  const [report, setReport] = useState<AiReport | null>(null);
  const [post, setPost] = useState<BoardPost | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [notes, setNotes] = useState<DevNote[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [summaryDraft, setSummaryDraft] = useState("");
  const [newNote, setNewNote] = useState("");
  const [planPrompt, setPlanPrompt] = useState("");
  const [adminReply, setAdminReply] = useState("");
  const [flash, setFlash] = useState("");
  const [flashIsError, setFlashIsError] = useState(false);
  const [busy, setBusy] = useState(false);

  function showFlash(msg: string, isError = false) {
    setFlash(msg);
    setFlashIsError(isError);
  }

  async function load() {
    const rid = Number(id);
    const [{ data: r }, { data: rep }, { data: bp }, { data: msgs }, { data: dn }, { data: pl }] =
      await Promise.all([
        supabase.from("enhancement_requests").select("*").eq("id", rid).single(),
        supabase.from("ai_reports").select("*").eq("request_id", rid)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("board_posts").select("*").eq("request_id", rid).maybeSingle(),
        supabase.from("request_messages").select("*").eq("request_id", rid).order("created_at"),
        supabase.from("dev_notes").select("*").eq("request_id", rid).order("created_at", { ascending: false }),
        supabase.from("plans").select("*").eq("request_id", rid).order("iteration", { ascending: false }),
      ]);
    setRequest(r as EnhancementRequest | null);
    setReport(rep as AiReport | null);
    setPost(bp as BoardPost | null);
    setMessages((msgs as RequestMessage[]) ?? []);
    setNotes((dn as DevNote[]) ?? []);
    setPlans((pl as Plan[]) ?? []);
    if (rep && !bp) setSummaryDraft((rep as AiReport).summary_draft);
    if (bp) setSummaryDraft((bp as BoardPost).summary);
  }
  useEffect(() => { load(); }, [id]);

  async function setStatus(status: RequestStatus) {
    await supabase.from("enhancement_requests").update({ status }).eq("id", id);
    await load();
  }

  async function dispatch(body: Record<string, unknown>) {
    if (busy) return;
    setBusy(true);
    showFlash("Starting...");
    try {
      const { error } = await supabase.functions.invoke("dispatch", { body });
      if (error) {
        let msg = error.message;
        try {
          const j = await (error as { context?: Response }).context?.json();
          if (j?.error) msg = j.error;
        } catch {}
        showFlash(`Dispatch failed: ${msg}`, true);
      } else {
        showFlash("Started: the report will appear in a few minutes. Refresh this page to see it.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function publishSummary() {
    if (!summaryDraft.trim()) return;
    if (post) {
      await supabase.from("board_posts").update({ summary: summaryDraft.trim() }).eq("id", post.id);
      showFlash("Board summary updated.");
    } else {
      await supabase.from("board_posts").insert({ request_id: Number(id), summary: summaryDraft.trim() });
      await setStatus("published");
      showFlash("Published to the board.");
    }
    await load();
  }

  async function addNote(e: React.FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    await supabase.from("dev_notes").insert({ request_id: Number(id), body: newNote.trim() });
    setNewNote("");
    await load();
  }

  async function sendAdminReply(e: React.FormEvent) {
    e.preventDefault();
    if (!adminReply.trim()) return;
    await supabase.from("request_messages").insert({
      request_id: Number(id), author_kind: "admin", body: adminReply.trim(),
    });
    setAdminReply("");
    await load();
  }

  async function requestPlan(e: React.FormEvent) {
    e.preventDefault();
    if (planPrompt.trim().length < 10) return;
    const iteration = (plans[0]?.iteration ?? 0) + 1;
    await dispatch({
      action: "implementation-plan", request_id: Number(id),
      prompt: planPrompt.trim(), iteration,
    });
    setPlanPrompt("");
    await load();
  }

  async function approvePlan(p: Plan) {
    await supabase.from("plans").update({ status: "approved" }).eq("id", p.id);
    await setStatus("planned");
  }

  async function deleteRequest() {
    if (!window.confirm("Delete this request and everything attached to it?")) return;
    await supabase.from("enhancement_requests").delete().eq("id", id);
    navigate("/admin");
  }

  if (!request && isNightTheme()) return <LoadingState label="Loading…" />;
  if (!request) return <p className="text-center text-gray-500">Loading…</p>;

  const card = "bg-white rounded-xl shadow-sm p-6";
  const btn = "rounded-md px-3 py-1.5 text-xs font-semibold";

  if (isNightTheme()) {
    return (
      <Container size="detail" className="al-members space-y-6">
        <div className="al-page-head">
          <div className="al-title-row">
            <h1 className="al-page-title">#{request.id} {request.title}</h1>
            <UiStatusBadge status={request.status} />
          </div>
          <LinkButton to="/admin" variant="ghost" className="al-back">← Queue</LinkButton>
        </div>
        {flash && (
          <Callout tone={flashIsError ? "error" : "note"}>{flash}</Callout>
        )}
        <Card as="article">
          <dl className="space-y-3">
            {([["Goal", request.goal], ["Where", request.where_in_app],
               ["How", request.how_it_works], ["Frequency", request.usage_frequency],
               ["Extra", request.extra_notes]] as const).map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm font-semibold uppercase tracking-wide">{k}</dt>
                <dd className="whitespace-pre-wrap">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={() => dispatch({ action: "triage-report", request_id: Number(id) })} busy={busy}>
              {busy ? "Starting..." : report ? "Re-run AI report" : "Run AI report"}
            </Button>
            <Button variant="secondary" onClick={() => setStatus("closed")}>Close</Button>
            <Button variant="destructive" onClick={() => setStatus("rejected")}>Reject</Button>
            <Button variant="secondary" onClick={() => setStatus("implemented")}>Mark implemented</Button>
            <span className="flex-1" />
            <Button variant="destructive" onClick={deleteRequest}>Delete</Button>
          </div>
        </Card>

        <Card as="article">
          <h2 className="al-card__title">AI developer report</h2>
          {report ? (
            <div className="mt-3 text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h2]:mt-4 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5">
              <p className="text-sm text-fg-muted">Generated {new Date(report.created_at).toLocaleString()}</p>
              <Markdown>{report.report_md}</Markdown>
            </div>
          ) : (
            <p className="mt-2 text-sm text-fg-muted">
              No report yet — run one with the button above.
            </p>
          )}
        </Card>

        <Card as="article">
          <h2 className="al-card__title">
            Public board summary {post && <span className="text-sm font-normal text-fg-muted">(live — <Link className="al-back-link" to={`/board/${post.id}`}>view post</Link>)</span>}
          </h2>
          <Field label="Public board summary" className="mt-3">
            {(control) => (
              <Textarea {...control} rows={4} value={summaryDraft}
                onChange={(e) => setSummaryDraft(e.target.value)}
                placeholder="The AI drafts this when its report runs; edit freely before publishing." />
            )}
          </Field>
          <Button className="mt-2" onClick={publishSummary}>
            {post ? "Update summary" : "Approve & publish to board"}
          </Button>
        </Card>

        <Card as="article">
          <h2 className="al-card__title">Implementation plans</h2>
          <form onSubmit={requestPlan} className="mt-3">
            <Field label="Your prompt to the code engine">
              {(control) => (
                <Textarea {...control} rows={3} value={planPrompt} onChange={(e) => setPlanPrompt(e.target.value)}
                  placeholder="Your prompt to the code engine: how you'd like this enhancement approached…" />
              )}
            </Field>
            <Button type="submit" className="mt-2">
              Generate plan (iteration {(plans[0]?.iteration ?? 0) + 1})
            </Button>
          </form>
          <ul className="al-card-list">
            {plans.map((p) => (
              <Card as="li" key={p.id} className="text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">v{p.iteration}</span>
                  <Badge tone="neutral">{p.status}</Badge>
                  <span className="flex-1" />
                  {p.repo_path && <code className="text-sm text-fg-muted">{p.repo_path}</code>}
                </div>
                <p className="mt-1 whitespace-pre-wrap">{p.prompt}</p>
                {p.plan_md && (
                  <Card className="mt-2 max-h-96 overflow-y-auto text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h2]:mt-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5">
                    <Markdown>{p.plan_md}</Markdown>
                  </Card>
                )}
                <div className="mt-2 flex gap-2">
                  {p.status === "draft" && (
                    <Button onClick={() => approvePlan(p)}>Approve plan</Button>
                  )}
                  {p.status === "approved" && p.repo_path && (
                    <Button onClick={() => dispatch({
                      action: "implement-pr", request_id: Number(id), plan_path: p.repo_path,
                    })}>
                      ⚡ Implement (opens PR)
                    </Button>
                  )}
                  {p.pr_url && (
                    <a href={p.pr_url} target="_blank" rel="noreferrer"
                      className="al-back-link">View PR →</a>
                  )}
                </div>
              </Card>
            ))}
          </ul>
          {plans.length === 0 && <p className="mt-3 text-sm text-fg-muted">No plans yet.</p>}
        </Card>

        <Card as="article">
          <h2 className="al-card__title">Dev notes (private)</h2>
          <form onSubmit={addNote} className="mt-3 flex items-end gap-2">
            <Field label="Add a note" className="flex-1">
              {(control) => (
                <Input {...control} value={newNote} onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note…" />
              )}
            </Field>
            <Button type="submit">Add</Button>
          </form>
          <ul className="al-card-list">
            {notes.map((n) => (
              <Card as="li" key={n.id} className="text-sm">
                <span className="text-sm text-fg-muted">{new Date(n.created_at).toLocaleString()} — </span>
                {n.body}
              </Card>
            ))}
          </ul>
        </Card>

        <Card as="article">
          <h2 className="al-card__title">Thread with the submitter</h2>
          <div className="mt-3">
            {messages.length === 0 && <p className="text-sm text-fg-muted">No messages.</p>}
          </div>
          {messages.length > 0 && (
            <ul className="al-msg-list">
              {messages.map((m) => (
                <li key={m.id} className={`al-msg${m.author_kind === "admin" ? " al-msg--own" : ""}`}>
                  <p className="al-msg__meta">
                    {m.author_kind} · {new Date(m.created_at).toLocaleString()}
                  </p>
                  <p className="al-msg__body">{m.body}</p>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={sendAdminReply} className="mt-3 flex items-end gap-2">
            <Field label="Reply as Actors Lines team" className="flex-1">
              {(control) => (
                <Input {...control} value={adminReply} onChange={(e) => setAdminReply(e.target.value)}
                  placeholder="Reply as Actors Lines team…" />
              )}
            </Field>
            <Button type="submit">Send</Button>
          </form>
        </Card>
      </Container>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={card}>
        <Link to="/admin" className="text-sm text-brand hover:underline">← Queue</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="flex-1 text-xl font-bold">#{request.id} {request.title}</h1>
          <StatusBadge status={request.status} />
        </div>
        {flash && (
          <p role="status" className={`mt-2 text-sm ${flashIsError ? "text-red-700" : "text-brand"}`}>
            {flash}
          </p>
        )}
        <dl className="mt-4 space-y-2 text-sm">
          {([["Goal", request.goal], ["Where", request.where_in_app],
             ["How", request.how_it_works], ["Frequency", request.usage_frequency],
             ["Extra", request.extra_notes]] as const).map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs font-semibold uppercase text-gray-400">{k}</dt>
              <dd className="whitespace-pre-wrap">{v || "—"}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => dispatch({ action: "triage-report", request_id: Number(id) })}
            disabled={busy}
            className={`${btn} bg-blue-100 text-blue-800 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed`}>
            {busy ? "Starting..." : report ? "Re-run AI report" : "Run AI report"}
          </button>
          <button onClick={() => setStatus("closed")} className={`${btn} bg-gray-200 hover:bg-gray-300`}>Close</button>
          <button onClick={() => setStatus("rejected")} className={`${btn} bg-red-100 text-red-800 hover:bg-red-200`}>Reject</button>
          <button onClick={() => setStatus("implemented")} className={`${btn} bg-emerald-100 text-emerald-800 hover:bg-emerald-200`}>Mark implemented</button>
          <span className="flex-1" />
          <button onClick={deleteRequest} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>Delete</button>
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-brand">AI developer report</h2>
        {report ? (
          <div className="mt-3 text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h2]:mt-4 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5">
            <p className="text-xs text-gray-400">Generated {new Date(report.created_at).toLocaleString()}</p>
            <Markdown>{report.report_md}</Markdown>
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-500">
            No report yet — run one with the button above.
          </p>
        )}
      </div>

      <div className={card}>
        <h2 className="font-semibold text-brand">
          Public board summary {post && <span className="text-xs font-normal text-gray-400">(live — <Link className="text-brand hover:underline" to={`/board/${post.id}`}>view post</Link>)</span>}
        </h2>
        <textarea rows={4} value={summaryDraft}
          onChange={(e) => setSummaryDraft(e.target.value)}
          placeholder="The AI drafts this when its report runs; edit freely before publishing."
          className="mt-3 w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
        <button onClick={publishSummary}
          className="mt-2 rounded-md bg-brand text-white px-4 py-2 text-sm font-semibold hover:bg-brand-light">
          {post ? "Update summary" : "Approve & publish to board"}
        </button>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-brand">Implementation plans</h2>
        <form onSubmit={requestPlan} className="mt-3">
          <textarea rows={3} value={planPrompt} onChange={(e) => setPlanPrompt(e.target.value)}
            placeholder="Your prompt to the code engine: how you'd like this enhancement approached…"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button className="mt-2 rounded-md bg-purple-700 text-white px-4 py-2 text-sm font-semibold hover:bg-purple-800">
            Generate plan (iteration {(plans[0]?.iteration ?? 0) + 1})
          </button>
        </form>
        <div className="mt-4 space-y-3">
          {plans.map((p) => (
            <div key={p.id} className="rounded-lg border border-gray-200 p-3 text-sm">
              <div className="flex items-center gap-2">
                <span className="font-semibold">v{p.iteration}</span>
                <span className="text-xs rounded-full bg-gray-100 px-2 py-0.5">{p.status}</span>
                <span className="flex-1" />
                {p.repo_path && <code className="text-xs text-gray-500">{p.repo_path}</code>}
              </div>
              <p className="mt-1 text-gray-600 whitespace-pre-wrap">{p.prompt}</p>
              {p.plan_md && (
                <div className="mt-2 max-h-96 overflow-y-auto rounded-md border border-gray-200 bg-gray-50 p-3 text-sm [&_h1]:font-bold [&_h2]:font-semibold [&_h2]:mt-3 [&_ul]:list-disc [&_ul]:ml-5 [&_ol]:list-decimal [&_ol]:ml-5">
                  <Markdown>{p.plan_md}</Markdown>
                </div>
              )}
              <div className="mt-2 flex gap-2">
                {p.status === "draft" && (
                  <button onClick={() => approvePlan(p)}
                    className={`${btn} bg-green-100 text-green-800 hover:bg-green-200`}>
                    Approve plan
                  </button>
                )}
                {p.status === "approved" && p.repo_path && (
                  <button onClick={() => dispatch({
                    action: "implement-pr", request_id: Number(id), plan_path: p.repo_path,
                  })}
                    className={`${btn} bg-brand text-white hover:bg-brand-light`}>
                    ⚡ Implement (opens PR)
                  </button>
                )}
                {p.pr_url && (
                  <a href={p.pr_url} target="_blank" rel="noreferrer"
                    className="text-xs text-brand hover:underline">View PR →</a>
                )}
              </div>
            </div>
          ))}
          {plans.length === 0 && <p className="text-sm text-gray-500">No plans yet.</p>}
        </div>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-brand">Dev notes (private)</h2>
        <form onSubmit={addNote} className="mt-3 flex gap-2">
          <input value={newNote} onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note…"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-light">Add</button>
        </form>
        <ul className="mt-3 space-y-2 text-sm">
          {notes.map((n) => (
            <li key={n.id} className="rounded bg-gray-50 p-2">
              <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()} — </span>
              {n.body}
            </li>
          ))}
        </ul>
      </div>

      <div className={card}>
        <h2 className="font-semibold text-brand">Thread with the submitter</h2>
        <div className="mt-3 space-y-2 text-sm">
          {messages.map((m) => (
            <div key={m.id} className={`rounded p-2 ${m.author_kind === "admin" ? "bg-brand/5" : "bg-gray-50"}`}>
              <span className="text-xs text-gray-400">
                {m.author_kind} · {new Date(m.created_at).toLocaleString()}
              </span>
              <p className="whitespace-pre-wrap">{m.body}</p>
            </div>
          ))}
          {messages.length === 0 && <p className="text-gray-500">No messages.</p>}
        </div>
        <form onSubmit={sendAdminReply} className="mt-3 flex gap-2">
          <input value={adminReply} onChange={(e) => setAdminReply(e.target.value)}
            placeholder="Reply as Actors Lines team…"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-light">Send</button>
        </form>
      </div>
    </div>
  );
}
