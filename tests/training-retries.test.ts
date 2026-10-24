import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyLesson,
  newRun,
  updateLesson,
  parseLesson,
  trainingComplete,
  trainingAssisted,
  result,
} from "../src/course/videoLesson/model";
import { getLessonContent } from "../src/course/videoLesson/content";
const at = "2026-10-25T00:00:00.000Z";
const fresh = (): ReturnType<typeof emptyLesson> => ({
  ...emptyLesson(),
  runs: [{ ...newRun("retry-test", at), stage: "practice" as const }],
});
const { practice, check } = getLessonContent(newRun("test", at));
const q = practice[0];
const wrong = q.choices.map((_, i) => i).filter((i) => i !== q.correct);

test("first-try success lights a green star and permits immediate navigation", () => {
  let d = updateLesson(fresh(), {
    type: "trainingTry",
    id: q.id,
    choice: q.correct,
    at,
  });
  assert.equal(trainingComplete(d.runs[0], q), true);
  assert.equal(trainingAssisted(d.runs[0], q), false);
  d = updateLesson(d, { type: "practiceContinue", index: 0 });
  assert.equal(d.runs[0].practiceIndex, 1);
  d = updateLesson(d, { type: "practiceIndex", index: 0 });
  assert.equal(trainingComplete(d.runs[0], q), true);
});
test("wrong answers are retryable without overwriting the first answer or earning a star", () => {
  let d = updateLesson(fresh(), {
    type: "trainingTry",
    id: q.id,
    choice: wrong[0],
    at,
  });
  const first = d.runs[0].practice[q.id];
  assert.equal(trainingComplete(d.runs[0], q), false);
  assert.equal(updateLesson(d, { type: "practiceContinue", index: 0 }), d);
  assert.equal(updateLesson(d, { type: "trainingAcknowledge", id: q.id }), d);
  assert.equal(
    updateLesson(d, { type: "trainingTry", id: q.id, choice: wrong[0], at }),
    d,
  );
  d = parseLesson(JSON.stringify(d));
  d = updateLesson(d, {
    type: "trainingTry",
    id: q.id,
    choice: q.correct,
    at: "later",
  });
  assert.deepEqual(d.runs[0].practice[q.id], first);
  assert.equal(d.runs[0].training?.[q.id].resolved, true);
  assert.equal(trainingComplete(d.runs[0], q), false);
  d = parseLesson(JSON.stringify(d));
  d = updateLesson(d, { type: "trainingAcknowledge", id: q.id });
  assert.equal(trainingComplete(d.runs[0], q), true);
  assert.equal(trainingAssisted(d.runs[0], q), true);
  assert.equal(
    updateLesson(d, { type: "trainingTry", id: q.id, choice: q.correct, at }),
    d,
  );
});
test("eliminating all wrong choices requires explanation acknowledgement", () => {
  let d = fresh() as ReturnType<typeof emptyLesson>;
  for (const choice of wrong)
    d = updateLesson(d, { type: "trainingTry", id: q.id, choice, at });
  assert.equal(d.runs[0].training?.[q.id].resolved, true);
  assert.equal(trainingComplete(d.runs[0], q), false);
  d = updateLesson(d, { type: "trainingAcknowledge", id: q.id });
  assert.equal(trainingComplete(d.runs[0], q), true);
});
test("the last retry cannot finish the section until the explanation is acknowledged", () => {
  let d = fresh() as ReturnType<typeof emptyLesson>;
  for (let i = 0; i < practice.length; i++) {
    const item = practice[i];
    d = updateLesson(d, { type: "practiceIndex", index: i });
    const choice =
      i === practice.length - 1
        ? (item.correct + 1) % item.choices.length
        : item.correct;
    d = updateLesson(d, { type: "trainingTry", id: item.id, choice, at });
  }
  assert.equal(updateLesson(d, { type: "practiceDone" }), d);
  const last = practice.at(-1)!;
  d = updateLesson(d, {
    type: "trainingTry",
    id: last.id,
    choice: last.correct,
    at,
  });
  assert.equal(updateLesson(d, { type: "practiceDone" }), d);
  d = updateLesson(d, { type: "trainingAcknowledge", id: last.id });
  d = updateLesson(d, { type: "practiceContinue", index: practice.length - 1 });
  assert.equal(d.runs[0].stage, "return");
});
test("training actions never grade or modify independent practice", () => {
  const d = fresh();
  d.runs[0].stage = "check";
  assert.equal(
    updateLesson(d, {
      type: "trainingTry",
      id: check[0].id,
      choice: check[0].correct,
      at,
    }),
    d,
  );
  assert.equal(
    updateLesson(d, { type: "trainingAcknowledge", id: check[0].id }),
    d,
  );
  assert.equal(result(d.runs[0]).correct, 0);
});
test("legacy saved answers stay complete and corrupted retry data fails closed", () => {
  const d = fresh();
  d.runs[0].practice[q.id] = { choice: wrong[0], at };
  assert.equal(
    trainingComplete(parseLesson(JSON.stringify(d)).runs[0], q),
    true,
  );
  const retry = updateLesson(fresh(), {
    type: "trainingTry",
    id: q.id,
    choice: wrong[0],
    at,
  });
  retry.runs[0].training![q.id].rejected = [q.correct];
  assert.throws(() => parseLesson(JSON.stringify(retry)));
});
