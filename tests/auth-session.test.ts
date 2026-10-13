import test from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import {
  AuthSessionStorage,
  memoryStorage,
  singleFlight,
} from "../src/services/authSessionStorage";
import { validateRegistration } from "../src/services/registration";

const key = "sb-test-auth-token";
const user = {
  id: "00000000-0000-4000-8000-000000000001",
  aud: "authenticated",
  role: "authenticated",
  email: "fixture@example.test",
  created_at: new Date().toISOString(),
};
const token = (exp: number) =>
  [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: user.id,
        exp,
        iat: exp - 3600,
        role: "authenticated",
      }),
    ).toString("base64url"),
    "fixture-signature",
  ].join(".");
function sdk(
  storage: AuthSessionStorage,
  failure: "login" | "revoked" | "logout" | null = null,
) {
  let logins = 0;
  const client = createClient("http://127.0.0.1:54321", "public-test-key", {
    auth: {
      storage,
      storageKey: key,
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: async (url, init) => {
        const path = String(url);
        if (path.includes("logout"))
          return failure === "logout"
            ? new Response(JSON.stringify({ message: "Network unavailable" }), {
                status: 503,
              })
            : new Response(null, { status: 204 });
        if (path.includes("grant_type=refresh_token"))
          return new Response(
            JSON.stringify({
              code: "refresh_token_not_found",
              message: "Revoked refresh token",
            }),
            { status: 400 },
          );
        logins++;
        const body = JSON.parse(String(init?.body));
        assert.equal(body.password, "  unchanged-password  ");
        if (failure === "login")
          return new Response(
            JSON.stringify({ message: "Invalid login credentials" }),
            { status: 400 },
          );
        const expires = Math.floor(Date.now() / 1000) + 3600;
        return new Response(
          JSON.stringify({
            access_token: token(expires),
            refresh_token: "fixture-refresh",
            token_type: "bearer",
            expires_in: 3600,
            user,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  });
  return {
    client,
    get logins() {
      return logins;
    },
  };
}
for (const remember of [false, true])
  test(`SDK session persists reload; browser reopen respects remember=${remember}`, async () => {
    const temp = memoryStorage(),
      persistent = memoryStorage();
    const storage = new AuthSessionStorage(temp, persistent, key);
    await storage.choose(remember);
    const a = sdk(storage);
    assert.equal(
      (
        await a.client.auth.signInWithPassword({
          email: user.email,
          password: "  unchanged-password  ",
        })
      ).error,
      null,
    );
    assert.ok(
      (
        await sdk(
          new AuthSessionStorage(temp, persistent, key),
        ).client.auth.getSession()
      ).data.session,
    );
    const reopened = sdk(
      new AuthSessionStorage(memoryStorage(), persistent, key),
    );
    assert.equal(
      !!(await reopened.client.auth.getSession()).data.session,
      remember,
    );
    assert.equal((await a.client.auth.signOut()).error, null);
    assert.equal(await temp.getItem(key), null);
    assert.equal(await persistent.getItem(key), null);
    assert.equal(await storage.remember(), false);
    assert.equal(
      (
        await sdk(
          new AuthSessionStorage(memoryStorage(), persistent, key),
        ).client.auth.getSession()
      ).data.session,
      null,
    );
  });
test("expired/revoked SDK sessions are removed, never restored from the other store", async () => {
  const temp = memoryStorage(),
    persistent = memoryStorage(),
    storage = new AuthSessionStorage(temp, persistent, key);
  await storage.choose(true);
  await storage.setItem(
    key,
    JSON.stringify({
      access_token: token(1),
      refresh_token: "revoked",
      expires_at: 1,
      expires_in: 3600,
      token_type: "bearer",
      user,
    }),
  );
  const result = await sdk(storage, "revoked").client.auth.getSession();
  assert.equal(result.data.session, null);
  assert.equal(await persistent.getItem(key), null);
  assert.equal(await temp.getItem(key), null);
});
test("invalid login never leaves a stored session or a password", async () => {
  const temp = memoryStorage(),
    persistent = memoryStorage(),
    storage = new AuthSessionStorage(temp, persistent, key);
  await storage.choose(true);
  const a = sdk(storage, "login");
  assert.ok(
    (
      await a.client.auth.signInWithPassword({
        email: user.email,
        password: "  unchanged-password  ",
      })
    ).error,
  );
  assert.equal(await persistent.getItem(key), null);
  assert.equal(await temp.getItem(key), null);
});
test("changing to temporary persistence removes previous durable sessions and verifier", async () => {
  const temp = memoryStorage(),
    persistent = memoryStorage(),
    storage = new AuthSessionStorage(temp, persistent, key);
  await storage.choose(true);
  await storage.setItem(key, "old-session");
  await storage.setItem(key + "-code-verifier", "old-verifier");
  await storage.choose(false);
  assert.equal(await persistent.getItem(key), null);
  assert.equal(await persistent.getItem(key + "-code-verifier"), null);
  await storage.setItem(key, "new-session");
  assert.equal(await temp.getItem(key), "new-session");
  assert.equal(await persistent.getItem(key), null);
});
test("single-flight prevents duplicate submissions and allows retry after a rejection", async () => {
  const once = singleFlight<void>();
  let calls = 0;
  let resolve!: () => void;
  const task = () => {
    calls++;
    return new Promise<void>((r) => {
      resolve = r;
    });
  };
  const a = once(task),
    b = once(task);
  assert.equal(a, b);
  await Promise.resolve();
  assert.equal(calls, 1);
  resolve();
  await a;
  await assert.rejects(
    once(async () => {
      throw Error("fixture");
    }),
  );
  await once(async () => {
    calls++;
  });
  assert.equal(calls, 2);
});
test("password confirmation is exact, required only for new credentials and never trimmed", () => {
  const input = {
    name: "Анна",
    role: "student",
    code: "ABC2345",
    email: user.email,
    password: " spaced password ",
    passwordConfirmation: " spaced password ",
  };
  assert.equal(validateRegistration(input, true).password, input.password);
  for (const confirmation of [undefined, "spaced password", "other password"])
    assert.throws(
      () =>
        validateRegistration(
          { ...input, passwordConfirmation: confirmation },
          true,
        ),
      { code: "password_mismatch" },
    );
  assert.doesNotThrow(() =>
    validateRegistration(
      { ...input, password: undefined, passwordConfirmation: undefined },
      false,
    ),
  );
});

test("logout network failure reports an error but still removes the saved device session", async () => {
  const temporary = memoryStorage(),
    persistent = memoryStorage();
  const storage = new AuthSessionStorage(temporary, persistent, key);
  await storage.choose(true);
  const working = sdk(storage);
  await working.client.auth.signInWithPassword({
    email: user.email,
    password: "  unchanged-password  ",
  });
  const failing = sdk(storage, "logout");
  assert.ok((await failing.client.auth.signOut()).error);
  assert.equal(await persistent.getItem(key), null);
  assert.equal(await temporary.getItem(key), null);
  assert.equal(
    (
      await sdk(
        new AuthSessionStorage(memoryStorage(), persistent, key),
      ).client.auth.getSession()
    ).data.session,
    null,
  );
});

test("session persistence uses keys compatible with native SecureStore", async () => {
  const values = memoryStorage();
  const native = {
    getItem: async (k: string) => {
      assert.match(k, /^[A-Za-z0-9._-]+$/);
      return values.getItem(k);
    },
    setItem: async (k: string, v: string) => {
      assert.match(k, /^[A-Za-z0-9._-]+$/);
      return values.setItem(k, v);
    },
    removeItem: async (k: string) => {
      assert.match(k, /^[A-Za-z0-9._-]+$/);
      return values.removeItem(k);
    },
  };
  const storage = new AuthSessionStorage(memoryStorage(), native, key);
  await storage.choose(true);
  await storage.setItem(key, "fixture-session");
  assert.equal(await storage.getItem(key), "fixture-session");
  await storage.clear();
});
