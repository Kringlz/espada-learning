import { useEffect, useRef, useState } from "react";
import { ProgressStorage } from "../useStoredCourseProgress";
import {
  Action,
  emptyLesson,
  lessonKey,
  parseLesson,
  updateLesson,
  LessonData,
} from "./model";
import { activeSeconds } from "../../progress/model";
import type { ProgressOutbox } from "../../progress/outbox";
import type { ProgressData } from "../../progress/model";
import { ProgressCommand } from "../../progress/outbox";
import { uid } from "../../core/ids";

export function useLesson(
  actorId: string,
  storage: ProgressStorage,
  lessonId = "G08-02",
  sync?: {
    outbox: ProgressOutbox;
    read: (actor: string, student: string) => Promise<ProgressData>;
  },
) {
  const [data, setData] = useState(emptyLesson),
    latest = useRef(data);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [saving, setSaving] = useState(false),
    [reload, setReload] = useState(0);
  const mounted = useRef(false),
    queue = useRef<Promise<unknown>>(Promise.resolve());
  const lastInteraction = useRef<number | null>(null),
    videoSeconds = useRef(0);
  const unsaved = useRef(new Map<string, ProgressCommand>());
  const key = lessonKey(actorId, lessonId);
  const setFailure = (e: unknown) => {
    if (mounted.current) {
      setSaving(false);
      setError(
        `Синхронизация не подтверждена. Ответы ожидают отправки. ${e instanceof Error ? e.message : ""}`,
      );
    }
  };
  useEffect(() => {
    let live = true;
    mounted.current = true;
    setReady(false);
    async function load() {
      const loaded = parseLesson(await storage.getItem(key), lessonId);
      if (sync) {
        try {
          await sync.outbox.enqueue(actorId, {
            type: "begin",
            studentId: actorId,
            requestId: uid(),
            item: { at: new Date().toISOString() },
          });
          // Old local runs remain archive evidence, without invented activity events.
          for (const run of loaded.runs) {
            if (!run.syncRevision) {
              run.syncRevision = 1;
              await sync.outbox.enqueue(actorId, {
                type: "run",
                studentId: actorId,
                requestId: `${run.id}:1`,
                item: {
                  id: run.id,
                  topicId: lessonId,
                  version: run.contentVersion ?? 1,
                  revision: 1,
                  run,
                  archived: true,
                },
              });
            }
          }
          await storage.setItem(key, JSON.stringify(loaded));
          await sync.outbox.flush(actorId);
          const remote = await sync.read(actorId, actorId);
          for (const saved of remote.runs.filter(
            (r) => r.topicId === lessonId,
          )) {
            const idx = loaded.runs.findIndex((r) => r.id === saved.id);
            if (idx < 0)
              loaded.runs.push({ ...saved.run, syncRevision: saved.revision });
            else if ((loaded.runs[idx].syncRevision ?? 0) <= saved.revision)
              loaded.runs[idx] = { ...saved.run, syncRevision: saved.revision };
          }
          loaded.runs.sort((a, b) => a.startedAt.localeCompare(b.startedAt));
          await storage.setItem(key, JSON.stringify(loaded));
          if (live) setError("");
        } catch (e) {
          if (live) setFailure(e);
        }
      }
      if (!live) return;
      latest.current = loaded;
      setData(loaded);
      setReady(true);
    }
    load().catch(() => {
      if (live)
        setError("Не удалось прочитать прохождение. Повторите загрузку.");
    });
    return () => {
      live = false;
      mounted.current = false;
    };
  }, [key, reload]);
  function persist(next: LessonData, command?: ProgressCommand) {
    const value = JSON.stringify(next);
    setSaving(true);
    if (command) unsaved.current.set(command.requestId, command);
    const job = queue.current
      .catch(() => {})
      .then(async () => {
        // The durable envelope precedes the local snapshot. Retrying keeps its request id.
        if (sync)
          for (const [id, pending] of unsaved.current) {
            await sync.outbox.enqueue(actorId, pending);
            unsaved.current.delete(id);
          }
        await storage.setItem(key, value);
      });
    queue.current = job;
    void job
      .then(async () => {
        if (sync) await sync.outbox.flush(actorId);
        if (mounted.current && queue.current === job) {
          setSaving(false);
          setError("");
        }
      })
      .catch(setFailure);
  }
  function retry() {
    if (!ready) {
      setReload((n) => n + 1);
      return;
    }
    persist(latest.current);
  }
  useEffect(() => {
    if (typeof window === "undefined") return;
    const retryOnline = () => {
      if (ready) retry();
    };
    const resetActivity = () => {
      lastInteraction.current = null;
    };
    window.addEventListener("online", retryOnline);
    document.addEventListener("visibilitychange", resetActivity);
    return () => {
      window.removeEventListener("online", retryOnline);
      document.removeEventListener("visibilitychange", resetActivity);
    };
  }, [ready]);
  return {
    data,
    ready,
    saving,
    error,
    retry,
    pause() {
      lastInteraction.current = null;
    },
    send(action: Action) {
      if (!ready) return;
      const before = latest.current;
      let next = updateLesson(before, action);
      if (next === before) return;
      let command: ProgressCommand | undefined;
      const run = next.runs.at(-1);
      let shouldSync = action.type !== "video" && action.type !== "selectVideo";
      let seconds = 0;
      if (action.type === "video") {
        const old = action.id
          ? (before.videos?.[action.id] ?? before.video)
          : before.video;
        const delta =
          (action.progress.watch.activeSeconds ?? 0) -
          (old.watch.activeSeconds ?? 0);
        if (delta > 0 && delta <= 6) videoSeconds.current += delta;
        if (videoSeconds.current >= 15) {
          seconds = Math.min(60, Math.floor(videoSeconds.current));
          videoSeconds.current -= seconds;
          shouldSync = true;
        }
      } else if (
        [
          "choose",
          "hint",
          "submit",
          "finish",
          "checkContinue",
          "practiceContinue",
        ].includes(action.type)
      ) {
        const now = Date.now();
        seconds = activeSeconds(
          lastInteraction.current,
          now,
          typeof document === "undefined" || !document.hidden,
        );
        lastInteraction.current = now;
      }
      if (sync && run && shouldSync && !before.runs.at(-1)?.finishedAt) {
        const revision = (run.syncRevision ?? 0) + 1;
        const synced = { ...run, syncRevision: revision };
        next = { ...next, runs: [...next.runs.slice(0, -1), synced] };
        const stage = before.runs.at(-1)?.stage ?? run.stage;
        const kind =
          action.type === "video"
            ? "video"
            : stage === "intro"
              ? "initial"
              : stage === "return"
                ? "revisited"
                : stage === "check"
                  ? "independent"
                  : "practice";
        const meaningful =
          seconds > 0 || action.type === "submit" || action.type === "finish";
        command = {
          type: "run",
          studentId: actorId,
          requestId: `${run.id}:${revision}`,
          item: {
            id: run.id,
            topicId: lessonId,
            version: run.contentVersion ?? 1,
            revision,
            run: synced,
          },
          event: meaningful
            ? { at: new Date().toISOString(), kind, seconds }
            : null,
        };
      } else if (sync && run && action.type === "start") {
        const synced = { ...run, syncRevision: 1 };
        next = { ...next, runs: [...next.runs.slice(0, -1), synced] };
        command = {
          type: "run",
          studentId: actorId,
          requestId: `${run.id}:1`,
          item: {
            id: run.id,
            topicId: lessonId,
            version: run.contentVersion ?? 1,
            revision: 1,
            run: synced,
          },
        };
      }
      latest.current = next;
      setData(next);
      persist(next, command);
    },
  };
}
