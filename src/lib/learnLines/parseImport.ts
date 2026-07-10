import type { PlayExport } from "./types";
import { CURRENT_SUPPORTED_SCHEMA_VERSION } from "./types";

export interface ParseResult {
  ok: boolean;
  data?: PlayExport;
  error?: string;
}

/** Parses and validates a cast-distribution (or personal) export JSON file for the web
 *  renderer. Mirrors the friendliness of the app's own import error handling, but with
 *  messages aimed at someone who may not have the app open in front of them. */
export function parseImport(raw: string): ParseResult {
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return { ok: false, error: "This doesn't look like a valid script file." };
  }

  if (typeof json !== "object" || json === null) {
    return { ok: false, error: "This doesn't look like a valid script file." };
  }
  const obj = json as Record<string, unknown>;

  // kotlinx.serialization's JSON encoder omits any field left at its declared default —
  // and schemaVersion's default *is* "the app's current schema version" at export time, so
  // it always matches and is always omitted from real files. A missing schemaVersion is
  // therefore normal, not a sign of a malformed file; only reject it when present and
  // explicitly higher than what this web renderer understands.
  const schemaVersion = obj.schemaVersion;
  if (typeof schemaVersion === "number" && schemaVersion > CURRENT_SUPPORTED_SCHEMA_VERSION) {
    return {
      ok: false,
      error: "This file was exported by a newer version of the app than this website supports yet.",
    };
  }

  const title = obj.title;
  const characters = obj.characters;
  const scenes = obj.scenes;
  if (
    typeof title !== "string" ||
    !Array.isArray(characters) ||
    characters.length === 0 ||
    !Array.isArray(scenes)
  ) {
    return {
      ok: false,
      error: "This file is missing expected script data — was it exported from Actors Voice's 'Export for cast' option?",
    };
  }

  const normalized: PlayExport = {
    ...(obj as unknown as PlayExport),
    schemaVersion: typeof schemaVersion === "number" ? schemaVersion : CURRENT_SUPPORTED_SCHEMA_VERSION,
  };
  return { ok: true, data: normalized };
}
