import test from "node:test";
import assert from "node:assert/strict";
import {
  authFailure,
  createConfirmationMailer,
  normalizeEmail,
  pendingMatches,
  validEmail,
} from "../src/services/authFlow";
function fixture() {
  let value: string | null = null;
  let now = 100000;
  const storage = {
    getItem: async () => value,
    setItem: async (_key: string, next: string) => {
      value = next;
    },
  };
  return {
    storage,
    now: () => now,
    advance: (ms: number) => {
      now += ms;
    },
    corrupt: () => {
      value = "bad";
    },
  };
}
test("email validation and pending profile matching use normalized addresses", () => {
  assert.equal(normalizeEmail(" Test@Example.COM "), "test@example.com");
  assert.equal(validEmail(" Test@Example.COM "), true);
  assert.equal(validEmail("test@"), false);
  assert.equal(
    pendingMatches({ email: " Test@Example.COM " }, "test@example.com"),
    true,
  );
  assert.equal(
    pendingMatches({ email: "other@example.com" }, "test@example.com"),
    false,
  );
  assert.equal(pendingMatches(null, undefined), false);
});
test("structured errors preserve confirmation state and provider restrictions", () => {
  assert.equal(
    authFailure({ code: "email_not_confirmed", message: "Changed message" })
      .code,
    "email_not_confirmed",
  );
  assert.match(
    authFailure({ code: "email_address_not_authorized" }).message,
    /администратору/,
  );
  assert.equal(
    authFailure({
      status: 429,
      message:
        "For security purposes, you can only request this after 125 seconds.",
    }).retryAfter,
    125,
  );
});
test("accepted send normalizes email and cooldown survives reload then expires", async () => {
  const f = fixture();
  const mail = createConfirmationMailer(f.storage, f.now);
  let calls = 0;
  await mail.send(" Test@Example.com ", async (email) => {
    calls++;
    assert.equal(email, "test@example.com");
  });
  const reloaded = createConfirmationMailer(f.storage, f.now);
  assert.equal(await reloaded.remaining("test@example.com"), 60);
  await assert.rejects(
    reloaded.send("test@example.com", async () => {
      calls++;
    }),
    { code: "local_email_cooldown" },
  );
  f.advance(60001);
  await reloaded.send("test@example.com", async () => {
    calls++;
  });
  assert.equal(calls, 2);
});
test("concurrent taps cannot submit two requests", async () => {
  const f = fixture();
  const mail = createConfirmationMailer(f.storage, f.now);
  let finish!: () => void;
  const blocked = new Promise<void>((r) => {
    finish = r;
  });
  const first = mail.send("test@example.com", () => blocked);
  await assert.rejects(
    mail.send("test@example.com", async () => {}),
    { code: "request_in_progress" },
  );
  finish();
  await first;
});
test("failed delivery is not reported as accepted; rate limits persist", async () => {
  const f = fixture();
  const mail = createConfirmationMailer(f.storage, f.now);
  await assert.rejects(
    mail.send("test@example.com", async () => {
      throw { message: "Error sending confirmation email" };
    }),
    /не смог отправить/,
  );
  assert.equal(await mail.remaining("test@example.com"), 0);
  await assert.rejects(
    mail.send("test@example.com", async () => {
      throw {
        code: "over_email_send_rate_limit",
        message: "after 120 seconds",
      };
    }),
    { code: "over_email_send_rate_limit" },
  );
  assert.equal(
    await createConfirmationMailer(f.storage, f.now).remaining(
      "test@example.com",
    ),
    120,
  );
});
test("broken or unavailable private storage does not turn successful send into an error", async () => {
  const f = fixture();
  f.corrupt();
  assert.equal(
    await createConfirmationMailer(f.storage, f.now).remaining(
      "test@example.com",
    ),
    0,
  );
  const unavailable = {
    getItem: async () => {
      throw Error("Unavailable");
    },
    setItem: async () => {
      throw Error("Unavailable");
    },
  };
  const mail = createConfirmationMailer(unavailable, f.now);
  assert.equal(
    await mail.send("test@example.com", async () => "accepted"),
    "accepted",
  );
  assert.equal(await mail.remaining("test@example.com"), 60);
});
