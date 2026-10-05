import test from "node:test";
import assert from "node:assert/strict";
import {
  engagementStorageKey,
  localDay,
  parseEngagement,
  recordEngagement,
  streakSummary,
} from "../src/engagement/streaks";
import { parseSoundPreferences } from "../src/engagement/soundPreferences";
const at = (day: string) => new Date(`${day}T12:00:00Z`);
const event = (id: string) => [{ kind: "question" as const, id }];
const empty = () => parseEngagement(null, null, "UTC");
test("migration preserves points without inventing dates; backfill is quiet", () => {
  const migrated = parseEngagement(null, '{"question:a":"question"}', "UTC");
  assert.deepEqual(migrated.days, []);
  assert.equal(
    recordEngagement(migrated, event("a"), true, at("2026-10-01")).gained,
    0,
  );
  const backfill = recordEngagement(
    migrated,
    event("b"),
    false,
    at("2026-10-01"),
  );
  assert.equal(backfill.gained, 20);
  assert.deepEqual(backfill.data.days, []);
});
test("daily deduplication, repeated rewards, reload, grace day, gap and personal best", () => {
  let data = recordEngagement(empty(), event("a"), true, at("2026-10-01")).data;
  data = recordEngagement(data, event("b"), true, at("2026-10-01")).data;
  assert.deepEqual(data.days, ["2026-10-01"]);
  data = parseEngagement(JSON.stringify(data), null);
  assert.equal(
    recordEngagement(data, event("a"), true, at("2026-10-02")).newDay,
    false,
  );
  assert.equal(streakSummary(data, at("2026-10-02")).current, 1);
  data = recordEngagement(data, event("c"), true, at("2026-10-02")).data;
  assert.equal(streakSummary(data, at("2026-10-03")).current, 2);
  assert.equal(streakSummary(data, at("2026-10-04")).current, 0);
  data = recordEngagement(data, event("d"), true, at("2026-10-04")).data;
  assert.equal(streakSummary(data, at("2026-10-04")).current, 1);
  assert.equal(streakSummary(data, at("2026-10-04")).best, 2);
  assert.notEqual(engagementStorageKey("a"), engagementStorageKey("b"));
});
test("calendar boundaries survive DST, year and leap day; future dates do not extend today", () => {
  assert.equal(
    localDay(new Date("2026-03-08T04:59:00Z"), "America/New_York"),
    "2026-03-07",
  );
  assert.equal(
    localDay(new Date("2026-03-08T05:00:00Z"), "America/New_York"),
    "2026-03-08",
  );
  for (const days of [
    ["2026-03-07", "2026-03-08", "2026-03-09"],
    ["2026-10-31", "2026-11-01", "2026-11-02"],
    ["2024-02-28", "2024-02-29", "2024-03-01"],
    ["2025-12-31", "2026-01-01", "2026-01-02"],
  ]) {
    const data = { ...empty(), days, timeZone: "America/New_York" };
    assert.equal(streakSummary(data, at(days[2])).current, 3);
    assert.equal(streakSummary(data, at(days[0])).current, 1);
  }
});
test("invalid storage is rejected rather than overwritten; timezone survives device travel", () => {
  assert.throws(() =>
    parseEngagement(
      '{"version":2,"days":["2026-02-30"],"timeZone":"UTC","rewards":{}}',
      null,
    ),
  );
  assert.throws(() =>
    parseEngagement(
      '{"version":2,"days":[],"timeZone":"Bad/Zone","rewards":{}}',
      null,
    ),
  );
  assert.throws(() => parseEngagement("broken", null));
  const data = { ...empty(), timeZone: "Asia/Tokyo" };
  assert.equal(
    parseEngagement(JSON.stringify(data), null, "America/New_York").timeZone,
    "Asia/Tokyo",
  );
  assert.equal(recordEngagement(data, [], true).newDay, false);
});
test("sound preferences migrate mute and roundtrip volume; reject nonfinite/out of range", () => {
  assert.equal(parseSoundPreferences(null, "off").enabled, false);
  assert.deepEqual(
    parseSoundPreferences('{"enabled":true,"volume":0.2}', null),
    { enabled: true, volume: 0.2 },
  );
  for (const raw of [
    '{"enabled":true,"volume":2}',
    '{"enabled":true,"volume":null}',
    "no",
  ])
    assert.throws(() => parseSoundPreferences(raw, null));
});
