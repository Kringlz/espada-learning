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
    code: "ABC2345",
    email: "test@example.com",
  });
  for (const input of [
    { ...student, name: " " },
    { ...student, name: "a".repeat(81) },
    { ...student, code: "" },
    { ...student, code: "ABC" },
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
    code: "ABC2345",
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
  await assert.rejects(
    repo.registerProfile("Анна", "student", "ZZZZZZZ"),
    /Код группы/,
  );
  assert.equal((await repo.read()).profiles.length, before.profiles.length);
  const group = before.classes[0];
  const id = await repo.registerProfile("Анна", "student", group.joinCode);
  const after = await repo.read();
  assert(after.classes[0].studentIds.includes(id));
  assert.equal(after.profiles.find((p) => p.id === id)?.role, "student");
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
