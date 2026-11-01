import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import {
  DAILY_ID,
  TEST_ID,
  ReminderService,
  type ReminderPermission,
} from "./model";

export const remindersSupported = true;
const channelId = "study-reminders";
const kind = "study-reminder";
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});
async function ensureChannel() {
  if (Platform.OS === "android")
    await Notifications.setNotificationChannelAsync(channelId, {
      name: "Напоминания о занятиях",
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: "default",
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
}
export const reminders = new ReminderService(AsyncStorage, {
  async permission(request): Promise<ReminderPermission> {
    // Android requires a notification channel before the permission prompt.
    await ensureChannel();
    let status = await Notifications.getPermissionsAsync();
    if (request && !status.granted && status.canAskAgain)
      status = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowSound: true, allowBadge: false },
      });
    const allowed =
      status.granted ||
      status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL ||
      status.ios?.status === Notifications.IosAuthorizationStatus.EPHEMERAL;
    if (!allowed) return status.canAskAgain ? "undetermined" : "blocked";
    if (Platform.OS === "android") {
      const channel =
        await Notifications.getNotificationChannelAsync(channelId);
      if (channel?.importance === Notifications.AndroidImportance.NONE)
        return "blocked";
    }
    return "allowed";
  },
  async scheduled() {
    return (await Notifications.getAllScheduledNotificationsAsync()).map(
      (entry) => ({
        id: entry.identifier,
        hour: entry.content.data?.hour as number | undefined,
        minute: entry.content.data?.minute as number | undefined,
        timezone: entry.content.data?.timezone as string | undefined,
      }),
    );
  },
  cancel: (id) => Notifications.cancelScheduledNotificationAsync(id),
  async daily(settings, timezone) {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_ID,
      content: {
        title: "Время для математики",
        body: "Несколько задач сегодня — ещё один шаг вперёд. Открой Espada и продолжи занятие.",
        sound: "default",
        data: { kind, hour: settings.hour, minute: settings.minute, timezone },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: settings.hour,
        minute: settings.minute,
        channelId,
      },
    });
  },
  async test() {
    await Notifications.scheduleNotificationAsync({
      identifier: TEST_ID,
      content: {
        title: "Напоминания Espada работают",
        body: "Так будет выглядеть напоминание о ежедневном занятии.",
        sound: "default",
        data: { kind },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: 10,
        channelId,
      },
    });
  },
});

export function listenForStudyReminder(open: () => void) {
  let lastId = "";
  const receive = (response: Notifications.NotificationResponse | null) => {
    if (
      !response ||
      response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER ||
      response.notification.request.content.data?.kind !== kind
    )
      return;
    const id = `${response.notification.request.identifier}:${response.notification.date}`;
    if (lastId === id) return;
    lastId = id;
    Notifications.clearLastNotificationResponse();
    open();
  };
  const sub = Notifications.addNotificationResponseReceivedListener(receive);
  receive(Notifications.getLastNotificationResponse());
  return () => sub.remove();
}
