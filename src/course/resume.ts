import { QuizAttempts } from "./quiz";

/** Preserve authored question numbering and resume at the first unchecked answer. */
export function resumeQuestionIndex(
  questions: { number: string }[],
  attempts: QuizAttempts,
) {
  return Math.max(
    0,
    questions.findIndex((q) => !attempts[q.number]?.submitted),
  );
}
