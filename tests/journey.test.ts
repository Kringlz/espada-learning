import test from "node:test";
import assert from "node:assert/strict";
import { course, emptyProgress } from "../src/course/model";
import { lessonStatus, nextLesson } from "../src/course/journey";
const [first, second] = course;
const full = (topic = first) => ({
  ...emptyProgress(),
  updatedAt: "2026-10-14T01:00:00Z",
  readPages: topic.pages.map((_, i) => i),
  quiz: Object.fromEntries(
    Array.from({ length: topic.practice.count }, (_, i) => [
      String(i + 1),
      { selected: 0, hintsShown: 0, submitted: true },
    ]),
  ),
});
test("opening a lesson alone never completes it; reading and practice both required", () => {
  assert.equal(
    lessonStatus(first, {
      [first.id]: { ...emptyProgress(), updatedAt: "now" },
    }).complete,
    false,
  );
  assert.equal(
    lessonStatus(first, { [first.id]: { ...full(), quiz: {} } }).complete,
    false,
  );
  assert.equal(lessonStatus(first, { [first.id]: full() }).complete, true);
  assert.equal(lessonStatus(first, { [first.id]: full() }).percent, 100);
});
test("journey resumes latest unfinished lesson, then advances past completed lessons", () => {
  assert.equal(nextLesson([first, second], {})?.id, first.id);
  assert.equal(
    nextLesson([first, second], { [first.id]: full() })?.id,
    second.id,
  );
  assert.equal(
    nextLesson([first, second], {
      [first.id]: { ...emptyProgress(), updatedAt: "2026-10-12" },
      [second.id]: { ...emptyProgress(), updatedAt: "2026-10-13" },
    })?.id,
    second.id,
  );
  assert.equal(nextLesson([], {}), undefined);
});
test("duplicate and invalid read pages cannot inflate path progress", () => {
  const state = lessonStatus(first, {
    [first.id]: { ...emptyProgress(), readPages: [0, 0, -1, 99999] },
  });
  assert.equal(state.read, 1);
  assert.equal(state.complete, false);
  assert(state.percent <= 100);
});
