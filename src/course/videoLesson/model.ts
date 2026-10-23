import { getLessonMeta, getLessonContent, Question } from "./content";
import { emptyWatch, WatchState } from "../../engagement/rewards";
export type Stage =
  "intro" | "video" | "practice" | "return" | "check" | "result";
export type Answer = { choice: number; at: string };
export type Run = {
  id: string;
  lessonId?: string;
  contentVersion?: number;
  startedAt: string;
  finishedAt?: string;
  stage: Stage;
  initial?: Answer;
  revisited?: Answer;
  practice: Record<string, Answer>;
  hints: Record<string, number>;
  drafts: Record<string, number>;
  check: Record<string, Answer>;
  practiceIndex: number;
  checkIndex: number;
};
export type VideoProgress = {
  position: number;
  duration: number;
  watch: WatchState;
  completed: boolean;
};
export type LessonData = {
  version: 1;
  runs: Run[];
  video: VideoProgress;
  videos?: Record<string, VideoProgress>;
  selectedVideo?: string;
};
export function videoProgress(
  data: LessonData,
  lessonId: string,
  videoId: string,
) {
  return (
    data.videos?.[videoId] ??
    (videoId === getLessonMeta(lessonId).videos[0].id
      ? data.video
      : emptyLesson().video)
  );
}
export const newRun = (id: string, at: string, lessonId = "G08-02"): Run => ({
  id,
  lessonId,
  contentVersion: getLessonMeta(lessonId).version,
  startedAt: at,
  stage: "intro",
  practice: {},
  hints: {},
  drafts: {},
  check: {},
  practiceIndex: 0,
  checkIndex: 0,
});
export const emptyLesson = (): LessonData => ({
  version: 1,
  runs: [],
  video: { position: 0, duration: 0, watch: emptyWatch(), completed: false },
});
export const lessonKey = (actor: string, lessonId = "G08-02") =>
  `espada.video-lesson.v1:${encodeURIComponent(actor)}:${lessonId}`;
export function result(run: Run) {
  const { check } = getLessonContent(run);
  const correct = check.filter(
    (q) => run.check[q.id]?.choice === q.correct,
  ).length;
  return {
    correct,
    total: check.length,
    percent: (correct / check.length) * 100,
    repeat: correct * 100 < check.length * 70,
    concepts: [
      ...new Set(
        check
          .filter((q) => run.check[q.id]?.choice !== q.correct)
          .map((q) => q.concept),
      ),
    ],
  };
}
export type Action =
  | { type: "start"; id: string; at: string; lessonId?: string }
  | { type: "choose"; id: string; choice: number }
  | { type: "submit"; at: string }
  | { type: "hint" }
  | { type: "next"; from: Stage; index: number }
  | { type: "practiceDone" }
  | { type: "practiceContinue"; index: number }
  | { type: "practiceIndex"; index: number }
  | { type: "checkIndex"; index: number }
  | { type: "checkContinue"; index: number }
  | { type: "finish"; at: string }
  | { type: "video"; progress: VideoProgress; id?: string }
  | { type: "selectVideo"; id: string };
