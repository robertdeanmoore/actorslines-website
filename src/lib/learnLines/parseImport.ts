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

  // Files from app schema 33 and earlier never carried schemaVersion (the app's serializer
  // omitted it as a default); from 34 on it is always written. A missing schemaVersion is
  // therefore normal for an older file; only reject it when present and explicitly higher than
  // what this web renderer understands.
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

  // A personal backup carries the actor's accuracy history (app schema 34); the web renderer
  // never uses it, so it is dropped here rather than stored with the uploaded script.
  const { accuracyHistory: _personalHistory, ...rest } = obj;
  void _personalHistory;
  const normalized: PlayExport = {
    ...(rest as unknown as PlayExport),
    schemaVersion: typeof schemaVersion === "number" ? schemaVersion : CURRENT_SUPPORTED_SCHEMA_VERSION,
  };
  return { ok: true, data: normalized };
}
