import { validateReport, validateReportTemplate } from "./reports";
import { validateVideo } from "./video";
import {
  Assessment,
  State,
  Topic,
  Mark,
  Template,
  Command,
  Profile,
  Area,
} from "./types";
import { uid } from "./ids";
import { groupStudents, teachingGroups } from "./groups";
export const canAccess = (s: State, actor: Profile, studentId: string) =>
  actor.active &&
  (actor.role === "admin" ||
    (actor.role === "student" && actor.id === studentId) ||
    (actor.role === "parent" &&
      s.profiles.some(
        (p) => p.id === studentId && p.role === "student" && p.active,
      ) &&
      (s.parentLinks ?? []).some(
        (l) =>
          l.parentId === actor.id &&
          l.studentId === studentId &&
          Boolean(l.verifiedAt),
      )) ||
    (actor.role === "teacher" &&
      s.classes.some(
        (c) =>
          c.teacherIds.includes(actor.id) && c.studentIds.includes(studentId),
      )));
export function scopedState(s: State, actor: Profile): State {
  const ids = s.profiles
    .filter((p) => p.role === "student" && canAccess(s, actor, p.id))
    .map((p) => p.id);
  const staff = actor.role === "teacher" || actor.role === "admin";
  const visible = (x: { studentId: string }) => ids.includes(x.studentId);
  const classes = s.classes
    .filter(
      (c) =>
        actor.role === "admin" ||
        (actor.role === "teacher"
          ? c.teacherIds.includes(actor.id)
          : c.studentIds.some((id) => ids.includes(id))),
    )
    .map((c) =>
      staff
        ? c
        : { ...c, studentIds: c.studentIds.filter((id) => ids.includes(id)) },
    );
  const teacherIds =
    actor.role === "student" ? [] : classes.flatMap((c) => c.teacherIds);
  const links = (actor.role === "student" ? [] : (s.parentLinks ?? [])).filter(
    (l) =>
      actor.role === "admin" ||
      (actor.role === "parent" ? l.parentId === actor.id : visible(l)),
  );
  const parentIds = staff ? links.map((l) => l.parentId) : [];
  return {
    ...s,
    classes,
    parentLinks: links,
    teacherContacts: (s.teacherContacts ?? []).filter(
      (c) =>
        c.teacherId === actor.id ||
        teacherIds.includes(c.teacherId) ||
        actor.role === "admin",
    ),
    profiles: s.profiles.filter(
      (p) =>
        p.id === actor.id ||
        ids.includes(p.id) ||
        teacherIds.includes(p.id) ||
        parentIds.includes(p.id) ||
        actor.role === "admin",
    ),
    assessments: s.assessments.filter(
      (x) => visible(x) && (staff || x.status === "published"),
    ),
    reports: (s.reports ?? []).filter(
      (x) => visible(x) && (staff || x.status === "published"),
    ),
    reportReads: (s.reportReads ?? []).filter(visible),
    attempts: s.attempts.filter(visible),
    activities: s.activities.filter(visible),
    assignments: s.assignments.filter(visible),
    audit:
      actor.role === "admin"
        ? s.audit
        : actor.role === "teacher"
          ? s.audit.filter((a) =>
              [...s.assessments, ...(s.reports ?? [])].some(
                (r) => r.id === a.entityId && visible(r),
              ),
            )
          : [],
    deletionRequests:
      actor.role === "parent" ? [] : s.deletionRequests.filter(visible),
  };
}
export function validateTemplate(t: Template, topics: Topic[]) {
  if (
    !t.name.trim() ||
    !t.version.trim() ||
    !t.level.trim() ||
    !t.series.trim() ||
    t.questions.length < 1
  )
    throw Error(
      "Give the assessment a name, version, level, comparable series and at least one question.",
    );
  if (new Set(t.questions.map((q) => q.id)).size !== t.questions.length)
    throw Error("Question identifiers must be unique.");
  for (const q of t.questions)
    if (
      !Number.isFinite(q.max) ||
      q.max <= 0 ||
      q.max > 100 ||
      !topics.some((t) => t.id === q.topicId) ||
      !q.label.trim()
    )
      throw Error(
        "Each question needs a valid topic, label and maximum marks between 0 and 100.",
      );
}
export function validateMarks(t: Template, marks: Mark[], publish = false) {
  if (
    marks.length !== t.questions.length ||
    new Set(marks.map((m) => m.questionId)).size !== marks.length
  )
    throw Error("Record one marking status for every question.");
  for (const q of t.questions) {
    const m = marks.find((x) => x.questionId === q.id);
    if (!m) throw Error(`Нет задания: ${q.label}`);
    if (
      !["marked", "unanswered", "not_administered", "unmarked"].includes(
        m.status,
      )
    )
      throw Error("Unknown marking status.");
    if (
      m.status === "marked" &&
      (m.earned === null ||
        !Number.isFinite(m.earned) ||
        m.earned < 0 ||
        m.earned > q.max)
    )
      throw Error(`${q.label}: введите балл от 0 до ${q.max}.`);
    if (m.status === "unanswered" && m.earned !== 0)
      throw Error("An unanswered question must receive zero marks.");
    if (
      ["not_administered", "unmarked"].includes(m.status) &&
      m.earned !== null
    )
      throw Error("Missing or unmarked questions cannot have a score.");
    if (publish && m.status === "unmarked")
      throw Error(
        "Mark all administered questions before publishing. Save a draft to continue later.",
      );
  }
  if (
    publish &&
    !marks.some((m) => m.status === "marked" || m.status === "unanswered")
  )
    throw Error("At least one question must have a result.");
}
export function assessmentScore(s: State, a: Assessment, area?: Area) {
  const t = s.templates.find((t) => t.id === a.templateId)!;
  const qs = t.questions.filter(
    (q) => !area || s.topics.find((t) => t.id === q.topicId)?.area === area,
  );
  let earned = 0,
    max = 0,
    covered = 0;
  for (const q of qs) {
    const m = a.marks.find((m) => m.questionId === q.id);
    if (m && (m.status === "marked" || m.status === "unanswered")) {
      earned += m.earned ?? 0;
      max += q.max;
      covered++;
    }
  }
  return {
    earned,
    max,
    percent: max ? Math.round((earned / max) * 100) : null,
    covered,
    total: qs.length,
  };
}
export type Evidence = {
  key: string;
  value: number;
  weight: number;
  at: string;
  source: string;
};
export function topicEvidence(
  s: State,
  studentId: string,
  topicId: string,
  now = new Date(),
): Evidence[] {
  const rows: Evidence[] = [];
  const ageWeight = (at: string) =>
    Math.pow(
      0.5,
      Math.max(0, now.getTime() - new Date(at).getTime()) / 86400000 / 90,
    );
  for (const a of s.assessments.filter(
    (a) =>
      a.studentId === studentId &&
      a.status === "published" &&
      new Date(a.date) <= now,
  )) {
    const t = s.templates.find((t) => t.id === a.templateId)!;
    for (const q of t.questions.filter((q) => q.topicId === topicId)) {
      const m = a.marks.find((m) => m.questionId === q.id);
      if (m && (m.status === "marked" || m.status === "unanswered"))
        rows.push({
          key: `paper:${a.id}:${q.id}`,
          value: (m.earned ?? 0) / q.max,
          weight: 2 * ageWeight(a.date),
          at: a.date,
          source: `${t.name}, задание ${q.label} (версия ${a.revision})`,
        });
    }
  }
  const seen = new Set<string>();
  for (const a of [...s.attempts]
    .filter(
      (a) =>
        a.studentId === studentId &&
        a.topicId === topicId &&
        new Date(a.at) <= now,
    )
    .sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id))) {
    for (const answer of a.answers) {
      if (seen.has(answer.questionId)) continue;
      seen.add(answer.questionId);
      const q = s.topics
        .find((t) => t.id === topicId)
        ?.checks.find((q) => q.id === answer.questionId);
      if (q && !answer.assisted)
        rows.push({
          key: `check:${q.id}`,
          value: answer.choice === q.answer ? 1 : 0,
          weight: ageWeight(a.at),
          at: a.at,
          source: `Independent check · ${q.id}`,
        });
    }
  }
  return rows.filter(
    (r) => now.getTime() - new Date(r.at).getTime() <= 180 * 86400000,
  );
}
export function estimate(
  s: State,
  studentId: string,
  topicId: string,
  now = new Date(),
) {
  const evidence = topicEvidence(s, studentId, topicId, now);
  const sufficient = evidence.length >= 3;
  const raw = evidence.length
    ? evidence.reduce((sum, e) => sum + e.value * e.weight, 0) /
      evidence.reduce((sum, e) => sum + e.weight, 0)
    : null;
  const value = sufficient && raw !== null ? Math.round(raw * 20) * 5 : null;
  return {
    value,
    raw,
    count: evidence.length,
    label:
      value === null
        ? "More evidence needed"
        : value >= 80
          ? "Looking confident"
          : value >= 55
            ? "Building confidence"
            : "Developing",
    evidence,
    lastAt: evidence
      .map((e) => e.at)
      .sort()
      .at(-1),
  };
}
export function areaEstimate(
  s: State,
  id: string,
  area: Area,
  now = new Date(),
) {
  const es = s.topics
    .filter((t) => t.area === area)
    .map((t) => estimate(s, id, t.id, now));
  const known = es.filter((e) => e.value !== null);
  return {
    value: known.length
      ? Math.round(
          known.reduce((n, e) => n + (e.value ?? 0), 0) / known.length / 5,
        ) * 5
      : null,
    covered: known.length,
    total: es.length,
  };
}
export type Recommendation = {
  topicId: string;
  kind: "teacher" | "prerequisite" | "practice" | "check" | "review";
  reason: string;
  priority: number;
};
export function recommendations(
  s: State,
  id: string,
  now = new Date(),
): Recommendation[] {
  const results: Recommendation[] = [];
  const prerequisite = (t: Topic, trail: string[] = []): Topic | undefined => {
    if (trail.includes(t.id)) return;
    for (const p of t.prerequisites) {
      const pt = s.topics.find((t) => t.id === p);
      if (!pt) continue;
      const e = estimate(s, id, p, now);
      if (e.raw === null || e.raw < 0.55)
        return prerequisite(pt, [...trail, t.id]) ?? pt;
    }
  };
  for (const t of s.topics) {
    const e = estimate(s, id, t.id, now);
    const a = s.assignments
      .filter((a) => a.studentId === id && a.topicId === t.id && !a.completedAt)
      .sort(
        (a, b) =>
          Number(b.override) - Number(a.override) || b.at.localeCompare(a.at),
      )[0];
    const pre = prerequisite(t);
    if (a) {
      results.push({
        topicId: pre?.id ?? t.id,
        kind: pre ? "prerequisite" : "teacher",
        reason: pre
          ? `Начните с темы «${pre.title}», чтобы подготовиться к заданию «${t.title}». ${a.reason}`
          : `${a.override ? "Приоритет преподавателя" : "Задание преподавателя"}: ${a.reason}`,
        priority: a.override ? 110 : 100,
      });
      continue;
    }
    if (pre || !t.practice || t.checks.length < 3) continue;
    const recent = s.attempts.filter(
      (a) =>
        a.studentId === id &&
        a.topicId === t.id &&
        now.getTime() - new Date(a.at).getTime() < 86400000,
    ).length;
    const due =
      e.value !== null &&
      e.value >= 80 &&
      e.lastAt &&
      now.getTime() - new Date(e.lastAt).getTime() > 14 * 86400000;
    if (due)
      results.push({
        topicId: t.id,
        kind: "review",
        reason:
          "You showed confidence here. A short review will help you remember it.",
        priority: 60,
      });
    else if (e.raw !== null && e.raw < 0.65)
      results.push({
        topicId: t.id,
        kind: "practice",
        reason: `По последним ответам стоит повторить тему «${t.title}». ${s.topics.some((x) => x.prerequisites.includes(t.id)) ? "Она пригодится в следующих темах." : "Начните с разобранного примера."}`,
        priority: 80 - e.raw * 20 - recent * 45,
      });
    else if (e.value === null)
      results.push({
        topicId: t.id,
        kind: "check",
        reason:
          "We need a little more evidence here. Try a short check to find your starting point.",
        priority: 40 - recent * 25,
      });
  }
  const unique = new Map<string, Recommendation>();
  for (const r of results.sort(
    (a, b) => b.priority - a.priority || a.topicId.localeCompare(b.topicId),
  ))
    if (!unique.has(r.topicId)) unique.set(r.topicId, r);
  return [...unique.values()].slice(0, 3);
}
export function checkQuestions(s: State, id: string, topic: Topic) {
  const used = new Set(
    s.attempts
      .filter((a) => a.studentId === id && a.topicId === topic.id)
      .flatMap((a) => a.answers.map((q) => q.questionId)),
  );
  return [
    ...topic.checks.filter((q) => !used.has(q.id)),
    ...topic.checks.filter((q) => used.has(q.id)),
  ].slice(0, 3);
}
export function applyCommand(
  original: State,
  actorId: string,
  cmd: Command,
  now = new Date().toISOString(),
): State {
  const s: State = JSON.parse(JSON.stringify(original));
  const actor = s.profiles.find((p) => p.id === actorId && p.active);
  if (!actor) throw Error("Your session has expired. Sign in again.");
  const requireStaff = (studentId?: string) => {
    if (
      !["teacher", "admin"].includes(actor.role) ||
      (studentId && !canAccess(s, actor, studentId))
    )
      throw Error("You do not have access to this student.");
  };
  const requireAdmin = () => {
    if (actor.role !== "admin")
      throw Error("Only administrators can make this change.");
  };
  const requireOwn = (id: string) => {
    if (actor.role !== "student" || actor.id !== id)
      throw Error("You can only save your own learning work.");
  };
  const audit = (
    entityId: string,
    action: string,
    before: unknown,
    after: unknown,
    reason = "",
  ) =>
    s.audit.push({
      id: uid(),
      actorId,
      entityId,
      action,
      at: now,
      before,
      after,
      reason,
    });
  switch (cmd.type) {
    case "enrollStudent": {
      requireStaff();
      const group = s.classes.find((c) => c.id === cmd.classId);
      if (
        !group ||
        (actor.role !== "admin" && !group.teacherIds.includes(actor.id))
      )
        throw Error("Нет доступа к этой группе.");
      if (
        !s.profiles.some(
          (p) => p.id === cmd.studentId && p.role === "student" && p.active,
        )
      )
        throw Error("Код ученика не найден. Проверьте его в профиле ученика.");
      if (!group.studentIds.includes(cmd.studentId)) {
        group.studentIds.push(cmd.studentId);
        audit(group.id, "student.enrolled", null, { studentId: cmd.studentId });
      }
      break;
    }
    case "linkParent": {
      requireStaff(cmd.studentId);
      if (
        !s.profiles.some(
          (p) => p.id === cmd.studentId && p.role === "student" && p.active,
        ) ||
        !s.profiles.some(
          (p) => p.id === cmd.parentId && p.role === "parent" && p.active,
        )
      )
        throw Error("Проверьте коды действующих аккаунтов ученика и родителя.");
      const old = (s.parentLinks ?? []).find(
        (l) => l.parentId === cmd.parentId && l.studentId === cmd.studentId,
      );
      s.parentLinks = (s.parentLinks ?? []).filter((l) => l !== old);
      if (!cmd.remove)
        s.parentLinks.push({
          parentId: cmd.parentId,
          studentId: cmd.studentId,
          verifiedAt: now,
        });
      audit(
        cmd.studentId,
        cmd.remove ? "parent.unlinked" : "parent.linked",
        old ?? null,
        cmd.remove
          ? null
          : { parentId: cmd.parentId, studentId: cmd.studentId },
      );
      break;
    }
    case "saveTeacherContact": {
      requireStaff();
      const c = cmd.contact;
      if (actor.role !== "admin" && c.teacherId !== actor.id)
        throw Error("Можно изменить только свои контакты.");
      if (
        !s.profiles.some(
          (p) => p.id === c.teacherId && p.role === "teacher" && p.active,
        )
      )
        throw Error("Учитель не найден.");
      if (
        c.email.length > 160 ||
        (c.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email)) ||
        c.phone.length > 40 ||
        (c.phone && !/^[+\d() .-]{3,40}$/.test(c.phone)) ||
        c.hours.length > 200
      )
        throw Error("Проверьте email, телефон и время для связи.");
      s.teacherContacts = [
        ...(s.teacherContacts ?? []).filter((x) => x.teacherId !== c.teacherId),
        c,
      ];
      break;
    }
    case "saveReportTemplate": {
      requireStaff();
      validateReportTemplate(cmd.template, s.topics);
      const templates = (s.reportTemplates ??= []);
      const t = cmd.template;
      if (templates.some((x) => x.id === t.id))
        throw Error("Сохранённый шаблон неизменяем. Создайте новую версию.");
      const family = templates.filter((x) => x.familyId === t.familyId);
      if (
        t.version !==
        (family.length ? Math.max(...family.map((x) => x.version)) + 1 : 1)
      )
        throw Error("Версия шаблона изменилась. Обновите страницу.");
      templates.push(t);
      audit(t.id, "reportTemplate.created", null, t);
      break;
    }
    case "saveReport": {
      const r = cmd.report;
      requireStaff(r.studentId);
      if (
        !s.profiles.some(
          (p) => p.id === r.studentId && p.role === "student" && p.active,
        )
      )
        throw Error("Выберите действующего ученика.");
      const t = s.reportTemplates?.find((t) => t.id === r.templateId);
      if (!t) throw Error("Выберите шаблон работы.");
      validateReport(r, t, now.slice(0, 10));
      const reports = (s.reports ??= []);
      const old = reports.find((x) => x.id === r.id);
      if (cmd.expectedRevision !== (old?.revision ?? 0))
        throw Error("Запись уже изменена. Обновите страницу.");
      if (
        old &&
        (old.studentId !== r.studentId || old.templateId !== r.templateId)
      )
        throw Error("Ученик и шаблон сохранённой работы не меняются.");
      if (
        old?.status === "published" &&
        (!cmd.reason.trim() || r.status !== "published")
      )
        throw Error(
          "Для исправления опубликованного результата укажите причину.",
        );
      const next = {
        ...r,
        revision: (old?.revision ?? 0) + 1,
        authorId: actorId,
        updatedAt: now,
        createdAt: old?.createdAt ?? old?.updatedAt ?? now,
        demo: old?.demo,
      };
      s.reports = [...reports.filter((x) => x.id !== r.id), next];
      audit(r.id, "report.saved", old ?? null, next, cmd.reason);
      break;
    }
    case "readReport": {
      requireOwn(actorId);
      const r = s.reports?.find(
        (r) =>
          r.id === cmd.reportId &&
          r.studentId === actorId &&
          r.status === "published" &&
          r.revision === cmd.revision,
      );
      if (!r)
        throw Error("Результат изменился или недоступен. Обновите страницу.");
      s.reportReads = [
        ...(s.reportReads ?? []).filter(
          (x) => x.reportId !== r.id || x.studentId !== actorId,
        ),
        { studentId: actorId, reportId: r.id, revision: r.revision },
      ];
      break;
    }
    case "saveAssessment": {
      const a = cmd.assessment;
      requireStaff(a.studentId);
      const t = s.templates.find((t) => t.id === a.templateId);
      if (!t) throw Error("Choose a valid assessment template.");
      validateMarks(t, a.marks);
      if (
        !s.profiles.some(
          (p) => p.id === a.studentId && p.role === "student" && p.active,
        )
      )
        throw Error("Select an active student.");
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(a.date) ||
        !Number.isFinite(Date.parse(a.date)) ||
        a.date > now.slice(0, 10)
      )
        throw Error(
          "Choose a valid assessment date that is not in the future.",
        );
      const old = s.assessments.find((x) => x.id === a.id);
      if (
        old &&
        (old.status === "published" ||
          old.studentId !== a.studentId ||
          old.templateId !== a.templateId)
      )
        throw Error("Published assessments require an audited correction.");
      const row = {
        ...a,
        status: "draft" as const,
        revision: 0,
        authorId: actorId,
        updatedAt: now,
      };
      s.assessments = [...s.assessments.filter((x) => x.id !== a.id), row];
      break;
    }
    case "publishAssessment": {
      const a = s.assessments.find((a) => a.id === cmd.id);
      if (!a) throw Error("Assessment not found.");
      requireStaff(a.studentId);
      if (a.revision !== cmd.expectedRevision)
        throw Error("This record changed. Refresh before publishing again.");
      if (a.status === "published" && !cmd.reason.trim())
        throw Error("Explain why you are correcting this result.");
      const before = JSON.parse(JSON.stringify(a));
      const marks = cmd.marks ?? a.marks;
      validateMarks(
        s.templates.find((t) => t.id === a.templateId)!,
        marks,
        true,
      );
      a.marks = marks;
      a.status = "published";
      a.revision++;
      a.updatedAt = now;
      a.authorId = actorId;
      a.correctionReason = cmd.reason;
      audit(
        a.id,
        before.status === "published"
          ? "assessment.corrected"
          : "assessment.published",
        before,
        a,
        cmd.reason,
      );
      break;
    }
    case "submitAttempt": {
      const a = cmd.attempt;
      requireOwn(a.studentId);
      if (s.attempts.some((x) => x.id === a.id)) return s;
      const topic = s.topics.find((t) => t.id === a.topicId);
      if (
        !topic ||
        a.answers.length !== 3 ||
        new Set(a.answers.map((q) => q.questionId)).size !== 3
      )
        throw Error("Complete three different questions.");
      for (const answer of a.answers) {
        const q = topic.checks.find((q) => q.id === answer.questionId);
        if (
          !q ||
          !Number.isInteger(answer.choice) ||
          answer.choice < 0 ||
          answer.choice >= q.choices.length ||
          answer.assisted
        )
          throw Error(
            "Independent checks need three valid, unassisted answers.",
          );
      }
      s.attempts.push({ ...a, at: now });
      s.activities = s.activities.map((x) =>
        x.studentId === actor.id && x.topicId === a.topicId
          ? { ...x, stage: "complete", updatedAt: now }
          : x,
      );
      s.assignments = s.assignments.map((x) =>
        x.studentId === actor.id && x.topicId === a.topicId && !x.completedAt
          ? { ...x, completedAt: now }
          : x,
      );
      break;
    }
    case "saveVideoPosition": {
      requireOwn(cmd.studentId);
      if (
        !Number.isFinite(cmd.seconds) ||
        cmd.seconds < 0 ||
        cmd.seconds > 86400
      )
        throw Error("Некорректная позиция видео.");
      const topic = s.topics.find((t) => t.id === cmd.topicId);
      if (!topic?.videos?.some((v) => v.id === cmd.videoId))
        throw Error("Видеоурок не найден.");
      const activity = s.activities.find(
        (a) => a.studentId === actorId && a.topicId === cmd.topicId,
      );
      if (!activity) throw Error("Сначала откройте урок.");
      activity.videoPositions = {
        ...activity.videoPositions,
        [cmd.videoId]: cmd.seconds,
      };
      activity.updatedAt = now;
      break;
    }
    case "saveActivity": {
      const a = cmd.activity;
      requireOwn(a.studentId);
      if (!s.topics.some((t) => t.id === a.topicId))
        throw Error("Topic not found.");
      const existing = s.activities.find((x) => x.id === a.id);
      if (existing && existing.studentId !== actor.id)
        throw Error("Activity belongs to another student.");
      if (
        !["lesson", "practice", "check", "complete"].includes(a.stage) ||
        !Number.isFinite(a.videoSeconds) ||
        a.videoSeconds < 0
      )
        throw Error("Invalid activity.");
      s.activities = [
        ...s.activities.filter(
          (x) => !(x.studentId === a.studentId && x.topicId === a.topicId),
        ),
        {
          ...a,
          videoPositions: s.activities.find(
            (x) => x.studentId === a.studentId && x.topicId === a.topicId,
          )?.videoPositions,
          updatedAt: now,
        },
      ];
      break;
    }
    case "assignGroup": {
      const group = teachingGroups(s, actor).find((c) => c.id === cmd.classId);
      if (!group) throw Error("Эта группа недоступна. Выберите свою группу.");
      if (
        !cmd.id ||
        !cmd.reason.trim() ||
        typeof cmd.override !== "boolean" ||
        !s.topics.some((t) => t.id === cmd.topicId)
      )
        throw Error("Выберите тему и напишите задание для группы.");
      const previous = s.audit.find(
        (a) => a.entityId === cmd.id && a.action === "group.assigned",
      );
      if (previous) {
        const sent = previous.after as typeof cmd;
        if (
          previous.actorId !== actorId ||
          sent.classId !== cmd.classId ||
          sent.topicId !== cmd.topicId ||
          sent.reason !== cmd.reason.trim() ||
          sent.override !== cmd.override
        )
          throw Error("Это задание уже отправлено с другими данными.");
        return s;
      }
      const members = groupStudents(s, group.id);
      if (!members.length) throw Error("В группе нет активных учеников.");
      for (const member of members) {
        s.assignments.push({
          id: uid(),
          studentId: member.id,
          classId: group.id,
          className: group.name,
          groupAssignmentId: cmd.id,
          topicId: cmd.topicId,
          teacherId: actorId,
          reason: cmd.reason.trim(),
          override: cmd.override,
          at: now,
        });
      }
      audit(
        cmd.id,
        "group.assigned",
        null,
        { ...cmd, reason: cmd.reason.trim() },
        cmd.reason.trim(),
      );
      break;
    }
    case "assign": {
      const a = cmd.assignment;
      if (a.classId || a.className || a.groupAssignmentId)
        throw Error("Используйте выдачу задания группе.");
      requireStaff(a.studentId);
      if (
        !s.profiles.some(
          (p) => p.id === a.studentId && p.role === "student" && p.active,
        )
      )
        throw Error("Select an active student.");
      if (!a.reason.trim() || !s.topics.some((t) => t.id === a.topicId))
        throw Error("Choose a topic and explain the assignment.");
      if (s.assignments.some((x) => x.id === a.id))
        throw Error("Assignment already exists.");
      s.assignments.push({ ...a, teacherId: actorId, at: now });
      audit(a.id, "topic.assigned", null, a, a.reason);
      break;
    }
    case "saveTemplate": {
      requireStaff();
      validateTemplate(cmd.template, s.topics);
      if (s.assessments.some((a) => a.templateId === cmd.template.id))
        throw Error(
          "This template is in use. Create a new version to preserve past results.",
        );
      s.templates = [
        ...s.templates.filter((t) => t.id !== cmd.template.id),
        cmd.template,
      ];
      break;
    }
    case "attachVideo": {
      requireStaff();
      const topic = s.topics.find((t) => t.id === cmd.topicId);
      if (!topic) throw Error("Тема не найдена.");
      const v = cmd.video;
      validateVideo(v, actorId, topic.id);
      const existing = (topic.videos ?? []).find((x) => x.id === v.id);
      if (existing) {
        if (JSON.stringify(existing) !== JSON.stringify(v))
          throw Error("Этот видеоурок уже существует.");
        break;
      }
      topic.videos = [...(topic.videos ?? []), v];
      audit(topic.id, "video.added", null, v);
      break;
    }
    case "saveTopic": {
      requireAdmin();
      const t = cmd.topic;
      if (
        !t.title.trim() ||
        !t.lesson.trim() ||
        !t.objective.trim() ||
        !t.example.trim()
      )
        throw Error(
          "Title, objective, lesson and worked example are required.",
        );
      if (!s.topics.some((x) => x.id === t.id))
        throw Error("Use an existing topic.");
      const old = s.topics.find((x) => x.id === t.id)!;
      if (
        JSON.stringify(t.prerequisites) !== JSON.stringify(old.prerequisites) ||
        t.area !== old.area
      )
        throw Error("Curriculum graph changes require a reviewed migration.");
      if (
        s.attempts.some((a) => a.topicId === t.id) &&
        JSON.stringify(old.checks) !== JSON.stringify(t.checks)
      )
        throw Error(
          "Questions with attempts are immutable; version the question bank before changing it.",
        );
      for (const q of [...(t.practice ? [t.practice] : []), ...t.checks])
        if (
          !q.prompt.trim() ||
          q.choices.length !== 4 ||
          new Set(q.choices.map((c) => c.trim())).size !== 4 ||
          q.choices.some((c) => !c.trim()) ||
          q.answer < 0 ||
          q.answer > 3 ||
          !q.explanation.trim()
        )
          throw Error(
            "Questions need four different answers and an explanation.",
          );
      audit(t.id, "content.updated", old, t);
      s.topics = s.topics.map((x) =>
        x.id === t.id ? { ...t, videos: x.videos } : x,
      );
      break;
    }
    case "saveClass": {
      requireAdmin();
      const c = cmd.classroom;
      if (
        !c.name.trim() ||
        !c.teacherIds.every((id) =>
          s.profiles.some((p) => p.id === id && p.role === "teacher"),
        ) ||
        !c.studentIds.every((id) =>
          s.profiles.some((p) => p.id === id && p.role === "student"),
        )
      )
        throw Error("Choose a class name and valid members.");
      s.classes = [...s.classes.filter((x) => x.id !== c.id), c];
      break;
    }
    case "saveProfile": {
      requireAdmin();
      const p = cmd.profile;
      if (
        !p.name.trim() ||
        !["student", "parent", "teacher", "admin"].includes(p.role)
      )
        throw Error("Name and valid role required.");
      if (p.id === actorId && (!p.active || p.role !== "admin"))
        throw Error("You cannot remove your own administrator access.");
      const old = s.profiles.find((x) => x.id === p.id);
      if (old && old.role !== p.role)
        throw Error("Existing account roles cannot be changed here.");
      s.profiles = [...s.profiles.filter((x) => x.id !== p.id), p];
      audit(p.id, "account.updated", old, p);
      break;
    }
    case "requestDeletion": {
      requireOwn(actor.id);
      if (
        !s.deletionRequests.some(
          (r) => r.studentId === actor.id && r.status === "requested",
        )
      )
        s.deletionRequests.push({
          id: cmd.id,
          studentId: actor.id,
          at: now,
          status: "requested",
        });
      break;
    }
    case "eraseStudent": {
      requireAdmin();
      const id = cmd.studentId;
      if (
        !s.deletionRequests.some(
          (r) => r.studentId === id && r.status === "requested",
        )
      )
        throw Error("A student deletion request is required.");
      const entityIds = s.assessments
        .filter((a) => a.studentId === id)
        .map((a) => a.id);
      s.reports = (s.reports ?? []).filter(
        (x) => x.studentId !== cmd.studentId,
      );
      s.reportReads = (s.reportReads ?? []).filter(
        (x) => x.studentId !== cmd.studentId,
      );
      s.assessments = s.assessments.filter((a) => a.studentId !== id);
      s.attempts = s.attempts.filter((a) => a.studentId !== id);
      s.activities = s.activities.filter((a) => a.studentId !== id);
      s.assignments = s.assignments.filter((a) => a.studentId !== id);
      s.audit = s.audit.filter(
        (a) =>
          a.actorId !== id &&
          !entityIds.includes(a.entityId) &&
          !JSON.stringify(a).includes(id),
      );
      s.classes = s.classes.map((c) => ({
        ...c,
        studentIds: c.studentIds.filter((x) => x !== id),
      }));
      s.profiles = s.profiles.filter((p) => p.id !== id);
      s.parentLinks = (s.parentLinks ?? []).filter((l) => l.studentId !== id);
      s.deletionRequests = s.deletionRequests.filter((r) => r.studentId !== id);
      break;
    }
  }
  return s;
}

export function comparableAssessments(s: State, id: string, series?: string) {
  const all = s.assessments
    .filter((a) => a.studentId === id && a.status === "published")
    .sort((a, b) => a.date.localeCompare(b.date));
  const chosen =
    series ?? s.templates.find((t) => t.id === all.at(-1)?.templateId)?.series;
  const candidates = all.filter(
    (a) => s.templates.find((t) => t.id === a.templateId)?.series === chosen,
  );
  const signature = (a: Assessment) =>
    s.templates
      .find((t) => t.id === a.templateId)!
      .questions.filter((q) =>
        a.marks.some(
          (m) =>
            m.questionId === q.id &&
            (m.status === "marked" || m.status === "unanswered"),
        ),
      )
      .map((q) => `${q.id}:${q.topicId}:${q.max}`)
      .sort()
      .join("|");
  const last = candidates.at(-1);
  return last ? candidates.filter((a) => signature(a) === signature(last)) : [];
}
