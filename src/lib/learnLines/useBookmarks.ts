import { useCallback, useEffect, useState } from "react";
import { supabase } from "../supabase";
import type { LearnBookmark } from "./types";

function sortBookmarks(list: LearnBookmark[]): LearnBookmark[] {
  return [...list].sort((a, b) => a.scene_index - b.scene_index || a.line_index - b.line_index);
}

/** Loads and mutates the bookmark markers for one script. Add/delete are optimistic — the UI
 *  never waits on the network — with a console warning (not a thrown error) on failure, matching
 *  useRevealSync's stance that these interactions must never block. */
export function useBookmarks(scriptId: number | undefined) {
  const [bookmarks, setBookmarks] = useState<LearnBookmark[]>([]);

  useEffect(() => {
    if (!scriptId) return;
    let cancelled = false;
    supabase
      .from("learn_bookmarks")
      .select("*")
      .eq("script_id", scriptId)
      .then(({ data }) => {
        if (!cancelled) setBookmarks(sortBookmarks((data as LearnBookmark[]) ?? []));
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  const addBookmark = useCallback(
    async (sceneIndex: number, lineIndex: number, label: string) => {
      if (!scriptId) return;
      const { data, error } = await supabase
        .from("learn_bookmarks")
        .insert({ script_id: scriptId, scene_index: sceneIndex, line_index: lineIndex, label })
        .select()
        .single();
      if (error || !data) {
        console.warn("Failed to save bookmark", error);
        return;
      }
      setBookmarks((prev) => sortBookmarks([...prev, data as LearnBookmark]));
    },
    [scriptId],
  );

  const deleteBookmark = useCallback(async (id: number) => {
    setBookmarks((prev) => prev.filter((b) => b.id !== id));
    const { error } = await supabase.from("learn_bookmarks").delete().eq("id", id);
    if (error) console.warn("Failed to delete bookmark", error);
  }, []);

  return { bookmarks, addBookmark, deleteBookmark };
}
