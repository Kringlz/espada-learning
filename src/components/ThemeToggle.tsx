import React from "react";
import { Pressable } from "react-native";
import { Icon, useUITheme } from "./ui";

export function ThemeToggle() {
  const { dark, colors, setPreference } = useUITheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        dark ? "Включить светлую тему" : "Включить тёмную тему"
      }
      onPress={() => setPreference(dark ? "light" : "dark")}
      style={{
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: colors.white,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Icon name={dark ? "sun" : "moon"} size={20} />
    </Pressable>
  );
}
