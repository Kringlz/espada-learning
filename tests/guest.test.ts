import test from "node:test";
import assert from "node:assert/strict";
import {
  GuestRepository,
  GUEST_ID,
  GUEST_STATE_KEY,
} from "../src/services/guest";
import { STORAGE_KEY } from "../src/services/repository";
import { progressKey } from "../src/course/model";

function fixture() {
  const values = new Map<string, string>([[STORAGE_KEY, "existing demo"]]);
  const storage = {
    getItem: async (key: string) => values.get(key) ?? null,
    setItem: async (key: string, value: string) => {
      values.set(key, value);
    },
  };
  return { values, storage, repo: new GuestRepository(storage) };
}

test("guest starts as a single student with no fabricated results or adult accounts", async () => {
  const f = fixture();
  const state = await f.repo.read();
  assert.deepEqual(
    state.profiles.map((p) => [p.id, p.role]),
    [[GUEST_ID, "student"]],
  );
  assert.ok(state.topics.length > 0);
  for (const key of [
    "classes",
    "assessments",
    "attempts",
    "activities",
    "assignments",
  ] as const)
    assert.deepEqual(state[key], []);
  assert.equal(f.values.get(STORAGE_KEY), "existing demo");
  assert.notEqual(progressKey(GUEST_ID), progressKey("registered-student"));
});

test("guest work survives a new repository instance and cannot overwrite another student", async () => {
  const f = fixture();
  const state = await f.repo.read();
  const activity = {
    id: "guest-activity",
    studentId: GUEST_ID,
    topicId: state.topics[0].id,
    stage: "practice" as const,
    answers: {},
    questionIds: [],
    attemptId: "",
    videoSeconds: 0,
    updatedAt: "2026-10-30T00:00:00Z",
  };
  await f.repo.dispatch({ type: "saveActivity", activity });
  const reopened = new GuestRepository(f.storage);
  assert.equal((await reopened.read()).activities[0].studentId, GUEST_ID);
  await assert.rejects(
    reopened.dispatch({
      type: "saveActivity",
      activity: { ...activity, studentId: "real-student" },
    }),
  );
  assert.equal((await reopened.read()).activities.length, 1);
  assert.equal(f.values.get(STORAGE_KEY), "existing demo");
});

test("guest cannot perform teacher actions", async () => {
  const f = fixture();
  await assert.rejects(
    f.repo.dispatch({
      type: "createGroup",
      id: "group",
      name: "Group",
      schedule: "",
    }),
  );
  assert.deepEqual((await f.repo.read()).classes, []);
});

test("unreadable guest storage is preserved instead of replaced", async () => {
  const f = fixture();
  f.values.set(GUEST_STATE_KEY, "broken data");
  await assert.rejects(f.repo.read());
  assert.equal(f.values.get(GUEST_STATE_KEY), "broken data");
});
