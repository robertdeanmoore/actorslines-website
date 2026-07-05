import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Markdown from "react-markdown";
import { supabase } from "../../lib/supabase";
import type {
  AiReport, BoardPost, DevNote, EnhancementRequest, Plan, RequestMessage, RequestStatus,
} from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";

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
    setFlash("Dispatching to GitHub…");
    const { error } = await supabase.functions.invoke("dispatch", { body });
    setFlash(error ? `Dispatch failed: ${error.message}` : "Workflow started — results appear here in a few minutes.");
  }

  async function publishSummary() {
    if (!summaryDraft.trim()) return;
    if (post) {
      await supabase.from("board_posts").update({ summary: summaryDraft.trim() }).eq("id", post.id);
      setFlash("Board summary updated.");
    } else {
      await supabase.from("board_posts").insert({ request_id: Number(id), summary: summaryDraft.trim() });
      await setStatus("published");
      setFlash("Published to the board.");
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

  if (!request) return <p className="text-center text-gray-500">Loading…</p>;

  const card = "bg-white rounded-xl shadow-sm p-6";
  const btn = "rounded-md px-3 py-1.5 text-xs font-semibold";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className={card}>
        <Link to="/admin" className="text-sm text-brand hover:underline">← Queue</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="flex-1 text-xl font-bold">#{request.id} {request.title}</h1>
          <StatusBadge status={request.status} />
        </div>
        {flash && <p className="mt-2 text-sm text-brand">{flash}</p>}
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
            className={`${btn} bg-blue-100 text-blue-800 hover:bg-blue-200`}>
            {report ? "Re-run AI report" : "Run AI report"}
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
