import test from "node:test";
import assert from "node:assert/strict";
import { WeeklyRewardOutbox } from "../src/engagement/weeklyRewards";
import { RewardEvent } from "../src/engagement/rewards";
const reward: RewardEvent = { kind: "question", id: "trainer:A05-01:test" };
function store() {
  const rows = new Map<string, string>();
  return {
    rows,
    getItem: async (k: string) => rows.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      rows.set(k, v);
    },
  };
}
test("weekly awards survive offline restart, are scoped to actor, and retry the same event", async () => {
  const disk = store();
  const states: string[] = [];
  const one = new WeeklyRewardOutbox(
    "one",
    disk,
    async () => {
      throw Error("offline");
    },
    (e) => states.push(e),
  );
  await one.enqueue([reward, reward]);
  assert.ok(states.at(-1));
  one.stop();
  const sent: RewardEvent[][] = [];
  const other = new WeeklyRewardOutbox(
    "two",
    disk,
    async (e) => {
      sent.push(e);
    },
    () => {},
  );
  await other.retry();
  assert.equal(sent.length, 0);
  const restored = new WeeklyRewardOutbox(
    "one",
    disk,
    async (e) => {
      sent.push(e);
    },
    () => {},
  );
  await restored.retry();
  await restored.retry();
  assert.deepEqual(sent, [[reward]]);
  assert.equal(disk.rows.get("espada.weekly.pending:one"), "[]");
});
test("failed disk writes retain pending awards for retry before network", async () => {
  const disk = store();
  let fail = true,
    calls = 0;
  const outbox = new WeeklyRewardOutbox(
    "one",
    {
      ...disk,
      setItem: async (k, v) => {
        if (fail) throw Error("disk");
        await disk.setItem(k, v);
      },
    },
    async () => {
      calls++;
    },
    () => {},
  );
  await outbox.enqueue([reward]);
  assert.equal(calls, 0);
  fail = false;
  await outbox.retry();
  assert.equal(calls, 1);
});
test("an award arriving while an earlier batch is in flight is not dropped", async () => {
  const disk = store();
  let release!: () => void;
  let began!: () => void;
  const started = new Promise<void>((r) => (began = r));
  const gate = new Promise<void>((r) => (release = r));
  const sent: RewardEvent[][] = [];
  const outbox = new WeeklyRewardOutbox(
    "one",
    disk,
    async (e) => {
      sent.push(e);
      if (sent.length === 1) {
        began();
        await gate;
      }
    },
    () => {},
  );
  const first = outbox.enqueue([reward]);
  await started;
  const extra: RewardEvent = { kind: "video", id: "youtube:abcdefghijk" };
  const second = outbox.enqueue([extra]);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(sent.flat(), [reward, extra]);
});
