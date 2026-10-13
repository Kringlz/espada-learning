import { State } from "../core/types";
import { course } from "../course/model";
import { quizQuestion } from "../course/quiz";
export type StudyRecord = {
  reads: Record<string, number[]>;
  answers: Record<string, number[]>;
  earned: string[];
  lastActivity: string | null;
  requests: Record<string, string>;
};
export type StudyLedger = Record<string, StudyRecord>;
export type GroupRow = {
  name: string;
  rank: number;
  xp: number;
  isCurrent: boolean;
  studentId?: string;
  completedLessons?: number;
  lastActivity?: string | null;
};
export type GroupSummary = {
  groupId: string;
  groupName: string;
  teacherView: boolean;
  rows: GroupRow[];
};
const empty = (): StudyRecord => ({
  reads: {},
  answers: {},
  earned: [],
  lastActivity: null,
  requests: {},
});
export function applyStudyAnswer(
  ledger: StudyLedger,
  actorId: string,
  topicId: string,
  question: number,
  choice: number,
  requestId: string,
  now: string,
) {
  const topic = course.find((t) => t.id === topicId);
  if (
    !topic ||
    !Number.isInteger(question) ||
    question < 1 ||
    question > topic.practice.count ||
    ![0, 1, 2].includes(choice)
  )
    throw Error("Неизвестное задание или ответ.");
  const prev = ledger[actorId] ?? empty(),
    fingerprint = JSON.stringify([topicId, question, choice]);
  if (prev.requests[requestId]) {
    if (prev.requests[requestId] !== fingerprint)
      throw Error("Повторный запрос содержит другой ответ.");
    return {
      ledger,
      result: {
        correct: choice === 0,
        awardedXp: 0,
        totalXp: prev.earned.length * 20,
        replayed: true,
      },
    };
  }
  const key = `${topicId}:${question}`;
  const correct = quizQuestion(topicId, String(question)).choices.some(
    (c) => c.id === choice && c.id === 0,
  );
  const awardedXp = correct && !prev.earned.includes(key) ? 20 : 0;
  const next = {
    ...prev,
    answers: {
      ...prev.answers,
      [topicId]: [...new Set([...(prev.answers[topicId] ?? []), question])],
    },
    earned: awardedXp ? [...prev.earned, key] : prev.earned,
    lastActivity: now,
    requests: { ...prev.requests, [requestId]: fingerprint },
  };
  return {
    ledger: { ...ledger, [actorId]: next },
    result: {
      correct,
      awardedXp,
      totalXp: next.earned.length * 20,
      replayed: false,
    },
  };
}
export function applyStudyRead(
  ledger: StudyLedger,
  actorId: string,
  topicId: string,
  page: number,
) {
  const topic = course.find((t) => t.id === topicId);
  if (
    !topic ||
    !Number.isInteger(page) ||
    page < 0 ||
    page >= topic.pages.length
  )
    throw Error("Неизвестный раздел.");
  const previous = ledger[actorId] ?? empty();
  return {
    ...ledger,
    [actorId]: {
      ...previous,
      reads: {
        ...previous.reads,
        [topicId]: [...new Set([...(previous.reads[topicId] ?? []), page])],
      },
    },
  };
}
export function groupSummary(
  state: State,
  actorId: string,
  groupId: string,
  ledger: StudyLedger,
): GroupSummary {
  const actor = state.profiles.find((p) => p.id === actorId && p.active),
    group = state.classes.find((g) => g.id === groupId);
  if (
    !actor ||
    !group ||
    !["student", "teacher", "admin"].includes(actor.role) ||
    !(
      actor.role === "admin" ||
      (actor.role === "teacher" ? group.teacherIds : group.studentIds).includes(
        actor.id,
      )
    )
  )
    throw Error("Нет доступа к группе.");
  const teacherView = actor.role !== "student";
  const members = state.profiles
    .filter(
      (p) =>
        p.active && p.role === "student" && group.studentIds.includes(p.id),
    )
    .map((p) => ({ profile: p, record: ledger[p.id] ?? empty() }))
    .sort(
      (a, b) =>
        b.record.earned.length - a.record.earned.length ||
        (a.profile.name.toLowerCase() < b.profile.name.toLowerCase()
          ? -1
          : a.profile.name.toLowerCase() > b.profile.name.toLowerCase()
            ? 1
            : a.profile.id.localeCompare(b.profile.id)),
    );
  let place = 0,
    lastXp = -1;
  const rows = members.map(({ profile, record }, index) => {
    const xp = record.earned.length * 20;
    if (xp !== lastXp) {
      place = index + 1;
      lastXp = xp;
    }
    return {
      name: profile.name,
      rank: xp ? place : 0,
      xp,
      isCurrent: actor.id === profile.id,
      ...(teacherView
        ? {
            studentId: profile.id,
            completedLessons: course.filter(
              (t) =>
                (record.reads[t.id]?.length ?? 0) === t.pages.length &&
                (record.answers[t.id]?.length ?? 0) === t.practice.count,
            ).length,
            lastActivity: record.lastActivity,
          }
        : {}),
    };
  });
  return { groupId, groupName: group.name, teacherView, rows };
}
