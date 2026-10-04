import test from "node:test";
import assert from "node:assert/strict";
import {
  addRewards,
  emptyWatch,
  levelFor,
  parseRewards,
  rewardsStorageKey,
  totalPoints,
  trackWatch,
} from "../src/engagement/rewards";

test("rewards are earned once per content item, survive reload and do not subtract on quiz restart", () => {
  const events = [
    { kind: "video" as const, id: "youtube:123" },
    { kind: "question" as const, id: "course:A05-01:1" },
  ];
  const first = addRewards({}, [...events, events[0]]);
  assert.equal(first.gained, 30);
  const restored = parseRewards(JSON.stringify(first.ledger));
  assert.equal(addRewards(restored, events).gained, 0);
  assert.equal(addRewards(restored, []).gained, 0);
  assert.equal(totalPoints(restored), 30);
  assert.equal(
    addRewards(restored, [{ kind: "question", id: "course:A05-01:2" }]).gained,
    20,
  );
  assert.notEqual(
    rewardsStorageKey("student-a"),
    rewardsStorageKey("student-b"),
  );
});
test("three levels use stable exact thresholds and ignore fabricated totals", () => {
  assert.deepEqual(
    [0, 99, 100, 299, 300, 999].map(levelFor),
    [0, 0, 1, 1, 2, 2],
  );
  assert.equal(
    totalPoints(
      parseRewards(
        '{"total":99999,"question:a":"question","video:b":"video","question:c":"video","video:":"video"}',
      ),
    ),
    30,
  );
  assert.throws(() => parseRewards("[]"));
  assert.equal(
    addRewards({}, [{ kind: "toString", id: "a" } as any]).gained,
    0,
  );
});
test("video reward requires 80 percent of real unique playback", () => {
  let watch = emptyWatch();
  for (let i = 0; i <= 79; i++) {
    const result = trackWatch(watch, i, 100, true, i * 1000);
    watch = result.state;
    assert.equal(result.completed, false);
  }
  assert.equal(trackWatch(watch, 80, 100, true, 80000).completed, true);
});
test("opening, seeking, pausing, hidden playback and repeat loops cannot manufacture video completion", () => {
  let watch = trackWatch(emptyWatch(), 0, 100, true, 0).state;
  watch = trackWatch(watch, 99, 100, true, 1000).state;
  assert.equal(watch.seconds, 0);
  watch = trackWatch(watch, 100, 100, false, 2000).state;
  assert.equal(watch.seconds, 0);
  let now = 3000;
  for (let repeat = 0; repeat < 10; repeat++)
    for (let i = 0; i <= 10; i++) {
      watch = trackWatch(watch, i, 100, true, now).state;
      now += 1000;
    }
  assert.equal(watch.seconds, 10);
  assert.equal(trackWatch(watch, NaN, 100, true, now).completed, false);
  assert.equal(trackWatch(watch, 11, Infinity, true, now).completed, false);
  assert.equal(trackWatch(watch, 80, 100, true, now + 60000).completed, false);
});
