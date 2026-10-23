import test from "node:test";
import assert from "node:assert/strict";
import { passwordError, repeatPasswordError } from "../src/services/password";
import { validateRegistration } from "../src/services/registration";
test("confirmation waits for blur/submit, compares exact opaque strings, and clears on correction", () => {
  assert.equal(repeatPasswordError(" pass word ", " p", false), "");
  assert.equal(
    repeatPasswordError(" pass word ", "pass word", true),
    "Пароли не совпадают",
  );
  assert.equal(repeatPasswordError(" pass word ", " pass word ", true), "");
  assert.equal(
    repeatPasswordError("updated1", "", true),
    "Пароли не совпадают",
  );
  assert.ok(passwordError("1234567"));
  assert.equal(passwordError(" 123456 "), "");
  const input = validateRegistration(
    {
      name: "Тест",
      role: "student",
      code: "ABCDEFG",
      email: " test@example.test ",
      password: " 123456 ",
    },
    true,
  );
  assert.equal(input.password, " 123456 ");
});
