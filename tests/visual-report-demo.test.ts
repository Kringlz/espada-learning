import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { upgradeReportDemo } from "../src/data/reportDemo";
import { upgradeVisualReportDemo } from "../src/data/visualReportDemo";
import { sixAreaTemplate } from "../src/data/reportPresets";
import { fixedId } from "../src/core/ids";
import { latestReportInsights } from "../src/core/reportInsights";
import { validateReport, validateReportTemplate } from "../src/core/reports";

test("six-area demo upgrade preserves saved history and is idempotent", () => {
  const old = upgradeReportDemo(createSeed());
  const snapshot = JSON.stringify(old);
  const state = upgradeVisualReportDemo(old);
  assert.equal(JSON.stringify(old), snapshot);
  assert.deepEqual(state.reports!.slice(0, old.reports!.length), old.reports);
  assert.equal(upgradeVisualReportDemo(state), state);
  validateReportTemplate(sixAreaTemplate, state.topics);
  const data = latestReportInsights(state, fixedId(1))!;
  assert.equal(data.measuredCount, 6);
  assert.equal(data.comparedCount, 6);
  assert.equal(data.report.demo, true);
  assert.equal(data.correct, 43);
  assert.equal(data.total, 60);
  assert.equal(data.repeat[0].id, "data");
  assert.equal(data.strongest[0].id, "algebra");
  validateReport(data.report, sixAreaTemplate);
  validateReport(data.earlier!, sixAreaTemplate);
});

test("demo upgrade never adds sample results over authored reports", () => {
  const state = upgradeReportDemo(createSeed());
  state.reports![0].demo = false;
  const reports = JSON.parse(JSON.stringify(state.reports));
  const upgraded = upgradeVisualReportDemo(state);
  assert.deepEqual(upgraded.reports, reports);
  assert.equal(upgraded.reportTemplates!.at(-1)!.areas.length, 6);
});
