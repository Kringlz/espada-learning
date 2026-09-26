import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { rpc, sql, quote, actors } from "./lesson-db.mjs";
const data = JSON.parse(
  await readFile(
    new URL("../content/demo-lessons.json", import.meta.url),
    "utf8",
  ),
);
const prefix = "verify-" + randomUUID().slice(0, 8) + "-";
for (const c of data.courses) c.id = prefix + c.id;
for (const s of data.sections) {
  s.id = prefix + s.id;
  s.courseId = prefix + s.courseId;
}
for (const l of data.lessons) {
  l.id = prefix + l.id;
  l.sectionId = prefix + l.sectionId;
  l.questions.forEach((q) => (q.id = prefix + q.id));
}
const admin = (name, args) => rpc(actors.admin, name, args),
  student = (name, args) => rpc(actors.student, name, args);
const importData = (p = data, dry = false, id = randomUUID()) =>
  admin("lesson_import", { p_package: p, p_dry_run: dry, p_request_id: id });
const counts = () =>
  sql(
    `select jsonb_build_array((select count(*) from public.course_lessons),(select count(*) from public.lesson_questions),(select count(*) from public.lesson_options));`,
  );
const asRole = (actor, statement, role = "authenticated") =>
  sql(
    `begin;set local role ${role};set local request.jwt.claim.sub=${quote(actor)};${statement};rollback;`,
  );
