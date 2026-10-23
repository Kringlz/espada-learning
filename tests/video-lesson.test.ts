import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import {
  check,
  lessonId,
  lessonVideo,
  opening,
  practice,
  getLessonContent,
} from "../src/course/videoLesson/content";
import {
  emptyLesson,
  updateLesson,
  parseLesson,
  result,
  newRun,
  taskControl,
  lessonKey,
  Action,
  LessonData,
} from "../src/course/videoLesson/model";
import * as original from "../src/course/videoLesson/content.v1";
import { useLesson } from "../src/course/videoLesson/useLesson";
import { progressKey } from "../src/course/model";
import { addRewards, emptyWatch, trackWatch } from "../src/engagement/rewards";
import { ProgressStorage } from "../src/course/useStoredCourseProgress";
const at = "2026-10-23T00:00:00.000Z";
function journey() {
  let d = emptyLesson();
  const send = (a: Action) => {
    d = updateLesson(d, a);
  };
  send({ type: "start", id: "one", at });
  send({ type: "choose", id: opening.id, choice: 0 });
  send({ type: "submit", at });
  send({ type: "next", from: "intro", index: 0 });
  send({ type: "next", from: "video", index: 0 });
  practice.forEach((q, index) => {
    send({ type: "hint" });
    send({ type: "choose", id: q.id, choice: q.correct });
    send({ type: "submit", at });
    send({ type: "next", from: "practice", index });
  });
  send({ type: "choose", id: opening.id, choice: opening.correct });
  send({ type: "submit", at });
  send({ type: "next", from: "return", index: practice.length - 1 });
  return {
    get data() {
      return d;
    },
    send,
  };
}
test("full lesson keeps intro, revisit, training and check separate", () => {
  const j = journey();
  const r = j.data.runs[0];
  assert.equal(r.stage, "check");
  assert.equal(r.initial?.choice, 0);
  assert.equal(r.revisited?.choice, 1);
  assert.equal(Object.keys(r.practice).length, 6);
  assert.equal(Object.keys(r.check).length, 0);
  assert.equal(result(r).percent, 0);
  assert.equal(r.hints[practice[0].id], 1);
});
test("70% is enough; 60% repeats; unanswered denominator is always ten", () => {
  for (const count of [0, 6, 7, 10]) {
    const j = journey();
    check.slice(0, count).forEach((q, index) => {
      j.send({ type: "checkIndex", index });
      j.send({ type: "choose", id: q.id, choice: q.correct });
    });
    j.send({ type: "finish", at });
    assert.equal(result(j.data.runs[0]).percent, count * 10);
    assert.equal(result(j.data.runs[0]).repeat, count < 7);
    assert.equal(result(j.data.runs[0]).total, 10);
  }
});
test("double taps cannot skip stages, duplicate submissions, overwrite results or duplicate runs", () => {
  let d = updateLesson(emptyLesson(), { type: "start", id: "one", at });
  d = updateLesson(d, { type: "choose", id: opening.id, choice: 0 });
  d = updateLesson(d, { type: "submit", at });
  d = updateLesson(d, { type: "choose", id: opening.id, choice: 1 });
  assert.equal(d.runs[0].initial?.choice, 0);
  const next = { type: "next" as const, from: "intro" as const, index: 0 };
  d = updateLesson(updateLesson(d, next), next);
  assert.equal(d.runs[0].stage, "video");
  const j = journey();
  j.send({ type: "finish", at });
  const before = JSON.stringify(j.data.runs[0]);
  j.send({ type: "finish", at: "changed" });
  j.send({ type: "choose", id: check[0].id, choice: 1 });
  assert.equal(JSON.stringify(j.data.runs[0]), before);
  j.send({ type: "start", id: "two", at });
  j.send({ type: "start", id: "three", at });
  assert.equal(j.data.runs.length, 2);
  assert.equal(JSON.stringify(j.data.runs[0]), before);
});
test("check allows revisions before finishing and never gives training hints", () => {
  const j = journey();
  const hints = JSON.stringify(j.data.runs[0].hints);
  j.send({ type: "hint" });
  assert.equal(JSON.stringify(j.data.runs[0].hints), hints);
  j.send({ type: "choose", id: check[0].id, choice: 0 });
  j.send({ type: "choose", id: check[0].id, choice: 1 });
  assert.equal(j.data.runs[0].check[check[0].id].choice, 1);
});
test("invalid choices and stale question actions do not write answers", () => {
  const j = journey();
  for (const choice of [-1, 3, NaN, 1.2])
    j.send({ type: "choose", id: check[0].id, choice });
  j.send({ type: "choose", id: check[1].id, choice: 0 });
  assert.deepEqual(j.data.runs[0].check, {});
});
test("resume preserves all history and resets playback clock, leaving old storage separate", () => {
  const j = journey();
  const d = j.data;
  d.video = {
    position: 87,
    duration: 784,
    completed: false,
    watch: { position: 87, clock: 123456, seconds: 10, ranges: [[50, 60]] },
  };
  const parsed = parseLesson(JSON.stringify(d));
  assert.deepEqual(parsed.runs, d.runs);
  assert.equal(parsed.video.position, 87);
  assert.equal(parsed.video.watch.clock, null);
  assert.notEqual(lessonKey("student"), progressKey("student"));
  assert.throws(() => parseLesson('{"version":2}'));
  assert.throws(() => parseLesson("broken"));
});
test("video seeking and replay cannot earn duplicate viewing rewards", () => {
  let w = emptyWatch();
  w = trackWatch(w, 0, 100, true, 0).state;
  assert.equal(trackWatch(w, 90, 100, true, 1000).completed, false);
  for (let i = 1; i <= 80; i++) w = trackWatch(w, i, 100, true, i * 1000).state;
  assert.equal(w.seconds, 80);
  const resumed = { ...w, clock: null, position: null };
  assert.equal(trackWatch(resumed, 95, 100, true, 900000).state.seconds, 80);
  const event = { kind: "video" as const, id: `youtube:${lessonVideo.id}` };
  const first = addRewards({}, [event]);
  const second = addRewards(first.ledger, [event, event]);
  assert.equal(first.gained, 10);
  assert.equal(second.gained, 0);
});
test("answer keys are independently checked against the original geometry", () => {
  assert.equal(lessonId, "G08-02");
  assert.equal(lessonVideo.id, "7An72Mhm1_U");
  assert.equal(30 + 40 - Math.hypot(30, 40), 20);
  assert.equal(Math.hypot(6, 8), 10);
  assert.equal(Math.sqrt(17 ** 2 - 8 ** 2), 15);
  assert.notEqual(4 ** 2 + 5 ** 2, 6 ** 2);
  assert.equal(Math.hypot(1, 1), Math.sqrt(2));
  const expected = [
    "25 см",
    "Нет, высота рамки 15 см",
    "LN² = LM² + MN²",
    "Нет, потому что 6² + 7² ≠ 10²",
    "Увеличилась в 2 раза",
    "6 см",
    "5 см",
    "Подходит только 9 см",
    "Нет, не хватает условия о прямом угле",
    "4 см",
  ];
  assert.deepEqual(
    check.map((q) => q.choices[q.correct]),
    expected,
  );
  assert.equal(Math.hypot(14 / 2, 48 / 2), 25);
  assert.equal(Math.sqrt(17 ** 2 - 8 ** 2), 15);
  assert.notEqual(6 ** 2 + 7 ** 2, 10 ** 2);
  assert.equal(Math.hypot(6, 8), 2 * Math.hypot(3, 4));
  assert.ok(Math.abs((6 * Math.sqrt(2)) ** 2 / 2 - 36) < 1e-10);
  assert.equal(Math.sqrt(13 ** 2 - (17 - 5) ** 2), 5);
  assert.equal(Math.sqrt(5 ** 2 - 4 ** 2), 3);
  assert.equal(8 ** 2 + 12 ** 2, 16 * 13);
  assert.equal(Math.sqrt(10 ** 2 - 8 ** 2), 6);
  assert.equal(
    new Set([opening, ...practice, ...check].map((q) => q.id)).size,
    17,
  );
  for (const q of [...practice, ...check])
    assert.ok(q.hints.length && q.solution && q.source);
});
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
async function mount(storage: ProgressStorage) {
  let current!: ReturnType<typeof useLesson>;
  let root!: ReactTestRenderer;
  function Harness() {
    current = useLesson("local-fixture", storage);
    return null;
  }
  await act(async () => {
    root = create(React.createElement(Harness));
  });
  return {
    get current() {
      return current;
    },
    close: () => act(async () => root.unmount()),
  };
}
test("read failure never overwrites old data and retry restores it", async () => {
  let reads = 0;
  const writes: string[] = [];
  const data = journey().data;
  const h = await mount({
    getItem: async () => {
      if (++reads === 1) throw Error("offline");
      return JSON.stringify(data);
    },
    setItem: async (_, v) => {
      writes.push(v);
    },
  });
  assert.equal(h.current.ready, false);
  await act(async () => {
    h.current.send({ type: "start", id: "bad", at });
    h.current.retry();
  });
  assert.deepEqual(writes, []);
  assert.equal(h.current.ready, true);
  assert.deepEqual(h.current.data.runs, data.runs);
  await h.close();
});
test("failed saves are recoverable; rapid edits are serialized; remount restores the same run", async () => {
  let fail = true;
  let saved: string | null = null;
  const keys: string[] = [];
  const storage = {
    getItem: async () => saved,
    setItem: async (key: string, v: string) => {
      keys.push(key);
      if (fail) throw Error("quota");
      saved = v;
    },
  };
  const h = await mount(storage);
  await act(async () => {
    h.current.send({ type: "start", id: "saved", at });
    h.current.send({ type: "choose", id: opening.id, choice: 2 });
  });
  assert.ok(h.current.error);
  fail = false;
  await act(async () => h.current.retry());
  assert.equal(h.current.error, "");
  assert.equal(
    h.current.data.runs[0].syncRevision,
    undefined,
    "local-only records must remain eligible for archive import",
  );
  assert.ok(keys.every((k) => k === lessonKey("local-fixture")));
  await h.close();
  const restored = await mount(storage);
  assert.equal(restored.current.data.runs[0].drafts[`intro:${opening.id}`], 2);
  await restored.close();
});

