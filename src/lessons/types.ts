export type Difficulty = "easy" | "medium" | "hard";
export type SummaryBlock = {
  kind: "heading" | "paragraph" | "example" | "list";
  text: string;
};
export type LessonQuestion = {
  id: string;
  difficulty: Difficulty;
  type: "single" | "multiple";
  prompt: string;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation: string;
};
export type CourseContent = { id: string; title: string; order: number };
export type SectionContent = CourseContent & { courseId: string };
export type LessonContent = {
  id: string;
  sectionId: string;
  topicId: string;
  title: string;
  order: number;
  summary: SummaryBlock[];
  videoUrl: string | null;
  sources: { title: string; url?: string }[];
  demo: boolean;
  status?: "draft" | "published";
  test: { passScore: number };
  questions: LessonQuestion[];
};
export type LessonPackage = {
  schemaVersion: 1;
  courses: CourseContent[];
  sections: SectionContent[];
  lessons: LessonContent[];
};
export type PublicLesson = Omit<LessonContent, "questions"> & {
  status: "draft" | "published";
  revision: number;
  questionCounts: Record<Difficulty, number>;
  testReady: boolean;
};
export type LessonCatalog = {
  courses: CourseContent[];
  sections: SectionContent[];
  lessons: PublicLesson[];
};
export type AttemptQuestion = Omit<
  LessonQuestion,
  "correctOptionIds" | "explanation"
> & { ordinal: number; correctOptionIds?: string[]; explanation?: string };
export type LessonAttempt = {
  id: string;
  lessonId: string;
  status: "in_progress" | "submitted";
  revision: number;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  passScore: number;
  lesson: { title: string; revision: number; demo: boolean };
  questions: AttemptQuestion[];
  answers: { ordinal: number; optionIds: string[] }[];
};
export type AttemptSummary = Pick<
  LessonAttempt,
  | "id"
  | "lessonId"
  | "status"
  | "startedAt"
  | "submittedAt"
  | "score"
  | "passScore"
  | "lesson"
>;
export type ImportPreview = {
  courses: number;
  sections: number;
  lessons: number;
  questions: number;
  createdLessons: number;
  updatedLessons: number;
  dryRun: boolean;
};
