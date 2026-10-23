import test from "node:test";
import assert from "node:assert/strict";
import {
  activity,
  activeSeconds,
  comparisonKey,
  dayKey,
  emptyProgress,
  periodBounds,
  topicSummary,
  validateAttachment,
  validateWork,
} from "../src/progress/model";
import { ProgressOutbox } from "../src/progress/outbox";
const event = (at: string, seconds = 30) => ({
  id: at,
  at,
  topicId: "G08-02",
  kind: "video" as const,
  seconds,
  completed: 0,
  correct: 0,
});
test("Bishkek day boundary and Monday week, month ignores host timezone", () => {
  assert.equal(dayKey("2026-10-18T17:59:59Z"), "2026-10-18");
  assert.equal(dayKey("2026-10-18T18:00:00Z"), "2026-10-19");
  assert.equal(
    periodBounds("week", new Date("2026-10-18T18:00:00Z")).start,
    "2026-10-19",
  );
  const p = periodBounds("month", new Date("2026-03-31T10:00:00Z"));
  assert.equal(p.equalDays, 28);
  assert.equal(p.previousEnd, "2026-03-01");
  assert.equal(p.comparisonEnd, "2026-03-29");
});
test("missing history differs from confirmed zero; equal complete days only", () => {
  const d = emptyProgress(),
    now = new Date("2026-10-21T06:00:00Z");
  assert.equal(activity(d, "week", now).fullHistory, false);
  d.observedSince = "2026-10-01T00:00:00Z";
  let a = activity(d, "week", now);
  assert.equal(a.fullHistory, true);
  assert.equal(a.compare?.days, 2);
  d.events = [event("2026-10-21T05:00:00Z"), event("2026-10-12T05:00:00Z")];
  a = activity(d, "week", now);
  assert.equal(a.days.length, 1);
  assert.deepEqual(a.compare, { current: 0, previous: 1, days: 2 });
});
test("page opening and short passive fragments do not create learning days", () => {
  const d = emptyProgress();
  d.events = [
    event("2026-10-20T03:00:00Z", 0),
    event("2026-10-20T04:00:00Z", 10),
  ];
  assert.equal(activity(d, "week", new Date("2026-10-21")).days.length, 0);
  d.events.push({
    ...event("2026-10-20T05:00:00Z", 0),
    kind: "practice" as any,
    completed: 1,
  });
  assert.equal(activity(d, "week", new Date("2026-10-21")).days.length, 1);
  assert.equal(activeSeconds(0, 61000, true), 0);
  assert.equal(activeSeconds(0, 30000, false), 0);
  assert.equal(activeSeconds(0, 30000, true), 30);
});
test("independent counters exclude training and repeated opening question", () => {
  const d = emptyProgress();
  d.events = ["practice", "initial", "revisited", "independent"].map(
    (kind, i) => ({
      ...event(`2026-10-20T0${i}:00:00Z`),
      kind: kind as any,
      completed: 3,
      correct: 2,
    }),
  );
  const a = activity(d, "week", new Date("2026-10-21"));
  assert.equal(a.completed, 3);
  assert.equal(a.correct, 2);
});
test("topic comparison requires same version and flags familiar questions, never awards mastery", () => {
  const make = (id: string, version: number, correct: number) => ({
    id,
    topicId: "G08-02",
    version,
    correct,
    total: 3,
    revision: 1,
    questionIds: ["a", "b", "c"],
    archived: false,
    run: {
      id,
      finishedAt: `2026-10-${id}T00:00:00Z`,
      practice: {},
      hints: {},
      check: {},
    } as any,
  });
  let s = topicSummary([make("20", 1, 1), make("21", 2, 1)])[0];
  assert.equal(s.previous, undefined);
  assert.equal(s.attention, false);
  s = topicSummary([make("20", 2, 1), make("21", 2, 1)])[0];
  assert.equal(s.attention, true);
  assert.equal(s.overlap, 3);
  assert.match(
    topicSummary([make("21", 2, 3)])[0].status,
    /устойчивость ещё не подтверждена/,
  );
});
test("work scale and attachment validation preserve context", () => {
  const w = {
    date: "2026-01-01",
    title: "Работа",
    subject: "Алгебра",
    topics: ["Дроби"],
    kind: "Контрольная",
    scale: "grade" as const,
    minimum: 1,
    maximum: 5,
    score: 4,
    note: "",
  };
  validateWork(w);
  for (const bad of [
    { maximum: 0 },
    { score: 6 },
    { score: 0 },
    { date: "2026-02-30" },
    { topics: [] },
  ])
    assert.throws(() => validateWork({ ...w, ...bad }));
  assert.notEqual(
    comparisonKey(w as any),
    comparisonKey({ ...w, maximum: 10 } as any),
  );
  assert.notEqual(
    comparisonKey(w as any),
    comparisonKey({ ...w, topics: ["Уравнения"] } as any),
  );
  validateAttachment("application/pdf", 100);
  assert.throws(() => validateAttachment("image/svg+xml", 100));
  assert.throws(() => validateAttachment("image/png", 10485761));
});
test("outbox persists lost acknowledgements, survives restart and deduplicates replay", async () => {
  const map = new Map<string, string>(),
    storage = {
      async getItem(k: string) {
        return map.get(k) ?? null;
      },
      async setItem(k: string, v: string) {
        map.set(k, v);
      },
      async removeItem(k: string) {
        map.delete(k);
      },
    };
  const receipts = new Set<string>();
  let fail = true,
    calls = 0;
  const send = async (a: string, c: any) => {
    calls++;
    receipts.add(c.requestId);
    if (fail) throw Error("lost response");
  };
  let box = new ProgressOutbox(storage, "test-db", send);
  const command = { type: "run", studentId: "s", requestId: "run:1" };
  await box.enqueue("s", command);
  await box.enqueue("s", command);
  await assert.rejects(box.flush("s"));
  assert.equal((await box.read("s")).length, 1);
  box = new ProgressOutbox(storage, "test-db", send);
  fail = false;
  await box.flush("s");
  assert.equal(receipts.size, 1);
  assert.equal(calls, 2);
  assert.equal((await box.read("s")).length, 0);
  await box.enqueue("s", command);
  assert.equal(
    (await new ProgressOutbox(storage, "other-db", send).read("s")).length,
    0,
  );
  assert.equal((await box.read("other")).length, 0);
});
test("measured seconds split at midnight without moving submitted answers", () => {
  const d = emptyProgress();
  d.observedSince = "2026-10-01T00:00:00Z";
  d.events = [
    {
      ...event("2026-10-18T18:00:10Z", 40),
      kind: "independent",
      completed: 1,
      correct: 1,
    },
  ];
  const a = activity(d, "week", new Date("2026-10-19T03:00:00Z"));
  assert.equal(a.seconds, 10);
  assert.equal(a.correct, 1);
  assert.equal(a.days.length, 1);
});
test("network stall cannot prevent new answers entering durable outbox", async () => {
  const m = new Map<string, string>(),
    storage = {
      async getItem(k: string) {
        return m.get(k) ?? null;
      },
      async setItem(k: string, v: string) {
        m.set(k, v);
      },
      async removeItem(k: string) {
        m.delete(k);
      },
    };
  let release!: () => void, entered!: () => void;
  const blocked = new Promise<void>((r) => (release = r)),
    started = new Promise<void>((r) => (entered = r));
  const box = new ProgressOutbox(storage, "db", async () => {
    entered();
    await blocked;
  });
  await box.enqueue("s", { type: "run", studentId: "s", requestId: "one" });
  const flushing = box.flush("s");
  await started;
  await box.enqueue("s", { type: "run", studentId: "s", requestId: "two" });
  assert.equal((await box.read("s")).length, 2);
  release();
  await flushing;
  assert.equal((await box.read("s")).length, 0);
});
