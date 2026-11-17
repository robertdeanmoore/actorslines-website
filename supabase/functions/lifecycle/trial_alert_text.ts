// Alert email text for unresolved trial-check failures (WIP #262). Count and run time only:
// never user ids, emails, names or reasons. Pure, no Deno APIs.

export function trialAlertSubject(): string {
  throw new Error("not implemented");
}

export function trialAlertBody(_count: number, _runTimeIso: string): string {
  throw new Error("not implemented");
}
