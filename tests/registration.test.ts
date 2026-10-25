import test from "node:test";
import assert from "node:assert/strict";
import {
  validateRegistration,
  parsePendingRegistration,
  registrationRoles,
} from "../src/services/registration";
import { LocalRepository } from "../src/services/repository";
const student = {
  name: "  Анна  ",
  role: "student",
  code: " abc2345 ",
  email: " Test@Example.COM ",
  password: "long-password",
};
test("public registration only allows student and parent, including old drafts", () => {
  assert.deepEqual(registrationRoles, ["student", "parent"]);
  for (const role of ["teacher", "admin", "", "Teacher"]) {
    assert.throws(() => validateRegistration({ ...student, role }), {
      code: "registration_role_closed",
    });
    assert.equal(
      parsePendingRegistration(JSON.stringify({ ...student, role })),
      null,
    );
  }
});
test("registration validates inputs before any auth request", () => {
  assert.deepEqual(validateRegistration(student, true), {
    ...student,
    name: "Анна",
    code: "",
    email: "test@example.com",
  });
  for (const input of [
    { ...student, name: " " },
    { ...student, name: "a".repeat(81) },
    { ...student, role: "parent", code: "" },
    { ...student, role: "parent", code: "ABC" },
    { ...student, email: "invalid" },
    { ...student, password: "short" },
  ])
    assert.throws(() => validateRegistration(input, true));
  assert.doesNotThrow(() =>
    validateRegistration(
      { ...student, role: "parent", password: undefined },
      false,
    ),
  );
});
test("damaged signup drafts cannot crash startup or introduce privileged roles", () => {
  for (const raw of [
    null,
    "{",
    "null",
    "[]",
    "1",
    '"x"',
    JSON.stringify({ role: "student" }),
    JSON.stringify({ ...student, email: "wrong" }),
  ])
    assert.equal(parsePendingRegistration(raw), null);
  assert.deepEqual(parsePendingRegistration(JSON.stringify(student)), {
    name: "Анна",
    role: "student",
    code: "",
    email: "test@example.com",
  });
});
test("demo repository applies the same restrictions and creates real memberships", async () => {
  const records = new Map<string, string>();
  const repo = new LocalRepository({
    getItem: async (k) => records.get(k) ?? null,
    setItem: async (k, v) => {
      records.set(k, v);
    },
  });
  const before = await repo.read();
  const teacher = before.profiles.find((p) => p.role === "teacher")!;
  await assert.rejects(repo.registerProfile("Intruder", "teacher"), {
    code: "registration_role_closed",
  });
  await assert.rejects(repo.registerProfile("Intruder", "admin"), {
    code: "registration_role_closed",
  });
  const id = await repo.registerProfile("Анна", "student");
  const after = await repo.read();
  const profile = after.profiles.find((p) => p.id === id)!;
  assert.equal(profile.role, "student");
  assert.match(profile.code!, /^[A-Z2-9]{7}$/);
  assert(after.classes.every((group) => !group.studentIds.includes(id)));
  const group = before.classes.find((g) => g.teacherIds.includes(teacher.id))!;
  await repo.dispatch(teacher.id, {
    type: "enrollStudent",
    classId: group.id,
    studentCode: profile.code!,
  });
  await repo.dispatch(teacher.id, {
    type: "enrollStudent",
    classId: group.id,
    studentCode: profile.code!,
  });
  assert.equal(
    (await repo.read()).classes
      .find((g) => g.id === group.id)!
      .studentIds.filter((sid) => sid === id).length,
    1,
  );
  const parent = await repo.registerProfile(
    "Родитель",
    "parent",
    after.profiles.find((p) => p.id === id)!.code,
  );
  const final = await repo.read();
  assert(
    final.parentLinks?.some((l) => l.parentId === parent && l.studentId === id),
  );
  assert.equal(
    final.profiles.find((p) => p.id === teacher.id)?.role,
    "teacher",
  );
});

test("students register and resume without a group code; old drafts never enroll them", () => {
  for (const code of [undefined, "", "ABC2345", "invalid"]) {
    assert.equal(validateRegistration({ ...student, code }, true).code, "");
    assert.deepEqual(
      parsePendingRegistration(JSON.stringify({ ...student, code })),
      {
        name: "Анна",
        role: "student",
        code: "",
        email: "test@example.com",
      },
    );
  }
});

test("invited teacher drafts stay distinct from public signup and never authorize admin", async () => {
  const { validateInvitedTeacherRegistration } =
    await import("../src/services/registration");
  assert.equal(
    validateInvitedTeacherRegistration({ ...student, role: "teacher" }, true)
      .role,
    "teacher",
  );
  for (const role of ["student", "parent", "admin"])
    assert.throws(() =>
      validateInvitedTeacherRegistration({ ...student, role }, true),
    );
  assert.throws(() =>
    validateInvitedTeacherRegistration(
      { ...student, role: "teacher", email: "bad" },
      true,
    ),
  );
  assert.deepEqual(
    parsePendingRegistration(
      JSON.stringify({ ...student, role: "teacher", invitedTeacher: true }),
    ),
    {
      name: "Анна",
      role: "teacher",
      code: "",
      email: "test@example.com",
      invitedTeacher: true,
    },
  );
  assert.equal(
    parsePendingRegistration(
      JSON.stringify({ ...student, role: "teacher", invitedTeacher: "true" }),
    ),
    null,
  );
  assert.equal(
    parsePendingRegistration(
      JSON.stringify({ ...student, role: "admin", invitedTeacher: true }),
    ),
    null,
  );
});
