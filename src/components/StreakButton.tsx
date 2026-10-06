import React, { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useStreak } from "../engagement/StreakContext";
import { dayWord, monthCells } from "../engagement/streak";
import { Button, Icon, Txt, useUITheme } from "./ui";
function Flame({ size = 24, color }: { size?: number; color: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 28" accessible={false}>
      <Path
        d="M13 1c2 7-5 8-3 13 2-1 3-3 3-5 5 4 8 7 8 11a9 9 0 0 1-18 0C3 12 11 10 13 1Z"
        fill={color}
      />
      <Path d="M12 17c0 3-4 4-3 7a4 4 0 0 0 7-2c0-2-2-3-4-5Z" fill="#FFF2D9" />
    </Svg>
  );
}
export function StreakButton() {
  const { colors, dark } = useUITheme();
  const streak = useStreak();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(streak.today.slice(0, 7));
  const cells = monthCells(month),
    marked = new Set(streak.days);
  const first = new Date(`${month}-01T12:00:00`);
  const changeMonth = (delta: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + delta);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const orange = dark ? "#F0B47D" : "#AC582A";
  const iconStyle = {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 14,
    backgroundColor: colors.subtle,
  };
  const earliest = [
    streak.today,
    ...streak.days.filter((d) => d <= streak.today),
  ]
    .sort()[0]
    .slice(0, 7);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Серия занятий: ${streak.current} ${dayWord(streak.current)}. Открыть календарь`}
        onPress={() => {
          setMonth(streak.today.slice(0, 7));
          setOpen(true);
        }}
        style={{
          minHeight: 48,
          paddingHorizontal: 14,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          borderRadius: 16,
          backgroundColor: colors.warning,
          borderWidth: 1,
          borderColor: colors.line,
        }}
      >
        <Flame color={streak.current ? orange : colors.muted} />
        <Txt weight="700" size={20}>
          {streak.ready ? streak.current : "…"}
        </Txt>
      </Pressable>
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            padding: 16,
            backgroundColor: "#00000066",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть календарь"
            onPress={() => setOpen(false)}
            style={{ position: "absolute", inset: 0 }}
          />
          <View
            accessibilityViewIsModal
            style={{
              width: "100%",
              maxWidth: 390,
              maxHeight: "90%",
              borderRadius: 28,
              borderWidth: 1,
              borderColor: colors.line,
              backgroundColor: colors.white,
              overflow: "hidden",
            }}
          >
            <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Flame color={orange} size={32} />
                <Txt size={23} weight="700" style={{ flex: 1 }}>
                  Серия занятий
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Готово"
                  onPress={() => setOpen(false)}
                  style={iconStyle}
                >
                  <Icon name="x" />
                </Pressable>
              </View>
              <View style={{ gap: 6 }}>
                <Txt size={32} weight="700">
                  {streak.current} {dayWord(streak.current)} подряд
                </Txt>
                <Txt size={16} color={colors.muted}>
                  {streak.todayDone
                    ? "Сегодня уже есть маленькая победа."
                    : streak.current
                      ? "Позанимайся сегодня, чтобы продолжить серию."
                      : "Одно занятие — начало новой серии."}
                </Txt>
              </View>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Предыдущий месяц"
                  disabled={month <= earliest}
                  onPress={() => changeMonth(-1)}
                  style={[iconStyle, { opacity: month <= earliest ? 0.35 : 1 }]}
                >
                  <Icon name="chevron-left" />
                </Pressable>
                <Txt
                  size={17}
                  weight="600"
                  style={{
                    flex: 1,
                    textAlign: "center",
                    textTransform: "capitalize",
                  }}
                >
                  {first.toLocaleDateString("ru-RU", {
                    month: "long",
                    year: "numeric",
                  })}
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Следующий месяц"
                  disabled={month >= streak.today.slice(0, 7)}
                  onPress={() => changeMonth(1)}
                  style={[
                    iconStyle,
                    { opacity: month >= streak.today.slice(0, 7) ? 0.35 : 1 },
                  ]}
                >
                  <Icon name="chevron-right" />
                </Pressable>
              </View>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row" }}>
                  {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((d) => (
                    <Txt
                      key={d}
                      size={13}
                      color={colors.muted}
                      style={{ width: "14.285714%", textAlign: "center" }}
                    >
                      {d}
                    </Txt>
                  ))}
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {cells.map((day, i) => (
                    <View
                      key={day ?? `blank-${i}`}
                      style={{ width: "14.285714%", padding: 2 }}
                    >
                      <View
                        accessibilityLabel={
                          day
                            ? `${new Date(`${day}T12:00:00`).toLocaleDateString("ru-RU")}${day === streak.today ? ", сегодня" : ""}${marked.has(day) ? ", занятие выполнено" : ""}`
                            : undefined
                        }
                        style={{
                          height: 36,
                          borderRadius: 12,
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor:
                            day && marked.has(day) && day <= streak.today
                              ? colors.green
                              : "transparent",
                          borderWidth: day === streak.today ? 1.5 : 0,
                          borderColor: orange,
                        }}
                      >
                        {day && (
                          <Txt
                            size={15}
                            weight={marked.has(day) ? "700" : "400"}
                            color={
                              marked.has(day) && day <= streak.today
                                ? colors.onPrimary
                                : day > streak.today
                                  ? colors.muted
                                  : colors.ink
                            }
                          >
                            {Number(day.slice(-2))}
                          </Txt>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              </View>
              <Txt size={15} color={colors.muted}>
                Рекорд: {streak.best} {dayWord(streak.best)} · Зелёным отмечены
                занятия.
              </Txt>
              <Txt size={14} color={colors.muted}>
                Прочитай раздел, проверь ответ или посмотри видео. Дни считаются
                по времени устройства.
              </Txt>
              {!!streak.error && (
                <>
                  <Txt accessibilityRole="alert" color={colors.red}>
                    {streak.error}
                  </Txt>
                  <Button secondary onPress={streak.retry}>
                    Повторить
                  </Button>
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}
