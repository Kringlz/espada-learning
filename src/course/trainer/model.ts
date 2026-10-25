import { trainerQuestion, TRAINER_BANK_VERSION } from "./bank";

export function qualifiesForCompletion(
  state: Pick<TrainerState, "correct" | "incorrect"> &
    Partial<Pick<TrainerState, "cursor" | "submitted">>,
) {
  const answered = state.correct + state.incorrect;
  const completed =
    state.cursor === undefined
      ? answered
      : state.cursor + Number(state.submitted);
  return completed >= 15 && state.correct * 5 >= answered * 4;
}
export function sessionQuestion(
  topic: string,
  state: TrainerState,
  cursor = state.cursor,
) {
  const previous = state.previousBanks?.find(
    (bank) => cursor >= bank.from && cursor < bank.until,
  );
  return trainerQuestion(
    topic,
    state.seed,
    previous ? cursor - previous.from : cursor - state.legacyThrough,
    previous ? previous.version : TRAINER_BANK_VERSION,
  );
}
export type PracticeEvent = {
  questionId: string;
  correct: boolean;
  at: string;
};
export type PracticeDay = { date: string; correct: number; incorrect: number };
export function practiceDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function recordDay(
  days: PracticeDay[],
  at: string,
  correct: boolean,
): PracticeDay[] {
  const date = practiceDay(new Date(at));
  const previous = days.find((day) => day.date === date) ?? {
    date,
    correct: 0,
    incorrect: 0,
  };
  return [
    ...days.filter((day) => day.date !== date),
    {
      date,
      correct: previous.correct + Number(correct),
      incorrect: previous.incorrect + Number(!correct),
    },
  ]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-35);
}
export type TrainerState = {
  rejected: number[];
  mastered: boolean;
  legacyThrough: number;
  previousBanks: { from: number; until: number; version: 1 | 2 }[];
  daily: PracticeDay[];
  recent: PracticeEvent[];
  answers: Record<
    number,
    { choice: number; hints: number; rejected?: number[] }
  >;
  version: number;
  seed: number;
  cursor: number;
  correct: number;
  incorrect: number;
  choice: number | null;
  submitted: boolean;
  hints: number;
  finished: boolean;
  recorded: boolean;
  totalAnswered: number;
  completedSessions: number;
};
export function newTrainer(
  seed: number,
  previous?: TrainerState,
): TrainerState {
  return {
    rejected: [],
    mastered: previous?.mastered ?? false,
    legacyThrough: 0,
    previousBanks: [],
    daily: previous?.daily ?? [],
    recent: previous?.recent ?? [],
    answers: {},
    version: TRAINER_BANK_VERSION,
    seed: seed >>> 0,
    cursor: 0,
    correct: 0,
    incorrect: 0,
    choice: null,
    submitted: false,
    hints: 0,
    finished: false,
    recorded: false,
    totalAnswered: previous?.totalAnswered ?? 0,
    completedSessions: previous?.completedSessions ?? 0,
  };
}
export type TrainerAction =
  | { type: "select"; choice: number }
  | { type: "submit" }
  | { type: "next" }
  | { type: "hint" }
  | { type: "finish" }
  | { type: "continue" };
