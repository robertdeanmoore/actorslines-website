// Inactivity warnings and deletion (DEF190 option b, WIP #263).
//
// Accounts with an ACTIVE LICENCE are exempt: status 'active', ends_at in the future, source not
// 'trial' (Holly rulings 2026-11-17). The predicate lives in SQL (0032: lifecycle_inactive_profiles
// and lifecycle_has_active_licence) so there is one definition. Here:
//   * the selector flags each stale profile `exempt`; exempt profiles get no warning, no deletion,
//     and any old warning stamps are cleared (so a later lapse starts a fresh sequence);
//   * the licence state is read again immediately before every deletion;
//   * if either licence read fails, nothing is deleted for that run (never delete on an unreadable
//     exemption).
// Pure of Deno APIs so node --test can run it.

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;
const FORTNIGHT_MS = 14 * 24 * 60 * 60 * 1000;
const PAGE = 1000; // PostgREST's default max rows per response

export type InactiveRow = {
  id: string;
  last_seen_at: string;
  inactivity_warned_1_at: string | null;
  inactivity_warned_2_at: string | null;
  exempt: boolean;
};

export type InactivitySummary = {
  warned1: number; warned2: number; deleted: number; errors: number; inactivityExempt: number;
};

type Res<T> = { data: T | null; error: unknown };

export interface InactivityDeps {
  now: number;
  /** public.lifecycle_inactive_profiles(p_cutoff), rows from..to inclusive, ordered by id. */
  listInactive(cutoffIso: string, from: number, to: number): PromiseLike<Res<InactiveRow[]>>;
  /** public.lifecycle_has_active_licence(p_user). */
  hasActiveLicence(id: string): PromiseLike<Res<boolean>>;
  getEmail(id: string): Promise<string | undefined>;
  sendEmail(to: string, subject: string, text: string): Promise<boolean>;
  /** update public.profiles set <patch> where id; returns true on success. */
  updateProfile(id: string, patch: Record<string, string | null>): Promise<boolean>;
  deleteUser(id: string): Promise<boolean>;
}

export async function runInactivity(deps: InactivityDeps, summary: InactivitySummary): Promise<void> {
  const cutoff = new Date(deps.now - 5 * MONTH_MS).toISOString();

  // Read every page before changing anything, so deletions cannot shift later pages.
  const rows: InactiveRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await deps.listInactive(cutoff, from, from + PAGE - 1);
    if (error || !data) {
      console.error("[lifecycle] failed to query inactive profiles", error);
      summary.errors++;
      return; // licence state unreadable: no warnings, no deletions this run
    }
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  const keepExempt = async (p: { id: string; inactivity_warned_1_at: string | null; inactivity_warned_2_at: string | null }) => {
    summary.inactivityExempt++;
    if (p.inactivity_warned_1_at || p.inactivity_warned_2_at) {
      const ok = await deps.updateProfile(p.id, { inactivity_warned_1_at: null, inactivity_warned_2_at: null });
      if (!ok) summary.errors++;
    }
  };

  for (const p of rows) {
    if (p.exempt) { await keepExempt(p); continue; }
    const email = await deps.getEmail(p.id);
    if (!email) continue;
    const keepLink = "https://actorslines.app/login";
    try {
      if (!p.inactivity_warned_1_at) {
        const ok = await deps.sendEmail(email, "Your Actors Lines account — are you still with us?",
          `Hello,\n\nYour actorslines.app account hasn't been used for about 5 months. ` +
          `Inactive accounts are removed after 6 months.\n\nTo keep your account, simply sign in: ${keepLink}\n\n` +
          `If you do nothing, we'll send one more reminder before your account and its data are deleted.\n\n— Actors Lines`);
        if (ok) {
          await deps.updateProfile(p.id, { inactivity_warned_1_at: new Date(deps.now).toISOString() });
          summary.warned1++;
        } else summary.errors++;
      } else if (!p.inactivity_warned_2_at &&
                 deps.now - Date.parse(p.inactivity_warned_1_at) > FORTNIGHT_MS) {
        const ok = await deps.sendEmail(email, "Final reminder — your Actors Lines account will be deleted",
          `Hello,\n\nThis is the final reminder: your actorslines.app account will be permanently deleted ` +
          `in 2 weeks due to inactivity.\n\nTo keep it, just sign in: ${keepLink}\n\n— Actors Lines`);
        if (ok) {
          await deps.updateProfile(p.id, { inactivity_warned_2_at: new Date(deps.now).toISOString() });
          summary.warned2++;
        } else summary.errors++;
      } else if (p.inactivity_warned_2_at &&
                 deps.now - Date.parse(p.inactivity_warned_2_at) > FORTNIGHT_MS) {
        // Re-read the licence state right before deleting; an unreadable answer never deletes.
        const { data: licensed, error } = await deps.hasActiveLicence(p.id);
        if (error || typeof licensed !== "boolean") {
          console.error(`[lifecycle] licence check failed, deletion skipped id=${p.id}`, error);
          summary.errors++;
        } else if (licensed) {
          await keepExempt(p);
        } else if (await deps.deleteUser(p.id)) {
          console.log(`[lifecycle] deleted inactive account id=${p.id}`);
          summary.deleted++;
        } else summary.errors++;
      }
    } catch (e) {
      console.error(`[lifecycle] failed processing profile id=${p.id}`, e);
      summary.errors++;
    }
  }
}
