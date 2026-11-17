import { test } from "node:test";
import assert from "node:assert/strict";
import { handleInlet, isPending, REQUEST_COLUMNS, tokenMatches } from "./core.ts";

const TOKEN = "t".repeat(64);
const BASE = "https://proj.supabase.co/functions/v1/inlet";

interface Call { url: string; method: string; body: string | undefined }
function mkDeps(responses: unknown[], opts: { token?: string | undefined; status?: number } = {}) {
  const calls: Call[] = [];
  let i = 0;
  const fetchFn = (async (url: string, init?: RequestInit) => {
    calls.push({ url: String(url), method: init?.method ?? "GET", body: init?.body as string | undefined });
    const body = responses[Math.min(i++, responses.length - 1)];
    return new Response(JSON.stringify(body), { status: opts.status ?? 200 });
  }) as unknown as typeof fetch;
  const deps = {
    token: "token" in opts ? opts.token : TOKEN,
    supabaseUrl: "https://proj.supabase.co",
    serviceKey: "svc",
    fetchFn,
    now: () => new Date("2026-11-17T10:00:00Z"),
  };
  return { deps, calls };
}
const auth = (t = TOKEN) => ({ Authorization: `Bearer ${t}` });
const req = (path: string, method: string, headers: Record<string, string> = auth(), body?: unknown) =>
  new Request(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });

const ROW = {
  id: 12, title: "Dark mode", goal: "g", where_in_app: "w", how_it_works: "h", usage_frequency: "daily", extra_notes: "n",
  status: "ready_for_dev", ready_at: "2026-11-17T09:00:00+00:00", created_at: "2026-11-16T09:00:00+00:00", inlet_acked_at: null,
  // never selected, but prove they cannot reach the response even if the database returned them
  author_id: "uuid-secret", email: "member@example.com", dev_notes: "private", profiles: { display_name: "Jo" },
  ai_reports: [
    { report_md: "old", created_at: "2026-11-16T10:00:00+00:00" },
    { report_md: "NEW", created_at: "2026-11-17T08:00:00+00:00" },
  ],
};

test("fails closed 503 when INLET_TOKEN unset or short", async () => {
  for (const token of [undefined, "", "short"]) {
    const { deps, calls } = mkDeps([[]], { token });
    const r = await handleInlet(req("", "GET"), deps);
    assert.equal(r.status, 503);
    assert.equal(calls.length, 0);
  }
});

test("401 with empty body for missing, wrong, and non-bearer auth; no database call", async () => {
  for (const h of [{}, auth("x".repeat(64)), auth(TOKEN + "x"), { Authorization: TOKEN }]) {
    const { deps, calls } = mkDeps([[]]);
    const r = await handleInlet(req("", "GET", h as Record<string, string>), deps);
    assert.equal(r.status, 401);
    assert.equal(await r.text(), "");
    assert.equal(calls.length, 0);
  }
});

test("tokenMatches accepts equal and rejects different or prefix", async () => {
  assert.equal(await tokenMatches("abc", "abc"), true);
  assert.equal(await tokenMatches("abc", "abd"), false);
  assert.equal(await tokenMatches("ab", "abc"), false);
});

test("GET uses explicit column list, never select *, no author identity columns requested", async () => {
  const { deps, calls } = mkDeps([[]]);
  await handleInlet(req("", "GET"), deps);
  const url = decodeURIComponent(calls[0].url);
  assert.ok(url.includes(`select=${REQUEST_COLUMNS},ai_reports(report_md,created_at)`));
  assert.ok(!/select=\*|select=[^&]*\*/.test(url));
  for (const bad of ["author_id", "email", "profiles", "dev_notes", "request_messages", "votes", "comments"]) {
    assert.ok(!url.includes(bad), `requested ${bad}`);
  }
  assert.ok(url.includes("status=eq.ready_for_dev"));
});

test("GET response is built field by field: no author identity even if the database returned it", async () => {
  const { deps } = mkDeps([[ROW]]);
  const r = await handleInlet(req("", "GET"), deps);
  assert.equal(r.status, 200);
  const text = await r.text();
  for (const leak of ["author_id", "uuid-secret", "member@example.com", "dev_notes", "private", "display_name", "profiles", "inlet_acked_at"]) {
    assert.ok(!text.includes(leak), `leaked ${leak}`);
  }
  const { items } = JSON.parse(text);
  assert.equal(items.length, 1);
  assert.equal(items[0].report_md, "NEW");
  assert.deepEqual(Object.keys(items[0]).sort(), [
    "created_at", "extra_notes", "goal", "how_it_works", "id", "ready_at", "report_md", "status", "title", "usage_frequency", "where_in_app",
  ]);
});

