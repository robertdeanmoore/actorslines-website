// Alert email text for unresolved trial-check failures (WIP #262). Count and run time only:
// never user ids, emails, names or reasons. Pure, no Deno APIs.

export function trialAlertSubject(): string {
  return "Actors Lines: trial checks need attention";
}

export function trialAlertBody(count: number, runTimeIso: string): string {
  return [
    `Trial maintenance run at ${runTimeIso}.`,
    `${count} account${count === 1 ? "" : "s"} confirmed their email, but the free-trial check could not run.`,
    "No free trial was given to these accounts.",
    "The daily job retries the check automatically; no action is needed unless this keeps happening.",
  ].join("\n");
}
