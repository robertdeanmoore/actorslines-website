import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import type { EnhancementRequest, RequestMessage } from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";

export default function RequestDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const [request, setRequest] = useState<EnhancementRequest | null>(null);
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: r } = await supabase
      .from("enhancement_requests").select("*").eq("id", id).single();
    setRequest(r as EnhancementRequest | null);
    const { data: msgs } = await supabase
      .from("request_messages").select("*").eq("request_id", id)
      .order("created_at");
    setMessages((msgs as RequestMessage[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim()) return;
    await supabase.from("request_messages").insert({
      request_id: Number(id),
      author_kind: "user",
      author_id: session!.user.id,
      body: reply.trim(),
    });
    setReply("");
    await load();
  }

  if (loading) return <p className="text-center text-gray-500">Loading…</p>;
  if (!request) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">That request couldn't be found.</p>
        <Link to="/requests" className="text-brand hover:underline text-sm">Back to my requests</Link>
      </div>
    );
  }

  const qa: [string, string][] = [
    ["What you're trying to achieve", request.goal],
    ["Where in the app", request.where_in_app],
    ["How it might work", request.how_it_works],
    ["How often you'd use it", request.usage_frequency || "—"],
    ["Anything else", request.extra_notes || "—"],
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Link to="/requests" className="text-sm text-brand hover:underline">← My requests</Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="flex-1 text-xl font-bold text-gray-900">{request.title}</h1>
          <StatusBadge status={request.status} />
        </div>
        <dl className="mt-4 space-y-3">
          {qa.map(([q, a]) => (
            <div key={q}>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">{q}</dt>
              <dd className="text-sm text-gray-800 whitespace-pre-wrap">{a}</dd>
            </div>
          ))}
        </dl>
        {request.status === "submitted" && (
          <p className="mt-4 text-sm text-gray-500">
            Thanks! Your suggestion is being reviewed — you'll see its status change
            here as it moves along.
          </p>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-brand">Conversation</h2>
        <div className="mt-3 space-y-3">
          {messages.length === 0 && (
            <p className="text-sm text-gray-500">No messages yet. If we need more
              detail from you, questions will appear here.</p>
          )}
          {messages.map((m) => (
            <div key={m.id}
              className={`rounded-lg p-3 text-sm whitespace-pre-wrap ${
                m.author_kind === "user"
                  ? "bg-brand/5 border border-brand/20"
                  : "bg-gray-100"
              }`}>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {m.author_kind === "user" ? "You" : "Actors Lines team"}
                {" · "}{new Date(m.created_at).toLocaleString()}
              </p>
              {m.body}
            </div>
          ))}
        </div>
        <form onSubmit={sendReply} className="mt-4 flex gap-2">
          <input value={reply} onChange={(e) => setReply(e.target.value)}
            placeholder="Add a message…" maxLength={4000}
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-light">
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
