import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { applyCommand, scopedState } from "../src/core/engine";
import { teachingGroups, groupStudents } from "../src/core/groups";
import { fixedId as id } from "../src/core/ids";
import { Command } from "../src/core/types";
const now = "2026-09-24T10:00:00.000Z";
const command = {
  type: "assignGroup",
  id: id(800),
  classId: id(6),
  topicId: "equivalent",
  reason: "Изучить урок и пройти проверку",
  override: true,
} as const;

test("group selection limits teachers and never returns a combined student list", () => {
  const s = createSeed();
  s.classes[1].studentIds = [id(2)];
  s.classes[0].studentIds = [id(1)];
  assert.deepEqual(
    teachingGroups(s, s.profiles[2]).map((c) => c.id),
    [id(6)],
  );
  assert.deepEqual(teachingGroups(s, s.profiles[0]), []);
  assert.equal(teachingGroups(s, s.profiles[3]).length, 2);
  assert.deepEqual(groupStudents(s, ""), []);
  assert.deepEqual(
    groupStudents(s, id(6)).map((p) => p.id),
    [id(1)],
  );
  assert.deepEqual(
    groupStudents(s, id(7)).map((p) => p.id),
    [id(2)],
  );
});
test("group homework reaches the whole active roster with separate completion and private student scope", () => {
  const original = createSeed();
  original.profiles.push({
    id: id(810),
    name: "Отключённый",
    role: "student",
    active: false,
  });
  original.classes[0].studentIds.push(id(810));
  let s = applyCommand(original, id(3), command, now);
  const issued = s.assignments.filter(
    (a) => a.groupAssignmentId === command.id,
  );
  assert.equal(issued.length, 2);
  assert.deepEqual(
    issued.map((a) => a.studentId),
    [id(1), id(2)],
  );
  assert.ok(
    issued.every(
      (a) =>
        a.classId === id(6) &&
        a.className === s.classes[0].name &&
        a.teacherId === id(3),
    ),
  );
  const topic = s.topics.find((t) => t.id === command.topicId)!;
  s = applyCommand(
    s,
    id(1),
    {
      type: "submitAttempt",
      attempt: {
        id: id(811),
        studentId: id(1),
        topicId: topic.id,
        at: now,
        answers: topic.checks
          .slice(0, 3)
          .map((q) => ({
            questionId: q.id,
            choice: q.answer,
            assisted: false,
          })),
      },
    },
    now,
  );
  assert.ok(s.assignments.find((a) => a.id === issued[0].id)?.completedAt);
  assert.equal(
    s.assignments.find((a) => a.id === issued[1].id)?.completedAt,
    undefined,
  );
  const view = scopedState(s, s.profiles[1]);
  assert.equal(
    view.assignments.filter((a) => a.groupAssignmentId === command.id).length,
    1,
  );
  assert.ok(view.assignments.every((a) => a.studentId === id(2)));
  assert.deepEqual(view.classes[0].studentIds, [id(2)]);
  assert.deepEqual(original.assignments.length, 1);
});
test("assignment retries do not duplicate homework or add later members", () => {
  let s = applyCommand(createSeed(), id(3), command, now);
  s.profiles.push({
    id: id(812),
    name: "Новый ученик",
    role: "student",
    active: true,
  });
  s.classes[0].studentIds.push(id(812));
  const retried = applyCommand(s, id(3), command, now);
  assert.deepEqual(retried, s);
  assert.throws(() =>
    applyCommand(s, id(3), { ...command, reason: "Другое задание" }, now),
  );
});
test("unauthorized, inactive, empty-group and invalid assignments leave state unchanged", () => {
  const s = createSeed();
  const before = JSON.stringify(s);
  for (const actor of [id(1), id(5)])
    assert.throws(() => applyCommand(s, actor, command, now));
  assert.throws(() =>
    applyCommand(s, id(3), { ...command, classId: id(7) }, now),
  );
  assert.throws(() =>
    applyCommand(s, id(4), { ...command, classId: id(7) }, now),
  );
  assert.throws(() =>
    applyCommand(s, id(3), { ...command, topicId: "missing" }, now),
  );
  assert.throws(() => applyCommand(s, id(3), { ...command, reason: " " }, now));
  assert.throws(() =>
    applyCommand(
      s,
      id(3),
      { ...command, override: "yes" } as unknown as Command,
      now,
    ),
  );
  assert.throws(() =>
    applyCommand(
      s,
      id(3),
      {
        type: "assign",
        assignment: { ...s.assignments[0], id: id(813), classId: id(7) },
      },
      now,
    ),
  );
  assert.equal(JSON.stringify(s), before);
  s.profiles[2].active = false;
  assert.throws(() => applyCommand(s, id(3), command, now));
});
test("group access requires membership even when another group shares the same student", () => {
  const s = createSeed();
  s.classes[1].studentIds = [id(1)];
  assert.throws(() =>
    applyCommand(s, id(3), { ...command, classId: id(7) }, now),
  );
  const byAdmin = applyCommand(s, id(4), { ...command, classId: id(7) }, now);
  assert.equal(
    byAdmin.assignments.filter((a) => a.groupAssignmentId === command.id)
      .length,
    1,
  );
});
