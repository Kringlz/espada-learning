import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { upgradeReportDemo } from "../src/data/reportDemo";
import { fixedId } from "../src/core/ids";
import { latestReportInsights } from "../src/core/reportInsights";
const student = fixedId(1);
const seed = () => upgradeReportDemo(createSeed());

test("insights use latest published teacher work for this student and compatible history", () => {
  const state = seed();
  const data = latestReportInsights(state, student)!;
  assert.equal(data.strongest[0].id, "algebra");
  assert.equal(data.repeat[0].id, "numbers");
  assert.equal(data.correct, 34);
  assert.equal(data.total, 40);
  assert.equal(data.improved.length, 4);
  state.reports!.push({
    ...data.report,
    id: "draft",
    date: "2099-01-01",
    status: "draft",
  });
  state.reports!.push({
    ...data.report,
    id: "another",
    studentId: "other",
    date: "2099-01-02",
  });
  assert.equal(latestReportInsights(state, student)!.report.id, data.report.id);
  assert.equal(latestReportInsights(state, "empty"), null);
  state.reportTemplates!.find(
    (t) => t.id === data.report.templateId,
  )!.familyId = "changed";
  // Also exclude all compatible predecessors to simulate the first result of a new test.
  state.reports = [data.report];
  assert.equal(latestReportInsights(state, student)!.earlier, undefined);
  assert.equal(latestReportInsights(state, student)!.comparedCount, 0);
});

test("missing sections, zero scores and equal scores are distinct; perfect work has no weak area", () => {
  const state = seed();
  const report = latestReportInsights(state, student)!.report;
  report.results[0].correct = 0;
  report.results[1].correct = report.results[1].total = null;
  let data = latestReportInsights(state, student)!;
  assert.equal(data.repeat[0].value, 0);
  assert.equal(data.total, 30);
  assert.equal(data.measuredCount, 3);
  assert.equal(data.comparedCount, 3);
  report.results.forEach((r) => {
    r.correct = 10;
    r.total = 10;
  });
  data = latestReportInsights(state, student)!;
  assert.equal(data.repeat.length, 0);
  assert.equal(data.uniform, true);
  assert.equal(data.strongest.length, 4);
  report.results.forEach((r) => {
    r.correct = r.total = null;
  });
  data = latestReportInsights(state, student)!;
  assert.equal(data.measuredCount, 0);
  assert.equal(data.strongest.length, 0);
  assert.equal(data.repeat.length, 0);
  assert.equal(data.total, 0);
});
