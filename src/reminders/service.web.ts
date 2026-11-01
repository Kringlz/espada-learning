import { DEFAULT_REMINDER, type ReminderState } from "./model";
export const remindersSupported = false;
const state = (): ReminderState => ({
  settings: { ...DEFAULT_REMINDER },
  permission: "undetermined",
  active: false,
});
export const reminders = {
  refresh: async () => state(),
  update: async (_settings: typeof DEFAULT_REMINDER) => state(),
  sendTest: async () => {},
};
export function listenForStudyReminder(_open: () => void) {
  return () => {};
}
