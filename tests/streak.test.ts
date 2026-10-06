import test from "node:test";
import assert from "node:assert/strict";
import {
  dayKey,
  didStudy,
  monthCells,
  parseStreak,
  shiftDay,
  streakKey,
  streakStats,
} from "../src/engagement/streak";

test("a streak counts unique consecutive days and allows today to be unfinished", () => {
  const days = ["2026-10-04", "2026-10-05", "2026-10-05", "2026-10-06"];
  assert.deepEqual(streakStats(days, "2026-10-07"), {
    current: 3,
    best: 3,
    todayDone: false,
  });
  assert.deepEqual(streakStats([...days, "2026-10-07"], "2026-10-07"), {
    current: 4,
    best: 4,
    todayDone: true,
  });
  assert.deepEqual(streakStats(days, "2026-10-08"), {
    current: 0,
    best: 3,
    todayDone: false,
  });
});
test("a gap starts a new series without losing the personal best", () => {
  assert.deepEqual(
    streakStats(
      ["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-04", "2026-10-05"],
      "2026-10-05",
    ),
    { current: 2, best: 3, todayDone: true },
  );
  assert.equal(
    streakStats(["2026-10-08", "bad", "2026-02-30"], "2026-10-07").current,
    0,
  );
});
test("calendar handles leap days, year boundaries and Monday-first weeks", () => {
  assert.equal(shiftDay("2024-03-01", -1), "2024-02-29");
  assert.equal(shiftDay("2026-01-01", -1), "2025-12-31");
  const feb = monthCells("2024-02");
  assert.equal(feb.filter(Boolean).length, 29);
  assert.equal(feb[3], "2024-02-01");
  assert.equal(feb.length % 7, 0);
  assert.equal(monthCells("2026-06")[0], "2026-06-01");
});
test("streak dates survive saving, reject invalid dates and stay per account", () => {
  assert.deepEqual(
    parseStreak('["2026-10-05","2026-02-30","2026-10-05",null,"2026-10-04"]'),
    ["2026-10-04", "2026-10-05"],
  );
  assert.deepEqual(parseStreak(null), []);
  assert.throws(() => parseStreak("{}"));
  assert.notEqual(streakKey("alice"), streakKey("bob"));
});
test("day boundaries use local calendar components including timezone and daylight-saving shifts", () => {
  const old = process.env.TZ;
  try {
    process.env.TZ = "Asia/Bishkek";
    assert.equal(dayKey(new Date("2026-10-06T18:05:00Z")), "2026-10-07");
    process.env.TZ = "America/New_York";
    assert.equal(shiftDay("2026-03-08", 1), "2026-03-09");
    assert.equal(shiftDay("2026-11-01", 1), "2026-11-02");
  } finally {
    if (old === undefined) delete process.env.TZ;
    else process.env.TZ = old;
  }
});
test("navigation, selection, notes and existing completions cannot count as study", () => {
  const before = { readPages: [0], quiz: { "1": { submitted: true } } };
  assert.equal(didStudy(before, { ...before }), false);
  assert.equal(didStudy(before, { ...before, readPages: [0, 1] }), true);
  assert.equal(
    didStudy(before, {
      ...before,
      quiz: { ...before.quiz, "2": { submitted: false } },
    }),
    false,
  );
  assert.equal(
    didStudy(before, {
      ...before,
      quiz: { ...before.quiz, "2": { submitted: true } },
    }),
    true,
  );
  assert.equal(didStudy(before, { readPages: [], quiz: {} }), false);
});
