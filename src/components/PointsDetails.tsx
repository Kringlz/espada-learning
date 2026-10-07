import React, { useState } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useRewards } from "../engagement/RewardContext";
import { levelFor, levels, rewardPoints } from "../engagement/rewards";
import { Button, Icon, Txt, useUITheme } from "./ui";
export function PointsDetails({
  children,
}: {
  children: (open: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { colors } = useUITheme();
  const rewards = useRewards();
  const level = levelFor(rewards.points);
  const next = levels[level + 1];
  return (
    <>
      {children(() => setOpen(true))}
      <Modal
        transparent
        visible={open}
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "#00000066",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Закрыть информацию об очках"
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
            <ScrollView contentContainerStyle={{ padding: 24, gap: 24 }}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <Icon name="star" size={28} color={colors.green} />
                <Txt size={26} weight="700" style={{ flex: 1 }}>
                  Очки
                </Txt>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Готово"
                  onPress={() => setOpen(false)}
                  style={{
                    height: 44,
                    width: 44,
                    borderRadius: 14,
                    backgroundColor: colors.subtle,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name="x" />
                </Pressable>
              </View>
              <View style={{ gap: 6 }}>
                <Txt size={44} weight="700">
                  {rewards.ready ? rewards.points : "…"}
                </Txt>
                <Txt size={18} weight="600">
                  {levels[level].name}
                </Txt>
                {next && (
                  <Txt size={15} color={colors.muted}>
                    Ещё {next.points - rewards.points} до уровня «{next.name}»
                  </Txt>
                )}
              </View>
              <View style={{ gap: 12 }}>
                {[
                  {
                    icon: "check-circle" as const,
                    title: "Правильный ответ",
                    value: rewardPoints.question,
                  },
                  {
                    icon: "play-circle" as const,
                    title: "Видео · от 80%",
                    value: rewardPoints.video,
                  },
                ].map((row) => (
                  <View
                    key={row.title}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                      padding: 16,
                      borderRadius: 18,
                      backgroundColor: colors.light,
                    }}
                  >
                    <Icon name={row.icon} color={colors.green} />
                    <Txt size={16} style={{ flex: 1 }}>
                      {row.title}
                    </Txt>
                    <Txt size={22} weight="700">
                      +{row.value}
                    </Txt>
                  </View>
                ))}
                <Txt size={14} color={colors.muted}>
                  За каждое видео и задание — один раз.
                </Txt>
              </View>
              <View style={{ gap: 14 }}>
                {levels.map((item, i) => (
                  <View
                    key={item.name}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Icon
                      name={i <= level ? "check-circle" : "circle"}
                      color={i <= level ? colors.green : colors.muted}
                      size={19}
                    />
                    <Txt size={16} style={{ flex: 1 }}>
                      {item.name}
                    </Txt>
                    <Txt size={15} color={colors.muted}>
                      {item.points}
                    </Txt>
                  </View>
                ))}
              </View>
              <Txt size={13} color={colors.muted}>
                Очки сохраняются на этом устройстве.
              </Txt>
              {!!rewards.error && (
                <>
                  <Txt accessibilityRole="alert" color={colors.red}>
                    {rewards.error}
                  </Txt>
                  <Button secondary onPress={rewards.retry}>
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
