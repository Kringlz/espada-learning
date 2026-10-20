import test from "node:test";
import assert from "node:assert/strict";
import {
  arenaTopics,
  localDay,
  practiceQuestions,
  practiceScore,
  remainingSeconds,
} from "../src/arena/model";
import { calculate } from "../src/tools/arithmetic";
test("practice question banks have unique choices and mathematically valid answers", () => {
  const positions = new Set<number>();
  for (const topic of arenaTopics)
    for (let seed = 1; seed <= 100; seed++)
      for (const q of practiceQuestions(topic.id, seed)) {
        assert.equal(new Set(q.choices).size, 4);
        positions.add(q.answer!);
        const answer = Number(q.choices[q.answer!]);
        if (topic.id === "arithmetic")
          assert.equal(calculate(q.prompt), answer);
        if (topic.id === "percent") {
          const [p, a] = q.prompt.match(/\d+/g)!.map(Number);
          assert.equal((a * p) / 100, answer);
        }
        if (topic.id === "equations") {
          const [a, b, c] = q.prompt.match(/\d+/g)!.map(Number);
          assert.equal(a * answer + b, c);
        }
      }
  assert.equal(positions.size, 4);
});
test("daily practice stays stable for the same local date and has five questions", () => {
  assert.equal(localDay(new Date(2026, 9, 20, 1)), "2026-10-20");
  assert.deepEqual(
    practiceQuestions("arithmetic", 20261020, 5),
    practiceQuestions("arithmetic", 20261020, 5),
  );
  assert.equal(practiceQuestions("arithmetic", 20261020, 5).length, 5);
  assert.notDeepEqual(
    practiceQuestions("arithmetic", 20261020, 5),
    practiceQuestions("arithmetic", 20261021, 5),
  );
});
test("scoring rewards speed, never awards incorrect or late answers and bounds timer", () => {
  assert.equal(practiceScore(true, 0), 500);
  assert.equal(practiceScore(true, 7500), 300);
  assert.equal(practiceScore(true, 14999), 100);
  for (const time of [-1, 15000, 16000, NaN, Infinity])
    assert.equal(practiceScore(true, time), 0);
  assert.equal(practiceScore(false, 0), 0);
  assert.equal(remainingSeconds(1000, 1001), 0);
  assert.equal(remainingSeconds(1000, 1), 1);
});
