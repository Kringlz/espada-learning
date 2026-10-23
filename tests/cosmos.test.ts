import test from "node:test";
import assert from "node:assert/strict";
import { course, emptyProgress } from "../src/course/model";
import {
  makeSpaceData,
  SpaceData,
  validSpaceAction,
} from "../src/cosmos/model";
import { spaceDocument } from "../src/cosmos/document";
import { spaceRuntime } from "../src/cosmos/runtime";

const data: SpaceData = {
  ...makeSpaceData({}),
  ready: true,
  error: null,
  name: "Ученик",
  signals: [{ id: "assignment-1", title: "Задание учителя" }],
};

test("space contains every real lesson and resumes the most recently studied grade", () => {
  assert.equal(data.lessons.length, course.length);
  assert.equal(new Set(data.lessons.map((s) => s.id)).size, course.length);
  assert.equal(data.grades.length, 7);
  for (const star of data.lessons) {
    assert.ok([star.x, star.y, star.z].every(Number.isFinite));
    assert.equal(star.complete, false);
  }
  const recent = course.find((t) => t.grade === 9)!;
  const progress = {
    [recent.id]: {
      ...emptyProgress(),
      updatedAt: "2026-10-20",
      readPages: [0],
    },
  };
  const before = JSON.stringify(progress);
  assert.equal(makeSpaceData(progress).initialId, recent.id);
  assert.equal(JSON.stringify(progress), before);
});

test("space bridge only accepts known lessons, assignments and supported destinations", () => {
  assert.ok(validSpaceAction({ type: "lesson", id: course[0].id }, data));
  assert.equal(
    validSpaceAction(
      { type: "lesson", id: course[0].id },
      { ...data, ready: false },
    ),
    false,
  );
  assert.equal(
    validSpaceAction({ type: "lesson", id: "unknown" }, data),
    false,
  );
  assert.ok(validSpaceAction({ type: "topic", id: "assignment-1" }, data));
  assert.equal(
    validSpaceAction({ type: "topic", id: "foreign-assignment" }, data),
    false,
  );
  assert.ok(validSpaceAction({ type: "navigate", id: "Progress" }, data));
  assert.ok(validSpaceAction({ type: "navigate", id: "Calculator" }, data));
  for (const value of [
    null,
    { type: "navigate", id: "Teacher" },
    { type: "navigate", id: "Arena" },
    { type: "navigate", id: "https://example.com" },
    { type: "lesson", id: 12 },
    { type: "delete", id: "" },
  ]) {
    assert.equal(validSpaceAction(value, data), false);
  }
});

test("untrusted lesson text cannot break out of the embedded scene script", () => {
  const payload = "</script><script>alert('injected')</script>";
  const html = spaceDocument(
    {
      ...data,
      name: payload,
      signals: [{ id: "assignment-1", title: payload }],
      lessons: data.lessons.map((s) => ({ ...s, title: payload })),
    },
    false,
  );
  assert.equal(html.includes(payload), false);
  assert.equal((html.match(/<script>/g) ?? []).length, 1);
  assert.equal((html.match(/<\/script>/g) ?? []).length, 1);
  // TypeScript cannot check JavaScript inside an HTML string.
  assert.doesNotThrow(() => new Function(spaceRuntime));
});

test("theme bridge accepts only explicit light and dark preferences", () => {
  assert.ok(validSpaceAction({ type: "theme", id: "light" }, data));
  assert.ok(validSpaceAction({ type: "theme", id: "dark" }, data));
  assert.equal(validSpaceAction({ type: "theme", id: "unknown" }, data), false);
});