function training() {
  let d = updateLesson(emptyLesson(), { type: "start", id: "navigation", at });
  d = updateLesson(d, { type: "choose", id: opening.id, choice: 1 });
  d = updateLesson(d, { type: "submit", at });
  d = updateLesson(d, { type: "next", from: "intro", index: 0 });
  return updateLesson(d, { type: "next", from: "video", index: 0 });
}
test("practice navigation is independent of checking and restores per-question drafts, hints and solutions", () => {
  let d = training();
  d = updateLesson(d, { type: "choose", id: practice[0].id, choice: 0 });
  d = updateLesson(d, { type: "hint" });
  d = updateLesson(d, { type: "practiceIndex", index: 5 });
  assert.deepEqual(d.runs[0].practice, {});
  d = updateLesson(d, { type: "practiceDone" });
  assert.equal(d.runs[0].stage, "practice");
  d = parseLesson(JSON.stringify(d));
  d = updateLesson(d, { type: "practiceIndex", index: 0 });
  assert.equal(d.runs[0].drafts[`practice:${practice[0].id}`], 0);
  assert.equal(d.runs[0].hints[practice[0].id], 1);
  d = updateLesson(d, { type: "submit", at });
  const answer = d.runs[0].practice[practice[0].id];
  d = updateLesson(d, { type: "practiceIndex", index: 1 });
  d = updateLesson(d, { type: "practiceIndex", index: 0 });
  d = updateLesson(d, { type: "choose", id: practice[0].id, choice: 1 });
  assert.deepEqual(d.runs[0].practice[practice[0].id], answer);
  for (const index of [-1, 6, 1.5, NaN])
    d = updateLesson(d, { type: "practiceIndex", index });
  assert.equal(d.runs[0].practiceIndex, 0);
});
test("old attempts retain their exact content, drafts and scores; new attempts use v2", () => {
  const old = newRun("legacy", at);
  delete old.contentVersion;
  old.stage = "check";
  old.practice[original.practice[0].id] = { choice: 1, at };
  old.drafts[`practice:${original.practice[1].id}`] = 2;
  original.check
    .slice(0, 7)
    .forEach((q) => (old.check[q.id] = { choice: q.correct, at }));
  let d = { ...emptyLesson(), runs: [old] };
  d = parseLesson(JSON.stringify(d));
  assert.deepEqual(d.runs[0], old);
  assert.equal(getLessonContent(d.runs[0]).check[0].id, "c-rope");
  assert.equal(result(d.runs[0]).percent, 70);
  d = updateLesson(d, { type: "finish", at });
  const frozen = JSON.stringify(d.runs[0]);
  d = updateLesson(d, { type: "start", id: "v2", at });
  assert.equal(d.runs[1].contentVersion, 2);
  assert.equal(getLessonContent(d.runs[1]).check[0].id, "v2-c-rhombus");
  assert.equal(JSON.stringify(d.runs[0]), frozen);
  assert.equal(result(d.runs[0]).percent, 70);
  const invalid = JSON.parse(JSON.stringify(d));
  invalid.runs[1].contentVersion = 999;
  assert.throws(() => parseLesson(JSON.stringify(invalid)));
  assert.ok(
    practice.every((q) => !original.practice.some((old) => old.id === q.id)),
  );
  assert.ok(check.every((q) => !original.check.some((old) => old.id === q.id)));
});
test("finishing practice from any reviewed task requires the complete set", () => {
  let d = training();
  practice.forEach((q, index) => {
    d = updateLesson(d, { type: "practiceIndex", index });
    d = updateLesson(d, { type: "choose", id: q.id, choice: q.correct });
    d = updateLesson(d, { type: "submit", at });
  });
  d = updateLesson(d, { type: "practiceIndex", index: 0 });
  d = updateLesson(d, { type: "practiceDone" });
  assert.equal(d.runs[0].stage, "return");
  assert.equal(Object.keys(d.runs[0].practice).length, 6);
});

