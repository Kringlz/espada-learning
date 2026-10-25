import { CourseProgress } from "../model";
export type PracticeSnapshot = {
  topicId: string;
  correct: number;
  incorrect: number;
  completed: number;
  finished: boolean;
  updatedAt: string;
};
export function practiceSnapshots(
  progress: CourseProgress,
): PracticeSnapshot[] {
  return Object.entries(progress).flatMap(([topicId, p]) => {
    const t = p.trainer;
    if (!t || !p.updatedAt || t.correct + t.incorrect === 0) return [];
    return [
      {
        topicId,
        correct: t.correct,
        incorrect: t.incorrect,
        completed: t.cursor + Number(t.submitted),
        finished: t.finished,
        updatedAt: p.practiceUpdatedAt || t.recent.at(-1)?.at || p.updatedAt,
      },
    ];
  });
}
export type SharedPractice = {
  topic_id: string;
  correct: number;
  incorrect: number;
  completed: number;
  finished: boolean;
  passed: boolean;
  observed_at: string;
};
export function latestPractice(rows: SharedPractice[]) {
  const result = new Map<string, SharedPractice>();
  for (const row of rows) {
    const previous = result.get(row.topic_id);
    const latest =
      !previous || row.observed_at > previous.observed_at ? row : previous;
    result.set(row.topic_id, {
      ...latest,
      passed: row.passed || !!previous?.passed,
    });
  }
  return [...result.values()].sort((a, b) =>
    b.observed_at.localeCompare(a.observed_at),
  );
}
