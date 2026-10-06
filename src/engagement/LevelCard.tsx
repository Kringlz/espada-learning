import { AtlasImage } from "../components/AtlasImage";
import { sectionIllustrations } from "../components/SectionIllustrations";
import React from "react";
import { Image, Pressable, View } from "react-native";
import {
  Button,
  Card,
  Disclosure,
  Icon,
  Txt,
  useUITheme,
} from "../components/ui";
import { SoftReveal } from "../components/Motion";
import { useRewards } from "./RewardContext";
import { levels, levelFor } from "./rewards";

export function LevelCard({
  compact = false,
  onPress,
}: {
  compact?: boolean;
  onPress?: () => void;
}) {
  const { colors } = useUITheme();
  const { points, ready, error, retry } = useRewards();
  const index = levelFor(points),
    level = levels[index],
    next = levels[index + 1];
  const percent = next
    ? Math.min(
        100,
        ((points - level.points) / (next.points - level.points)) * 100,
      )
    : 100;
  if (compact)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${level.name}, ${ready ? points : "загрузка"} очков. Мой прогресс`}
        onPress={onPress}
        style={({ pressed }) => ({
          minHeight: 164,
          padding: 24,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: colors.line,
          backgroundColor: colors.warning,
          gap: 20,
          opacity: pressed ? 0.8 : 1,
        })}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Icon name="star" size={28} color={colors.green} />
          <View style={{ flex: 1, gap: 2 }}>
            <Txt size={15} color={colors.muted}>
              {level.name}
            </Txt>
            <Txt size={26} weight="700">
              {ready ? points : "…"} очков
            </Txt>
          </View>
          <Icon name="arrow-right" size={20} />
        </View>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel={
            next ? `До уровня ${next.name}` : "Все уровни открыты"
          }
          accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
          style={{ height: 7, borderRadius: 7, backgroundColor: colors.line }}
        >
          <View
            style={{
              width: `${percent}%`,
              height: 7,
              borderRadius: 7,
              backgroundColor: colors.green,
            }}
          />
        </View>
        {!!error && (
          <Txt accessibilityRole="alert" size={14} color={colors.red}>
            Не удалось загрузить очки. Открой прогресс для повтора.
          </Txt>
        )}
      </Pressable>
    );
  return (
    <Card style={{ gap: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            backgroundColor: colors.light,
            borderRadius: 20,
            width: 56,
            height: 56,
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <AtlasImage
            source={sectionIllustrations.league.image}
            accessible={false}
            resizeMode="contain"
            style={{ width: 56, height: 56, borderRadius: 14 }}
          />
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Txt size={12} color={colors.muted}>
            УРОВЕНЬ {index + 1} / {levels.length}
          </Txt>
          <Txt size={22} weight="700">
            {level.name}
          </Txt>
          <Txt size={14} weight="700" color={colors.green}>
            {ready ? points : "…"} очков
          </Txt>
        </View>
      </View>
      <View
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
        accessibilityLabel={
          next ? `До уровня ${next.name}` : "Все уровни открыты"
        }
        style={{ height: 7, borderRadius: 7, backgroundColor: colors.line }}
      >
        <View
          style={{
            width: `${percent}%`,
            height: 7,
            borderRadius: 7,
            backgroundColor: colors.green,
          }}
        />
      </View>
      <Txt size={13} color={colors.muted}>
        {next
          ? `Ещё ${next.points - points} очков до уровня «${next.name}»`
          : "Все уровни открыты. Продолжай пополнять копилку!"}
      </Txt>
      <Disclosure title="Как получить очки?" icon="zap">
        <Txt>+10 за просмотр 80% видео · +20 за правильное задание.</Txt>
        <Txt size={13} color={colors.muted}>
          За каждое видео и задание — один раз, даже с подсказкой. Очки
          сохраняются на этом устройстве и не меняют оценки учителя.
        </Txt>
        {levels.map((item, i) => (
          <Txt key={item.name} size={13}>
            {i + 1}. {item.name} · от {item.points} очков
          </Txt>
        ))}
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
export function RewardNotice() {
  const { notice } = useRewards();
  const { colors } = useUITheme();
  if (!notice) return null;
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 18,
        right: 18,
        bottom: 90,
        alignItems: "center",
        zIndex: 30,
      }}
    >
      <SoftReveal key={notice}>
        <View
          accessibilityLiveRegion="polite"
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 13,
            paddingHorizontal: 20,
            borderRadius: 20,
          }}
        >
          <Txt weight="700" color={colors.onPrimary}>
            {notice}
          </Txt>
        </View>
      </SoftReveal>
    </View>
  );
}
