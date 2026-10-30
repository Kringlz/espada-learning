// Real authorization and persistence tests on an explicitly disposable local database.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { sql, quote, requireDisposableDatabase } from "./lesson-db.mjs";
requireDisposableDatabase();
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const student = id(1),
  peer = id(2),
  teacher = id(3),
  outsider = id(5),
  parent = id(450),
  group = id(6),
  otherGroup = id(7);
const as = (actor, s) =>
  sql(
    `begin;set local role authenticated;set local request.jwt.claim.sub=${quote(actor)};${s};commit;`,
  );
const read = (actor, g = group, before) =>
  as(
    actor,
    `select public.classroom_read(${quote(g)},${before ? quote(before.created_at) : "null"},${before ? quote(before.id) : "null"})`,
  ).then(JSON.parse);
const send = (actor, g, mid, body) =>
  as(
    actor,
    `select public.classroom_send(${quote(g)},${quote(mid)},${quote(body)})`,
  );
const save = (actor, g, item) =>
  as(
    actor,
    `select public.classroom_save_session(${quote(g)},${quote(JSON.stringify(item))}::jsonb)`,
  );
const check = async (name, fn) => {
  await fn();
  console.log("✓ " + name);
};
const session = {
  id: randomUUID(),
  starts_at: new Date(Date.now() + 86400000 * 2).toISOString(),
  topic: "Пифагор",
  location: "Кабинет 3",
  meeting_url: "https://example.test/lesson",
  revision: 0,
};
const messages = [];
try {
  await check(
    "teacher creates dated session; student sees same group, teacher and classmates",
    async () => {
      await save(teacher, group, session);
      const data = await read(student);
      assert.ok(
        data.members.some((p) => p.id === teacher && p.role === "teacher"),
      );
      assert.ok(data.members.some((p) => p.id === peer));
      assert.ok(data.members.every((p) => !("code" in p) && !("email" in p)));
      assert.equal(
        data.sessions.find((s) => s.id === session.id).topic,
        "Пифагор",
      );
    },
  );
  await check(
    "transfer and cancellation persist and stale writes are rejected",
    async () => {
      const old = (await read(teacher)).sessions.find(
        (s) => s.id === session.id,
      );
      await save(teacher, group, {
        ...old,
        starts_at: new Date(Date.now() + 86400000 * 3).toISOString(),
        cancelled: true,
      });
      const moved = (await read(student)).sessions.find(
        (s) => s.id === session.id,
      );
      assert.ok(moved.cancelled);
      assert.equal(
        Date.parse(moved.previous_starts_at),
        Date.parse(old.starts_at),
      );
      await assert.rejects(save(teacher, group, old));
    },
  );
  await check(
    "student, parent and another teacher cannot edit schedule or read another group",
    async () => {
      await assert.rejects(
        save(student, group, { ...session, id: randomUUID() }),
      );
      await assert.rejects(
        save(outsider, group, { ...session, id: randomUUID() }),
      );
      await assert.rejects(read(student, otherGroup));
      await assert.rejects(read(outsider, group));
      await assert.rejects(read(parent, group));
      await assert.rejects(
        sql(`set role anon;select public.classroom_read(${quote(group)})`),
      );
    },
  );
  await check(
    "student and teacher send durable messages; retry does not duplicate",
    async () => {
      const mid = randomUUID();
      messages.push(mid);
      await send(student, group, mid, "Вопрос о задаче");
      await send(student, group, mid, "Вопрос о задаче");
      const reply = randomUUID();
      messages.push(reply);
      await send(teacher, group, reply, "Разберём на занятии");
      const data = await read(peer);
      assert.equal(data.messages.filter((m) => m.id === mid).length, 1);
      assert.equal(
        data.messages.find((m) => m.id === reply).author_id,
        teacher,
      );
      assert.ok(data.messages.find((m) => m.id === mid).author_name);
    },
  );
  await check(
    "RLS blocks cross-group reads, sender forgery and message edits",
    async () => {
      await assert.rejects(
        send(student, otherGroup, randomUUID(), "Чужая группа"),
      );
      await assert.rejects(send(parent, group, randomUUID(), "Родитель"));
      assert.equal(
        await as(
          outsider,
          `select count(*) from public.classroom_messages where class_id=${quote(group)}`,
        ),
        "0",
      );
      await assert.rejects(
        as(
          student,
          `insert into public.classroom_messages(id,class_id,author_id,body) values(${quote(randomUUID())},${quote(group)},${quote(teacher)},'Подмена')`,
        ),
      );
      await assert.rejects(
        as(
          student,
          `update public.classroom_messages set body='Изменено' where id=${quote(messages[0])}`,
        ),
      );
      await assert.rejects(send(student, group, randomUUID(), " ".repeat(3)));
    },
  );
  await check(
    "pagination keeps all messages including equal timestamps",
    async () => {
      const stamp = new Date().toISOString();
      for (let i = 0; i < 55; i++) {
        const mid = randomUUID();
        messages.push(mid);
        await send(student, group, mid, `Страница ${i}`);
      }
      await sql(
        `update public.classroom_messages set created_at=${quote(stamp)} where id in (${messages.slice(2).map(quote).join(",")})`,
      );
      const first = await read(peer);
      assert.equal(first.messages.length, 50);
      const second = await read(peer, group, first.messages[0]);
      assert.equal(
        new Set([...first.messages, ...second.messages].map((m) => m.id)).size,
        57,
      );
    },
  );
  await check(
    "membership removal immediately revokes read and write",
    async () => {
      await sql(
        `delete from public.class_memberships where class_id=${quote(group)} and profile_id=${quote(peer)}`,
      );
      try {
        await assert.rejects(read(peer));
        await assert.rejects(send(peer, group, randomUUID(), "После удаления"));
      } finally {
        await sql(
          `insert into public.class_memberships values(${quote(group)},${quote(peer)})`,
        );
      }
    },
  );
} finally {
  await sql(
    `delete from public.classroom_sessions where id=${quote(session.id)};delete from public.classroom_messages where id in (${messages.length ? messages.map(quote).join(",") : quote(randomUUID())})`,
  );
}
console.log(
  "7 classroom scenarios passed against real PostgreSQL with separate role connections.",
);
