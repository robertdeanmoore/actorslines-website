import type { LearnBookmark, SceneExport } from "../../../lib/learnLines/types";

interface SceneListProps {
  scenes: SceneExport[];
  activeIndex: number;
  onSelect: (index: number) => void;
  bookmarks: LearnBookmark[];
  onSelectBookmark: (bookmark: LearnBookmark) => void;
}

/** The scene navigation list content — rendered both in the desktop sidebar and inside the
 *  mobile slide-out drawer by LearnPracticePage, which owns the responsive chrome around it.
 *  Each scene's own bookmarks are nested underneath it as perpetually-clickable shortcuts. */
export default function SceneList({ scenes, activeIndex, onSelect, bookmarks, onSelectBookmark }: SceneListProps) {
  return (
    <nav className="space-y-1">
      {scenes.map((scene, i) => {
        const active = i === activeIndex;
        const sceneBookmarks = bookmarks.filter((b) => b.scene_index === i);
        return (
          <div key={i}>
            <button
              onClick={() => onSelect(i)}
              className={`w-full text-left rounded-md px-3 py-2 text-sm transition-colors ${
                active ? "font-semibold" : "hover:opacity-80"
              }`}
              style={{
                backgroundColor: active ? "var(--color-paperkit-bg-deep)" : "transparent",
                color: "var(--color-paperkit-ink)",
              }}
            >
              <div>
                Act {scene.actNumber}, Scene {scene.sceneNumber}
              </div>
              {scene.shortDescription && (
                <div className="text-xs mt-0.5" style={{ color: "var(--color-paperkit-graphite)" }}>
                  {scene.shortDescription}
                </div>
              )}
            </button>
            {sceneBookmarks.length > 0 && (
              <div className="ml-3 space-y-0.5">
                {sceneBookmarks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => onSelectBookmark(b)}
                    className="w-full text-left rounded px-2 py-1 text-xs truncate hover:opacity-80"
                    style={{ color: "var(--color-brand-600)" }}
                  >
                    🔖 {b.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