test("pending filter: acked rows hidden, re-marked rows returned, max 20", async () => {
  const acked = { ...ROW, id: 1, inlet_acked_at: "2026-11-17T09:30:00+00:00" };
  const remarked = { ...ROW, id: 2, ready_at: "2026-11-17T09:45:00+00:00", inlet_acked_at: "2026-11-17T09:30:00+00:00" };
  const many = Array.from({ length: 30 }, (_, n) => ({ ...ROW, id: 100 + n }));
  const { deps } = mkDeps([[acked, remarked, ...many]]);
  const { items } = await (await handleInlet(req("", "GET"), deps)).json();
  assert.equal(items.length, 20);
  assert.equal(items[0].id, 2);
  assert.equal(isPending(acked), false);
});

test("ack sets inlet_acked_at only where ready_at still matches; idempotent when nothing matches", async () => {
  const { deps, calls } = mkDeps([[{ id: 12 }], []]);
  const body = { items: [{ id: 12, ready_at: "2026-11-17T09:00:00+00:00" }, { id: 13, ready_at: "2026-11-17T09:00:00+00:00" }] };
  const r = await handleInlet(req("/ack", "POST", auth(), body), deps);
  assert.deepEqual(await r.json(), { acked: 1 });
  assert.equal(calls[0].method, "PATCH");
  assert.ok(calls[0].url.includes("id=eq.12"));
  assert.ok(calls[0].url.includes("ready_at=eq.2026-11-17T09%3A00%3A00%2B00%3A00"));
  assert.ok(calls[0].url.includes("status=eq.ready_for_dev"));
  assert.deepEqual(JSON.parse(calls[0].body!), { inlet_acked_at: "2026-11-17T10:00:00.000Z" });
  // second identical call: nothing matches, still 200
  const again = mkDeps([[]]);
  const r2 = await handleInlet(req("/ack", "POST", auth(), { items: [body.items[0]] }), again.deps);
  assert.equal(r2.status, 200);
  assert.deepEqual(await r2.json(), { acked: 0 });
});

test("ack rejects bad bodies without touching the database", async () => {
  for (const b of [{}, { items: "x" }, { items: [{ id: "12", ready_at: "2026-11-17T09:00:00Z" }] }, { items: [{ id: 1.5, ready_at: "2026-11-17T09:00:00Z" }] },
    { items: [{ id: 1, ready_at: "nope" }] }, { items: Array.from({ length: 51 }, () => ({ id: 1, ready_at: "2026-11-17T09:00:00Z" })) }]) {
    const { deps, calls } = mkDeps([[]]);
    const r = await handleInlet(req("/ack", "POST", auth(), b), deps);
    assert.equal(r.status, 400);
    assert.equal(calls.length, 0);
  }
});

test("done only transitions ready_for_dev to implemented", async () => {
  const { deps, calls } = mkDeps([[{ id: 12 }]]);
  const r = await handleInlet(req("/done", "POST", auth(), { id: 12 }), deps);
  assert.deepEqual(await r.json(), { updated: 1 });
  assert.ok(calls[0].url.includes("id=eq.12") && calls[0].url.includes("status=eq.ready_for_dev"));
  assert.deepEqual(JSON.parse(calls[0].body!), { status: "implemented" });
  const none = mkDeps([[]]);
  assert.deepEqual(await (await handleInlet(req("/done", "POST", auth(), { id: 99 }), none.deps)).json(), { updated: 0 });
  const bad = mkDeps([[]]);
  assert.equal((await handleInlet(req("/done", "POST", auth(), { id: "1; drop" }), bad.deps)).status, 400);
  assert.equal(bad.calls.length, 0);
});

test("wrong method or route is 404 after auth; upstream failure is 502", async () => {
  const { deps } = mkDeps([[]]);
  assert.equal((await handleInlet(req("/ack", "GET"), deps)).status, 404);
  assert.equal((await handleInlet(req("", "DELETE"), deps)).status, 404);
  const down = mkDeps([{}], { status: 500 });
  assert.equal((await handleInlet(req("", "GET"), down.deps)).status, 502);
});

test("logs never contain request text or the token", async () => {
  const lines: string[] = [];
  const orig = { log: console.log, warn: console.warn, error: console.error };
  console.log = console.warn = console.error = (...a: unknown[]) => { lines.push(a.join(" ")); };
  try {
    const { deps } = mkDeps([[ROW]]);
    await handleInlet(req("", "GET"), deps);
    await handleInlet(req("", "GET", auth("y".repeat(64))), deps);
  } finally { Object.assign(console, orig); }
  const all = lines.join("\n");
  assert.ok(lines.length >= 2);
  assert.ok(!all.includes(TOKEN) && !all.includes("Dark mode") && !all.includes("y".repeat(64)));
});
