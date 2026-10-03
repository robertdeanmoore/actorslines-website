// TS mirror of the fields in the Android app's PlayShareDto.kt that matter for a read-only
// web render of a cast-distribution export. Personal/progress-only DTO fields (sections,
// reviewedLineIndexes, cover geometry, blended voices, etc.) are omitted — they're always
// empty/default in a cast-distribution file and unused by this renderer.

export type LineType = "DIALOGUE" | "SKIP" | "SOUND" | "LIGHT" | "STAGE_DIRECTION" | "PAGE_BREAK";

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
// 34 (WIP #155): PAGE_BREAK line type; the app now always writes schemaVersion.
export const CURRENT_SUPPORTED_SCHEMA_VERSION = 34;

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

/** Position of each line among the scene's lines that aren't page breaks, or -1 for a page break.
 *  Saved reveal states and bookmarks are keyed by this position, so adding page breaks to a script
 *  never shifts them onto a different line (WIP #155). */
export function contentLineIndexes(lines: LineExport[]): number[] {
  let next = 0;
  return lines.map((l) => (resolveLineType(l) === "PAGE_BREAK" ? -1 : next++));
}

export function lineKey(sceneIndex: number, lineIndex: number): string {
  return `${sceneIndex}:${lineIndex}`;
}

// A web-only proxy for the app's "sections" concept — not linked to it. Positional
// (scene_index/line_index) rather than a stored line key, purely for simplicity of the nested
// scene-list navigation, which needs the scene index up front to jump scenes.
export interface LearnBookmark {
  id: number;
  script_id: number;
  scene_index: number;
  line_index: number;
  label: string;
  created_at: string;
}
