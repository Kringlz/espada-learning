import test from "node:test";
import assert from "node:assert/strict";
import {
  DAILY_ID,
  DEFAULT_REMINDER,
  REMINDER_KEY,
  TEST_ID,
  ReminderService,
  parseReminder,
  type ReminderPermission,
} from "../src/reminders/model";

function fixture() {
  const storage = new Map<string, string>();
  const scheduled = new Map<
    string,
    { id: string; hour?: number; minute?: number; timezone?: string }
  >();
  const state = {
    permission: "allowed" as ReminderPermission,
    timezone: "Asia/Bishkek",
    requests: 0,
    schedules: 0,
    failSchedule: false,
    failStorage: false,
    failCancel: false,
  };
  const service = new ReminderService(
    {
      async getItem(key) {
        return storage.get(key) ?? null;
      },
      async setItem(key, value) {
        if (state.failStorage) throw Error("disk full");
        storage.set(key, value);
      },
    },
    {
      async permission(request) {
        if (request) state.requests++;
        return state.permission;
      },
      async scheduled() {
        return [...scheduled.values()];
      },
      async cancel(id) {
        if (state.failCancel) throw Error("OS failed");
        scheduled.delete(id);
      },
      async daily(settings, timezone) {
        if (state.failSchedule) throw Error("OS failed");
        state.schedules++;
        scheduled.set(DAILY_ID, {
          id: DAILY_ID,
          hour: settings.hour,
          minute: settings.minute,
          timezone,
        });
      },
      async test() {
        scheduled.set(TEST_ID, { id: TEST_ID });
      },
    },
    () => state.timezone,
  );
  return { service, storage, scheduled, state };
}
const enabled = { enabled: true, hour: 19, minute: 0 };

test("fresh installation never prompts or schedules without opt-in", async () => {
  const f = fixture();
  assert.deepEqual((await f.service.refresh()).settings, DEFAULT_REMINDER);
  assert.equal(f.state.requests, 0);
  assert.equal(f.scheduled.size, 0);
});
test("corrupt preferences cannot enable reminders", () => {
  for (const raw of [
    null,
    "{",
    "null",
    "{}",
    '{"enabled":"true","hour":19,"minute":0}',
    '{"enabled":true,"hour":24,"minute":0}',
    '{"enabled":true,"hour":19,"minute":60}',
  ])
    assert.deepEqual(parseReminder(raw), DEFAULT_REMINDER);
});
test("opt-in schedules one daily reminder and foreground does not duplicate it", async () => {
  const f = fixture();
  assert.equal((await f.service.update(enabled)).active, true);
  await f.service.refresh();
  await f.service.refresh();
  assert.equal(f.state.requests, 1);
  assert.equal(f.state.schedules, 1);
  assert.deepEqual(f.scheduled.get(DAILY_ID), {
    id: DAILY_ID,
    hour: 19,
    minute: 0,
    timezone: "Asia/Bishkek",
  });
});
test("time change and timezone change replace the existing schedule", async () => {
  const f = fixture();
  await f.service.update(enabled);
  await f.service.update({ ...enabled, hour: 0, minute: 5 });
  f.state.timezone = "Europe/London";
  await f.service.refresh();
  assert.equal(f.scheduled.size, 1);
  assert.deepEqual(f.scheduled.get(DAILY_ID), {
    id: DAILY_ID,
    hour: 0,
    minute: 5,
    timezone: "Europe/London",
  });
});
test("denied permission is never reported as active and a settings grant restores opt-in", async () => {
  const f = fixture();
  f.state.permission = "blocked";
  assert.equal((await f.service.update(enabled)).active, false);
  assert.equal(f.scheduled.size, 0);
  await assert.rejects(f.service.sendTest());
  f.state.permission = "allowed";
  assert.equal((await f.service.refresh()).active, true);
  assert.equal(f.state.requests, 1);
});
test("revoking permission cancels daily and test notifications, keeping other features intact", async () => {
  const f = fixture();
  await f.service.update(enabled);
  await f.service.sendTest();
  f.scheduled.set("other-feature", { id: "other-feature" });
  f.state.permission = "blocked";
  assert.equal((await f.service.refresh()).active, false);
  assert.deepEqual([...f.scheduled.keys()], ["other-feature"]);
});
test("turning reminders off cancels both schedules and preserves the chosen time", async () => {
  const f = fixture();
  await f.service.update({ ...enabled, hour: 21, minute: 45 });
  await f.service.sendTest();
  await f.service.update({ enabled: false, hour: 21, minute: 45 });
  assert.equal(f.scheduled.size, 0);
  await assert.rejects(f.service.sendTest());
  assert.equal((await f.service.refresh()).settings.hour, 21);
});
test("a scheduling failure keeps durable intent for a subsequent retry", async () => {
  const f = fixture();
  f.state.failSchedule = true;
  await assert.rejects(f.service.update(enabled));
  assert.deepEqual(parseReminder(f.storage.get(REMINDER_KEY)!), enabled);
  f.state.failSchedule = false;
  assert.equal((await f.service.refresh()).active, true);
});
test("a failed preference write never changes an existing schedule", async () => {
  const f = fixture();
  await f.service.update(enabled);
  f.state.failStorage = true;
  await assert.rejects(f.service.update({ ...enabled, hour: 20 }));
  assert.equal(f.scheduled.get(DAILY_ID)?.hour, 19);
});
test("failed cancellation is surfaced and retried until reminders are actually off", async () => {
  const f = fixture();
  await f.service.update(enabled);
  f.state.failCancel = true;
  await assert.rejects(f.service.update({ ...enabled, enabled: false }));
  f.state.failCancel = false;
  assert.equal((await f.service.refresh()).active, false);
  assert.equal(f.scheduled.size, 0);
});
test("racing enable, time edit, refresh and disable converge on the final choice", async () => {
  const f = fixture();
  await Promise.all([
    f.service.update(enabled),
    f.service.update({ ...enabled, hour: 22 }),
    f.service.refresh(),
    f.service.update({ enabled: false, hour: 22, minute: 0 }),
  ]);
  assert.equal(f.scheduled.size, 0);
  assert.deepEqual((await f.service.refresh()).settings, {
    enabled: false,
    hour: 22,
    minute: 0,
  });
});
test("invalid times do not prompt, persist, or schedule", async () => {
  const f = fixture();
  for (const settings of [
    { ...enabled, hour: -1 },
    { ...enabled, hour: 24 },
    { ...enabled, minute: 60 },
    { ...enabled, minute: 0.5 },
  ])
    await assert.rejects(f.service.update(settings));
  assert.equal(f.state.requests, 0);
  assert.equal(f.storage.size, 0);
});
test("restores a schedule removed by the OS without prompting again", async () => {
  const f = fixture();
  await f.service.update(enabled);
  f.scheduled.clear();
  assert.equal((await f.service.refresh()).active, true);
  assert.equal(f.scheduled.size, 1);
  assert.equal(f.state.requests, 1);
});
