export const REMINDER_KEY = "espada.study-reminder.v1";
export const DAILY_ID = "espada.study-reminder.daily";
export const TEST_ID = "espada.study-reminder.test";
export const DEFAULT_REMINDER = { enabled: false, hour: 19, minute: 0 };
export type ReminderSettings = typeof DEFAULT_REMINDER;
export type ReminderPermission = "allowed" | "undetermined" | "blocked";
export type ReminderState = {
  settings: ReminderSettings;
  permission: ReminderPermission;
  active: boolean;
};
export function validTime(hour: number, minute: number) {
  return (
    Number.isInteger(hour) &&
    hour >= 0 &&
    hour < 24 &&
    Number.isInteger(minute) &&
    minute >= 0 &&
    minute < 60
  );
}
export function parseReminder(raw: string | null): ReminderSettings {
  try {
    const value = JSON.parse(raw ?? "null");
    if (
      value &&
      typeof value.enabled === "boolean" &&
      validTime(value.hour, value.minute)
    )
      return { enabled: value.enabled, hour: value.hour, minute: value.minute };
  } catch {
    /* Invalid preferences must never opt a user in. */
  }
  return { ...DEFAULT_REMINDER };
}
export function formatReminderTime(hour: number, minute: number) {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
export interface ReminderGateway {
  permission(request: boolean): Promise<ReminderPermission>;
  scheduled(): Promise<
    { id: string; hour?: number; minute?: number; timezone?: string }[]
  >;
  cancel(id: string): Promise<void>;
  daily(settings: ReminderSettings, timezone: string): Promise<void>;
  test(): Promise<void>;
}
export interface ReminderStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

/** One opt-in per installation; messages contain no account or learning data. */
export class ReminderService {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private storage: ReminderStorage,
    private gateway: ReminderGateway,
    private timezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone,
  ) {}
  private run<T>(action: () => Promise<T>): Promise<T> {
    const task = this.queue.then(action);
    this.queue = task.catch(() => {});
    return task;
  }
  private async reconcile(
    settings: ReminderSettings,
    permission: ReminderPermission,
  ): Promise<ReminderState> {
    const scheduled = await this.gateway.scheduled();
    const active = settings.enabled && permission === "allowed";
    const timezone = this.timezone();
    const existing = scheduled.find((entry) => entry.id === DAILY_ID);
    if (!active) {
      // Never cancel notifications owned by another feature.
      for (const entry of scheduled)
        if (entry.id === DAILY_ID || entry.id === TEST_ID)
          await this.gateway.cancel(entry.id);
    } else if (
      !existing ||
      existing.hour !== settings.hour ||
      existing.minute !== settings.minute ||
      existing.timezone !== timezone
    ) {
      if (existing) await this.gateway.cancel(DAILY_ID);
      await this.gateway.daily(settings, timezone);
    }
    return { settings, permission, active };
  }
  refresh() {
    return this.run(async () =>
      this.reconcile(
        parseReminder(await this.storage.getItem(REMINDER_KEY)),
        await this.gateway.permission(false),
      ),
    );
  }
  update(settings: ReminderSettings) {
    return this.run(async () => {
      if (!validTime(settings.hour, settings.minute))
        throw Error("Invalid reminder time");
      const permission = await this.gateway.permission(settings.enabled);
      // Save the intent before touching the OS schedule, so a failed operation is
      // retried on the next foreground/restart instead of silently forgotten.
      await this.storage.setItem(REMINDER_KEY, JSON.stringify(settings));
      return this.reconcile(settings, permission);
    });
  }
  sendTest() {
    return this.run(async () => {
      const settings = parseReminder(await this.storage.getItem(REMINDER_KEY));
      const permission = await this.gateway.permission(false);
      if (!settings.enabled || permission !== "allowed")
        throw Error("Reminders are not enabled");
      await this.gateway.cancel(TEST_ID);
      await this.gateway.test();
    });
  }
}