test("continue requires a checked answer and returns to skipped drafts at the end", () => {
  let d = training();
  const send = (a: Action) => {
    d = updateLesson(d, a);
  };
  const before = d;
  send({ type: "practiceContinue", index: 0 });
  assert.equal(d, before);
  send({ type: "choose", id: practice[0].id, choice: 0 });
  send({ type: "hint" });
  // Leave the first question as a draft, then check all the others.
  for (let index = 1; index < practice.length; index++) {
    send({ type: "practiceIndex", index });
    send({ type: "choose", id: practice[index].id, choice: 0 });
    send({ type: "submit", at });
  }
  send({ type: "practiceContinue", index: practice.length - 1 });
  assert.equal(d.runs[0].practiceIndex, 0);
  assert.equal(d.runs[0].stage, "practice");
  assert.equal(d.runs[0].drafts[`practice:${practice[0].id}`], 0);
  assert.equal(d.runs[0].hints[practice[0].id], 1);
  assert.equal(d.runs[0].practice[practice[0].id], undefined);
  // A repeated event from the previous question cannot advance the new one.
  const restored = parseLesson(JSON.stringify(d));
  d = restored;
  send({ type: "practiceContinue", index: practice.length - 1 });
  assert.equal(d, restored);
  send({ type: "submit", at });
  assert.equal(d.runs[0].stage, "practice");
  const answers = JSON.stringify(d.runs[0].practice);
  send({ type: "practiceContinue", index: 0 });
  assert.equal(d.runs[0].stage, "return");
  const finished = d;
  send({ type: "practiceContinue", index: 0 });
  assert.equal(d, finished);
  assert.equal(JSON.stringify(d.runs[0].practice), answers);
});

