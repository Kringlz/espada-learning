import bank from "../../content/math-course/quiz.json";

type AuthoredQuestion = { choices: string[]; hints: string[] };
export type QuizAttempt = {
  selected: number | null;
  hintsShown: number;
  submitted: boolean;
};
export type QuizAttempts = Record<string, QuizAttempt>;
export const emptyAttempt = (): QuizAttempt => ({
  selected: null,
  hintsShown: 0,
  submitted: false,
});
export function quizQuestion(topic: string, number: string) {
  const authored = (bank as Record<string, AuthoredQuestion[]>)[topic]?.[
    Number(number) - 1
  ];
  if (!authored) throw new Error(`Missing quiz question: ${topic}/${number}`);
  // Stable ordering survives reloads; the correct option is not always first.
  const offset =
    [...`${topic}:${number}`].reduce((sum, c) => sum + c.charCodeAt(0), 0) % 3;
  return {
    hints: authored.hints,
    choices: authored.choices
      .map((text, id) => ({ id, text }))
      .sort((a, b) => ((a.id + offset) % 3) - ((b.id + offset) % 3)),
  };
}
export type QuizAction =
  { type: "select"; choice: number } | { type: "hint" } | { type: "submit" };
export function applyQuizAction(
  previous: QuizAttempt | undefined,
  action: QuizAction,
  hintCount: number,
): QuizAttempt {
  const current = previous ?? emptyAttempt();
  if (current.submitted) return current;
  if (action.type === "select")
    return [0, 1, 2].includes(action.choice)
      ? { ...current, selected: action.choice }
      : current;
  if (action.type === "hint")
    return {
      ...current,
      hintsShown: Math.min(hintCount, current.hintsShown + 1),
    };
  return current.selected === null ? current : { ...current, submitted: true };
}
export function quizStats(attempts: QuizAttempts = {}) {
  const checked = Object.values(attempts).filter((a) => a.submitted);
  return {
    answered: checked.length,
    independent: checked.filter((a) => a.selected === 0 && a.hintsShown === 0)
      .length,
    assisted: checked.filter((a) => a.selected === 0 && a.hintsShown > 0)
      .length,
    incorrect: checked.filter((a) => a.selected !== 0).length,
  };
}
export function parseQuizAttempts(
  value: unknown,
  topic: string,
  count: number,
): QuizAttempts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: QuizAttempts = {};
  for (let n = 1; n <= count; n++) {
    const a = (value as Record<string, any>)[String(n)];
    if (!a || typeof a !== "object") continue;
    const selected = [0, 1, 2].includes(a.selected)
      ? (a.selected as number)
      : null;
    result[String(n)] = {
      selected,
      hintsShown: Number.isInteger(a.hintsShown)
        ? Math.min(
            quizQuestion(topic, String(n)).hints.length,
            Math.max(0, a.hintsShown),
          )
        : 0,
      submitted: a.submitted === true && selected !== null,
    };
  }
  return result;
}
