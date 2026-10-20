import test from "node:test";
import assert from "node:assert/strict";
import {
  SessionPersistence,
  memorySessionStore,
} from "../src/services/sessionPersistence";
const make = () => {
  const durable = memorySessionStore(),
    preferences = memorySessionStore();
  const create = (temporary = memorySessionStore()) =>
    new SessionPersistence({
      durable,
      preferences,
      temporary,
      preferenceKey: "remember",
      authKey: "auth",
    });
  return { durable, preferences, create };
};
test("remembered sessions survive restart; temporary sessions do not", async () => {
  const x = make();
  const a = x.create();
  await a.setRemember(true);
  await a.setItem("auth", "token");
  assert.equal(await x.create().getItem("auth"), "token");
  await a.setRemember(false);
  assert.equal(await a.getItem("auth"), "token");
  assert.equal(await x.durable.getItem("auth"), null);
  assert.equal(await x.create().getItem("auth"), null);
});
test("refresh racing a preference change cannot restore durable tokens", async () => {
  const x = make(),
    a = x.create();
  await a.setRemember(true);
  await Promise.all([
    a.setItem("auth", "old"),
    a.setRemember(false),
    a.setItem("auth", "refreshed"),
  ]);
  assert.equal(await x.durable.getItem("auth"), null);
  assert.equal(await a.getItem("auth"), "refreshed");
});
test("sign out removes tokens from both locations and verifier migration follows preference", async () => {
  const x = make(),
    a = x.create();
  await a.setItem("auth", "token");
  await a.setItem("auth-code-verifier", "code");
  await a.setRemember(true);
  assert.equal(await x.create().getItem("auth-code-verifier"), "code");
  await a.removeItem("auth");
  assert.equal(await a.getItem("auth"), null);
  assert.equal(await x.create().getItem("auth"), null);
});
test("storage failures reject login persistence changes and do not poison subsequent operations", async () => {
  const prefs = memorySessionStore(),
    temp = memorySessionStore();
  let fail = true;
  const durable = {
    ...memorySessionStore(),
    async setItem() {
      if (fail) throw Error("disk full");
    },
  };
  const a = new SessionPersistence({
    durable,
    temporary: temp,
    preferences: prefs,
    preferenceKey: "remember",
    authKey: "auth",
  });
  await a.setItem("auth", "token");
  await assert.rejects(a.setRemember(true));
  assert.equal(await a.remembers(), false);
  fail = false;
  await a.setRemember(false);
  assert.equal(await a.getItem("auth"), "token");
});