const fail = async (action, pattern) => assert.rejects(action, pattern);
let checks = 0;
const ok = (s) => {
  checks++;
  console.log("✓ " + s);
};
try {
  const before = await counts();
  await importData(data, true);
  assert.equal(await counts(), before);
  ok("dry-run changes no rows");
  const invalid = structuredClone(data);
  invalid.lessons[2].questions[19].correctOptionIds = ["missing"];
  await fail(() => importData(invalid), /правильный ответ/);
  assert.equal(await counts(), before);
  ok("invalid last question rolls back entire package");
  const req = randomUUID();
  await importData(data, false, req);
  const after = await counts();
  await importData(data, false, req);
  assert.equal(await counts(), after);
  await importData();
  assert.equal(await counts(), after);
  ok("import, idempotent network retry, and re-import create no duplicates");
  await fail(
    () => student("lesson_read", { p_id: data.lessons[0].id }),
    /недоступен/,
  );
  assert(
    !(await student("lesson_catalog")).lessons.some(
      (l) => l.id === data.lessons[0].id,
    ),
  );
  for (const name of ["course_lessons", "lesson_sections", "lesson_courses"])
    assert.equal(
      await asRole(
        actors.student,
        `select count(*) from public.${name} where id like ${quote(prefix + "%")}`,
      ),
      "0",
    );
  ok("draft lessons/sections/courses hidden via RPC and direct RLS");
  const insufficient = structuredClone(data);
  insufficient.lessons[0].status = "published";
  insufficient.lessons[0].id += "-insufficient";
  insufficient.lessons[0].questions = insufficient.lessons[0].questions
    .filter((q) => q.difficulty !== "hard")
    .map((q) => ({ ...q, id: q.id + "-small" }));
  await fail(() => importData(insufficient), /4 простых/);
  assert.equal(await counts(), after);
  ok("insufficient bank cannot publish; transaction rolled back");
  data.lessons.forEach((l) => (l.status = "published"));
  await importData();
  for (const role of ["student", "other", "teacher"]) {
    await fail(
      () =>
        rpc(actors[role], "lesson_import", {
          p_package: data,
          p_dry_run: false,
          p_request_id: randomUUID(),
        }),
      /администратор/,
    );
    await fail(
      () => rpc(actors[role], "lesson_admin_export", {}),
      /администратор/,
    );
    for (const table of [
      "lesson_questions",
      "lesson_options",
      "lesson_attempt_items",
      "lesson_import_receipts",
    ])
      assert.equal(
        await asRole(actors[role], `select count(*) from public.${table}`),
        "0",
      );
    await fail(
      () =>
        asRole(
          actors[role],
          `select public.lesson_public_json(${quote(data.lessons[0].id)})`,
        ),
      /permission denied/,
    );
  }
  await fail(
    () => asRole(actors.student, "select public.lesson_catalog()", "anon"),
    /permission denied/,
  );
  ok(
    "only admins author/export; keys and helper functions denied to students/teachers/anon",
  );
  const l = data.lessons[0],
    key = randomUUID();
  let a = await student("lesson_start", {
    p_lesson_id: l.id,
    p_request_id: key,
  });
  const verify = (a) => {
    assert.equal(a.questions.length, 10);
    assert.equal(new Set(a.questions.map((q) => q.id)).size, 10);
    assert.deepEqual(
      ["easy", "medium", "hard"].map(
        (d) => a.questions.filter((q) => q.difficulty === d).length,
      ),
      [4, 4, 2],
    );
  };
  verify(a);
  assert(!JSON.stringify(a).includes("correctOptionIds"));
  assert(!JSON.stringify(a).includes("explanation"));
  const [again, concurrent] = await Promise.all([
    student("lesson_start", { p_lesson_id: l.id, p_request_id: key }),
    student("lesson_start", { p_lesson_id: l.id, p_request_id: randomUUID() }),
  ]);
  assert.deepEqual(again, a);
  assert.deepEqual(concurrent, a);
  ok(
    "10 distinct questions, 4/4/2, no keys/explanations, concurrent starts resume one attempt",
  );
  await fail(
    () => rpc(actors.other, "lesson_attempt_read", { p_id: a.id }),
    /недоступна/,
  );
  await fail(
    () =>
      rpc(actors.other, "lesson_save_answers", {
        p_attempt_id: a.id,
        p_answers: [],
        p_revision: 0,
      }),
    /недоступна/,
  );
  await fail(
    () =>
      rpc(actors.other, "lesson_submit", { p_attempt_id: a.id, p_revision: 0 }),
    /недоступна/,
  );
  await fail(
    () =>
      asRole(
        actors.student,
        `select public.lesson_attempt_json(${quote(a.id)})`,
      ),
    /permission denied/,
  );
  assert.equal(
    await asRole(
      actors.other,
      `select count(*) from public.lesson_attempts where id=${quote(a.id)}`,
    ),
    "0",
  );
  await fail(
    () =>
      asRole(
        actors.student,
        `update public.lesson_attempts set score=10 where id=${quote(a.id)}`,
      ),
    /permission denied/,
  );
  ok("other student cannot read/save/submit attempt; no direct score mutation");
  await fail(
    () =>
      student("lesson_submit", { p_attempt_id: a.id, p_revision: a.revision }),
    /все 10/,
  );
  await fail(
    () =>
      student("lesson_save_answers", {
        p_attempt_id: a.id,
        p_answers: [{ ordinal: 1, optionIds: ["missing"] }],
        p_revision: a.revision,
      }),
    /недопустимые/,
  );
  const expected = a.questions.map((q) => ({
    ordinal: q.ordinal,
    optionIds: l.questions.find((x) => x.id === q.id).correctOptionIds,
  }));
  a = await student("lesson_save_answers", {
    p_attempt_id: a.id,
    p_answers: expected.slice(0, 3),
    p_revision: a.revision,
  });
  assert.deepEqual(await student("lesson_attempt_read", { p_id: a.id }), a);
  assert.deepEqual(
    await student("lesson_start", {
      p_lesson_id: l.id,
      p_request_id: randomUUID(),
    }),
    a,
  );
  ok("new connections restore exact question order and saved partial answers");
  await fail(
    () =>
      student("lesson_save_answers", {
        p_attempt_id: a.id,
        p_answers: expected,
        p_revision: 0,
      }),
    /другой вкладке/,
  );
  const stale = a.revision;
  a = await student("lesson_save_answers", {
    p_attempt_id: a.id,
    p_answers: expected,
    p_revision: stale,
  });
  assert.deepEqual(
    await student("lesson_save_answers", {
      p_attempt_id: a.id,
      p_answers: expected,
      p_revision: stale,
    }),
    a,
  );
  ok("answer save retries idempotent, stale conflicting writes rejected");
  const oldQuestions = structuredClone(a.questions);
  const edited = structuredClone(data);
  edited.lessons[0].questions.forEach((q) => {
    q.prompt = "Изменённый вопрос: " + q.prompt;
    q.correctOptionIds = [
      q.options.find((o) => !q.correctOptionIds.includes(o.id))?.id ??
        q.options[0].id,
    ];
    q.explanation = "Новое объяснение после изменения урока.";
  });
  edited.lessons[0].test.passScore = 9;
  await importData(edited);
  const [result, resultRetry] = await Promise.all([
    student("lesson_submit", { p_attempt_id: a.id, p_revision: a.revision }),
    student("lesson_submit", { p_attempt_id: a.id, p_revision: a.revision }),
  ]);
  assert.deepEqual(result, resultRetry);
  assert.equal(result.score, 10);
  assert.equal(result.passScore, 7);
  assert(result.questions.every((q) => q.explanation && q.correctOptionIds));
  assert.deepEqual(
    result.questions.map((q) => q.prompt),
    oldQuestions.map((q) => q.prompt),
  );
  await fail(
    () =>
      student("lesson_save_answers", {
        p_attempt_id: a.id,
        p_answers: expected,
        p_revision: result.revision,
      }),
    /нельзя изменить/,
  );
  ok(
    "server grades immutable snapshot (10/10), preserves old threshold, releases explanations only on submit",
  );
  await importData(data);
  assert.deepEqual(
    await student("lesson_attempt_read", { p_id: a.id }),
    result,
  );
  ok(
    "completed result survives subsequent content edits and fresh database connections",
  );
  let b = await student("lesson_start", {
    p_lesson_id: l.id,
    p_request_id: randomUUID(),
  });
  verify(b);
  assert(!b.questions.some((q) => a.questions.some((p) => p.id === q.id)));
  ok("second attempt uses all unseen questions with 4/4/2");
  const multiple =
    b.questions.find((q) => q.type === "multiple") ??
    a.questions.find((q) => q.type === "multiple");
  assert(multiple, "demo must include multiple choice");
  // Wrong first answer (missing a correct option for multiple, or extra option) receives zero; all others exact.
  const answers = b.questions.map((q, i) => {
    const right = l.questions.find((x) => x.id === q.id).correctOptionIds;
    return {
      ordinal: q.ordinal,
      optionIds:
        i === 0
          ? [q.options.find((o) => !right.includes(o.id)).id]
          : [...right].reverse(),
    };
  });
  b = await student("lesson_save_answers", {
    p_attempt_id: b.id,
    p_answers: answers,
    p_revision: b.revision,
  });
  b = await student("lesson_submit", {
    p_attempt_id: b.id,
    p_revision: b.revision,
  });
  assert.equal(b.score, 9);
  ok("equal weight and order-independent exact option-set scoring");
  let previous = b;
  for (let i = 0; i < 5; i++) {
    let next = await student("lesson_start", {
      p_lesson_id: l.id,
      p_request_id: randomUUID(),
    });
    verify(next);
    assert.notDeepEqual(
      next.questions.map((q) => q.id).sort(),
      previous.questions.map((q) => q.id).sort(),
    );
    next = await student("lesson_save_answers", {
      p_attempt_id: next.id,
      p_answers: next.questions.map((q) => ({
        ordinal: q.ordinal,
        optionIds: l.questions.find((x) => x.id === q.id).correctOptionIds,
      })),
      p_revision: next.revision,
    });
    previous = await student("lesson_submit", {
      p_attempt_id: next.id,
      p_revision: next.revision,
    });
  }
  ok(
    "later retries maintain composition and change actual set, not only order",
  );

  const exact = structuredClone(data);
  exact.lessons = [exact.lessons[0]];
  exact.lessons[0].id += "-exact";
  exact.lessons[0].questions = ["easy", "medium", "hard"]
    .flatMap((d) =>
      exact.lessons[0].questions
        .filter((q) => q.difficulty === d)
        .slice(0, d === "hard" ? 2 : 4),
    )
    .map((q) => ({
      ...q,
      id: q.id + "-exact",
      type: "multiple",
      correctOptionIds: q.options.slice(0, 2).map((o) => o.id),
    }));
  await importData(exact);
  let exactAttempt = await student("lesson_start", {
    p_lesson_id: exact.lessons[0].id,
    p_request_id: randomUUID(),
  });
  const exactAnswers = exactAttempt.questions.map((q, i) => ({
    ordinal: q.ordinal,
    optionIds: q.options
      .slice(0, i === 0 ? 1 : i === 1 ? 3 : 2)
      .map((o) => o.id)
      .reverse(),
  }));
  exactAttempt = await student("lesson_save_answers", {
    p_attempt_id: exactAttempt.id,
    p_answers: exactAnswers,
    p_revision: exactAttempt.revision,
  });
  exactAttempt = await student("lesson_submit", {
    p_attempt_id: exactAttempt.id,
    p_revision: exactAttempt.revision,
  });
  assert.equal(exactAttempt.score, 8);
  const minimal = await student("lesson_start", {
    p_lesson_id: exact.lessons[0].id,
    p_request_id: randomUUID(),
  });
  verify(minimal);
  assert.deepEqual(
    minimal.questions.map((q) => q.id).sort(),
    exactAttempt.questions.map((q) => q.id).sort(),
  );
  assert.equal(
    await asRole(
      actors.student,
      `select count(*) from public.lesson_attempt_items where attempt_id=${quote(minimal.id)}`,
    ),
    "0",
  );
  ok(
    "multiple-choice partial/extra sets get zero; exact reordered sets get one; minimum 10-question bank is valid",
  );
  // Additional test lesson is intentionally retained until the scoped finally cleanup.
  const afterWithExact = await counts();
  const draft = structuredClone(data);
  delete draft.lessons[0].status;
  draft.lessons[0].questions = [];
  await importData(draft);
  assert.equal(await counts(), afterWithExact);
  await fail(() => student("lesson_read", { p_id: l.id }), /недоступен/);
  assert.deepEqual(
    await student("lesson_attempt_read", { p_id: a.id }),
    result,
  );
  ok(
    "omitted questions retained, omitted status defaults to draft, historical result stays readable",
  );

  const omitOption = structuredClone(data);
  const optionQ = omitOption.lessons[1].questions[0];
  optionQ.options = optionQ.options.filter(
    (o, i) =>
      i !==
      optionQ.options.findIndex(
        (x) => !optionQ.correctOptionIds.includes(x.id),
      ),
  );
  await importData(omitOption);
  assert.equal(await counts(), afterWithExact);
  ok("omitted options are retained rather than deleted");
  const invalidTypes = structuredClone(data);
  invalidTypes.lessons[0].questions = "not-array";
  await fail(() => importData(invalidTypes), /массивом/);
  ok("invalid question-array type gives understandable error");
  console.log(`${checks} database flow/security checks passed.`);
} finally {
  // Only rows generated under this run's random prefix, in an explicitly disposable database.
  await sql(
    `delete from public.lesson_attempts where lesson_id like ${quote(prefix + "%")};delete from public.lesson_options where question_id like ${quote(prefix + "%")};delete from public.lesson_questions where id like ${quote(prefix + "%")};delete from public.lesson_test_settings where lesson_id like ${quote(prefix + "%")};delete from public.course_lessons where id like ${quote(prefix + "%")};delete from public.lesson_sections where id like ${quote(prefix + "%")};delete from public.lesson_courses where id like ${quote(prefix + "%")};`,
  );
}
