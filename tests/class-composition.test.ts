import test from "node:test";
import assert from "node:assert/strict";
import { makeSpaceData } from "../src/cosmos/model";
import { classStarPosition } from "../src/course/constellation";
import { course, emptyProgress } from "../src/course/model";

test("classes keep distinct stable silhouettes across progress updates", () => {
  const initial = makeSpaceData({});
  const progress = {
    [course[0].id]: {
      ...emptyProgress(),
      readPages: [0],
      updatedAt: "2026-10-23",
    },
  };
  const saved = JSON.stringify(progress);
  const updated = makeSpaceData(progress);
  assert.equal(JSON.stringify(progress), saved);
  assert.deepEqual(
    initial.lessons.map((s) => [s.id, s.x, s.y, s.z]),
    updated.lessons.map((s) => [s.id, s.x, s.y, s.z]),
  );
  const shapes = initial.grades.map((g) => {
    const stars = initial.lessons.filter((s) => s.grade === g.grade);
    assert.equal(
      new Set(stars.map((s) => `${s.x}:${s.y}:${s.z}`)).size,
      stars.length,
    );
    return Array.from({ length: 7 }, (_, i) =>
      classStarPosition(g.grade, i, 7),
    );
  });
  assert.equal(new Set(shapes.map((s) => JSON.stringify(s))).size, 7);
  for (const shape of shapes)
    for (const p of shape) {
      assert.ok(p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
    }
});
