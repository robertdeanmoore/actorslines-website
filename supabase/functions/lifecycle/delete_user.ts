// Inactivity deletion wrapper. supabase-js admin.deleteUser returns {error} rather than throwing,
// so the caller must check it: before this, a failed delete (e.g. the licences cascade, DEF555)
// was logged and counted as "deleted". Pure of Deno APIs so node --test can run it.

type DeleteResult = { error: { code?: string; status?: number } | null };
export type UserAdmin = { deleteUser(id: string): PromiseLike<DeleteResult> };

/** True only when the user was really deleted. Logs the error code only, never content. */
export async function deleteInactiveUser(admin: UserAdmin, id: string): Promise<boolean> {
  const { error } = await admin.deleteUser(id);
  if (error) {
    console.error(`[lifecycle] deleteUser failed id=${id} code=${error.code ?? error.status ?? "unknown"}`);
    return false;
  }
  return true;
}
