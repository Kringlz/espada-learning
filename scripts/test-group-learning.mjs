import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, quote, actors } from "./lesson-db.mjs";
const group = "00000000-0000-4000-8000-000000000006";
const emptyGroup = "00000000-0000-4000-8000-000000000960";
const outsider = "00000000-0000-4000-8000-000000000005";
const parent = "00000000-0000-4000-8000-000000000961";
const topic = "qa-group-" + randomUUID().slice(0, 8);
async function call(actor, fn, args, role = "authenticated") {
  const raw = await sql(
    `begin;set local role ${role};set local request.jwt.claim.sub=${quote(actor ?? "")};select public.${fn}(${args});commit;`,
  );
  return raw ? JSON.parse(raw) : null;
}
const answer = (actor, question, choice, id = randomUUID()) =>
  call(
    actor,
    "record_course_answer",
    `${quote(topic)},${question},${choice},${quote(id)}::uuid`,
  );
const summary = (actor) =>
  call(actor, "group_learning_summary", `${quote(group)}::uuid`);
await sql(
  `insert into public.study_topics values(${quote(topic)},1,2);insert into public.study_questions values(${quote(topic)},1,0),(${quote(topic)},2,0);insert into public.classes(id,name,join_code) values(${quote(emptyGroup)},'Empty QA','QA23456');insert into public.class_memberships values(${quote(emptyGroup)},${quote(actors.teacher)});insert into auth.users values(${quote(parent)});insert into public.profiles(id,name,role,active,code) values(${quote(parent)},'QA parent','parent',true,'QP23456');`,
);
for (const actor of [outsider, parent]) await assert.rejects(summary(actor));
await assert.rejects(
  call(null, "group_learning_summary", `${quote(group)}::uuid`, "anon"),
);
await assert.rejects(
  call(actors.student, "group_learning_summary", `${quote(emptyGroup)}::uuid`),
);
assert.equal(
  (
    await call(
      actors.teacher,
      "group_learning_summary",
      `${quote(emptyGroup)}::uuid`,
    )
  ).rows.length,
  0,
);
for (const actor of [actors.teacher, actors.admin, outsider, parent])
  await assert.rejects(answer(actor, 1, 0));
await assert.rejects(
  call(
    actors.student,
    "record_course_answer",
    `${quote(topic)},1,0,${quote(randomUUID())}::uuid,ARRAY[99]`,
  ),
);
await assert.rejects(answer(actors.student, 99, 0));
await assert.rejects(answer(actors.student, 1, 20));
await assert.rejects(
  call(actors.student, "record_course_read", `${quote(topic)},3`),
);
for (const statement of [
  "select * from public.study_xp",
  "select * from public.study_answers",
  "select * from public.study_questions",
  `select public.study_totals(${quote(actors.other)})`,
  `insert into public.study_xp(student_id,topic_id,question_no) values(${quote(actors.student)},${quote(topic)},1)`,
])
  await assert.rejects(
    sql(
      `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(actors.student)};${statement};commit;`,
    ),
  );
console.log(
  "✓ authorization matrix: assigned teacher / own student / other group / parent / unauthenticated / direct table / private helper",
);
const request = randomUUID();
const results = await Promise.all(
  Array.from({ length: 6 }, () => answer(actors.student, 1, 0, request)),
);
assert.equal(
  results.reduce((s, r) => s + r.awardedXp, 0),
  20,
);
assert(results.every((r) => r.totalXp === 20));
await assert.rejects(answer(actors.student, 2, 0, request));
const extra = await Promise.all(
  Array.from({ length: 5 }, () => answer(actors.student, 1, 0)),
);
assert(extra.every((r) => r.awardedXp === 0));
assert.equal((await answer(actors.student, 2, 1)).awardedXp, 0);
console.log(
  "✓ refresh/retry/concurrent submits award one +20; forged points, question and reused request rejected",
);
await call(actors.student, "record_course_read", `${quote(topic)},0`);
let t = await summary(actors.teacher),
  own = t.rows.find((r) => r.studentId === actors.student);
assert.equal(own.xp, 20);
assert.equal(own.completedLessons, 1);
assert(own.lastActivity);
const timestamp = own.lastActivity;
await answer(actors.student, 1, 0, request); // network replay cannot manufacture fresh activity
assert.equal(
  (await summary(actors.teacher)).rows.find(
    (r) => r.studentId === actors.student,
  ).lastActivity,
  timestamp,
);
await answer(actors.other, 1, 0);
const studentView = await summary(actors.student);
assert.equal(studentView.teacherView, false);
for (const r of studentView.rows)
  assert.deepEqual(
    Object.keys(r).sort(),
    ["isCurrent", "name", "rank", "xp"].sort(),
  );
assert.equal(studentView.rows.filter((r) => r.isCurrent).length, 1);
assert(studentView.rows.filter((r) => r.xp === 20).every((r) => r.rank === 1));
assert.deepEqual(studentView.rows, (await summary(actors.student)).rows);
assert.equal((await answer(actors.student, 2, 0)).awardedXp, 20);
assert.equal(
  (await summary(actors.student)).rows.find((r) => r.isCurrent).xp,
  40,
);
await sql(
  `update public.profiles set active=false where id=${quote(actors.other)};`,
);
await assert.rejects(answer(actors.other, 2, 0));
assert(
  !(await summary(actors.teacher)).rows.some(
    (r) => r.studentId === actors.other,
  ),
);
await sql(
  `update public.profiles set active=true where id=${quote(actors.other)};`,
);
console.log(
  "✓ completed lesson, last verified activity, stable tied ranks, minimum peer data and post-answer refresh",
);
console.log("Group learning PostgreSQL checks passed.");
