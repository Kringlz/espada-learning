import test from "node:test";
import assert from "node:assert/strict";
import { summarizeRuns } from "../src/course/videoLesson/completion";
import {
  emptyLesson,
  newRun,
  updateLesson,
} from "../src/course/videoLesson/model";
import { makeSpaceData } from "../src/cosmos/model";
const at = "2026-10-25T00:00:00.000Z";

test("a new visit to a finished lesson creates a clean run without deleting history or viewing credit", () => {
  const original = {
    ...newRun("finished", at, "A05-02"),
    stage: "result" as const,
    finishedAt: at,
    initial: { choice: 1, at },
  };
  const d = { ...emptyLesson(), runs: [original] };
  d.video.position = 123;
  d.video.completed = true;
  const next = updateLesson(d, {
    type: "start",
    id: "replay",
    at,
    lessonId: "A05-02",
  });
  assert.equal(next.runs.length, 2);
  assert.deepEqual(next.runs[0], original);
  assert.equal(next.runs[1].stage, "intro");
  assert.deepEqual(next.runs[1].practice, {});
  assert.equal(next.runs[1].initial, undefined);
  assert.equal(next.video.position, 0);
  assert.equal(next.video.completed, true);
  assert.equal(
    updateLesson(next, {
      type: "start",
      id: "duplicate",
      at,
      lessonId: "A05-02",
    }),
    next,
  );
});
test("completed stars stay lit when replay begins and come from any finished attempt", () => {
  const first = {
    ...newRun("done", at, "A05-02"),
    stage: "result" as const,
    finishedAt: at,
  };
  const replay = newRun("replay", "2026-10-25T01:00:00.000Z", "A05-02");
  const summaries = summarizeRuns([first, replay]);
  assert.equal(summaries["A05-02"].complete, true);
  const map = makeSpaceData({}, summaries);
  assert.equal(map.lessons.find((s) => s.id === "A05-02")?.complete, true);
  assert.equal(map.lessons.find((s) => s.id === "A05-02")?.percent, 100);
  assert.equal(map.lessons.find((s) => s.id === "A05-01")?.complete, false);
  assert.notEqual(map.initialId, "A05-02");
});
test("local and server histories merge without losing completion or treating unfinished exercises as complete", () => {
  const local = summarizeRuns([
    { ...newRun("done", at, "A05-02"), stage: "result", finishedAt: at },
  ]);
  const merged = summarizeRuns(
    [newRun("pending", at, "A05-02"), newRun("other", at, "G08-02")],
    local,
  );
  assert.equal(merged["A05-02"].complete, true);
  assert.equal(merged["G08-02"].complete, false);
  assert.equal(local["G08-02"], undefined);
  assert.equal(
    makeSpaceData({}, merged).lessons.find((s) => s.id === "G08-02")?.started,
    true,
  );
});
