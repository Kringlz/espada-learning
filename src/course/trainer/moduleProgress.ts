import type { TopicProgress } from "../model";
import {
  newTrainer,
  TrainerState,
  qualifiesForCompletion,
  sessionQuestion,
} from "./model";
import { trainerModules } from "./modules";

/** One completed encounter with each skill is the initial set; retries keep
 * their normal first-answer scoring. There is no new accuracy threshold. */
export function moduleSetComplete(topic: string, state?: TrainerState) {
  const module = trainerModules(topic).find((m) => m.id === state?.moduleId);
  if (!module || !state) return false;
  const completed = state.cursor + Number(state.submitted);
  const seen = new Set(
    Array.from(
      { length: Math.min(completed, 120) },
      (_, i) => sessionQuestion(topic, state, i).skill,
    ),
  );
  return module.skills.every((skill) => seen.has(skill));
}
export function modulesCovered(topic: string, p?: TopicProgress) {
  const modules = trainerModules(topic);
  return (
    !!modules.length &&
    modules.every((m) => moduleSetComplete(topic, p?.modulePractice?.[m.id]))
  );
}
/** Old mixed sessions remain untouched and are never assigned to a module. */
export function topicPractice(
  topic: string,
  p?: TopicProgress,
): TrainerState | undefined {
  const current = Object.values(p?.modulePractice ?? {});
  if (!current.length) return p?.trainer;
  const all = [p?.trainer, ...current].filter((s): s is TrainerState => !!s);
  const total = (key: "correct" | "incorrect" | "cursor") =>
    current.reduce((n, s) => n + s[key], 0);
  const completed = total("cursor") + current.filter((s) => s.submitted).length;
  const days = new Map<
    string,
    { date: string; correct: number; incorrect: number }
  >();
  for (const s of all)
    for (const day of s.daily) {
      const old = days.get(day.date) ?? {
        date: day.date,
        correct: 0,
        incorrect: 0,
      };
      days.set(day.date, {
        date: day.date,
        correct: old.correct + day.correct,
        incorrect: old.incorrect + day.incorrect,
      });
    }
  const summary = {
    ...newTrainer(0),
    correct: total("correct"),
    incorrect: total("incorrect"),
    cursor: completed,
    finished: current.every((s) => s.finished) && modulesCovered(topic, p),
    totalAnswered: all.reduce((n, s) => n + s.totalAnswered, 0),
    completedSessions: all.reduce((n, s) => n + s.completedSessions, 0),
    recent: all
      .flatMap((s) => s.recent)
      .sort((a, b) => a.at.localeCompare(b.at))
      .slice(-200),
    daily: [...days.values()]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-35),
  };
  return {
    ...summary,
    mastered:
      !!p?.trainer?.mastered ||
      !!p?.modulesMastered ||
      (summary.finished && qualifiesForCompletion(summary)),
  };
}
