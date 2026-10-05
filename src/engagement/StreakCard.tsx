import { streakDays } from "./streaks";
import React from "react";
import { View } from "react-native";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  useUITheme,
} from "../components/ui";
import { useRewards } from "./RewardContext";

export function StreakCard() {
  const { colors } = useUITheme();
  const { streak, ready, timeZone, error, retry } = useRewards();
  return (
    <Card style={{ gap: 14, backgroundColor: colors.light }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            backgroundColor: colors.paper,
            padding: 14,
            borderRadius: 20,
          }}
        >
          <Icon name="sun" size={28} color={colors.orange} />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={12} color={colors.muted}>
            РИТМ УЧЁБЫ
          </Txt>
          <Txt testID="streak-count" size={24} weight="700">
            {ready ? streakDays(streak.current) : "…"} подряд
          </Txt>
          <Txt size={13} color={colors.green}>
            {streak.today
              ? "Сегодня уже получилось!"
              : streak.current
                ? "Ещё один шаг сегодня — и серия продолжится"
                : "Новый день — начало новой серии"}
          </Txt>
        </View>
      </View>
      <Txt size={13} color={colors.muted}>
        Лучшая серия: {ready ? streakDays(streak.best) : "…"} · Каждый небольшой
        шаг считается.
      </Txt>
      <Disclosure title="Как продолжить серию?" icon="sun">
        <Txt size={14}>
          Получи очки за новое правильное задание или просмотр 80% нового видео.
          Достаточно одного такого действия за день.
        </Txt>
        <Txt size={13} color={colors.muted}>
          Повторы не добавляют очков и дней. Пропуск дня начинает новую серию, а
          лучший результат остаётся. День заканчивается в полночь (
          {timeZone || "часовой пояс устройства"}). Серия сохраняется для твоего
          аккаунта на этом устройстве.
        </Txt>
      </Disclosure>
      {!!error && (
        <>
          <Txt accessibilityRole="alert" color={colors.red}>
            {error}
          </Txt>
          <Button small secondary onPress={retry}>
            Повторить
          </Button>
        </>
      )}
    </Card>
  );
}
