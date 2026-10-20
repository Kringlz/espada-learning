import React from "react";
import { Pressable, View } from "react-native";
import { Txt, useUITheme } from "./ui";

export function ChoiceTabs<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly (readonly [T, string])[];
  onChange: (value: T) => void;
  label: string;
}) {
  const { colors } = useUITheme();
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        padding: 4,
        gap: 4,
        borderRadius: 18,
        backgroundColor: colors.subtle,
      }}
    >
      {options.map(([id, title]) => (
        <Pressable
          key={id}
          accessibilityRole="tab"
          accessibilityLabel={title}
          accessibilityState={{ selected: id === value }}
          aria-selected={id === value}
          onPress={() => onChange(id)}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            padding: 6,
            borderRadius: 14,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: id === value ? colors.white : "transparent",
            opacity: pressed ? 0.65 : 1,
          })}
        >
          <Txt
            size={14}
            weight="700"
            color={id === value ? colors.primary : colors.muted}
            style={{ textAlign: "center" }}
          >
            {title}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
