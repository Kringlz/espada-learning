import { Run } from "./model";
export type LessonSummary = {
  complete: boolean;
  started: boolean;
  updatedAt: string;
};
export type LessonSummaries = Record<string, LessonSummary>;
/** Completion belongs to the whole history, not just the newest replay. */
export function summarizeRuns(
  runs: Run[],
  previous: LessonSummaries = {},
): LessonSummaries {
  const summaries = { ...previous };
  for (const run of runs) {
    const id = run.lessonId ?? "G08-02";
    const old = summaries[id];
    const at = run.finishedAt ?? run.startedAt;
    summaries[id] = {
      complete: !!old?.complete || (run.stage === "result" && !!run.finishedAt),
      started: true,
      updatedAt: old && old.updatedAt > at ? old.updatedAt : at,
    };
  }
  return summaries;
}
const listeners = new Set<(actor: string) => void>();
export function notifyLessonSaved(actor: string) {
  listeners.forEach((listener) => listener(actor));
}
export function onLessonSaved(listener: (actor: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
