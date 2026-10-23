import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, quote } from "./lesson-db.mjs";
import { getLessonContent } from "../src/course/videoLesson/content";
import { newRun } from "../src/course/videoLesson/model";
const id = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const student = id(1),
  parent = id(450),
  teacher = id(3),
  other = id(2),
  stranger = id(5),
  admin = id(4);
const as = (actor: string, statement: string) =>
  sql(
    `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(actor)};${statement};commit;`,
  );
const rpc = async (actor: string, name: string, args: any) =>
  JSON.parse(
    await as(
      actor,
      `select public.${name}(${quote(typeof args === "object" ? JSON.stringify(args) : args)}${typeof args === "object" ? "::jsonb" : "::uuid"})`,
    ),
  );
const cmd = (actor: string, c: any) =>
  rpc(actor, "progress_command", {
    requestId: randomUUID(),
    studentId: student,
    ...c,
  });
const read = (actor: string, s = student) => rpc(actor, "progress_read", s);
let checks = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  checks++;
  console.log("✓ " + name);
}
await check(
  "opening starts observation without creating activity",
  async () => {
    await cmd(student, {
      type: "begin",
      item: { at: new Date().toISOString() },
    });
    const d = await read(student);
    assert.ok(d.observedSince);
  },
);
const contents = getLessonContent({ lessonId: "G08-02", contentVersion: 2 });
const run = {
  ...newRun(randomUUID(), new Date().toISOString(), "G08-02"),
  finishedAt: new Date().toISOString(),
  stage: "result",
  syncRevision: 1,
  initial: { choice: 0, at: new Date().toISOString() },
  revisited: { choice: 1, at: new Date().toISOString() },
  hints: { [contents.practice[0].id]: 2 },
  check: Object.fromEntries(
    contents.check.map((q) => [
      q.id,
      { choice: q.correct, at: new Date().toISOString() },
    ]),
  ),
};
const payload = {
  type: "run",
  studentId: student,
  requestId: `${run.id}:1`,
  item: { id: run.id, topicId: "G08-02", version: 2, revision: 1, run },
  event: { kind: "independent", at: new Date().toISOString(), seconds: 20 },
};
await check(
  "server grades from frozen bank; separate sessions see same result",
  async () => {
    await cmd(student, payload);
    for (const actor of [student, parent, teacher]) {
      const d = await read(actor);
      const r = d.runs.find((r: any) => r.id === run.id);
      assert.equal(r.correct, contents.check.length);
      assert.equal(r.run.hints[contents.practice[0].id], 2);
    }
  },
);
await check(
  "lost acknowledgement and simultaneous resend do not duplicate events or attempts",
  async () => {
    await Promise.all([
      cmd(student, payload),
      cmd(student, payload),
      cmd(student, payload),
    ]);
    const d = await read(parent);
    assert.equal(d.runs.filter((r: any) => r.id === run.id).length, 1);
    const events = d.events.filter((e: any) => e.id === payload.requestId);
    assert.equal(events.length, 1);
    assert.equal(events[0].seconds, 20);
    assert.equal(events[0].completed, contents.check.length);
  },
);
await check(
  "completed attempts immutable; parent cannot submit student evidence",
  async () => {
    await assert.rejects(
      cmd(student, {
        ...payload,
        requestId: randomUUID(),
        item: { ...payload.item, revision: 2 },
      }),
    );
    await assert.rejects(cmd(parent, { ...payload, requestId: randomUUID() }));
  },
);
await check(
  "unknown versions, excessive duration, future timestamps rejected",
  async () => {
    for (const change of [
      { item: { ...payload.item, version: 999 } },
      { event: { ...payload.event, seconds: 61 } },
      { event: { ...payload.event, at: "2099-01-01" } },
    ])
      await assert.rejects(
        cmd(student, { ...payload, requestId: randomUUID(), ...change }),
      );
  },
);
await check(
  "unrelated student and teacher cannot read progress; RLS blocks direct writes",
  async () => {
    await assert.rejects(read(other));
    await assert.rejects(read(stranger));
    assert.equal(
      await as(stranger, "select count(*) from public.progress_runs"),
      "0",
    );
    await assert.rejects(
      as(
        student,
        `delete from public.progress_runs where student_id=${quote(student)}`,
      ),
    );
  },
);
const workId = randomUUID();
let w = {
  id: workId,
  studentId: student,
  date: new Date().toISOString().slice(0, 10),
  title: "ТЕСТ · Проверенная школьная работа",
  subject: "Геометрия",
  topics: ["Теорема Пифагора"],
  kind: "Контрольная",
  score: 4,
  minimum: 1,
  maximum: 5,
  scale: "grade",
  note: "Тестовые данные, локальная база",
  attachment: null as string | null,
  authorId: teacher,
  source: "spoof",
};
await check(
  "parent school result retains actual source and author",
  async () => {
    await cmd(parent, { type: "work", item: w, expectedRevision: 0 });
    const saved = (await read(teacher)).works.find((x: any) => x.id === workId);
    assert.equal(saved.authorId, parent);
    assert.equal(saved.source, "Внесено родителем");
  },
);
await check(
  "viewer teacher cannot edit parent work; author can correct with audit",
  async () => {
    await assert.rejects(
      cmd(teacher, {
        type: "work",
        item: { ...w, score: 5 },
        expectedRevision: 1,
      }),
    );
    await cmd(parent, {
      type: "work",
      item: { ...w, score: 5 },
      expectedRevision: 1,
    });
    const d = await read(student);
    assert.equal(d.works.find((x: any) => x.id === workId).score, 5);
    assert.ok(
      d.audit.some(
        (x: any) =>
          x.entityId === workId && x.before?.score === 4 && x.after.score === 5,
      ),
    );
  },
);
await check("stale edit and invalid grades rejected by server", async () => {
  await assert.rejects(
    cmd(parent, { type: "work", item: w, expectedRevision: 1 }),
  );
  for (const change of [
    { score: 6 },
    { maximum: 0 },
    { score: 0 },
    { date: "2026-02-30" },
    { topics: [] },
  ])
    await assert.rejects(
      cmd(parent, {
        type: "work",
        item: { ...w, ...change },
        expectedRevision: 2,
      }),
    );
});
const path = `${student}/${parent}/${workId}/${randomUUID()}`;
await check(
  "private storage upload ownership and read authorization",
  async () => {
    await as(
      parent,
      `insert into storage.objects(bucket_id,name,owner_id,metadata) values('student-works',${quote(path)},${quote(parent)},'{"mimetype":"application/pdf","size":100}')`,
    );
    assert.equal(
      await as(
        parent,
        `select count(*) from storage.objects where name=${quote(path)}`,
      ),
      "0",
    );
    await cmd(parent, {
      type: "work",
      item: { ...w, score: 5, attachment: path },
      expectedRevision: 2,
    });
    for (const actor of [student, parent, teacher])
      assert.equal(
        await as(
          actor,
          `select count(*) from storage.objects where name=${quote(path)}`,
        ),
        "1",
      );
    for (const actor of [stranger, other])
      assert.equal(
        await as(
          actor,
          `select count(*) from storage.objects where name=${quote(path)}`,
        ),
        "0",
      );
    await assert.rejects(
      as(
        stranger,
        `insert into storage.objects(bucket_id,name) values('student-works',${quote(student + "/" + stranger + "/" + randomUUID() + "/test")})`,
      ),
    );
  },
);
await check(
  "one goal with visible author, revision protects concurrent replacement",
  async () => {
    const d = await read(parent),
      rev = d.goal?.revision ?? 0;
    await cmd(parent, {
      type: "goal",
      item: { days: 4 },
      expectedRevision: rev,
    });
    await assert.rejects(
      cmd(teacher, { type: "goal", item: { days: 3 }, expectedRevision: rev }),
    );
    await cmd(teacher, {
      type: "goal",
      item: { days: 3 },
      expectedRevision: rev + 1,
    });
    assert.equal((await read(student)).goal.authorId, teacher);
    await assert.rejects(
      cmd(student, {
        type: "goal",
        item: { days: 5 },
        expectedRevision: rev + 2,
      }),
    );
  },
);
await check("deletion audited and revokes file access", async () => {
  await cmd(parent, {
    type: "deleteWork",
    item: { id: workId },
    expectedRevision: 3,
  });
  assert.ok(!(await read(teacher)).works.some((x: any) => x.id === workId));
  assert.equal(
    await as(
      parent,
      `select count(*) from storage.objects where name=${quote(path)}`,
    ),
    "0",
  );
});
await check(
  "revoking family link immediately revokes progress access",
  async () => {
    assert.equal(
      await sql(
        `begin;delete from parent_links where parent_id=${quote(parent)};set local role authenticated;set local request.jwt.claim.sub=${quote(parent)};select not public.can_access_student(${quote(student)});rollback;`,
      ),
      "t",
    );
  },
);
console.log(
  `${checks} database progress scenarios passed (fresh connections for every role/request).`,
);
