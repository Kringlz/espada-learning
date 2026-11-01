import React, { useEffect, useState } from "react";
import { Linking, Switch, TextInput, View } from "react-native";
import { Button, Card, Txt, useUITheme } from "../components/ui";
import { formatReminderTime, validTime } from "./model";
import { remindersSupported } from "./service";
import { useReminders } from "./ReminderContext";

export function StudyReminderSettings() {
  const { colors, styles } = useUITheme();
  const { state, ready, busy, error, notice, update, retry, test } =
    useReminders();
  const { settings, permission, active } = state;
  const [hour, setHour] = useState("19");
  const [minute, setMinute] = useState("00");
  const [settingsError, setSettingsError] = useState("");
  useEffect(() => {
    setHour(String(settings.hour).padStart(2, "0"));
    setMinute(String(settings.minute).padStart(2, "0"));
  }, [settings.hour, settings.minute]);
  if (!remindersSupported) return null;
  const valid =
    /^\d{1,2}$/.test(hour) &&
    /^\d{1,2}$/.test(minute) &&
    validTime(Number(hour), Number(minute));
  const changed =
    Number(hour) !== settings.hour || Number(minute) !== settings.minute;
  return (
    <Card>
      <View
        style={[
          styles.row,
          { justifyContent: "space-between", flexWrap: "wrap" },
        ]}
      >
        <Txt size={20} weight="600">
          Напоминания о занятиях
        </Txt>
        <Switch
          accessibilityLabel="Ежедневное напоминание о занятиях"
          value={settings.enabled}
          disabled={!ready || busy || !!error}
          onValueChange={(enabled) => update({ ...settings, enabled })}
          trackColor={{ true: colors.green }}
        />
      </View>
      <Txt color={colors.muted}>
        Каждый день в удобное время на этом устройстве. Настройка общая для всех
        аккаунтов и сохраняется после выхода.
      </Txt>
      <View style={[styles.row, { flexWrap: "wrap" }]}>
        {(
          [
            ["Часы", hour, setHour],
            ["Минуты", minute, setMinute],
          ] as const
        ).map(([label, value, setValue]) => (
          <View key={label} style={{ gap: 4 }}>
            <Txt size={13} color={colors.muted}>
              {label}
            </Txt>
            <TextInput
              accessibilityLabel={label}
              value={value}
              onChangeText={setValue}
              keyboardType="number-pad"
              maxLength={2}
              editable={ready && !busy && !error}
              selectTextOnFocus
              style={{
                color: colors.ink,
                borderColor: colors.line,
                borderWidth: 1,
                borderRadius: 12,
                padding: 12,
                fontSize: 22,
                width: 80,
                textAlign: "center",
              }}
            />
          </View>
        ))}
      </View>
      <Txt size={13} color={colors.muted}>
        По местному времени телефона, формат 24 часа. Энергосбережение и режим
        «Не беспокоить» могут задержать уведомление.
      </Txt>
      {!valid && (
        <Txt color={colors.red} accessibilityRole="alert">
          Введи часы от 00 до 23 и минуты от 00 до 59.
        </Txt>
      )}
      {changed && (
        <Button
          secondary
          disabled={!ready || busy || !valid || !!error}
          onPress={() =>
            update({ ...settings, hour: Number(hour), minute: Number(minute) })
          }
        >
          Сохранить время
        </Button>
      )}
      {!error && (
        <Txt accessibilityLiveRegion="polite" color={colors.muted}>
          {busy
            ? "Обновляем напоминания…"
            : !ready
              ? "Загружаем настройки…"
              : active
                ? `Напомним каждый день в ${formatReminderTime(settings.hour, settings.minute)}.`
                : settings.enabled
                  ? "Нужно разрешить уведомления в настройках телефона."
                  : "Напоминания выключены."}
        </Txt>
      )}
      {settings.enabled &&
        !active &&
        ready &&
        !busy &&
        permission !== "allowed" && (
          <Button
            secondary
            onPress={() => {
              setSettingsError("");
              void Linking.openSettings().catch(() =>
                setSettingsError(
                  "Открой настройки телефона → Espada → Уведомления.",
                ),
              );
            }}
          >
            Открыть настройки телефона
          </Button>
        )}
      {active && !error && (
        <Button secondary small disabled={busy} onPress={test}>
          Проверить уведомление
        </Button>
      )}
      {!!error && (
        <>
          <Txt accessibilityRole="alert" color={colors.red}>
            {error}
          </Txt>
          <Button secondary disabled={busy} onPress={retry}>
            Повторить
          </Button>
        </>
      )}
      {!!settingsError && (
        <Txt accessibilityRole="alert" color={colors.red}>
          {settingsError}
        </Txt>
      )}
      {!!notice && (
        <Txt accessibilityLiveRegion="polite" color={colors.muted}>
          {notice}
        </Txt>
      )}
    </Card>
  );
}
