import { questionById } from "../course/trainer/bank";
import { practiceDay, sessionQuestion } from "../course/trainer/model";
import { course, CourseProgress } from "../course/model";
import { topicReferences } from "../course/trainer/topics";
import { trainerPreview } from "../course/trainer/preview";
import { renderMath } from "../math/render";

export type SpaceProgress = ReturnType<typeof makeSpaceProgress>;
const formulaCache = new Map<string, string>();
function formulaImage(latex: string) {
  if (!formulaCache.has(latex)) {
    const svg = renderMath(latex)?.svg.replace(/currentColor/g, "#c2e2d1");
    formulaCache.set(
      latex,
      svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "",
    );
  }
  return formulaCache.get(latex)!;
}
const dayKey = practiceDay;
export function makeSpaceProgress(progress: CourseProgress, now = new Date()) {
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 6 + i,
    );
    return {
      key: dayKey(date),
      label: date.toLocaleDateString("ru-RU", { weekday: "short" }),
      date: date.toLocaleDateString("ru-RU", { day: "numeric", month: "long" }),
      correct: 0,
      incorrect: 0,
    };
  });
  const topics = course.map((topic) => {
    const p = progress[topic.id],
      s = p?.trainer;
    // Old saves have no answer dates. Keep their latest counts, without inventing a daily history.
    const events = (s?.recent ?? []).filter(
      (event) => Date.parse(event.at) <= now.getTime(),
    );
    const recent = events.filter(
      (event) => Date.parse(event.at) >= now.getTime() - 14 * 86400000,
    );
    for (const entry of s?.daily ?? []) {
      const day = days.find((day) => day.key === entry.date);
      if (day) {
        day.correct += entry.correct;
        day.incorrect += entry.incorrect;
      }
    }
    const sample = s?.recent.length
      ? recent.length
      : (s?.correct ?? 0) + (s?.incorrect ?? 0);
    const errors = s?.recent.length
      ? recent.filter((event) => !event.correct).length
      : (s?.incorrect ?? 0);
    return {
      id: topic.id,
      title: topic.title,
      grade: topic.grade,
      interested: p?.interested === true,
      answered: s?.totalAnswered ?? 0,
      sample,
      errors,
      last: events.at(-1)?.at ?? (s?.totalAnswered ? (p?.updatedAt ?? "") : ""),
      sessions: s?.completedSessions ?? 0,
    };
  });
  const practiced = topics.filter((t) => t.answered > 0);
  const accuracySample = topics.reduce((sum, t) => sum + t.sample, 0);
  const mistakes = topics.reduce((sum, t) => sum + t.errors, 0);
  const weak = topics
    .filter((t) => t.errors > 0)
    .sort((a, b) => b.last.localeCompare(a.last) || b.errors - a.errors);
  const interests = topics.filter((t) => t.interested);
  const frequent = practiced
    .slice()
    .sort((a, b) => b.answered - a.answered || b.last.localeCompare(a.last))
    .slice(0, 3);
  const choices: { id: string; reason: string }[] = [];
  const add = (id: string, reason: string) => {
    if (!choices.some((x) => x.id === id)) choices.push({ id, reason });
  };
  weak
    .slice(0, interests.length ? 2 : 3)
    .forEach((t) => add(t.id, `Ошибки: ${t.errors} / ${t.sample}`));
  interests.forEach((t) => add(t.id, "Тебе интересно"));
  frequent.forEach((t) => add(t.id, "Часто выбираешь"));
  const recommendations = choices.slice(0, 3).map((choice) => {
    const topic = topics.find((t) => t.id === choice.id)!;
    const session = progress[topic.id]?.trainer;
    const lastError = session?.recent
      .filter(
        (event) =>
          !event.correct &&
          Date.parse(event.at) <= now.getTime() &&
          Date.parse(event.at) >= now.getTime() - 14 * 86400000,
      )
      .at(-1);
    let mistake = lastError
      ? questionById(topic.id, lastError.questionId)
      : undefined;
    if (!session?.recent.length && topic.errors && session) {
      const previous = Object.entries(session.answers)
        .sort(([a], [b]) => Number(b) - Number(a))
        .find(
          ([cursor, answer]) =>
            answer.rejected?.length ||
            sessionQuestion(topic.id, session, Number(cursor)).correct !==
              answer.choice,
        );
      if (previous)
        mistake = sessionQuestion(topic.id, session, Number(previous[0]));
    }
    const firstReference = topicReferences(topic.id)[0];
    return {
      ...choice,
      quickRecall: firstReference.rule || firstReference.conditions,
      review: mistake
        ? { prompt: mistake.prompt, solution: mistake.solution }
        : null,
      title: topic.title,
      formulaImage: trainerPreview(topic.id).formulaImage,
      references: topicReferences(topic.id)
        .slice(0, 3)
        .map((ref) => ({
          id: ref.id,
          title: ref.title,
          rule: ref.rule ?? "",
          conditions: ref.conditions,
          formulas: ref.formulas.map((f) => ({
            image: formulaImage(f.latex),
            spoken: f.spoken,
          })),
        })),
    };
  });
  return {
    totalAnswered: topics.reduce((sum, t) => sum + t.answered, 0),
    sessions: topics.reduce((sum, t) => sum + t.sessions, 0),
    practiced: practiced.length,
    totalTopics: course.length,
    accuracy: accuracySample
      ? Math.round(((accuracySample - mistakes) / accuracySample) * 100)
      : null,
    accuracySample,
    mistakes,
    days,
    topics,
    frequent,
    recommendations,
    recent: practiced
      .slice()
      .sort((a, b) => b.last.localeCompare(a.last))
      .slice(0, 5),
  };
}
