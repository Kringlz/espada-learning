import test from "node:test";
import assert from "node:assert/strict";
import { makeSpaceProgress } from "../src/cosmos/progress";
import { emptyProgress, parseProgress } from "../src/course/model";
import {
  newTrainer,
  reduceTrainer,
  parseTrainer,
} from "../src/course/trainer/model";
import { trainerQuestion } from "../src/course/trainer/bank";
import { makeSpaceData, validSpaceAction } from "../src/cosmos/model";
const topic = "G08-02";
function answer(
  state = newTrainer(123),
  correct = true,
  at = "2026-10-25T09:00:00Z",
) {
  const q = trainerQuestion(topic, state.seed, state.cursor);
  let next = reduceTrainer(
    reduceTrainer(state, topic, {
      type: "select",
      choice: correct ? q.correct : (q.correct + 1) % q.choices.length,
    }),
    topic,
    { type: "submit" },
    state.cursor,
    at,
  );
  if (!next.submitted) {
    next = reduceTrainer(next, topic, { type: "select", choice: q.correct });
    next = reduceTrainer(next, topic, { type: "submit" }, next.cursor, at);
  }
  return next;
}
test("space progress does not invent activity or recommendations for a new learner", () => {
  const p = makeSpaceProgress({}, new Date("2026-10-25T12:00:00Z"));
  assert.equal(p.totalAnswered, 0);
  assert.equal(p.accuracy, null);
  assert.equal(p.practiced, 0);
  assert.equal(p.recommendations.length, 0);
  assert.equal(
    p.days.reduce((n, d) => n + d.correct + d.incorrect, 0),
    0,
  );
});
test("dated practice survives a new session and counts once in the week and recommendations", () => {
  let s = answer(undefined, false);
  s = reduceTrainer(s, topic, { type: "next" });
  s = answer(s, true);
  const again = reduceTrainer(s, topic, { type: "submit" });
  assert.deepEqual(again.recent, s.recent);
  s = newTrainer(456, s);
  s = answer(s, true);
  const p = makeSpaceProgress(
    { [topic]: { ...emptyProgress(), trainer: s } },
    new Date("2026-10-25T12:00:00Z"),
  );
  assert.equal(p.totalAnswered, 3);
  assert.equal(p.practiced, 1);
  assert.equal(p.accuracy, 67);
  assert.equal(p.accuracySample, 3);
  assert.equal(
    p.days.reduce((n, d) => n + d.correct, 0),
    2,
  );
  assert.equal(
    p.days.reduce((n, d) => n + d.incorrect, 0),
    1,
  );
  assert.equal(p.recommendations[0].id, topic);
  assert.ok(p.recommendations[0].quickRecall.length > 0);
  assert.deepEqual(p.recommendations[0].review, {
    prompt: trainerQuestion(topic, 123, 0).prompt,
    solution: trainerQuestion(topic, 123, 0).solution,
  });
  assert.match(p.recommendations[0].reason, /1 \/ 3/);
  assert.ok(
    p.recommendations[0].references.some((r) =>
      r.formulas.some((f) => f.image.startsWith("data:image/svg+xml")),
    ),
  );
  assert.deepEqual(parseTrainer(JSON.parse(JSON.stringify(s)), topic), s);
});
test("old answers are not assigned fabricated dates; outdated and future events are excluded", () => {
  const old = answer(undefined, false, "2026-09-10T09:00:00Z");
  const p = makeSpaceProgress(
    { [topic]: { ...emptyProgress(), trainer: old } },
    new Date("2026-10-25T12:00:00Z"),
  );
  assert.equal(p.accuracy, null);
  assert.equal(p.mistakes, 0);
  assert.equal(
    p.days.reduce((n, d) => n + d.incorrect, 0),
    0,
  );
  const legacy = parseTrainer({ ...old, recent: undefined }, topic)!;
  const legacyProgress = makeSpaceProgress(
    { [topic]: { ...emptyProgress(), trainer: legacy } },
    new Date("2026-10-25T12:00:00Z"),
  );
  assert.equal(legacyProgress.accuracy, 0);
  assert.equal(
    legacyProgress.days.reduce((n, d) => n + d.incorrect, 0),
    0,
  );
  const future = answer(undefined, false, "2026-11-01T09:00:00Z");
  const futureProgress = makeSpaceProgress(
    { [topic]: { ...emptyProgress(), trainer: future } },
    new Date("2026-10-25T12:00:00Z"),
  );
  assert.equal(futureProgress.accuracy, null);
  assert.equal(futureProgress.mistakes, 0);
  const invalid = parseTrainer(
    { ...old, recent: [{ questionId: "a", correct: "yes", at: "nonsense" }] },
    topic,
  )!;
  assert.deepEqual(invalid.recent, []);
});
test("explicit interests are saved and can drive relevant formulas without fake practice", () => {
  const raw = { [topic]: { ...emptyProgress(), interested: true } };
  const saved = parseProgress(JSON.stringify(raw));
  assert.equal(saved[topic].interested, true);
  const p = makeSpaceProgress(saved);
  assert.equal(p.totalAnswered, 0);
  assert.equal(p.recommendations[0].id, topic);
  assert.equal(p.recommendations[0].reason, "Тебе интересно");
  assert.equal(p.recommendations[0].review, null);
  const data = {
    ...makeSpaceData(saved),
    ready: true,
    error: null,
    name: "Student",
    signals: [],
  };
  assert.ok(
    validSpaceAction({ type: "interest", id: topic, enabled: false }, data),
  );
  assert.equal(
    validSpaceAction({ type: "interest", id: topic, enabled: "yes" }, data),
    false,
  );
  assert.equal(
    validSpaceAction({ type: "interest", id: "foreign", enabled: true }, data),
    false,
  );
  assert.equal(
    validSpaceAction(
      { type: "interest", id: topic, enabled: true },
      { ...data, ready: false },
    ),
    false,
  );
});
test("recent practice history is bounded across sessions", () => {
  let s = newTrainer(12);
  for (let i = 0; i < 215; i++) {
    s = answer(s, i % 2 === 0);
    s = reduceTrainer(s, topic, { type: "next" });
  }
  assert.equal(s.recent.length, 200);
  assert.equal(s.totalAnswered, 215);
  assert.equal(
    s.daily.reduce((sum, day) => sum + day.correct + day.incorrect, 0),
    215,
  );
  assert.deepEqual(newTrainer(13, s).daily, s.daily);
  assert.equal(newTrainer(13, s).recent.length, 200);
});
