import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import type { LearnScript, LineExport, RevealMode } from "../../lib/learnLines/types";
import { lineKey, resolveLineType } from "../../lib/learnLines/types";
import { rollRandomWords } from "../../lib/learnLines/revealRanges";
import { applyZoneTap } from "../../lib/learnLines/zoneTap";
import { useRevealSync } from "../../lib/learnLines/useRevealSync";
import SceneList from "./components/SceneList";
import LineRow from "./components/LineRow";
import StageDirectionRow from "./components/StageDirectionRow";
import CueRow from "./components/CueRow";

export default function LearnPracticePage() {
  const { scriptId } = useParams<{ scriptId: string }>();
  const scriptIdNum = scriptId ? Number(scriptId) : undefined;

  const [script, setScript] = useState<LearnScript | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [activeScene, setActiveScene] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sync = useRevealSync(scriptIdNum);
  const randomWordsRef = useRef<Record<string, Set<number>>>({});

  useEffect(() => {
    if (!scriptIdNum) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("learn_scripts")
        .select("*")
        .eq("id", scriptIdNum)
        .single();
      if (cancelled) return;
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setScript(data as LearnScript);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [scriptIdNum]);

  useEffect(() => {
    if (!scriptIdNum) return;
    supabase
      .from("learn_line_states")
      .select("line_key, reveal_mode")
      .eq("script_id", scriptIdNum)
      .then(({ data }) => {
        const map: Record<string, RevealMode> = {};
        for (const row of (data as { line_key: string; reveal_mode: RevealMode }[]) ?? []) {
          map[row.line_key] = row.reveal_mode;
        }
        sync.hydrate(map);
      });
    // sync.hydrate is stable (useCallback with no deps) — only re-run when the script changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scriptIdNum]);

  const characterColorByName = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of script?.data.characters ?? []) map[c.characterName] = c.characterColorIndex;
    return map;
  }, [script]);

  function ensureRandomWords(key: string, text: string, forceReroll = false): Set<number> {
    if (forceReroll || !randomWordsRef.current[key]) {
      randomWordsRef.current[key] = rollRandomWords(text, randomWordsRef.current[key]);
    }
    return randomWordsRef.current[key];
  }

  function handleTap(sceneIndex: number, lineIndex: number, line: LineExport, zoneMode: RevealMode) {
    const key = lineKey(sceneIndex, lineIndex);
    const current = sync.revealByKey[key] ?? "VISIBLE";
    const newMode = applyZoneTap(current, zoneMode);
    if (newMode === "RANDOM" && current !== "RANDOM") {
      ensureRandomWords(key, line.text, true);
    }
    sync.setReveal(key, newMode);
  }

  if (loading) return <p className="p-8 text-center text-gray-500">Loading…</p>;
  if (notFound || !script) {
    return (
      <div className="max-w-md mx-auto text-center py-12">
        <p className="text-gray-600">That script couldn't be found.</p>
        <Link to="/learn-lines" className="text-brand hover:underline text-sm mt-2 inline-block">
          Back to My Scripts
        </Link>
      </div>
    );
  }

  const scenes = script.data.scenes;
  const scene = scenes[activeScene];

  return (
    <div className="flex gap-6 -mx-4 sm:mx-0">
      {/* Desktop sidebar */}
      <div
        className="hidden md:block w-60 shrink-0 sticky top-4 self-start max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl p-3"
        style={{ backgroundColor: "var(--color-paperkit-bg)" }}
      >
        <SceneList scenes={scenes} activeIndex={activeScene} onSelect={setActiveScene} />
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/40" onClick={() => setDrawerOpen(false)} />
          <div
            className="relative w-4/5 max-w-xs h-full overflow-y-auto p-3 shadow-lg"
            style={{ backgroundColor: "var(--color-paperkit-bg)" }}
          >
            <SceneList
              scenes={scenes}
              activeIndex={activeScene}
              onSelect={(i) => {
                setActiveScene(i);
                setDrawerOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <main className="flex-1 min-w-0">
        <div className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 mb-2 -mx-4 bg-white shadow-sm">
          <button
            onClick={() => setDrawerOpen(true)}
            className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-gray-100 text-xl"
            aria-label="Scenes"
          >
            ☰
          </button>
          <div className="font-semibold text-sm truncate">
            Act {scene.actNumber}, Scene {scene.sceneNumber}
          </div>
        </div>

        <div
          className="rounded-xl px-4 sm:px-6 py-6"
          style={{ backgroundColor: "var(--color-paperkit-bg)" }}
        >
          <h1 className="hidden md:block text-lg font-semibold mb-4" style={{ color: "var(--color-paperkit-ink)" }}>
            Act {scene.actNumber}, Scene {scene.sceneNumber}
            {scene.shortDescription && (
              <span className="ml-2 text-sm font-normal" style={{ color: "var(--color-paperkit-graphite)" }}>
                {scene.shortDescription}
              </span>
            )}
          </h1>

          <div className="space-y-1">
            {scene.lines.map((line, li) => {
              const type = resolveLineType(line);
              if (type === "SKIP") return null;
              if (type === "STAGE_DIRECTION") return <StageDirectionRow key={li} line={line} />;
              if (type === "SOUND" || type === "LIGHT") return <CueRow key={li} line={line} kind={type} />;

              const key = lineKey(activeScene, li);
              const isUserLine = line.speaker === script.my_character_name;
              const revealMode: RevealMode = isUserLine ? sync.revealByKey[key] ?? "VISIBLE" : "VISIBLE";
              const shownWordIndices =
                isUserLine && revealMode === "RANDOM" ? ensureRandomWords(key, line.text) : undefined;

              return (
                <LineRow
                  key={li}
                  line={line}
                  lineKey={key}
                  isUserLine={isUserLine}
                  characterColorIndex={characterColorByName[line.speaker] ?? 0}
                  revealMode={revealMode}
                  shownWordIndices={shownWordIndices}
                  onTap={(zoneMode) => handleTap(activeScene, li, line, zoneMode)}
                />
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
