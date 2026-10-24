import { useEffect, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { lessonKey, parseLesson } from "./model";
import { lessonSync } from "../../progress/service";
import { LessonSummaries, summarizeRuns, onLessonSaved } from "./completion";

export function useLessonSummaries(actor: string, active: boolean) {
  const [summaries, setSummaries] = useState<LessonSummaries>({});
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    setSummaries({});
    setError("");
  }, [actor]);
  useEffect(
    () =>
      onLessonSaved((id) => {
        if (id === actor) refresh();
      }),
    [actor, refresh],
  );
  useEffect(() => {
    if (!active) return;
    let live = true;
    async function load() {
      const prefix = lessonKey(actor, "");
      const keys = (await AsyncStorage.getAllKeys()).filter((key) =>
        key.startsWith(prefix),
      );
      let local: LessonSummaries = {};
      for (const [key, raw] of await AsyncStorage.multiGet(keys)) {
        try {
          local = summarizeRuns(
            parseLesson(raw, key.slice(prefix.length)).runs,
            local,
          );
        } catch {
          /* One unreadable lesson must not hide the rest of the map. */
        }
      }
      if (live) {
        setSummaries(local);
        setError("");
      }
      if (lessonSync) {
        const remote = await lessonSync.read(actor, actor);
        if (live)
          setSummaries(
            summarizeRuns(
              remote.runs.map((saved) => saved.run),
              local,
            ),
          );
      }
    }
    load().catch(() => {
      if (live)
        setError(
          "Не удалось обновить отметки уроков. Сохранённые на устройстве отметки остаются видны.",
        );
    });
    return () => {
      live = false;
    };
  }, [actor, active, revision]);
  return { summaries, error, refresh };
}
