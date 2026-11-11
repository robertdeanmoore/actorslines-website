// Worker entry (wrangler.jsonc `main`). Logic lives in routing.ts; a Worker module may only
// export handlers, so the testable helpers stay out of this file.
import { handle } from "./routing.ts";

export default { fetch: handle };
