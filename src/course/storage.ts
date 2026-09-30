import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";
import {
  CourseProgress,
  emptyProgress,
  parseProgress,
  progressKey,
  TopicProgress,
} from "./model";

export function useCourseProgress(actorId: string) {
  const [progress, setProgress] = useState<CourseProgress>({});
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const latest = useRef<CourseProgress>({});
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const mounted = useRef(true);
  const key = progressKey(actorId);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((raw) => {
        const data = parseProgress(raw);
        if (!cancelled) {
          latest.current = data;
          setProgress(data);
          setReady(true);
        }
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Не удалось прочитать сохранённые отметки. Конспекты доступны; чтобы повторить загрузку отметок, откройте раздел заново.",
          );
      });
    return () => {
      cancelled = true;
      mounted.current = false;
    };
  }, [key]);
  function persist(data: CourseProgress) {
    setSaving(true);
    const value = JSON.stringify(data);
    const task = queue.current
      .catch(() => {})
      .then(() => AsyncStorage.setItem(key, value));
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
  function update(id: string, patch: Partial<TopicProgress>) {
    if (!ready) return;
    const data = {
      ...latest.current,
      [id]: {
        ...(latest.current[id] ?? emptyProgress()),
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    };
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
    retry: () => persist(latest.current),
  };
}
