import { useEffect, useRef, useState } from "react";
import { didStudy } from "../engagement/streak";
import {
  CourseProgress,
  emptyProgress,
  parseProgress,
  progressKey,
  TopicProgress,
} from "./model";
export type ProgressStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function useStoredCourseProgress(
  actorId: string,
  storage: ProgressStorage,
  mark: () => void,
) {
  const [progress, setProgress] = useState<CourseProgress>({});
  const [ready, setReady] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = useRef<CourseProgress>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  const key = progressKey(actorId);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    setReady(false);
    setError("");
    storage
      .getItem(key)
      .then((raw) => {
        const data = parseProgress(raw);
        if (!cancelled) {
          latest.current = data;
          setProgress(data);
          setError("");
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Не удалось прочитать сохранённые отметки. Конспекты доступны. Повторите загрузку отметок.",
          );
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [key, loadAttempt]);
  function persist(data: CourseProgress) {
    setSaving(true);
    const value = JSON.stringify(data);
    const task = queue.current
      .catch(() => {})
      .then(() => storage.setItem(key, value));
    queue.current = task;
    task
      .then(() => {
        if (mounted.current && queue.current === task) {
          setSaving(false);
          setError("");
        }
      })
      .catch(() => {
        if (mounted.current && queue.current === task) {
          setSaving(false);
          setError(
            "Не удалось сохранить отметки на устройстве. Повторите сохранение.",
          );
        }
      });
  }
  function update(
    id: string,
    patch:
      | Partial<TopicProgress>
      | ((current: TopicProgress) => Partial<TopicProgress>),
  ) {
    if (!ready) return;
    const current = latest.current[id] ?? emptyProgress();
    const data = {
      ...latest.current,
      [id]: {
        ...current,
        ...(typeof patch === "function" ? patch(current) : patch),
        updatedAt: new Date().toISOString(),
      },
    };
    if (didStudy(current, data[id])) mark();
    latest.current = data;
    setProgress(data);
    persist(data);
  }
  return {
    progress,
    ready,
    error,
    saving,
    update,
    // A failed read must never be retried as a write of the empty initial state.
    retry: () =>
      ready ? persist(latest.current) : setLoadAttempt((n) => n + 1),
  };
}