test("continue follows question order when reviewing checked work", () => {
  let d = training();
  for (const index of [0, 1, 2]) {
    d = updateLesson(d, { type: "practiceIndex", index });
    d = updateLesson(d, { type: "choose", id: practice[index].id, choice: 0 });
    d = updateLesson(d, { type: "submit", at });
  }
  d = updateLesson(d, { type: "practiceIndex", index: 0 });
  d = updateLesson(d, { type: "practiceContinue", index: 0 });
  assert.equal(d.runs[0].practiceIndex, 1);
  assert.equal(Object.keys(d.runs[0].practice).length, 3);
  assert.equal(d.runs[0].stage, "practice");
});

test("primary task labels match their action in training and assessment", () => {
  let d = training();
  assert.deepEqual(taskControl(d.runs[0]), {
    label: "Проверить",
    disabled: true,
    action: "submit",
  });
  d = updateLesson(d, { type: "choose", id: practice[0].id, choice: 0 });
  assert.equal(taskControl(d.runs[0])?.disabled, false);
  d = updateLesson(d, { type: "submit", at });
  assert.deepEqual(taskControl(d.runs[0]), {
    label: "Далее",
    disabled: false,
    action: "practiceContinue",
  });
  for (let index = 1; index < practice.length; index++) {
    d = updateLesson(d, { type: "practiceIndex", index });
    d = updateLesson(d, { type: "choose", id: practice[index].id, choice: 0 });
    d = updateLesson(d, { type: "submit", at });
  }
  assert.equal(taskControl(d.runs[0])?.label, "Завершить");
  const j = journey();
  for (let index = 0; index < check.length; index++) {
    j.send({ type: "checkIndex", index });
    assert.deepEqual(taskControl(j.data.runs[0]), {
      label: index === check.length - 1 ? "Завершить" : "Далее",
      disabled: false,
      action: index === check.length - 1 ? "finish" : "checkContinue",
    });
  }
});

test("assessment Continue saves drafts, never grades, never finishes and ignores repeated events", () => {
  const j = journey();
  j.send({ type: "choose", id: check[0].id, choice: 0 });
  const answer = j.data.runs[0].check[check[0].id];
  const action = { type: "checkContinue" as const, index: 0 };
  j.send(action);
  j.send(action);
  assert.equal(j.data.runs[0].checkIndex, 1);
  assert.deepEqual(j.data.runs[0].check[check[0].id], answer);
  for (let index = 1; index < check.length; index++)
    j.send({ type: "checkContinue", index });
  assert.equal(j.data.runs[0].checkIndex, check.length - 1);
  assert.equal(j.data.runs[0].stage, "check");
  assert.equal(j.data.runs[0].finishedAt, undefined);
  assert.equal(Object.keys(j.data.runs[0].check).length, 1);
  assert.equal(result(j.data.runs[0]).total, 10);
  j.send({ type: "checkIndex", index: 0 });
  j.send({ type: "choose", id: check[0].id, choice: check[0].correct });
  assert.equal(j.data.runs[0].check[check[0].id].choice, check[0].correct);
});
