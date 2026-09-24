import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { fixedId as id } from "../src/core/ids";
import {
  applyCommand,
  assessmentScore,
  estimate,
  recommendations,
  scopedState,
  validateMarks,
  checkQuestions,
  canAccess,
} from "../src/core/engine";
import { LocalRepository, STORAGE_KEY } from "../src/services/repository";
import { State, Attempt, Assessment } from "../src/core/types";
const now = "2026-09-23T10:00:00.000Z";
const seed = () => createSeed(new Date(now));
const attempt = (s: State, n = 90): Attempt => ({
  id: id(n),
  studentId: id(1),
  topicId: "equivalent",
  at: now,
  answers: s.topics
    .find((t) => t.id === "equivalent")!
    .checks.slice(0, 3)
    .map((q) => ({ questionId: q.id, choice: q.answer, assisted: false })),
});
test("partial marks and missing coverage have different denominators", () => {
  const s = seed(),
    a = s.assessments[0];
  a.marks = a.marks.map((m) => ({
    ...m,
    status: "not_administered",
    earned: null,
  }));
  a.marks[0] = { ...a.marks[0], status: "marked", earned: 0.5 };
  a.marks[1] = { ...a.marks[1], status: "unanswered", earned: 0 };
  const score = assessmentScore(s, a);
  assert.equal(score.earned, 0.5);
  assert.equal(score.max, 4);
  assert.equal(score.covered, 2);
  assert.equal(score.percent, 13);
});
test("publishing incomplete, negative, excessive or duplicate marks fails", () => {
  const s = seed(),
    t = s.templates[0];
  const marks = s.assessments[0].marks;
  for (const change of [
    { status: "unmarked", earned: null },
    { status: "marked", earned: -1 },
    { status: "marked", earned: 3 },
  ] as const)
    assert.throws(() =>
      validateMarks(t, [{ ...marks[0], ...change }, ...marks.slice(1)], true),
    );
  assert.throws(() => validateMarks(t, [marks[1], ...marks.slice(1)], true));
});
test("student scope hides classmates, drafts and staff audit", () => {
  const s = seed();
  s.assessments.push({ ...s.assessments[0], id: id(99), studentId: id(2) });
  const view = scopedState(s, s.profiles[0]);
  assert.ok(view.assessments.every((a) => a.studentId === id(1)));
  assert.ok(view.profiles.every((p) => p.id === id(1)));
  assert.ok(view.classes.every((c) => c.studentIds.every((x) => x === id(1))));
  assert.equal(view.audit.length, 0);
});
test("teachers only access their assigned students and cannot grant access", () => {
  const s = seed();
  assert.equal(canAccess(s, s.profiles[2], id(1)), true);
  assert.equal(canAccess(s, s.profiles[4], id(1)), false);
  assert.throws(() =>
    applyCommand(
      s,
      id(5),
      { type: "saveAssessment", assessment: s.assessments[0] },
      now,
    ),
  );
  assert.throws(() =>
    applyCommand(s, id(3), { type: "saveClass", classroom: s.classes[1] }, now),
  );
});
test("student cannot publish, impersonate another student, or edit content", () => {
  const s = seed();
  assert.throws(() =>
    applyCommand(
      s,
      id(1),
      {
        type: "publishAssessment",
        id: id(20),
        expectedRevision: 1,
        reason: "bad",
      },
      now,
    ),
  );
  assert.throws(() =>
    applyCommand(s, id(2), { type: "submitAttempt", attempt: attempt(s) }, now),
  );
  assert.throws(() =>
    applyCommand(s, id(1), { type: "saveTopic", topic: s.topics[0] }, now),
  );
});
test("lesson viewing never changes evidence", () => {
  const s = seed();
  const before = estimate(s, id(1), "equivalent", new Date(now));
  const after = applyCommand(
    s,
    id(1),
    {
      type: "saveActivity",
      activity: {
        id: id(80),
        studentId: id(1),
        topicId: "equivalent",
        stage: "lesson",
        answers: {},
        questionIds: [],
        attemptId: id(90),
        videoSeconds: 300,
        updatedAt: now,
      },
    },
    now,
  );
  assert.deepEqual(estimate(after, id(1), "equivalent", new Date(now)), before);
});
test("practice affects estimate without rewriting historical paper scores", () => {
  const s = seed();
  const after = applyCommand(
    s,
    id(1),
    { type: "submitAttempt", attempt: attempt(s) },
    now,
  );
  assert.deepEqual(after.assessments, s.assessments);
  assert.ok(
    estimate(after, id(1), "equivalent", new Date(now)).value! >
      estimate(s, id(1), "equivalent", new Date(now)).value!,
  );
  assert.ok(after.assignments[0].completedAt);
});
test("submission retries are idempotent and repeat questions do not inflate evidence", () => {
  let s = seed();
  const a = attempt(s);
  s = applyCommand(s, id(1), { type: "submitAttempt", attempt: a }, now);
  const first = estimate(s, id(1), "equivalent", new Date(now));
  s = applyCommand(s, id(1), { type: "submitAttempt", attempt: a }, now);
  assert.equal(s.attempts.length, 1);
  s = applyCommand(
    s,
    id(1),
    { type: "submitAttempt", attempt: { ...a, id: id(91) } },
    now,
  );
  assert.equal(s.attempts.length, 2);
  assert.deepEqual(estimate(s, id(1), "equivalent", new Date(now)), first);
  assert.ok(
    checkQuestions(
      s,
      id(1),
      s.topics.find((t) => t.id === "equivalent")!,
    ).every((q) => !a.answers.some((x) => x.questionId === q.id)),
  );
});
test("assistance, invalid choices and duplicate questions are rejected", () => {
  const s = seed();
  for (const answers of [
    attempt(s).answers.map((a) => ({ ...a, assisted: true })),
    attempt(s).answers.map((a) => ({ ...a, choice: 9 })),
    Array(3).fill(attempt(s).answers[0]),
  ])
    assert.throws(() =>
      applyCommand(
        s,
        id(1),
        { type: "submitAttempt", attempt: { ...attempt(s), answers } },
        now,
      ),
    );
});
test("first wrong answer stays evidence even after a correct repeat", () => {
  let s = seed();
  s.assessments = [];
  const a = attempt(s);
  a.answers = a.answers.map((x) => ({ ...x, choice: (x.choice + 1) % 4 }));
  s = applyCommand(s, id(1), { type: "submitAttempt", attempt: a }, now);
  s = applyCommand(
    s,
    id(1),
    { type: "submitAttempt", attempt: attempt(s, 91) },
    now,
  );
  assert.equal(estimate(s, id(1), "equivalent", new Date(now)).value, 0);
});
test("missing and expired evidence produce insufficient evidence, not zero ability", () => {
  const s = seed();
  assert.equal(estimate(s, id(2), "equivalent", new Date(now)).value, null);
  assert.equal(
    estimate(s, id(1), "equivalent", new Date("2028-01-01")).value,
    null,
  );
});
test("recommendations respect prerequisite gaps, overrides and determinism", () => {
  const s = seed();
  s.assignments[0].topicId = "add-fractions";
  const r = recommendations(s, id(1), new Date(now));
  assert.equal(r[0].topicId, "equivalent");
  assert.equal(r[0].kind, "prerequisite");
  assert.deepEqual(r, recommendations(s, id(1), new Date(now)));
  assert.equal(
    recommendations(s, id(2), new Date(now))[0].topicId,
    "place-value",
  );
});
test("corrections preserve original data and detect stale revisions", () => {
  let s = seed();
  const original = structuredClone(s.assessments[0]);
  const marks = original.marks.map((m) => ({ ...m, earned: 2 }));
  s = applyCommand(
    s,
    id(3),
    {
      type: "publishAssessment",
      id: original.id,
      expectedRevision: 1,
      reason: "Rechecked rubric",
      marks,
    },
    now,
  );
  assert.equal(s.assessments[0].revision, 2);
  assert.deepEqual(s.audit[0].before, original);
  assert.throws(() =>
    applyCommand(
      s,
      id(3),
      {
        type: "publishAssessment",
        id: original.id,
        expectedRevision: 1,
        reason: "stale",
      },
      now,
    ),
  );
  assert.throws(() =>
    applyCommand(
      s,
      id(3),
      {
        type: "publishAssessment",
        id: original.id,
        expectedRevision: 2,
        reason: "",
      },
      now,
    ),
  );
});
test("template and question bank with results are immutable", () => {
  let s = seed();
  assert.throws(() =>
    applyCommand(
      s,
      id(4),
      { type: "saveTemplate", template: s.templates[0] },
      now,
    ),
  );
  s = applyCommand(
    s,
    id(1),
    { type: "submitAttempt", attempt: attempt(s) },
    now,
  );
  const topic = structuredClone(s.topics.find((t) => t.id === "equivalent")!);
  topic.checks[0].answer = (topic.checks[0].answer + 1) % 4;
  assert.throws(() =>
    applyCommand(s, id(4), { type: "saveTopic", topic }, now),
  );
});
test("full cycle publishes to the correct student and returns teacher activity", () => {
  let s = seed();
  const a: Assessment = {
    ...s.assessments[0],
    id: id(70),
    studentId: id(2),
    status: "draft",
    revision: 0,
    date: "2026-09-23",
  };
  s = applyCommand(s, id(3), { type: "saveAssessment", assessment: a }, now);
  assert.equal(scopedState(s, s.profiles[1]).assessments.length, 0);
  s = applyCommand(
    s,
    id(3),
    { type: "publishAssessment", id: a.id, expectedRevision: 0, reason: "" },
    now,
  );
  assert.equal(scopedState(s, s.profiles[1]).assessments.length, 1);
  s = applyCommand(
    s,
    id(2),
    { type: "submitAttempt", attempt: { ...attempt(s), studentId: id(2) } },
    now,
  );
  assert.equal(scopedState(s, s.profiles[2]).attempts.length, 1);
  assert.equal(scopedState(s, s.profiles[4]).attempts.length, 0);
});
test("persistent repository survives recreation and does not claim failed saves", async () => {
  let raw: string | null = null;
  let fail = false;
  const storage = {
    getItem: async () => raw,
    setItem: async (_k: string, v: string) => {
      if (fail) throw Error("Disk full");
      raw = v;
    },
  };
  const repo = new LocalRepository(storage);
  let s = await repo.read();
  s = await repo.dispatch(id(1), {
    type: "submitAttempt",
    attempt: attempt(s),
  });
  assert.equal((await new LocalRepository(storage).read()).attempts.length, 1);
  fail = true;
  await assert.rejects(
    repo.dispatch(id(1), { type: "requestDeletion", id: id(95) }),
  );
  assert.equal((await repo.read()).deletionRequests.length, 0);
  fail = false;
  await repo.dispatch(id(1), { type: "requestDeletion", id: id(95) });
  assert.equal((await repo.read()).deletionRequests.length, 1);
});
test("erasure removes student records, class membership and related audit", () => {
  let s = seed();
  s = applyCommand(s, id(1), { type: "requestDeletion", id: id(92) }, now);
  s = applyCommand(s, id(4), { type: "eraseStudent", studentId: id(1) }, now);
  assert.ok(!s.profiles.some((p) => p.id === id(1)));
  assert.ok(!s.assessments.some((a) => a.studentId === id(1)));
  assert.ok(s.classes.every((c) => !c.studentIds.includes(id(1))));
});
import { LearningOutbox } from "../src/services/outbox";
test("outbox keeps interrupted submissions across restart and drains in order", async () => {
  let raw: string | null = null;
  let online = false;
  let s = seed();
  const storage = {
    getItem: async () => raw,
    setItem: async (_k: string, v: string) => {
      raw = v;
    },
    removeItem: async () => {
      raw = null;
    },
  };
  const send = async (c: Parameters<typeof applyCommand>[2]) => {
    if (!online) throw Error("Offline");
    s = applyCommand(s, id(1), c, now);
    return s;
  };
  const first = new LearningOutbox(storage, send);
  const cmd = { type: "submitAttempt" as const, attempt: attempt(s) };
  await assert.rejects(first.submit(id(1), cmd));
  assert.equal((await first.read(id(1))).length, 1);
  online = true;
  const restarted = new LearningOutbox(storage, send);
  await restarted.retry(id(1));
  assert.equal(s.attempts.length, 1);
  assert.equal((await restarted.read(id(1))).length, 0);
});
test("outbox safely replays a server commit whose acknowledgement was lost", async () => {
  let raw: string | null = null;
  let s = seed(),
    loseAck = true;
  const storage = {
    getItem: async () => raw,
    setItem: async (_k: string, v: string) => {
      raw = v;
    },
    removeItem: async () => {
      raw = null;
    },
  };
  const outbox = new LearningOutbox(storage, async (c) => {
    s = applyCommand(s, id(1), c, now);
    if (loseAck) {
      loseAck = false;
      throw Error("Connection lost after commit");
    }
    return s;
  });
  const cmd = { type: "submitAttempt" as const, attempt: attempt(s) };
  await assert.rejects(outbox.submit(id(1), cmd));
  await outbox.submit(id(1), cmd);
  assert.equal(s.attempts.length, 1);
  assert.equal((await outbox.read(id(1))).length, 0);
});
import { comparableAssessments } from "../src/core/engine";
test("charts connect only a matching series and identical administered coverage", () => {
  const s = seed();
  assert.equal(comparableAssessments(s, id(1), "foundations-a").length, 2);
  const latest = s.assessments[1];
  latest.marks[0] = {
    ...latest.marks[0],
    status: "not_administered",
    earned: null,
  };
  assert.equal(comparableAssessments(s, id(1), "foundations-a").length, 1);
  const t = { ...s.templates[0], id: id(66), series: "harder-paper" };
  s.templates.push(t);
  s.assessments.push({ ...latest, id: id(67), templateId: t.id });
  assert.equal(comparableAssessments(s, id(1), "harder-paper").length, 1);
});
import { ChunkedPrivateStorage } from "../src/services/privateStorage";
test("secure chunk storage handles large sessions and interrupted writes atomically", async () => {
  const data = new Map<string, string>();
  let writes = 0,
    failAt = Infinity;
  const storage = {
    getItem: async (k: string) => data.get(k) ?? null,
    setItem: async (k: string, v: string) => {
      if (++writes === failAt) throw Error("Interrupted");
      data.set(k, v);
    },
    removeItem: async (k: string) => {
      data.delete(k);
    },
  };
  const chunked = new ChunkedPrivateStorage(storage);
  await chunked.setItem("auth", "old".repeat(1500));
  assert.equal(await chunked.getItem("auth"), "old".repeat(1500));
  failAt = writes + 3;
  await assert.rejects(chunked.setItem("auth", "new".repeat(1800)));
  assert.equal(await chunked.getItem("auth"), "old".repeat(1500));
  failAt = Infinity;
  await chunked.setItem("auth", "fresh");
  assert.equal(await chunked.getItem("auth"), "fresh");
  await chunked.removeItem("auth");
  assert.equal(await chunked.getItem("auth"), null);
  assert.equal(data.size, 0);
});
import { curriculum } from "../src/data/curriculum";
test("every original question has exactly one mathematically distinct correct choice", () => {
  const value = (s: string) => {
    const frac = s.match(/^(\d+)\/(\d+)$/);
    return frac
      ? Number(frac[1]) / Number(frac[2])
      : Number(s.replace(/[^\d.-]/g, ""));
  };
  for (const t of curriculum) {
    for (const q of [...(t.practice ? [t.practice] : []), ...t.checks]) {
      assert.equal(
        new Set(q.choices.map(value)).size,
        4,
        `Ambiguous answers: ${q.id}`,
      );
      assert.ok(q.answer >= 0 && q.answer < 4);
      assert.ok(q.explanation && q.hint);
    }
  }
});
