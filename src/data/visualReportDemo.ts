import { fixedId } from "../core/ids";
import { State } from "../core/types";
import { sixAreaTemplate } from "./reportPresets";

/** Local demo only. Preserve past reports and never cover up authored results. */
export function upgradeVisualReportDemo(state: State): State {
  if ((state.reportDemoVersion ?? 0) >= 2) return state;
  const s: State = JSON.parse(JSON.stringify(state));
  s.reportDemoVersion = 2;
  if (!s.profiles.some((p) => p.id === fixedId(1) && p.role === "student"))
    return s;
  s.reportTemplates ??= [];
  s.reports ??= [];
  if (s.reportTemplates.some((t) => t.id === sixAreaTemplate.id)) return s;
  s.reportTemplates.push(JSON.parse(JSON.stringify(sixAreaTemplate)));
  if (
    s.reports.some(
      (r) => r.studentId === fixedId(1) && (!r.demo || r.revision > 1),
    )
  )
    return s;
  const scores = [
    [5, 4, 5, 7, 6, 4],
    [8, 6, 7, 9, 8, 5],
  ];
  scores.forEach((score, index) => {
    const date = new Date();
    date.setUTCDate(date.getUTCDate() - (index === 0 ? 15 : 1));
    const id = fixedId(441 + index);
    if (s.reports!.some((r) => r.id === id)) return;
    s.reports!.push({
      id,
      studentId: fixedId(1),
      templateId: sixAreaTemplate.id,
      date: date.toISOString().slice(0, 10),
      grade: index === 0 ? 3 : 4,
      status: "published",
      revision: 1,
      authorId: fixedId(3),
      updatedAt: date.toISOString(),
      demo: true,
      results: sixAreaTemplate.areas.map((area, i) => ({
        areaId: area.id,
        correct: score[i],
        total: 10,
      })),
    });
  });
  return s;
}
