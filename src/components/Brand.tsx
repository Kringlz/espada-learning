import React from "react";
import { Image, View } from "react-native";
import { useTheme } from "../theme/Theme";
import { Txt } from "./ui";

export function Brand() {
  const { dark } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View
        style={{
          width: 44,
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
      <Txt size={27} weight="700" style={{ letterSpacing: -1 }}>
        espada.
      </Txt>
    </View>
  );
}
