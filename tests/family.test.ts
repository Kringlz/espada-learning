import test from "node:test";
import assert from "node:assert/strict";
import { createSeed } from "../src/data/seed";
import { upgradeReportDemo } from "../src/data/reportDemo";
import { upgradeFamilyDemo } from "../src/data/familyDemo";
import { applyCommand, canAccess, scopedState } from "../src/core/engine";
import { fixedId as id } from "../src/core/ids";
import { Command } from "../src/core/types";
const seed = () => upgradeFamilyDemo(upgradeReportDemo(createSeed()));
test("parent sees linked child, published results and their teachers, not classmates or drafts", () => {
  const s = seed(),
    parent = s.profiles.find((p) => p.role === "parent")!;
  s.reports!.push({ ...s.reports![0], id: id(990), status: "draft" });
  s.teacherContacts = [
    { teacherId: id(3), email: "teacher@example.com", phone: "", hours: "" },
    { teacherId: id(5), email: "private@example.com", phone: "", hours: "" },
  ];
  const view = scopedState(s, parent);
  assert(canAccess(s, parent, id(1)));
  assert(!canAccess(s, parent, id(2)));
  assert.deepEqual(
    view.profiles.filter((p) => p.role === "student").map((p) => p.id),
    [id(1)],
  );
  assert(view.profiles.some((p) => p.id === id(3)));
  assert(!view.profiles.some((p) => p.id === id(5)));
  assert(view.classes.every((c) => c.studentIds.every((x) => x === id(1))));
  assert(
    view.reports!.every(
      (r) => r.status === "published" && r.studentId === id(1),
    ),
  );
  assert(
    view.assessments.every(
      (r) => r.status === "published" && r.studentId === id(1),
    ),
  );
  assert.equal(view.audit.length, 0);
  assert.deepEqual(
    view.teacherContacts!.map((c) => c.teacherId),
    [id(3)],
  );
});
test("parent cannot author marks, assign homework, enroll or grant their own access", () => {
  const s = seed(),
    parent = id(450);
  const commands: Command[] = [
    { type: "enrollStudent", classId: id(6), studentId: id(2) },
    { type: "linkParent", parentId: parent, studentId: id(2) },
    {
      type: "assignGroup",
      id: id(991),
      classId: id(6),
      topicId: "equivalent",
      reason: "Test",
      override: false,
    },
    {
      type: "saveReport",
      report: s.reports![0],
      expectedRevision: 1,
      reason: "edit",
    },
    {
      type: "saveProfile",
      profile: { id: parent, name: "Admin", role: "admin", active: true },
    },
    {
      type: "saveTeacherContact",
      contact: { teacherId: id(3), email: "", phone: "", hours: "" },
    },
  ];
  commands.forEach((c) => assert.throws(() => applyCommand(s, parent, c)));
  assert.throws(() =>
    applyCommand(s, parent, {
      type: "readReport",
      reportId: s.reports![0].id,
      revision: 1,
    }),
  );
});
test("teacher enrolls in own group idempotently and cannot change another group", () => {
  let s = seed();
  s.classes[0].studentIds = [id(1)];
  const c: Command = {
    type: "enrollStudent",
    classId: id(6),
    studentId: id(2),
  };
  s = applyCommand(s, id(3), c);
  s = applyCommand(s, id(3), c);
  assert.equal(s.classes[0].studentIds.filter((x) => x === id(2)).length, 1);
  assert.throws(() => applyCommand(s, id(5), c));
  assert.throws(() => applyCommand(s, id(1), c));
  assert.throws(() => applyCommand(s, id(3), { ...c, studentId: id(3) }));
});
test("parent link can be verified and revoked only by authorized staff; inactive children hidden", () => {
  let s = seed();
  const parent = s.profiles.find((p) => p.role === "parent")!;
  assert.throws(() =>
    applyCommand(s, id(5), {
      type: "linkParent",
      parentId: parent.id,
      studentId: id(1),
    }),
  );
  s = applyCommand(s, id(3), {
    type: "linkParent",
    parentId: parent.id,
    studentId: id(1),
    remove: true,
  });
  assert(!canAccess(s, parent, id(1)));
  assert.equal(scopedState(s, parent).reports!.length, 0);
  s = applyCommand(s, id(3), {
    type: "linkParent",
    parentId: parent.id,
    studentId: id(1),
  });
  assert(canAccess(s, parent, id(1)));
  s.profiles[0].active = false;
  assert(!canAccess(s, parent, id(1)));
});
test("teacher edits only own validated contacts; demo upgrade preserves saved state", () => {
  const s = seed();
  const contact = {
    teacherId: id(3),
    email: "teacher@example.com",
    phone: "+996 555 123 456",
    hours: "По будням",
  };
  const next = applyCommand(s, id(3), { type: "saveTeacherContact", contact });
  assert.deepEqual(next.teacherContacts, [contact]);
  assert.throws(() =>
    applyCommand(s, id(5), { type: "saveTeacherContact", contact }),
  );
  assert.throws(() =>
    applyCommand(s, id(3), {
      type: "saveTeacherContact",
      contact: { ...contact, email: "javascript:bad" },
    }),
  );
  assert.equal(upgradeFamilyDemo(next), next);
  assert.deepEqual(next.reports, s.reports);
});
