import raw from "../../content/math-course/supplemental.json";

export type SupplementalExercise = {
  question: string;
  choices: string[];
  hints: string[];
  answer: string;
  source: { file: string; page: number; section: string; adaptation: string };
};

// Append-only: saved attempts and reward IDs use the original question numbers.
export const supplemental = raw as Record<string, SupplementalExercise[]>;
