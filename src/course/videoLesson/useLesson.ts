import { useEffect, useRef, useState } from "react";
import { ProgressStorage } from "../useStoredCourseProgress";
import {
  Action,
  emptyLesson,
  lessonKey,
  parseLesson,
  updateLesson,
} from "./model";

export function useLesson(
  actorId: string,
  storage: ProgressStorage,
  lessonId = "G08-02",
) {
  const [data, setData] = useState(emptyLesson);
  const latest = useRef(data);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reload, setReload] = useState(0);
  const mounted = useRef(false);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const key = lessonKey(actorId, lessonId);
  useEffect(() => {
    let live = true;
    mounted.current = true;
    setReady(false);
    storage
      .getItem(key)
      .then((raw) => {
        const loaded = parseLesson(raw, lessonId);
        if (!live) return;
        latest.current = loaded;
        setData(loaded);
        setReady(true);
        setError("");
      })
      .catch(() => {
        if (live)
          setError(
            "Не удалось прочитать прохождение. Попробуй загрузить ещё раз.",
          );
      });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [key, reload]);
  function persist() {
    const value = JSON.stringify(latest.current);
    setSaving(true);
    const job = queue.current
      .catch(() => {})
      .then(() => storage.setItem(key, value));
    queue.current = job;
    void job
      .then(() => {
        if (mounted.current && queue.current === job) {
          setSaving(false);
          setError("");
        }
      })
      .catch(() => {
        if (mounted.current && queue.current === job) {
          setSaving(false);
          setError(
            "Ответы ещё не сохранены. Оставь урок открытым и повтори сохранение.",
          );
        }
      });
  }
  return {
    data,
    ready,
    saving,
    error,
    send(action: Action) {
      if (!ready) return;
      const next = updateLesson(latest.current, action);
      if (next === latest.current) return;
      latest.current = next;
      setData(next);
      persist();
    },
    retry() {
      if (ready) persist();
      else setReload((n) => n + 1);
    },
  };
}
