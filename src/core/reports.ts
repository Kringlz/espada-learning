import {
  State,
  Topic,
  ReportTemplate,
  TeacherReport,
  AreaResult,
} from "./types";

export const percent = (r?: AreaResult) =>
  r?.correct == null || r.total == null
    ? null
    : Math.round((r.correct / r.total) * 100);
export function validateReportTemplate(t: ReportTemplate, topics: Topic[]) {
  if (
    !t.id ||
    !t.familyId ||
    !t.name.trim() ||
    !Number.isInteger(t.version) ||
    t.version < 1 ||
    !t.areas.length ||
    t.areas.length > 20
  )
    throw Error("Укажите название, версию и от 1 до 20 разделов.");
  if (
    ![t.scale.min, t.scale.max, t.scale.step].every(Number.isFinite) ||
    t.scale.min >= t.scale.max ||
    t.scale.step <= 0 ||
    t.scale.step > t.scale.max - t.scale.min
  )
    throw Error("Проверьте шкалу оценки: минимум, максимум и шаг.");
  if (new Set(t.areas.map((a) => a.id)).size !== t.areas.length)
    throw Error("Разделы должны иметь разные коды.");
  for (const a of t.areas) {
    if (
      !a.id ||
      !a.label.trim() ||
      !a.definition.trim() ||
      !a.topicIds.length ||
      new Set(a.topicIds).size !== a.topicIds.length ||
      a.topicIds.some((id) => !topics.some((t) => t.id === id)) ||
      !["area", "topic"].includes(a.scope)
    )
      throw Error(
        "Укажите название, содержание проверки и существующие темы для каждого раздела.",
      );
    if (
      a.scope === "topic" &&
      (a.topicIds.length !== 1 || !a.coverageConfirmed)
    )
      throw Error(
        "Проверка темы требует одной темы и подтверждения полного охвата.",
      );
  }
}
export function validateReport(
  r: TeacherReport,
  t: ReportTemplate,
  today = new Date().toISOString().slice(0, 10),
) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
    !Number.isFinite(Date.parse(r.date)) ||
    new Date(r.date).toISOString().slice(0, 10) !== r.date ||
    r.date > today
  )
    throw Error("Укажите настоящую дату работы, не позже сегодняшнего дня.");
  if (
    !Number.isFinite(r.grade) ||
    r.grade < t.scale.min ||
    r.grade > t.scale.max ||
    Math.abs(
      (r.grade - t.scale.min) / t.scale.step -
        Math.round((r.grade - t.scale.min) / t.scale.step),
    ) > 1e-8
  )
    throw Error("Оценка должна соответствовать шкале шаблона.");
  if (
    !["draft", "published"].includes(r.status) ||
    r.results.length !== t.areas.length ||
    new Set(r.results.map((a) => a.areaId)).size !== t.areas.length
  )
    throw Error("Заполните строку для каждого раздела.");
  for (const a of t.areas) {
    const row = r.results.find((x) => x.areaId === a.id);
    if (!row) throw Error("Не найден раздел работы.");
    if (row.correct === null && row.total === null) continue;
    if (
      !Number.isInteger(row.correct) ||
      !Number.isInteger(row.total) ||
      row.correct === null ||
      row.total === null ||
      row.correct < 0 ||
      row.total < 1 ||
      row.total > 10000 ||
      row.correct > row.total
    )
      throw Error(
        `${a.label}: укажите целые числа от 0 до количества вопросов или оставьте оба поля пустыми.`,
      );
  }
}
// Conservative compatibility: a new definition, label, scope, mapping or scale starts a separate history.
export function compatibleTemplates(a: ReportTemplate, b: ReportTemplate) {
  const signature = (t: ReportTemplate) =>
    JSON.stringify({
      scale: [t.scale.min, t.scale.max, t.scale.step],
      areas: t.areas
        .map((x) => ({
          id: x.id,
          label: x.label,
          definition: x.definition,
          scope: x.scope,
          coverageConfirmed: x.coverageConfirmed,
          topicIds: [...x.topicIds].sort(),
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    });
  return a.familyId === b.familyId && signature(a) === signature(b);
}
export function reportsFor(s: State, studentId: string) {
  return (s.reports ?? [])
    .filter((r) => r.studentId === studentId && r.status === "published")
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        (b.createdAt ?? b.updatedAt).localeCompare(
          a.createdAt ?? a.updatedAt,
        ) ||
        a.id.localeCompare(b.id),
    );
}
/** Use the earliest compatible version's order, even if a later template was reordered. */
export function orderedReportTemplate(
  s: State,
  template: ReportTemplate,
): ReportTemplate {
  const first =
    (s.reportTemplates ?? [])
      .filter((t) => compatibleTemplates(t, template))
      .sort((a, b) => a.version - b.version)[0] ?? template;
  return {
    ...template,
    areas: first.areas.map((a) => template.areas.find((x) => x.id === a.id)!),
  };
}
export function reportHistory(s: State, r: TeacherReport) {
  const t = s.reportTemplates?.find((t) => t.id === r.templateId);
  return t
    ? reportsFor(s, r.studentId).filter((x) => {
        const other = s.reportTemplates?.find((t) => t.id === x.templateId);
        return other && compatibleTemplates(t, other);
      })
    : [];
}
export type MasteryStatus =
  "Ещё не проверяли" | "Изучаю" | "Получается" | "Освоено";
// Initial product policy, not a validated measurement of mathematical ability.
export const masteryPolicy = {
  minQuestions: 3,
  proficientRatio: 0.75,
  masteredRatio: 0.85,
  confirmations: 2,
  spacingDays: 7,
};
export function topicMastery(
  s: State,
  studentId: string,
  topicId: string,
  policy = masteryPolicy,
) {
  const topic = s.topics.find((t) => t.id === topicId);
  const observations: {
    id: string;
    at: string;
    correct: number;
    total: number;
  }[] = [];
  const used = new Set<string>();
  for (const a of s.attempts
    .filter((a) => a.studentId === studentId && a.topicId === topicId)
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    let correct = 0,
      total = 0;
    for (const answer of a.answers) {
      const q = topic?.checks.find((q) => q.id === answer.questionId);
      if (!q || answer.assisted || used.has(q.id)) continue;
      used.add(q.id);
      total++;
      if (q.answer === answer.choice) correct++;
    }
    if (total) observations.push({ id: a.id, at: a.at, correct, total });
  }
  for (const r of reportsFor(s, studentId)) {
    const t = s.reportTemplates?.find((t) => t.id === r.templateId);
    // One observation per report and topic; overlapping area mappings cannot multiply evidence.
    const areas =
      t?.areas.filter(
        (a) =>
          a.scope === "topic" &&
          a.coverageConfirmed &&
          a.topicIds.length === 1 &&
          a.topicIds[0] === topicId,
      ) ?? [];
    const rows = areas
      .map((a) => r.results.find((x) => x.areaId === a.id))
      .filter(
        (x): x is AreaResult & { correct: number; total: number } =>
          x?.correct != null && x.total != null,
      );
    if (rows.length === 1)
      observations.push({
        id: r.id,
        at: r.date,
        correct: rows[0].correct,
        total: rows[0].total,
      });
  }
  observations.sort(
    (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
  );
  const qualified = observations.filter((o) => o.total >= policy.minQuestions);
  const latest = qualified.at(-1);
  const successful = qualified.filter(
    (o) => o.correct / o.total >= policy.masteredRatio,
  );
  const spaced = successful.reduce<typeof successful>(
    (out, o) =>
      !out.length ||
      Date.parse(o.at) - Date.parse(out.at(-1)!.at) >=
        policy.spacingDays * 86400000
        ? [...out, o]
        : out,
    [],
  );
  let status: MasteryStatus = "Ещё не проверяли";
  if (observations.length) status = "Изучаю";
  if (latest && latest.correct / latest.total >= policy.proficientRatio)
    status = "Получается";
  if (
    status === "Получается" &&
    latest &&
    latest.correct / latest.total >= policy.masteredRatio &&
    spaced.length >= policy.confirmations
  )
    status = "Освоено";
  return {
    status,
    observations,
    count: observations.reduce((sum, o) => sum + o.total, 0),
    visited: s.activities.some(
      (a) => a.studentId === studentId && a.topicId === topicId,
    ),
  };
}
export const hasMaterial = (t: Topic) =>
  Boolean(t.lesson.trim() || t.practice || t.videos?.length || t.video);
export type Suggestion = { topicId: string; reason: string };
export function reviewSuggestions(
  s: State,
  studentId: string,
  report?: TeacherReport,
): Suggestion[] {
  const out: Suggestion[] = [];
  const assigned = new Set(
    s.assignments
      .filter((a) => a.studentId === studentId && !a.completedAt)
      .map((a) => a.topicId),
  );
  const push = (id: string, reason: string) => {
    const t = s.topics.find((t) => t.id === id);
    if (
      t &&
      hasMaterial(t) &&
      !assigned.has(id) &&
      !out.some((x) => x.topicId === id) &&
      out.length < 3
    )
      out.push({ topicId: id, reason });
  };
  const latest = report ? [report] : reportsFor(s, studentId);
  const visitedAreas = new Set<string>();
  for (const r of latest) {
    const template = s.reportTemplates?.find((t) => t.id === r.templateId);
    if (!template) continue;
    for (const a of template.areas) {
      const key = `${template.familyId}:${a.id}`;
      if (visitedAreas.has(key)) continue;
      visitedAreas.add(key);
      const row = r.results.find((x) => x.areaId === a.id);
      const p = percent(row);
      if (p === null || p >= 75) continue;
      const earlier = reportHistory(s, r)
        .filter((x) => x.date < r.date)
        .find(
          (x) => percent(x.results.find((y) => y.areaId === a.id)) !== null,
        );
      const prev = earlier?.results.find((x) => x.areaId === a.id);
      const reason = `В разделе «${a.label}» правильно ${row!.correct} из ${row!.total}${prev ? `; в прошлой работе — ${prev.correct} из ${prev.total}` : ""}. Можно повторить связанную тему.`;
      const topics = a.topicIds
        .map((id) => s.topics.find((t) => t.id === id)!)
        .filter(Boolean)
        .sort(
          (a, b) =>
            (topicMastery(s, studentId, a.id).status === "Освоено" ? 1 : 0) -
            (topicMastery(s, studentId, b.id).status === "Освоено" ? 1 : 0),
        );
      for (const t of topics.slice(0, 3)) {
        const prerequisite = t.prerequisites.find(
          (id) =>
            topicMastery(s, studentId, id).status === "Ещё не проверяли" &&
            s.topics.some((t) => t.id === id && hasMaterial(t)),
        );
        if (prerequisite)
          push(
            prerequisite,
            `Можно начать с этой темы: она пригодится для «${t.title}», а результатов проверки пока нет.`,
          );
        push(t.id, reason);
      }
    }
    if (out.length >= 3) break;
  }
  if (!report)
    for (const t of s.topics.filter(hasMaterial)) {
      const m = topicMastery(s, studentId, t.id);
      if (m.status === "Изучаю")
        push(
          t.id,
          "По самостоятельной проверке этой темы стоит ещё потренироваться.",
        );
    }
  return out;
}
