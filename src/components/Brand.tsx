import React from "react";
import { Image, View } from "react-native";
import { Txt, useUITheme } from "./ui";

export function Brand({ compact = false }: { compact?: boolean }) {
  const { dark, colors } = useUITheme();
  return (
    <View
      accessibilityLabel="Espada"
      style={{ flexDirection: "row", alignItems: "center", gap: 9 }}
    >
      <View
        style={{
          width: 31,
          height: 40,
          overflow: "hidden",
          backgroundColor: colors.paper,
        }}
      >
        <Image
          accessibilityLabel="Логотип Espada"
          source={
            dark
              ? require("../../assets/brand/knight-dark.jpg")
              : require("../../assets/brand/knight-light.jpg")
          }
          style={{
            position: "absolute",
            width: 70,
            height: 57,
            left: -20,
            top: -8,
            ...({ mixBlendMode: dark ? "screen" : "multiply" } as any),
          }}
          resizeMode="contain"
        />
      </View>
      {!compact && (
        <Txt size={24} weight="500" style={{ letterSpacing: -0.8 }}>
          Espada
        </Txt>
      )}
    </View>
  );
}
