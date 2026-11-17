// Inlet pipe core: bearer auth + three routes against PostgREST, with fetch injected for tests.
// Deployed with --no-verify-jwt: the bearer is INLET_TOKEN, not a user JWT. Design:
// RobLife Deliverables/Actors Lines - Inlet Pipe Design 2026-11-17.md. Docs: docs/features/inlet.md.
//
// Hard rules: explicit column list (never select *), output built field by field so author identity
// cannot leak even if the database returned it, logs hold counts and status codes only.

export const REQUEST_COLUMNS =
  "id,title,goal,where_in_app,how_it_works,usage_frequency,extra_notes,status,ready_at,created_at,inlet_acked_at";
export const REPORT_COLUMNS = "report_md,created_at";
export const MAX_PENDING = 20;
const SCAN_LIMIT = 500; // ready_for_dev rows scanned; PostgREST cannot compare two columns, so filter here
const MAX_ACK_ITEMS = 50;
const MAX_BODY_BYTES = 8 * 1024;

export interface InletDeps {
  token: string | undefined;
  supabaseUrl: string;
  serviceKey: string;
  fetchFn: typeof fetch;
  now?: () => Date;
}

let unauthorizedCount = 0;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function digest(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}

// Constant-time: compare fixed-length SHA-256 digests, so length and content differences cost the same.
export async function tokenMatches(presented: string, expected: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(presented), digest(expected)]);
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function bearer(req: Request): string {
  const h = req.headers.get("Authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : "";
}

async function readJson(req: Request): Promise<unknown | null> {
  const text = await req.text();
  if (text.length === 0 || text.length > MAX_BODY_BYTES) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

const isId = (v: unknown): v is number => typeof v === "number" && Number.isInteger(v) && v > 0;

interface RequestRow {
  id: number;
  title: string;
  goal: string;
  where_in_app: string;
  how_it_works: string;
  usage_frequency: string;
  extra_notes: string;
  status: string;
  ready_at: string | null;
  created_at: string;
  inlet_acked_at: string | null;
  ai_reports?: { report_md: string; created_at: string }[] | null;
}

export function isPending(r: Pick<RequestRow, "status" | "ready_at" | "inlet_acked_at">): boolean {
  if (r.status !== "ready_for_dev" || !r.ready_at) return false;
  if (!r.inlet_acked_at) return true;
  return Date.parse(r.inlet_acked_at) < Date.parse(r.ready_at);
}

// Field by field on purpose: nothing outside this list can reach the response.
export function toItem(r: RequestRow) {
  const latest = (r.ai_reports ?? []).slice().sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0];
  return {
    id: r.id,
    title: r.title,
    goal: r.goal,
    where_in_app: r.where_in_app,
    how_it_works: r.how_it_works,
    usage_frequency: r.usage_frequency,
    extra_notes: r.extra_notes,
    status: r.status,
    ready_at: r.ready_at,
    created_at: r.created_at,
    report_md: latest ? latest.report_md : null,
  };
}

export async function handleInlet(req: Request, deps: InletDeps): Promise<Response> {
  if (!deps.token || deps.token.length < 16) {
    console.error("[inlet] INLET_TOKEN unset or too short: failing closed");
    return json({ error: "unavailable" }, 503);
  }
  const presented = bearer(req);
  if (!presented || !(await tokenMatches(presented, deps.token))) {
    unauthorizedCount++;
    console.warn(`[inlet] unauthorized count=${unauthorizedCount}`);
    return new Response(null, { status: 401 });
  }

  const rest = `${deps.supabaseUrl}/rest/v1/enhancement_requests`;
  const headers = {
    apikey: deps.serviceKey,
    Authorization: `Bearer ${deps.serviceKey}`,
    "Content-Type": "application/json",
  };
  const now = (deps.now ?? (() => new Date()))();
  const last = new URL(req.url).pathname.split("/").filter(Boolean).pop() ?? "";

  if (req.method === "GET" && last === "inlet") {
    const q =
      `${rest}?select=${REQUEST_COLUMNS},ai_reports(${REPORT_COLUMNS})` +
      `&status=eq.ready_for_dev&order=ready_at.asc&limit=${SCAN_LIMIT}` +
      `&ai_reports.order=created_at.desc&ai_reports.limit=1`;
    const res = await deps.fetchFn(q, { headers });
    if (!res.ok) {
      console.error(`[inlet] list failed status=${res.status}`);
      return json({ error: "upstream" }, 502);
    }
    const rows = (await res.json()) as RequestRow[];
    const items = rows.filter(isPending).slice(0, MAX_PENDING).map(toItem);
    console.log(`[inlet] list scanned=${rows.length} returned=${items.length}`);
    return json({ items });
  }

  if (req.method === "POST" && last === "ack") {
    const body = (await readJson(req)) as { items?: unknown } | null;
    if (!body || !Array.isArray(body.items) || body.items.length > MAX_ACK_ITEMS) return json({ error: "bad request" }, 400);
    const valid: { id: number; ready_at: string }[] = [];
    for (const it of body.items) {
      const o = it as { id?: unknown; ready_at?: unknown };
      if (!isId(o?.id) || typeof o.ready_at !== "string" || o.ready_at.length > 40 || Number.isNaN(Date.parse(o.ready_at))) {
        return json({ error: "bad request" }, 400);
      }
      valid.push({ id: o.id, ready_at: o.ready_at });
    }
    let acked = 0;
    for (const it of valid) {
      // Only where ready_at still matches: a re-mark during the gap stays pending.
      const url = `${rest}?id=eq.${it.id}&status=eq.ready_for_dev&ready_at=eq.${encodeURIComponent(it.ready_at)}&select=id`;
      const res = await deps.fetchFn(url, {
        method: "PATCH",
        headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ inlet_acked_at: now.toISOString() }),
      });
      if (!res.ok) {
        console.error(`[inlet] ack failed status=${res.status}`);
        return json({ error: "upstream" }, 502);
      }
      acked += ((await res.json()) as unknown[]).length;
    }
    console.log(`[inlet] ack requested=${valid.length} acked=${acked}`);
    return json({ acked });
  }

  if (req.method === "POST" && last === "done") {
    const body = (await readJson(req)) as { id?: unknown } | null;
    if (!body || !isId(body.id)) return json({ error: "bad request" }, 400);
    const url = `${rest}?id=eq.${body.id}&status=eq.ready_for_dev&select=id`;
    const res = await deps.fetchFn(url, {
      method: "PATCH",
      headers: { ...headers, Prefer: "return=representation" },
      body: JSON.stringify({ status: "implemented" }),
    });
    if (!res.ok) {
      console.error(`[inlet] done failed status=${res.status}`);
      return json({ error: "upstream" }, 502);
    }
    const updated = ((await res.json()) as unknown[]).length;
    console.log(`[inlet] done updated=${updated}`);
    return json({ updated });
  }

  return json({ error: "not found" }, 404);
}
