import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { act, create, ReactTestRenderer } from "react-test-renderer";
import { LocalRepository } from "../src/services/repository";
import { memoryStorage } from "../src/services/authSessionStorage";
import {
  applyStudyAnswer,
  applyStudyRead,
  groupSummary,
  StudyLedger,
  GroupSummary,
} from "../src/groups/model";
import { useGroupSummary } from "../src/groups/useGroupSummary";
import { course } from "../src/course/model";
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const topic = course[0];
test("group aggregates expose minimal peers, assigned teacher detail, stable ties and empty states", async () => {
  const state = await new LocalRepository(memoryStorage()).read();
  const group = state.classes[0],
    teacher = group.teacherIds[0],
    first = group.studentIds[0],
    second = group.studentIds[1];
  let ledger: StudyLedger = {};
  for (const id of [first, second])
    ledger = applyStudyAnswer(
      ledger,
      id,
      topic.id,
      1,
      0,
      id,
      "2026-10-14T10:00:00Z",
    ).ledger;
  const peer = groupSummary(state, first, group.id, ledger);
  assert(
    peer.rows.every(
      (r) => Object.keys(r).sort().join(",") === "isCurrent,name,rank,xp",
    ),
  );
  assert(peer.rows.filter((r) => r.xp === 20).every((r) => r.rank === 1));
  assert.equal(peer.rows.filter((r) => r.isCurrent).length, 1);
  assert.deepEqual(peer, groupSummary(state, first, group.id, ledger));
  assert(
    groupSummary(state, teacher, group.id, ledger).rows.every(
      (r) => typeof r.completedLessons === "number",
    ),
  );
  for (const actor of state.profiles.filter(
    (p) =>
      p.role === "parent" ||
      (p.role === "teacher" && !group.teacherIds.includes(p.id)),
  ))
    assert.throws(() => groupSummary(state, actor.id, group.id, ledger));
  assert.throws(() => groupSummary(state, first, "missing", ledger));
  const empty = { ...state, classes: [{ ...group, studentIds: [] }] };
  assert.equal(groupSummary(empty, teacher, group.id, {}).rows.length, 0);
});
test("verified answers alone award fixed unique XP; completion requires all reads and submitted answers", async () => {
  const state = await new LocalRepository(memoryStorage()).read();
  const group = state.classes[0],
    id = group.studentIds[0];
  let ledger: StudyLedger = {};
  assert.throws(() =>
    applyStudyAnswer(ledger, id, topic.id, 1, 999, "bad", "now"),
  );
  assert.throws(() =>
    applyStudyAnswer(ledger, id, topic.id, 999, 0, "bad", "now"),
  );
  const first = applyStudyAnswer(
    ledger,
    id,
    topic.id,
    1,
    0,
    "one",
    "2026-10-14T10:00:00Z",
  );
  ledger = first.ledger;
  assert.equal(first.result.awardedXp, 20);
  assert.equal(
    applyStudyAnswer(ledger, id, topic.id, 1, 0, "one", "later").result
      .awardedXp,
    0,
  );
  assert.throws(() =>
    applyStudyAnswer(ledger, id, topic.id, 1, 1, "one", "later"),
  );
  assert.equal(
    applyStudyAnswer(ledger, id, topic.id, 1, 0, "two", "later").result
      .awardedXp,
    0,
  );
  for (let q = 2; q <= topic.practice.count; q++)
    ledger = applyStudyAnswer(
      ledger,
      id,
      topic.id,
      q,
      1,
      `q${q}`,
      "2026-10-14T10:00:00Z",
    ).ledger;
  assert.equal(
    groupSummary(state, group.teacherIds[0], group.id, ledger).rows.find(
      (r) => r.studentId === id,
    )?.completedLessons,
    0,
  );
  for (let p = 0; p < topic.pages.length; p++)
    ledger = applyStudyRead(ledger, id, topic.id, p);
  assert.equal(
    groupSummary(state, group.teacherIds[0], group.id, ledger).rows.find(
      (r) => r.studentId === id,
    )?.completedLessons,
    1,
  );
  assert.equal(ledger[id].earned.length * 20, 20);
});
test("late group responses cannot replace another group, errors clear stale rows, retry recovers", async () => {
  const pending = new Map<
    string,
    { resolve: (d: GroupSummary) => void; reject: () => void }
  >();
  const load = (_actor: string, group: string) =>
    new Promise<GroupSummary>((resolve, reject) =>
      pending.set(group, { resolve, reject: () => reject(Error("fixture")) }),
    );
  let value!: ReturnType<typeof useGroupSummary>;
  const fixture = (id: string): GroupSummary => ({
    groupId: id,
    groupName: id,
    rows: [],
    teacherView: false,
  });
  function Harness({ group }: { group: string }) {
    value = useGroupSummary("student", group, true, load);
    // Check every render, including the render before the scope effect runs.
    if (value.data) assert.equal(value.data.groupId, group);
    return null;
  }
  let root!: ReactTestRenderer;
  await act(async () => {
    root = create(React.createElement(Harness, { group: "a" }));
  });
  await act(async () =>
    root.update(React.createElement(Harness, { group: "b" })),
  );
  await act(async () => pending.get("a")!.resolve(fixture("a")));
  assert.equal(value.data, null);
  assert.equal(value.loading, true);
  await act(async () => pending.get("b")!.reject());
  assert.ok(value.error);
  assert.equal(value.data, null);
  await act(async () => value.refresh());
  assert.equal(value.error, "");
  assert.equal(value.loading, true);
  await act(async () => pending.get("b")!.resolve(fixture("b")));
  assert.equal((value.data as GroupSummary | null)?.groupId, "b");
  await act(async () =>
    root.update(React.createElement(Harness, { group: "c" })),
  );
  assert.equal(value.data, null);
  assert.equal(value.loading, true);
  await act(async () => root.unmount());
});
