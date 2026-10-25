import test from "node:test";
import assert from "node:assert/strict";
import {
  practiceSnapshots,
  latestPractice,
} from "../src/course/trainer/sharing";
import { emptyProgress } from "../src/course/model";
import { newTrainer } from "../src/course/trainer/model";
test("shared practice excludes notes and counts an unresolved retry only as an attempt", () => {
  const p = {
    ...emptyProgress(),
    notes: "Private notes",
    updatedAt: "2026-10-25T10:00:00Z",
    trainer: {
      ...newTrainer(1),
      cursor: 14,
      correct: 12,
      incorrect: 3,
      submitted: false,
      rejected: [1],
    },
  };
  assert.deepEqual(practiceSnapshots({ "G05-02": p }), [
    {
      topicId: "G05-02",
      correct: 12,
      incorrect: 3,
      completed: 14,
      finished: false,
      updatedAt: p.updatedAt,
    },
  ]);
  assert.deepEqual(
    practiceSnapshots({ "G05-02": { ...p, trainer: newTrainer(2) } }),
    [],
  );
});
test("multiple devices show latest practice without doubling scores and preserve earned completion", () => {
  const old = {
    topic_id: "G05-02",
    correct: 12,
    incorrect: 3,
    completed: 15,
    finished: true,
    passed: true,
    observed_at: "2026-10-24T10:00:00Z",
  };
  const recent = {
    ...old,
    correct: 1,
    incorrect: 1,
    completed: 2,
    finished: false,
    passed: false,
    observed_at: "2026-10-25T10:00:00Z",
  };
  assert.deepEqual(latestPractice([old, recent]), [
    { ...recent, passed: true },
  ]);
  assert.deepEqual(latestPractice([recent, old]), [
    { ...recent, passed: true },
  ]);
});
