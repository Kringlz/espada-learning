import { State, ReportTemplate, TeacherReport } from "../core/types";
import { fixedId } from "../core/ids";
/** Called only by the local demo repository, never by the connected backend. */
export function upgradeReportDemo(state: State): State {
  if (state.reportDemoVersion) return state;
  const s: State = JSON.parse(JSON.stringify(state));
  s.reportTemplates ??= [];
  s.reports ??= [];
  s.reportReads ??= [];
  s.reportDemoVersion = 1;
  if (!s.profiles.some((p) => p.id === fixedId(1) && p.role === "student"))
    return s;
  const t: ReportTemplate = {
    id: fixedId(400),
    familyId: fixedId(400),
    name: "Математика · проверочная работа",
    version: 1,
    scale: { min: 1, max: 5, step: 1 },
    areas: [
      {
        id: "numbers",
        label: "Числа и вычисления",
        definition: "Разрядный состав и арифметические действия",
        topicIds: ["place-value", "operations"],
        scope: "area",
        coverageConfirmed: false,
      },
      {
        id: "fractions",
        label: "Дроби и отношения",
        definition: "Равные дроби, сложение дробей и отношения",
        topicIds: ["equivalent", "add-fractions", "ratios"],
        scope: "area",
        coverageConfirmed: false,
      },
      {
        id: "geometry",
        label: "Геометрия",
        definition: "Углы и периметр",
        topicIds: ["angles", "perimeter"],
        scope: "area",
        coverageConfirmed: false,
      },
      {
        id: "algebra",
        label: "Уравнения",
        definition: "Решение уравнений",
        topicIds: ["equations"],
        scope: "area",
        coverageConfirmed: false,
      },
    ],
  };
  s.reportTemplates.push(
    t,
    { ...t, id: fixedId(401), version: 2 },
    { ...t, id: fixedId(402), version: 3, scale: { min: 0, max: 10, step: 1 } },
  );
  const today = new Date();
  for (let i = 0; i < 9; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - (8 - i) * 14 - 2);
    const r: TeacherReport = {
      id: fixedId(410 + i),
      studentId: fixedId(1),
      templateId: i < 5 ? t.id : fixedId(401),
      date: d.toISOString().slice(0, 10),
      grade: i < 4 ? 3 : 4,
      status: "published",
      revision: 1,
      authorId: fixedId(3),
      updatedAt: d.toISOString(),
      demo: true,
      results: t.areas.map((a, j) => ({
        areaId: a.id,
        correct:
          i === 3 && j === 2 ? null : Math.min(10, 3 + Math.floor(i / 2) + j),
        total: i === 3 && j === 2 ? null : 10,
      })),
    };
    s.reports.push(r);
  }
  // Isolated changed-scale version with only one measured area; other rows are explicitly missing.
  const d = new Date(today);
  d.setUTCDate(d.getUTCDate() - 60);
  s.reports.push({
    id: fixedId(430),
    studentId: fixedId(1),
    templateId: fixedId(402),
    date: d.toISOString().slice(0, 10),
    grade: 6,
    status: "published",
    revision: 1,
    authorId: fixedId(3),
    updatedAt: d.toISOString(),
    demo: true,
    results: t.areas.map((a, i) => ({
      areaId: a.id,
      correct: i === 0 ? 0 : null,
      total: i === 0 ? 5 : null,
    })),
  });
  return s;
}
