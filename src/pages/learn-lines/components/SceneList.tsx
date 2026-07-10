import type { SceneExport } from "../../../lib/learnLines/types";

interface SceneListProps {
  scenes: SceneExport[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

/** The scene navigation list content — rendered both in the desktop sidebar and inside the
 *  mobile slide-out drawer by LearnPracticePage, which owns the responsive chrome around it. */
export default function SceneList({ scenes, activeIndex, onSelect }: SceneListProps) {
  return (
    <nav className="space-y-1">
      {scenes.map((scene, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={i}
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
        );
      })}
    </nav>
  );
}
