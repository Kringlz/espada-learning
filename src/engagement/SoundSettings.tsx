import React from "react";
import { View } from "react-native";
import { Button, Card, Txt, useUITheme } from "../components/ui";
import { useSounds } from "./Sounds";
export function SoundSettings() {
  const sounds = useSounds();
  const { colors } = useUITheme();
  return (
    <Card style={{ gap: 14 }}>
      <Txt size={20} weight="600">
        Звуки Espada
      </Txt>
      <Txt size={14} color={colors.muted}>
        Мягкие ноты для карты результатов, очков и новых достижений.
      </Txt>
      <Button
        secondary
        icon={sounds.enabled ? "volume-2" : "volume-x"}
        onPress={sounds.toggle}
      >
        {sounds.enabled ? "Выключить звуки" : "Включить звуки"}
      </Button>
      <Txt size={14}>Громкость · {Math.round(sounds.volume * 100)}%</Txt>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {[
          [0.2, "Тихо"],
          [0.45, "Умеренно"],
          [0.7, "Громче"],
        ].map(([value, label]) => (
          <Button
            key={value}
            small
            secondary
            selected={sounds.volume === value}
            onPress={() => sounds.setVolume(Number(value))}
          >
            {label}
          </Button>
        ))}
      </View>
      <Button
        small
        secondary
        disabled={!sounds.enabled || sounds.volume === 0}
        icon="play"
        onPress={() => sounds.play("points")}
      >
        Послушать звук очков
      </Button>
      {!!sounds.error && (
        <>
          <Txt accessibilityRole="alert" color={colors.red}>
            {sounds.error}
          </Txt>
          <Button small secondary onPress={sounds.retry}>
            Повторить сохранение звука
          </Button>
        </>
      )}
    </Card>
  );
}
