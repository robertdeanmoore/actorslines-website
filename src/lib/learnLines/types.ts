// TS mirror of the fields in the Android app's PlayShareDto.kt that matter for a read-only
// web render of a cast-distribution export. Personal/progress-only DTO fields (sections,
// reviewedLineIndexes, cover geometry, blended voices, etc.) are omitted — they're always
// empty/default in a cast-distribution file and unused by this renderer.

export type LineType = "DIALOGUE" | "SKIP" | "SOUND" | "LIGHT" | "STAGE_DIRECTION";

export interface LineExport {
  speaker: string;
  text: string;
  teachPauseMs?: number | null;
  isSkip?: boolean; // legacy fallback only, pre-v11 files
  isSoundEffect?: boolean; // legacy fallback only, pre-v11 files
  soundDescription?: string | null;
  lineType?: LineType | null;
}

export interface SceneExport {
  actNumber: number;
  sceneNumber: number;
  lines: LineExport[];
  shortDescription?: string | null;
  pageNumber?: number | null;
  orderIndex?: number;
}

export interface CharacterExport {
  characterName: string;
  actorName: string;
  characterColorIndex: number; // 0 = no color assigned
  isMyCharacter?: boolean; // always false in cast-distribution files
  orderIndex?: number;
}

export interface PlayExport {
  schemaVersion: number;
  title: string;
  characters: CharacterExport[];
  scenes: SceneExport[];
  castDistribution?: boolean;
  orderIndex?: number;
}

// The schema version this web renderer understands. Mirrors the app's guard
// (`schemaVersion <= CURRENT_SCHEMA_VERSION`) in PlayShareSerializer.kt.
export const CURRENT_SUPPORTED_SCHEMA_VERSION = 26;

/** Resolves a line's effective type, replicating PlayRepository.importPlay's legacy fallback
 *  for pre-v11 files that predate the `lineType` field. */
export function resolveLineType(line: LineExport): LineType {
  if (line.lineType) return line.lineType;
  if (line.isSkip) return "SKIP";
  if (line.isSoundEffect) return "SOUND";
  return "DIALOGUE";
}

// ── Supabase row shapes ──────────────────────────────────────────────────────

export type RevealMode = "VISIBLE" | "HIDDEN" | "FIRST_WORD" | "FIRST_LETTERS" | "RANDOM";

export interface LearnScript {
  id: number;
  user_id: string;
  title: string;
  schema_version: number;
  my_character_name: string;
  data: PlayExport;
  created_at: string;
  updated_at: string;
}

export interface LearnScriptSummary {
  id: number;
  title: string;
  my_character_name: string;
  updated_at: string;
}

export interface LearnLineState {
  id: number;
  script_id: number;
  line_key: string; // `${sceneIndex}:${lineIndex}`
  reveal_mode: RevealMode;
  updated_at: string;
}

export function lineKey(sceneIndex: number, lineIndex: number): string {
  return `${sceneIndex}:${lineIndex}`;
}
