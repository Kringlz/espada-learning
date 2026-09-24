import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { upgradeReportDemo } from "../src/data/reportDemo";
import { fixedId } from "../src/core/ids";
import { applyCommand, scopedState } from "../src/core/engine";
import {
  compatibleTemplates,
  orderedReportTemplate,
  validateReport,
  validateReportTemplate,
  percent,
  reportHistory,
  reportsFor,
  topicMastery,
  reviewSuggestions,
  hasMaterial,
} from "../src/core/reports";
import { State, TeacherReport, ReportTemplate } from "../src/core/types";
const student = fixedId(1),
  teacher = fixedId(3);
const seed = () => upgradeReportDemo(createSeed());
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
function topicTemplate(s: State): ReportTemplate {
  return {
    ...s.reportTemplates![0],
    id: fixedId(700),
    familyId: fixedId(700),
    version: 1,
    areas: [
      {
        id: "eq",
        label: "Равные дроби",
        definition: "Самостоятельная проверка всей темы",
        scope: "topic",
        coverageConfirmed: true,
        topicIds: ["equivalent"],
      },
    ],
  };
}
function result(
  t: ReportTemplate,
  id = 710,
  date = "2026-06-01",
  correct = 3,
  total = 3,
): TeacherReport {
  return {
    id: fixedId(id),
    studentId: student,
    templateId: t.id,
    date,
    grade: 4,
    results: t.areas.map((a) => ({ areaId: a.id, correct, total })),
    status: "published",
    revision: 0,
    authorId: teacher,
    updatedAt: date,
  };
}
test("counts preserve missing vs zero, exact percentages and valid bounds", () => {
  const s = seed(),
    t = s.reportTemplates![0],
    r = result(t);
  r.results[0] = { areaId: t.areas[0].id, correct: 0, total: 10 };
  r.results[1] = { areaId: t.areas[1].id, correct: null, total: null };
  validateReport(r, t);
  assert.equal(percent(r.results[0]), 0);
  assert.equal(percent(r.results[1]), null);
  assert.equal(percent({ areaId: "a", correct: 6, total: 10 }), 60);
  for (const row of [
    { correct: -1, total: 3 },
    { correct: 4, total: 3 },
    { correct: 1.5, total: 3 },
    { correct: 0, total: 0 },
    { correct: null, total: 3 },
    { correct: 2, total: null },
    { correct: NaN, total: 3 },
  ]) {
    const bad = clone(r);
    bad.results[0] = { areaId: t.areas[0].id, ...row };
    assert.throws(() => validateReport(bad, t));
  }
  const bad = clone(r);
  bad.date = "2026-02-30";
  assert.throws(() => validateReport(bad, t));
  bad.date = "2026-01-01";
  bad.grade = 4.5;
  assert.throws(() => validateReport(bad, t));
});
test("compatible versions have stable area histories; mapping, definitions and scales split histories", () => {
  const s = seed();
  const last = reportsFor(s, student)[0];
  assert.equal(reportHistory(s, last).length, 9);
  const t = s.reportTemplates![0],
    same = clone(t);
  same.id = "another";
  same.version = 9;
  same.areas.reverse();
  assert.ok(compatibleTemplates(t, same));
  for (const change of [
    (x: ReportTemplate) => (x.scale.max = 10),
    (x: ReportTemplate) => (x.areas[0].definition = "Другой охват"),
    (x: ReportTemplate) => (x.areas[0].topicIds = ["equations"]),
    (x: ReportTemplate) => (x.areas[0].id = "new"),
  ]) {
    const other = clone(t);
    change(other);
    assert.equal(compatibleTemplates(t, other), false);
  }
  const earlier = reportHistory(s, last).at(-1)!;
  assert.equal(percent(last.results[0])! - percent(earlier.results[0])!, 40);
  assert.equal(
    reportHistory(
      s,
      s.reports!.find((r) => r.templateId === fixedId(402))!,
    ).length,
    1,
  );
});
test("broad aggregate results including single mapped topics never grant topic mastery", () => {
  const s = seed();
  s.attempts = [];
  for (const t of s.topics)
    assert.equal(topicMastery(s, student, t.id).status, "Ещё не проверяли");
  s.reports!.forEach((r) =>
    r.results.forEach((row) => {
      row.correct = 10;
      row.total = 10;
    }),
  );
  assert.equal(
    topicMastery(s, student, "equations").status,
    "Ещё не проверяли",
  );
});
test("opening a topic and completing video is activity, not learning evidence", () => {
  const s = seed();
  s.attempts = [];
  s.activities.push({
    id: fixedId(999),
    studentId: student,
    topicId: "equivalent",
    stage: "complete",
    answers: {},
    questionIds: [],
    attemptId: fixedId(998),
    videoSeconds: 9999,
    videoPositions: { video: 9999 },
    updatedAt: "2026-06-01",
  });
  assert.equal(
    topicMastery(s, student, "equivalent").status,
    "Ещё не проверяли",
  );
  assert.equal(topicMastery(s, student, "equivalent").visited, true);
});
test("topic-specific evidence: minimum, repeated independent checks, spacing and later weak evidence", () => {
  let s = seed();
  s.attempts = [];
  const t = topicTemplate(s);
  s = applyCommand(s, teacher, { type: "saveReportTemplate", template: t });
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: result(t),
    expectedRevision: 0,
    reason: "",
  });
  assert.equal(topicMastery(s, student, "equivalent").status, "Получается");
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: result(t, 711, "2026-06-04"),
    expectedRevision: 0,
    reason: "",
  });
  assert.equal(topicMastery(s, student, "equivalent").status, "Получается");
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: result(t, 712, "2026-06-09"),
    expectedRevision: 0,
    reason: "",
  });
  assert.equal(topicMastery(s, student, "equivalent").status, "Освоено");
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: result(t, 713, "2026-06-10", 1),
    expectedRevision: 0,
    reason: "",
  });
  assert.equal(topicMastery(s, student, "equivalent").status, "Изучаю");
});
test("corrections replace one observation, keep audit, invalidate read receipt, reject stale writes", () => {
  let s = seed();
  s.attempts = [];
  const t = topicTemplate(s);
  s = applyCommand(s, teacher, { type: "saveReportTemplate", template: t });
  const r = result(t);
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: r,
    expectedRevision: 0,
    reason: "",
  });
  s = applyCommand(s, student, {
    type: "readReport",
    reportId: r.id,
    revision: 1,
  });
  const changed = { ...r, results: [{ areaId: "eq", correct: 0, total: 3 }] };
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: changed,
    expectedRevision: 1,
    reason: "Исправлена опечатка",
  });
  assert.equal(s.reports!.filter((x) => x.id === r.id).length, 1);
  assert.equal(topicMastery(s, student, "equivalent").count, 3);
  assert.equal(topicMastery(s, student, "equivalent").status, "Изучаю");
  assert.equal(s.reportReads!.find((x) => x.reportId === r.id)!.revision, 1);
  assert.equal(s.reports!.find((x) => x.id === r.id)!.revision, 2);
  assert.equal(s.audit.filter((x) => x.entityId === r.id).length, 2);
  assert.throws(() =>
    applyCommand(s, teacher, {
      type: "saveReport",
      report: changed,
      expectedRevision: 1,
      reason: "Устарело",
    }),
  );
  assert.throws(() =>
    applyCommand(s, teacher, {
      type: "saveReport",
      report: changed,
      expectedRevision: 2,
      reason: "",
    }),
  );
});
test("practice repeated questions and assisted answers cannot inflate mastery", () => {
  const s = seed();
  s.attempts = [];
  const t = s.topics.find((t) => t.id === "equivalent")!;
  const answers = t.checks
    .slice(0, 3)
    .map((q) => ({ questionId: q.id, choice: q.answer, assisted: false }));
  s.attempts.push(
    { id: "a", studentId: student, topicId: t.id, answers, at: "2026-06-01" },
    { id: "b", studentId: student, topicId: t.id, answers, at: "2026-06-10" },
  );
  assert.equal(topicMastery(s, student, t.id).count, 3);
  assert.equal(topicMastery(s, student, t.id).status, "Получается");
  s.attempts.push({
    id: "c",
    studentId: student,
    topicId: t.id,
    answers: t.checks
      .slice(3)
      .map((q) => ({ questionId: q.id, choice: q.answer, assisted: true })),
    at: "2026-06-11",
  });
  assert.equal(topicMastery(s, student, t.id).count, 3);
  s.attempts[2].answers.forEach((a) => (a.assisted = false));
  assert.equal(topicMastery(s, student, t.id).status, "Освоено");
});
test("template immutability, explicit topic coverage and overlapping areas are conservative", () => {
  let s = seed();
  const t = topicTemplate(s);
  t.areas[0].coverageConfirmed = false;
  assert.throws(() => validateReportTemplate(t, s.topics));
  t.areas[0].coverageConfirmed = true;
  t.areas[0].topicIds.push("equations");
  assert.throws(() => validateReportTemplate(t, s.topics));
  t.areas[0].topicIds = ["equivalent"];
  s = applyCommand(s, teacher, { type: "saveReportTemplate", template: t });
  assert.throws(() =>
    applyCommand(s, teacher, { type: "saveReportTemplate", template: t }),
  );
  const overlapping = {
    ...t,
    id: fixedId(701),
    version: 2,
    areas: [t.areas[0], { ...t.areas[0], id: "other" }],
  };
  s = applyCommand(s, teacher, {
    type: "saveReportTemplate",
    template: overlapping,
  });
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: result(overlapping),
    expectedRevision: 0,
    reason: "",
  });
  assert.equal(topicMastery(s, student, "equivalent").count, 0);
});
test("recommendations use aggregate counts/history, actual materials, unknown prerequisite wording and separate homework", () => {
  const s = seed();
  s.attempts = [];
  const suggestions = reviewSuggestions(s, student);
  assert.ok(suggestions.length > 0 && suggestions.length <= 3);
  for (const r of suggestions) {
    assert.ok(s.topics.some((t) => t.id === r.topicId && hasMaterial(t)));
    assert.ok(
      !s.assignments.some(
        (a) =>
          a.studentId === student && !a.completedAt && a.topicId === r.topicId,
      ),
    );
    assert.match(r.reason, /правильно|Можно начать/);
    assert.doesNotMatch(r.reason, /ошибк|не уме|слаб/);
  }
  s.topics.forEach((t) => {
    t.lesson = "";
    t.practice = undefined;
    t.video = undefined;
    t.videos = [];
  });
  assert.deepEqual(reviewSuggestions(s, student), []);
});
test("report access separates students, drafts, unassigned teachers and read receipts", () => {
  let s = seed();
  const t = s.reportTemplates![0];
  const r = { ...result(t), status: "draft" as const };
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: r,
    expectedRevision: 0,
    reason: "",
  });
  const own = scopedState(
    s,
    s.profiles.find((p) => p.id === student)!,
  );
  assert.ok(!own.reports!.some((x) => x.id === r.id));
  assert.deepEqual(
    scopedState(
      s,
      s.profiles.find((p) => p.id === fixedId(2))!,
    ).reports,
    [],
  );
  assert.throws(() =>
    applyCommand(s, student, {
      type: "saveReport",
      report: r,
      expectedRevision: 1,
      reason: "",
    }),
  );
  assert.throws(() =>
    applyCommand(s, fixedId(5), {
      type: "saveReport",
      report: r,
      expectedRevision: 1,
      reason: "",
    }),
  );
  assert.throws(() =>
    applyCommand(s, fixedId(2), {
      type: "readReport",
      reportId: s.reports![0].id,
      revision: 1,
    }),
  );
  assert.equal(own.topics.filter((t) => t.sectionId).length, 108);
});
test("demo upgrade is idempotent, preserves records and leaves real seeds free of report examples", () => {
  const base = createSeed();
  assert.equal(base.reports, undefined);
  const s = upgradeReportDemo(base);
  assert.equal(upgradeReportDemo(s), s);
  assert.deepEqual(s.assessments, base.assessments);
  assert.equal(s.reports!.length, 10);
  assert.ok(s.reports!.every((x) => x.demo));
});

