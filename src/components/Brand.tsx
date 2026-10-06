import React from "react";
import { Image, View, useWindowDimensions } from "react-native";
import { useTheme } from "../theme/Theme";
import { Txt } from "./ui";

export function Brand({ compact = false }: { compact?: boolean }) {
  const { dark } = useTheme();
  const narrow = useWindowDimensions().width < 360;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: narrow ? 6 : 10,
      }}
    >
      <View
        style={{
          width: narrow ? 38 : 44,
          height: 48,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: dark ? "#000" : "#fff",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Image
          accessibilityLabel="Логотип Espada"
          source={
            dark
              ? require("../../assets/brand/knight-dark.jpg")
              : require("../../assets/brand/knight-light.jpg")
          }
          style={{ width: 84, height: 69 }}
          resizeMode="contain"
        />
      </View>
      {!compact && (
        <Txt size={narrow ? 23 : 27} weight="700" style={{ letterSpacing: -1 }}>
          Espada
        </Txt>
      )}
    </View>
  );
}
