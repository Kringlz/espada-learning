import React, { useState } from "react";
import { Linking, View } from "react-native";
import { Button, Icon, Txt, useUITheme } from "../components/ui";
const configured = process.env.EXPO_PUBLIC_SUPPORT_TELEGRAM;
const hasConfiguredHandle = !!configured && /^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(configured);
const handle =
  hasConfiguredHandle
    ? configured
    : "espada_support_team";
export const supportTelegramURL = `https://t.me/${handle}`;
export function Support({ back }: { back: () => void }) {
  const { colors } = useUITheme();
  const [error, setError] = useState("");
  return (
    <View
      testID="support-screen"
      style={{ maxWidth: 520, width: "100%", alignSelf: "center", gap: 24 }}
    >
      <Button small secondary icon="arrow-left" onPress={back}>
        К профилю
      </Button>
      <View style={{ gap: 16, paddingVertical: 28 }}>
        <Icon name="message-circle" size={36} color={colors.green} />
        <Txt size={30} weight="600">
          Поддержка Espada
        </Txt>
        <Txt color={colors.muted}>
          Коротко опишите проблему. Можно приложить скриншот.
        </Txt>
        <Txt selectable size={14} color={colors.muted}>
          @{handle}
          {hasConfiguredHandle ? "" : " · временный адрес"}
        </Txt>
      </View>
      <Button
        icon="send"
        onPress={() => {
          setError("");
          void Linking.openURL(supportTelegramURL).catch(() =>
            setError("Не удалось открыть Telegram. Скопируйте адрес выше."),
          );
        }}
      >
        Открыть Telegram
      </Button>
      {!!error && (
        <Txt accessibilityRole="alert" color={colors.red}>
          {error}
        </Txt>
      )}
    </View>
  );
}
