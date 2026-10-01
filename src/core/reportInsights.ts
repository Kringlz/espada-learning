import { State } from "./types";
import {
  orderedReportTemplate,
  percent,
  reportHistory,
  reportsFor,
} from "./reports";

/** Published teacher work only. Missing sections never become zero scores. */
export function latestReportInsights(state: State, studentId: string) {
  const report = reportsFor(state, studentId)[0];
  const stored = state.reportTemplates?.find(
    (t) => t.id === report?.templateId,
  );
  if (!report || !stored) return null;
  const template = orderedReportTemplate(state, stored);
  const history = reportHistory(state, report);
  const earlier = history[1];
  const areas = template.areas.map((area) => {
    const result = report.results.find((r) => r.areaId === area.id);
    const value = percent(result);
    const previous = percent(
      earlier?.results.find((r) => r.areaId === area.id),
    );
    return {
      ...area,
      result,
      value,
      previous,
      change: value === null || previous === null ? null : value - previous,
    };
  });
  const measured = areas.filter((a) => a.value !== null);
  const max = Math.max(...measured.map((a) => a.value!));
  const min = Math.min(...measured.map((a) => a.value!));
  const correct = measured.reduce((n, a) => n + a.result!.correct!, 0);
  const total = measured.reduce((n, a) => n + a.result!.total!, 0);
  return {
    report,
    template,
    earlier,
    areas,
    correct,
    total,
    measuredCount: measured.length,
    // Ties stay ties; a uniformly perfect result has no weak area.
    strongest: measured.filter((a) => a.value === max),
    repeat: measured.filter((a) => a.value === min && min < 100),
    uniform: measured.length > 1 && min === max,
    improved: measured.filter((a) => a.change !== null && a.change > 0),
    comparedCount: measured.filter((a) => a.change !== null).length,
  };
}