export function currentQuestion(run: Run): Question | undefined {
  const { opening, practice, check } = getLessonContent(run);
  return run.stage === "intro" || run.stage === "return"
    ? opening
    : run.stage === "practice"
      ? practice[run.practiceIndex]
      : run.stage === "check"
        ? check[run.checkIndex]
        : undefined;
}
export function draftId(run: Run, question: Question) {
  return `${run.stage}:${question.id}`;
}
/** One meaning per label: check one answer, move forward, or finish the set. */
export function taskControl(run: Run) {
  const { practice, check } = getLessonContent(run);
  if (run.stage === "practice") {
    const q = practice[run.practiceIndex];
    const submitted = !!run.practice[q.id];
    const complete = practice.every((item) => run.practice[item.id]);
    return {
      label: complete ? "Завершить" : submitted ? "Далее" : "Проверить",
      disabled: !submitted && run.drafts[draftId(run, q)] === undefined,
      action: submitted ? ("practiceContinue" as const) : ("submit" as const),
    };
  }
  if (run.stage === "check") {
    const last = run.checkIndex === check.length - 1;
    return {
      label: last ? "Завершить" : "Далее",
      disabled: false,
      action: last ? ("finish" as const) : ("checkContinue" as const),
    };
  }
  return undefined;
}
export function updateLesson(data: LessonData, action: Action): LessonData {
  if (action.type === "video") {
    if (!action.id) return { ...data, video: action.progress };
    const meta = getLessonMeta(data.runs.at(-1)?.lessonId);
    if (!meta.videos.some((v) => v.id === action.id)) return data;
    return {
      ...data,
      video: action.id === meta.videos[0].id ? action.progress : data.video,
      videos: { ...data.videos, [action.id]: action.progress },
    };
  }
  if (action.type === "selectVideo") {
    if (
      !getLessonMeta(data.runs.at(-1)?.lessonId).videos.some(
        (v) => v.id === action.id,
      )
    )
      return data;
    return { ...data, selectedVideo: action.id };
  }
  const previous = data.runs.at(-1);
  if (action.type === "start") {
    if (
      previous &&
      (previous.lessonId ?? "G08-02") !== (action.lessonId ?? "G08-02")
    )
      return data;
    if (
      (previous && !previous.finishedAt) ||
      data.runs.some((r) => r.id === action.id)
    )
      return data;
    return {
      ...data,
      runs: [...data.runs, newRun(action.id, action.at, action.lessonId)],
    };
  }
  if (!previous || previous.finishedAt) return data;
  let run = { ...previous };
  const { practice, check } = getLessonContent(run);
  const question = currentQuestion(run);
  const submitted =
    run.stage === "intro"
      ? run.initial
      : run.stage === "return"
        ? run.revisited
        : run.stage === "practice" && question
          ? run.practice[question.id]
          : undefined;
  if (
    action.type === "choose" &&
    question &&
    question.id === action.id &&
    !submitted &&
    Number.isInteger(action.choice) &&
    action.choice >= 0 &&
    action.choice < question.choices.length
  ) {
    run.drafts = { ...run.drafts, [draftId(run, question)]: action.choice };
    if (run.stage === "check")
      run.check = {
        ...run.check,
        [question.id]: { choice: action.choice, at: new Date().toISOString() },
      };
  } else if (
    action.type === "submit" &&
    question &&
    !submitted &&
    run.stage !== "check"
  ) {
    const choice = run.drafts[draftId(run, question)];
    if (choice === undefined) return data;
    const answer = { choice, at: action.at };
    if (run.stage === "intro") run.initial = answer;
    if (run.stage === "return") run.revisited = answer;
    if (run.stage === "practice")
      run.practice = { ...run.practice, [question.id]: answer };
  } else if (
    action.type === "hint" &&
    run.stage === "practice" &&
    question &&
    !submitted
  ) {
    run.hints = {
      ...run.hints,
      [question.id]: Math.min(
        question.hints.length,
        (run.hints[question.id] ?? 0) + 1,
      ),
    };
  } else if (
    action.type === "next" &&
    action.from === run.stage &&
    action.index === run.practiceIndex
  ) {
    if (run.stage === "intro" && run.initial) run.stage = "video";
    else if (run.stage === "video") run.stage = "practice";
    else if (run.stage === "practice" && submitted) {
      if (run.practiceIndex < practice.length - 1) run.practiceIndex++;
      else if (practice.every((q) => run.practice[q.id])) run.stage = "return";
    } else if (run.stage === "return" && run.revisited) run.stage = "check";
  } else if (
    action.type === "practiceContinue" &&
    run.stage === "practice" &&
    action.index === run.practiceIndex &&
    submitted
  ) {
    if (practice.every((q) => run.practice[q.id])) run.stage = "return";
    else if (run.practiceIndex < practice.length - 1) run.practiceIndex++;
    else run.practiceIndex = practice.findIndex((q) => !run.practice[q.id]);
  } else if (
    action.type === "checkContinue" &&
    run.stage === "check" &&
    action.index === run.checkIndex &&
    run.checkIndex < check.length - 1
  ) {
    // Navigation never grades or submits the assessment, even without an answer.
    run.checkIndex++;
  } else if (
    action.type === "practiceDone" &&
    run.stage === "practice" &&
    practice.every((q) => run.practice[q.id])
  )
    run.stage = "return";
  else if (
    action.type === "practiceIndex" &&
    run.stage === "practice" &&
    Number.isInteger(action.index) &&
    action.index >= 0 &&
    action.index < practice.length
  )
    run.practiceIndex = action.index;
  else if (
    action.type === "checkIndex" &&
    run.stage === "check" &&
    Number.isInteger(action.index) &&
    action.index >= 0 &&
    action.index < check.length
  )
    run.checkIndex = action.index;
  else if (action.type === "finish" && run.stage === "check") {
    run.finishedAt = action.at;
    run.stage = "result";
  } else return data;
  return { ...data, runs: [...data.runs.slice(0, -1), run] };
}
/** Fail closed on corrupted/newer storage. Never silently replace saved attempts. */
export function parseLesson(
  raw: string | null,
  lessonId = "G08-02",
): LessonData {
  if (!raw) return emptyLesson();
  const d = JSON.parse(raw) as LessonData;
  const validAnswer = (a: Answer | undefined, q: Question) =>
    a === undefined ||
    (!!a &&
      Number.isInteger(a.choice) &&
      a.choice >= 0 &&
      a.choice < q.choices.length &&
      typeof a.at === "string");
  if (
    !d ||
    d.version !== 1 ||
    !Array.isArray(d.runs) ||
    !d.video ||
    ![d.video.position, d.video.duration].every(
      (n) => Number.isFinite(n) && n >= 0,
    ) ||
    typeof d.video.completed !== "boolean" ||
    !Array.isArray(d.video.watch?.ranges) ||
    !d.video.watch.ranges.every(
      (r) =>
        Array.isArray(r) &&
        r.length === 2 &&
        r.every((n) => Number.isFinite(n) && n >= 0) &&
        r[0] <= r[1],
    )
  )
    throw Error("Invalid lesson data");
  for (const r of d.runs) {
    if (!r || (r.lessonId ?? "G08-02") !== lessonId)
      throw Error("Invalid attempt lesson");
    const { opening, practice, check } = getLessonContent(r);
    if (
      !r ||
      typeof r.id !== "string" ||
      typeof r.startedAt !== "string" ||
      !["intro", "video", "practice", "return", "check", "result"].includes(
        r.stage,
      ) ||
      !r.practice ||
      !r.check ||
      !r.hints ||
      !r.drafts ||
      !Number.isInteger(r.practiceIndex) ||
      r.practiceIndex < 0 ||
      r.practiceIndex >= practice.length ||
      !Number.isInteger(r.checkIndex) ||
      r.checkIndex < 0 ||
      r.checkIndex >= check.length ||
      !validAnswer(r.initial, opening) ||
      !validAnswer(r.revisited, opening) ||
      !practice.every((q) => validAnswer(r.practice[q.id], q)) ||
      !check.every((q) => validAnswer(r.check[q.id], q))
    )
      throw Error("Invalid attempt");
  }
  // A new playback session must not count the gap since the previous visit.
  d.video.watch = {
    ...d.video.watch,
    clock: null,
    position: null,
    seconds: d.video.watch.ranges.reduce((n, r) => n + r[1] - r[0], 0),
  };
  const meta = getLessonMeta(lessonId);
  if (d.selectedVideo && !meta.videos.some((v) => v.id === d.selectedVideo))
    throw Error("Unknown video");
  if (d.videos) {
    if (typeof d.videos !== "object" || Array.isArray(d.videos))
      throw Error("Invalid videos");
    for (const [id, progress] of Object.entries(d.videos)) {
      if (!meta.videos.some((v) => v.id === id)) throw Error("Unknown video");
      // Reuse the same strict progress validation and clear the playback clock.
      d.videos[id] = parseLesson(
        JSON.stringify({ version: 1, runs: [], video: progress }),
        lessonId,
      ).video;
    }
  }
  return d;
}
