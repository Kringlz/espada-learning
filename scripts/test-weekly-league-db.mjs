import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, quote, requireDisposableDatabase } from "./lesson-db.mjs";
requireDisposableDatabase();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const as = (n, q) =>
  sql(
    `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(id(n))};${q};commit;`,
  );
const league = (n, g = 6) =>
  as(n, `select public.classroom_league(${quote(id(g))})`).then(JSON.parse);
const suffix = randomUUID();
const event = { kind: "question", id: `trainer:A05-01:${suffix}` };
const record = (n, events) =>
  as(
    n,
    `select public.record_learning_rewards(${quote(JSON.stringify(events))}::jsonb)`,
  );
const points = (b) => b.leaders.find((p) => p.id === id(1)).points;
try {
  const before = await league(1);
  await record(1, [event, event]);
  await record(1, [event]);
  const after = await league(1);
  assert.equal(points(after) - points(before), 20);
  assert.deepEqual(after, await league(2));
  assert.ok(after.leaders.every((p) => [id(1), id(2)].includes(p.id)));
  assert.equal(
    Date.parse(after.endsAt) - Date.parse(after.startsAt),
    7 * 86400000,
  );
  // Boundary: the first instant belongs to this week; last week's event is excluded.
  await sql(
    `update private.learning_reward_events set received_at=${quote(after.startsAt)}::timestamptz-interval '1 microsecond' where event_key=${quote("question:" + event.id)}`,
  );
  assert.equal(points(await league(1)), points(before));
  await sql(
    `update private.learning_reward_events set received_at=${quote(after.startsAt)} where event_key=${quote("question:" + event.id)}`,
  );
  assert.equal(points(await league(1)), points(after));
  await sql(
    `update private.learning_reward_events set received_at=${quote(after.endsAt)} where event_key=${quote("question:" + event.id)}`,
  );
  assert.equal(points(await league(1)), points(before));
  for (const n of [5, 450]) await assert.rejects(() => league(n));
  await assert.rejects(() => league(1, 7));
  await assert.rejects(() => record(3, [event]));
  await assert.rejects(() => record(1, [{ kind: "points", id: "99999" }]));
  await assert.rejects(() =>
    as(1, "select * from private.learning_reward_events"),
  );
  await assert.rejects(() =>
    sql(
      `begin;set local role anon;select public.classroom_league(${quote(id(6))});rollback;`,
    ),
  );
  console.log(
    "✓ Weekly learning league: real points, deduplication, week boundaries, membership and role isolation",
  );
} finally {
  await sql(
    `delete from private.learning_reward_events where event_key=${quote("question:" + event.id)}`,
  );
}
