import { translate } from "../i18n";
import { State, Assessment, Mark } from "../core/types";
import { curriculum, originalCurriculum } from "./curriculum";
import { fixedId as id } from "../core/ids";
export const demoStudentId = id(1);
export function createSeed(now = new Date()): State {
  const date = (days: number) =>
    new Date(now.getTime() - days * 86400000).toISOString().slice(0, 10);
  const questions = originalCurriculum.flatMap((t, i) =>
    [0, 1, 2].map((j) => ({
      id: `paper-${t.id}-${j}`,
      label: `${i * 3 + j + 1}`,
      max: 2,
      topicId: t.id,
      rubric:
        "2: correct method and answer. 1: valid method with an arithmetic slip. 0: no demonstrated method.",
    })),
  );
  const baseline = [
    0.67, 0.67, 0.17, 0.17, 0.33, 0.5, 0.33, 0.67, 0.5, 0.67, 0.5, 0.17,
  ];
  const latest = [
    1, 1, 0.33, 0.33, 0.5, 0.83, 0.67, 0.83, 0.67, 0.83, 0.83, 0.5,
  ];
  const marks = (values: number[]): Mark[] =>
    questions.map((q, i) => ({
      questionId: q.id,
      status: "marked",
      earned: Math.min(
        2,
        Math.max(0, Math.round(values[Math.floor(i / 3)] * 6) - (i % 3) * 2),
      ),
    }));
  const assessment = (
    n: number,
    days: number,
    values: number[],
  ): Assessment => ({
    id: id(n),
    studentId: id(1),
    templateId: id(10),
    date: date(days),
    marks: marks(values),
    status: "published",
    revision: 1,
    updatedAt: date(days) + "T10:00:00.000Z",
    authorId: id(3),
  });
  const seed: State = {
    schemaVersion: 1,
    curriculumVersion: 2,
    profiles: [
      { id: id(1), name: "Alex Morgan", role: "student", active: true },
      { id: id(2), name: "Sam Rivera", role: "student", active: true },
      { id: id(3), name: "Jamie Chen", role: "teacher", active: true },
      { id: id(4), name: "Taylor Reed", role: "admin", active: true },
      { id: id(5), name: "Robin Ellis", role: "teacher", active: true },
    ],
    classes: [
      {
        id: id(6),
        name: "Maths foundations · Group A",
        teacherIds: [id(3)],
        studentIds: [id(1), id(2)],
      },
      {
        id: id(7),
        name: "Maths foundations · Group B",
        teacherIds: [id(5)],
        studentIds: [],
      },
    ],
    topics: curriculum,
    templates: [
      {
        id: id(10),
        name: "Foundations check-in",
        version: "A · 2026",
        level: "Maths foundations",
        series: "foundations-a",
        questions,
      },
    ],
    assessments: [assessment(20, 42, baseline), assessment(21, 7, latest)],
    attempts: [],
    activities: [],
    assignments: [
      {
        id: id(30),
        studentId: id(1),
        topicId: "equivalent",
        teacherId: id(3),
        reason:
          "Let’s build a strong foundation for adding fractions. Start with equal parts, then try the short check.",
        override: true,
        at: date(2) + "T10:00:00.000Z",
      },
    ],
    audit: [],
    deletionRequests: [],
  };
  seed.profiles.forEach((p) => (p.name = translate(p.name)));
  seed.classes.forEach((c) => (c.name = translate(c.name)));
  seed.templates.forEach((t) => {
    t.name = translate(t.name);
    t.level = translate(t.level);
    t.questions.forEach((q) => (q.rubric = translate(q.rubric)));
  });
  seed.assignments.forEach((a) => (a.reason = translate(a.reason)));
  return seed;
}