/** expectedCursor also prevents a rapid double click from advancing/skipping two questions. */
export function reduceTrainer(
  state: TrainerState,
  topic: string,
  action: TrainerAction,
  expectedCursor = state.cursor,
  at = new Date().toISOString(),
): TrainerState {
  if (state.cursor !== expectedCursor) return state;
  if (action.type === "continue") return { ...state, finished: false };
  if (state.finished) return state;
  const q = sessionQuestion(topic, state);
  if (action.type === "finish")
    return {
      ...state,
      finished: true,
      mastered: state.mastered || qualifiesForCompletion(state),
      completedSessions:
        state.completedSessions +
        (!state.recorded && state.correct + state.incorrect > 0 ? 1 : 0),
      recorded: state.recorded || state.correct + state.incorrect > 0,
    };
  if (action.type === "next")
    return state.submitted
      ? {
          ...state,
          cursor: state.cursor + 1,
          rejected: [],
          choice: null,
          submitted: false,
          hints: 0,
        }
      : state;
  if (state.submitted) return state;
  if (action.type === "select")
    return Number.isInteger(action.choice) &&
      action.choice >= 0 &&
      action.choice < q.choices.length &&
      !state.rejected.includes(action.choice)
      ? { ...state, choice: action.choice }
      : state;
  if (action.type === "hint")
    return { ...state, hints: Math.min(q.hints.length, state.hints + 1) };
  if (state.choice === null || state.rejected.includes(state.choice))
    return state;
  const correct = state.choice === q.correct;
  const first = state.rejected.length === 0;
  const rejected = correct ? state.rejected : [...state.rejected, state.choice];
  const resolved = correct || rejected.length >= q.choices.length - 1;
  return {
    ...state,
    rejected,
    answers: resolved
      ? {
          ...Object.fromEntries(
            Object.entries(state.answers).filter(
              ([index]) => Number(index) > state.cursor - 60,
            ),
          ),
          [state.cursor]: {
            choice: state.choice,
            hints: state.hints,
            ...(rejected.length ? { rejected } : {}),
          },
        }
      : state.answers,
    daily: first ? recordDay(state.daily, at, correct) : state.daily,
    recent: first
      ? [...state.recent.slice(-199), { questionId: q.id, correct, at }]
      : state.recent,
    submitted: resolved,
    correct: state.correct + Number(first && correct),
    incorrect: state.incorrect + Number(first && !correct),
    totalAnswered: state.totalAnswered + Number(first),
  };
}
export function parseTrainer(
  value: unknown,
  topic: string,
): TrainerState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const input = value as TrainerState;
  // Retain scores and the exact old questions for review; only upcoming tasks use the new bank.
  const cutoff =
    input.cursor + Number(input.submitted === true || !!input.rejected?.length);
  const previousBanks: TrainerState["previousBanks"] = [];
  if (input.version === 1 && cutoff > 0)
    previousBanks.push({ from: 0, until: cutoff, version: 1 });
  if (input.version === 2) {
    const oldThrough = input.legacyThrough ?? 0;
    if (
      !Number.isSafeInteger(oldThrough) ||
      oldThrough < 0 ||
      oldThrough > cutoff
    )
      return undefined;
    if (oldThrough > 0)
      previousBanks.push({ from: 0, until: oldThrough, version: 1 });
    if (cutoff > oldThrough)
      previousBanks.push({ from: oldThrough, until: cutoff, version: 2 });
  }
  const v =
    input.version === 1 || input.version === 2
      ? {
          ...input,
          version: TRAINER_BANK_VERSION,
          legacyThrough: cutoff,
          previousBanks,
          choice:
            input.submitted || input.rejected?.length ? input.choice : null,
        }
      : input;
  const integers = [
    v.seed,
    v.cursor,
    v.correct,
    v.incorrect,
    v.hints,
    v.totalAnswered,
    v.completedSessions,
  ];
  if (
    v.version !== TRAINER_BANK_VERSION ||
    !integers.every((n) => Number.isSafeInteger(n) && n >= 0) ||
    v.seed > 0xffffffff
  )
    return undefined;
  if (
    v.correct + v.incorrect !==
      v.cursor + Number(v.submitted === true || !!v.rejected?.length) ||
    v.totalAnswered < v.correct + v.incorrect
  )
    return undefined;
  const legacyThrough = v.legacyThrough ?? 0;
  if (
    !Number.isSafeInteger(legacyThrough) ||
    legacyThrough < 0 ||
    legacyThrough >
      v.cursor + Number(v.submitted === true || !!v.rejected?.length)
  )
    return undefined;
  const banks = v.previousBanks ?? [];
  if (!Array.isArray(banks)) return undefined;
  let through = 0;
  for (const bank of banks) {
    if (
      !bank ||
      (bank.version !== 1 && bank.version !== 2) ||
      bank.from !== through ||
      !Number.isSafeInteger(bank.until) ||
      bank.until <= bank.from ||
      bank.until > legacyThrough
    )
      return undefined;
    through = bank.until;
  }
  if (through !== legacyThrough) return undefined;
  const state = { ...v, legacyThrough, previousBanks: banks };
  const q = sessionQuestion(topic, state);
  const rejected = Array.isArray(v.rejected)
    ? [
        ...new Set(
          v.rejected.filter(
            (index) =>
              Number.isInteger(index) &&
              index >= 0 &&
              index < q.choices.length &&
              index !== q.correct,
          ),
        ),
      ]
    : [];
  if (
    v.rejected !== undefined &&
    (!Array.isArray(v.rejected) || rejected.length !== v.rejected.length)
  )
    return undefined;
  if (!v.submitted && rejected.length >= q.choices.length - 1) return undefined;
  const choice =
    Number.isInteger(v.choice) && v.choice! >= 0 && v.choice! < q.choices.length
      ? v.choice
      : null;
  if ((v.submitted || rejected.length > 0) && choice === null) return undefined;
  const answers: TrainerState["answers"] = {};
  if (v.answers && typeof v.answers === "object") {
    for (const [key, answer] of Object.entries(v.answers)) {
      const index = Number(key);
      if (
        !Number.isSafeInteger(index) ||
        index < Math.max(0, v.cursor - 60) ||
        index > v.cursor ||
        (index === v.cursor && !v.submitted)
      )
        continue;
      const task = sessionQuestion(topic, state, index);
      if (
        answer &&
        Number.isInteger(answer.choice) &&
        answer.choice >= 0 &&
        answer.choice < task.choices.length &&
        Number.isInteger(answer.hints) &&
        answer.hints >= 0
      )
        answers[index] = {
          choice: answer.choice,
          hints: Math.min(answer.hints, task.hints.length),
          ...(Array.isArray(answer.rejected) && answer.rejected.length
            ? {
                rejected: [
                  ...new Set(
                    answer.rejected.filter(
                      (i) =>
                        Number.isInteger(i) &&
                        i >= 0 &&
                        i < task.choices.length &&
                        i !== task.correct,
                    ),
                  ),
                ],
              }
            : {}),
        };
    }
  }
  if (v.submitted && choice !== null)
    answers[v.cursor] = {
      choice,
      hints: Math.min(v.hints, q.hints.length),
      ...(rejected.length
        ? { rejected }
        : answers[v.cursor]?.rejected
          ? { rejected: answers[v.cursor].rejected }
          : {}),
    };
  const recent = Array.isArray(v.recent)
    ? v.recent
        .filter(
          (event) =>
            event &&
            typeof event.questionId === "string" &&
            event.questionId.length < 200 &&
            typeof event.correct === "boolean" &&
            typeof event.at === "string" &&
            Number.isFinite(Date.parse(event.at)),
        )
        .slice(-200)
    : [];
  const daily = Array.isArray(v.daily)
    ? v.daily
        .filter(
          (day) =>
            day &&
            typeof day.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(day.date) &&
            Number.isSafeInteger(day.correct) &&
            day.correct >= 0 &&
            Number.isSafeInteger(day.incorrect) &&
            day.incorrect >= 0,
        )
        .filter(
          (day, index, all) =>
            all.findIndex((other) => other.date === day.date) === index,
        )
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-35)
        .map((day) => ({
          date: day.date,
          correct: day.correct,
          incorrect: day.incorrect,
        }))
    : recent.reduce(
        (days, event) => recordDay(days, event.at, event.correct),
        [] as PracticeDay[],
      );
  return {
    rejected,
    mastered:
      v.mastered === true || (v.finished === true && qualifiesForCompletion(v)),
    legacyThrough,
    previousBanks: banks,
    daily,
    recent,
    answers,
    version: v.version,
    seed: v.seed,
    cursor: v.cursor,
    correct: v.correct,
    incorrect: v.incorrect,
    hints: Math.min(v.hints, q.hints.length),
    choice,
    submitted: v.submitted === true,
    finished: v.finished === true,
    recorded: v.recorded === true,
    totalAnswered: v.totalAnswered,
    completedSessions: v.completedSessions,
  };
}