test("compatible versions retain earliest axis order despite reordering and JSON key order", () => {
  const s = seed();
  const t = s.reportTemplates![0];
  const other = clone(t);
  other.id = fixedId(990);
  other.version = 4;
  other.areas.reverse();
  other.scale = { step: 1, max: 5, min: 1 };
  s.reportTemplates!.push(other);
  assert.ok(compatibleTemplates(t, other));
  assert.deepEqual(
    orderedReportTemplate(s, other).areas.map((a) => a.id),
    t.areas.map((a) => a.id),
  );
});
test("correction does not move a same-day report ahead of a later-added report", () => {
  let s = seed();
  const t = s.reportTemplates![0];
  const r = result(t, 900, "2026-07-01");
  s = applyCommand(
    s,
    teacher,
    { type: "saveReport", report: r, expectedRevision: 0, reason: "" },
    "2026-07-01T10:00:00Z",
  );
  s = applyCommand(
    s,
    teacher,
    {
      type: "saveReport",
      report: { ...r, id: fixedId(901) },
      expectedRevision: 0,
      reason: "",
    },
    "2026-07-01T11:00:00Z",
  );
  s = applyCommand(
    s,
    teacher,
    {
      type: "saveReport",
      report: r,
      expectedRevision: 1,
      reason: "Исправление",
    },
    "2026-07-01T12:00:00Z",
  );
  assert.deepEqual(
    reportsFor(s, student)
      .filter((x) => x.date === "2026-07-01")
      .map((x) => x.id),
    [fixedId(901), r.id],
  );
});
test("erasure removes new reports, receipts and report audit snapshots", () => {
  let s = seed();
  const r = s.reports![0];
  s = applyCommand(s, student, {
    type: "readReport",
    reportId: r.id,
    revision: 1,
  });
  s = applyCommand(s, teacher, {
    type: "saveReport",
    report: r,
    expectedRevision: 1,
    reason: "Уточнение",
  });
  s = applyCommand(s, student, { type: "requestDeletion", id: fixedId(997) });
  s = applyCommand(s, fixedId(4), { type: "eraseStudent", studentId: student });
  assert.ok(!s.reports!.some((r) => r.studentId === student));
  assert.ok(!s.reportReads!.some((r) => r.studentId === student));
  assert.ok(!JSON.stringify(s.audit).includes(student));
});
