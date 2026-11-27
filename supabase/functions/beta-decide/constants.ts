// Constants for the beta-decide function. Local copies of the beta-apply values: a function
// must not import from outside its own directory (Scripts/supabase_migrate.sh refuses to deploy it).
// decide_policy.test.ts asserts these stay equal to ../beta-apply/policy.ts.

/** Total places in the beta programme. */
export const BETA_CAP = 50;
/** Shared inbox for replies and deletion requests. */
export const REPLY_TO = "hello@actorslines.app";
export const SITE_URL = "https://actorslines.app";
