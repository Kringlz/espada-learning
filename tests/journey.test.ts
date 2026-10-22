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

// Constellation browsing must remain bounded and must not mutate learning records.
import {
  adjacentStar,
  constellations,
  starIdentity,
  starPosition,
} from "../src/course/constellation";
test("constellation navigation stops at both ends and handles empty results", () => {
  assert.equal(adjacentStar(0, -1, 6), 0);
  assert.equal(adjacentStar(5, 1, 6), 5);
  assert.equal(adjacentStar(2, 1, 6), 3);
  assert.equal(adjacentStar(0, 1, 0), 0);
});
test("every lesson has a stable star identity and every grade has a constellation", () => {
  const identities = course.map((t) => starIdentity(t.id).seed);
  assert.equal(new Set(identities).size, course.length);
  for (const topic of course) {
    assert.ok(constellations[topic.grade]);
    assert.deepEqual(starIdentity(topic.id), starIdentity(topic.id));
    const p = starPosition(course.indexOf(topic), topic.grade);
    assert.ok(Number.isFinite(p.x) && p.y > 70 && p.y < 260);
  }
});
