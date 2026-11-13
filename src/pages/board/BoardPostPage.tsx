import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../auth/AuthContext";
import type { Comment } from "../../lib/types";
import StatusBadge from "../../components/StatusBadge";
import type { BoardPostStats } from "./BoardPage";
import { isNightTheme } from "../../lib/theme";
import { Container } from "../../components/ui/Layout";
import Card from "../../components/ui/Card";
import { StatusBadge as UiStatusBadge } from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import LinkButton from "../../components/ui/LinkButton";
import { Field, Input } from "../../components/ui/Field";
import { LoadingState, EmptyState } from "../../components/ui/States";

interface CommentWithName extends Comment {
  public_profiles: { display_name: string } | null;
}

export default function BoardPostPage() {
  const { id } = useParams();
  const { session, profile } = useAuth();
  const night = isNightTheme();
  const [post, setPost] = useState<BoardPostStats | null>(null);
  const [comments, setComments] = useState<CommentWithName[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: p } = await supabase
      .from("board_posts_with_stats").select("*").eq("id", id).single();
    setPost(p as BoardPostStats | null);
    const { data: cs } = await supabase
      .from("comments")
      .select("*, public_profiles:author_id(display_name)")
      .eq("post_id", id)
      .order("created_at");
    setComments((cs as CommentWithName[]) ?? []);
    setLoading(false);
  }
  useEffect(() => { load(); }, [id]);

  async function vote(value: 1 | -1) {
    if (!post) return;
    if (post.my_vote === value) {
      await supabase.from("votes").delete()
        .eq("post_id", post.id).eq("user_id", session!.user.id);
    } else {
      await supabase.from("votes").upsert({
        post_id: post.id, user_id: session!.user.id, value,
      });
    }
    await load();
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim() || !post) return;
    await supabase.from("comments").insert({
      post_id: post.id, author_id: session!.user.id, body: newComment.trim(),
    });
    setNewComment("");
    await load();
  }

  async function hideComment(c: CommentWithName) {
    await supabase.from("comments")
      .update({ hidden_by_admin: !c.hidden_by_admin }).eq("id", c.id);
    await load();
  }

  if (loading)
    return night ? (
      <Container size="detail">
        <LoadingState label="Loading…" />
      </Container>
    ) : (
      <p className="text-center text-gray-500">Loading…</p>
    );
  if (!post) {
    return night ? (
      <Container size="detail">
        <EmptyState
          title="That post couldn't be found."
          action={
            <LinkButton to="/board" variant="secondary">
              Back to the board
            </LinkButton>
          }
        />
      </Container>
    ) : (
      <div className="text-center py-12">
        <p className="text-gray-600">That post couldn't be found.</p>
        <Link to="/board" className="text-brand hover:underline text-sm">Back to the board</Link>
      </div>
    );
  }

  const voteBtn = (active: boolean) =>
    `rounded-md px-4 py-2 text-sm font-semibold border ${
      active ? "bg-brand text-white border-brand" : "border-gray-300 hover:bg-gray-100"
    }`;

  return night ? (
    <Container size="detail" className="al-members space-y-6">
      <Card as="article">
        <LinkButton to="/board" variant="ghost" className="al-back">← Enhancement board</LinkButton>
        <div className="mt-3 flex items-start gap-3">
          <h1 className="al-page-title al-page-title--post flex-1">{post.summary}</h1>
          <UiStatusBadge status={post.status} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <Button
            variant={post.my_vote === 1 ? "primary" : "secondary"}
            aria-pressed={post.my_vote === 1}
            aria-label={`Thumbs up, ${post.up_votes} votes`}
            onClick={() => vote(1)}
          >
            👍 {post.up_votes}
          </Button>
          <Button
            variant={post.my_vote === -1 ? "primary" : "secondary"}
            aria-pressed={post.my_vote === -1}
            aria-label={`Thumbs down, ${post.down_votes} votes`}
            onClick={() => vote(-1)}
          >
            👎 {post.down_votes}
          </Button>
          <span className="text-xs">
            Tap again to remove your vote.
          </span>
        </div>
      </Card>

      <Card as="article">
        <h2>Comments</h2>
        <div className="mt-3">
          {comments.length === 0 && (
            <EmptyState headingLevel={3} title="No comments yet — start the conversation." />
          )}
        </div>
        {comments.length > 0 && (
          <ul className="al-msg-list">
            {comments.map((c) => (
              <li
                key={c.id}
                className={`al-msg${c.author_id === session?.user.id ? " al-msg--own" : ""}${c.hidden_by_admin ? " al-msg--hidden" : ""}`}
              >
                <p className="al-msg__meta">
                  {c.author_id === session?.user.id
                    ? "You"
                    : c.public_profiles?.display_name || "Former member"}
                  {" · "}{new Date(c.created_at).toLocaleString()}
                  {c.hidden_by_admin && " · hidden"}
                </p>
                <p className="al-msg__body">{c.body}</p>
                {profile?.role === "admin" && (
                  <Button variant="ghost" onClick={() => hideComment(c)} className="mt-1 text-xs">
                    {c.hidden_by_admin ? "Unhide" : "Hide"}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        <form onSubmit={addComment} className="mt-4 flex items-end gap-2">
          <Field label="Comment" className="flex-1">
            {(control) => (
              <Input
                {...control}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                maxLength={2000}
                placeholder="Add a comment…"
              />
            )}
          </Field>
          <Button type="submit">Post</Button>
        </form>
      </Card>
    </Container>
  ) : (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm p-6">
        <Link to="/board" className="text-sm text-brand hover:underline">← Enhancement board</Link>
        <div className="mt-3 flex items-start gap-3">
          <p className="flex-1 text-gray-800">{post.summary}</p>
          <StatusBadge status={post.status} />
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button onClick={() => vote(1)} className={voteBtn(post.my_vote === 1)}>
            👍 {post.up_votes}
          </button>
          <button onClick={() => vote(-1)} className={voteBtn(post.my_vote === -1)}>
            👎 {post.down_votes}
          </button>
          <span className="text-xs text-gray-400">
            Tap again to remove your vote.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="font-semibold text-brand">Comments</h2>
        <div className="mt-3 space-y-3">
          {comments.length === 0 && (
            <p className="text-sm text-gray-500">No comments yet — start the conversation.</p>
          )}
          {comments.map((c) => (
            <div key={c.id}
              className={`rounded-lg bg-gray-50 p-3 text-sm ${c.hidden_by_admin ? "opacity-50" : ""}`}>
              <p className="text-xs font-semibold text-gray-500 mb-1">
                {c.public_profiles?.display_name || "Former member"}
                {" · "}{new Date(c.created_at).toLocaleString()}
                {c.hidden_by_admin && " · hidden"}
              </p>
              <p className="whitespace-pre-wrap text-gray-800">{c.body}</p>
              {profile?.role === "admin" && (
                <button onClick={() => hideComment(c)}
                  className="mt-1 text-xs text-red-600 hover:underline">
                  {c.hidden_by_admin ? "Unhide" : "Hide"}
                </button>
              )}
            </div>
          ))}
        </div>
        <form onSubmit={addComment} className="mt-4 flex gap-2">
          <input value={newComment} onChange={(e) => setNewComment(e.target.value)}
            maxLength={2000} placeholder="Add a comment…"
            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm" />
          <button className="rounded-md bg-brand text-white px-4 text-sm font-semibold hover:bg-brand-light">
            Post
          </button>
        </form>
      </div>
    </div>
  );
}
