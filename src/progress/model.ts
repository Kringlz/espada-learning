import type { Run } from "../course/videoLesson/model";
export const APP_TIME_ZONE = "Asia/Bishkek";
export type Period = "week" | "month";
export type ProgressEvent = {
  id: string;
  at: string;
  topicId: string;
  kind: "video" | "practice" | "independent" | "initial" | "revisited";
  seconds: number;
  completed: number;
  correct: number;
};
export type SavedRun = {
  id: string;
  topicId: string;
  version: number;
  revision: number;
  run: Run;
  correct: number | null;
  total: number;
  questionIds: string[];
  archived: boolean;
};
export type ExternalWork = {
  id: string;
  studentId: string;
  date: string;
  title: string;
  subject: string;
  topics: string[];
  kind: string;
  score: number;
  maximum: number;
  minimum: number;
  scale: "points" | "grade";
  note: string;
  authorId: string;
  authorName: string;
  source: string;
  revision: number;
  updatedAt: string;
  attachment: string | null;
  deleted?: boolean;
};
export type Goal = {
  days: number | null;
  authorName: string;
  authorId: string;
  revision: number;
  updatedAt: string;
};
export type ProgressData = {
  observedSince: string | null;
  events: ProgressEvent[];
  runs: SavedRun[];
  works: ExternalWork[];
  goal: Goal | null;
  legacy: {
    id: string;
    title: string;
    at: string;
    correct: number;
    total: number;
    source: string;
  }[];
  audit: {
    entityId: string;
    at: string;
    actorName: string;
    before: unknown;
    after: unknown;
  }[];
};
export const emptyProgress = (): ProgressData => ({
  observedSince: null,
  events: [],
  runs: [],
  works: [],
  goal: null,
  legacy: [],
  audit: [],
});
export function dayKey(at: string | Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(at));
  return ["year", "month", "day"]
    .map((k) => parts.find((p) => p.type === k)!.value)
    .join("-");
}
const dayMillis = 86400000;
export function periodBounds(period: Period, now = new Date()) {
  const today = dayKey(now),
    current = new Date(today + "T00:00:00Z");
  const start = new Date(current);
  if (period === "week")
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  else start.setUTCDate(1);
  const previousStart = new Date(start);
  if (period === "week") previousStart.setUTCDate(start.getUTCDate() - 7);
  else previousStart.setUTCMonth(start.getUTCMonth() - 1);
  // Compare only complete days, never today's partial day with a full previous day.
  const elapsed = Math.floor((+current - +start) / dayMillis);
  const available = Math.floor((+start - +previousStart) / dayMillis);
  const equalDays = Math.min(elapsed, available);
  const key = (d: Date) => d.toISOString().slice(0, 10);
  return {
    start: key(start),
    end: today,
    comparisonEnd: key(new Date(+start + equalDays * dayMillis)),
    previousStart: key(previousStart),
    previousEnd: key(new Date(+previousStart + equalDays * dayMillis)),
    equalDays,
  };
}
export function activity(data: ProgressData, period: Period, now = new Date()) {
  const b = periodBounds(period, now);
  // Divide measured intervals at the application midnight; answers belong to submission day.
  const splitEvents = data.events.flatMap((e) => {
    const end = Date.parse(e.at),
      start = end - e.seconds * 1000;
    if (!e.seconds || dayKey(new Date(start)) === dayKey(e.at)) return [e];
    const midnight = Date.parse(`${dayKey(e.at)}T00:00:00+06:00`);
    const after = Math.max(0, Math.floor((end - midnight) / 1000));
    return [
      {
        ...e,
        id: e.id + ":previous-day",
        at: new Date(midnight - 1).toISOString(),
        seconds: e.seconds - after,
        completed: 0,
        correct: 0,
      },
      { ...e, seconds: after },
    ];
  });
  const between = (start: string, end: string, inclusive = false) =>
    splitEvents.filter(
      (e) =>
        dayKey(e.at) >= start &&
        (inclusive ? dayKey(e.at) <= end : dayKey(e.at) < end),
    );
  const meaningful = (es: ProgressEvent[]) => {
    const days = new Map<string, { seconds: number; answered: boolean }>();
    for (const e of es) {
      const key = dayKey(e.at),
        d = days.get(key) ?? { seconds: 0, answered: false };
      d.seconds += e.seconds;
      d.answered ||= e.completed > 0;
      days.set(key, d);
    }
    return [...days.entries()]
      .filter(([, d]) => d.answered || d.seconds >= 30)
      .map(([key]) => key);
  };
  const events = between(b.start, b.end, true),
    days = meaningful(events);
  const fullHistory =
    !!data.observedSince && dayKey(data.observedSince) < b.start;
  const compare =
    !!data.observedSince &&
    dayKey(data.observedSince) < b.previousStart &&
    b.equalDays > 0
      ? {
          current: meaningful(between(b.start, b.comparisonEnd)).length,
          previous: meaningful(between(b.previousStart, b.previousEnd)).length,
          days: b.equalDays,
        }
      : null;
  return {
    ...b,
    days,
    fullHistory,
    compare,
    seconds: events.reduce((n, e) => n + e.seconds, 0),
    videoSeconds: events
      .filter((e) => e.kind === "video")
      .reduce((n, e) => n + e.seconds, 0),
    completed: events
      .filter((e) => e.kind === "independent")
      .reduce((n, e) => n + e.completed, 0),
    correct: events
      .filter((e) => e.kind === "independent")
      .reduce((n, e) => n + e.correct, 0),
  };
}
export function topicSummary(runs: SavedRun[]) {
  const completed = runs
    .filter((r) => r.run.finishedAt && r.correct !== null)
    .sort((a, b) => b.run.finishedAt!.localeCompare(a.run.finishedAt!));
  return [...new Set(completed.map((r) => r.topicId))].map((topicId) => {
    const history = completed.filter((r) => r.topicId === topicId),
      last = history[0];
    const previous = history
      .slice(1)
      .find((r) => r.version === last.version && r.total === last.total);
    const overlap = previous
      ? last.questionIds.filter((id) => previous.questionIds.includes(id))
          .length
      : 0;
    const attention =
      !!previous &&
      last.correct! * 100 < last.total * 70 &&
      previous.correct! * 100 < previous.total * 70;
    return {
      topicId,
      last,
      previous,
      overlap,
      history,
      attention,
      status: attention
        ? "Стоит повторить"
        : last.correct! * 100 >= last.total * 70
          ? "Проверка пройдена · устойчивость ещё не подтверждена"
          : "Пока недостаточно данных",
    };
  });
}
export function validateWork(
  w: Pick<
    ExternalWork,
    | "date"
    | "title"
    | "subject"
    | "topics"
    | "kind"
    | "score"
    | "maximum"
    | "minimum"
    | "scale"
    | "note"
  >,
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(w.date) ||
    Number.isNaN(Date.parse(w.date)) ||
    new Date(w.date).toISOString().slice(0, 10) !== w.date ||
    w.date > dayKey(new Date())
  )
    throw Error("Укажите действительную дату работы, не позже сегодняшней.");
  if (
    !w.title.trim() ||
    !w.subject.trim() ||
    !w.kind.trim() ||
    !w.topics.length ||
    w.topics.some((t) => !t.trim())
  )
    throw Error("Укажите название, предмет, тип и хотя бы одну тему.");
  if (
    ![w.score, w.maximum, w.minimum].every(Number.isFinite) ||
    w.maximum <= 0 ||
    w.minimum < 0 ||
    w.minimum >= w.maximum ||
    w.score < w.minimum ||
    w.score > w.maximum ||
    (w.scale === "points" && w.minimum !== 0)
  )
    throw Error("Проверьте результат и границы шкалы.");
  if (w.title.length > 160 || w.note.length > 500 || w.topics.length > 12)
    throw Error("Сократите название, примечание или список тем.");
}
export function comparisonKey(w: ExternalWork) {
  return JSON.stringify([
    w.subject.trim().toLowerCase(),
    w.kind.trim().toLowerCase(),
    [...w.topics].sort(),
    w.scale,
    w.minimum,
    w.maximum,
  ]);
}
export function validateAttachment(type: string, size: number) {
  if (!["image/jpeg", "image/png", "application/pdf"].includes(type))
    throw Error("Выберите JPG, PNG или PDF.");
  if (size <= 0 || size > 10 * 1024 * 1024)
    throw Error("Размер файла должен быть от 1 байта до 10 МБ.");
}
export function activeSeconds(
  previous: number | null,
  now: number,
  visible: boolean,
) {
  const elapsed = previous === null ? 0 : (now - previous) / 1000;
  return visible && elapsed > 0 && elapsed <= 60 ? Math.floor(elapsed) : 0;
}
