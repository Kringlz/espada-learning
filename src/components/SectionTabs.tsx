import { useSounds } from "../engagement/Sounds";
import React from "react";
import { Pressable, View } from "react-native";
import { Icon, Txt, useUITheme } from "./ui";

export function SectionTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  options: {
    value: T;
    label: string;
    icon: React.ComponentProps<typeof Icon>["name"];
  }[];
}) {
  const { colors, clarity } = useUITheme();
  const { play } = useSounds();
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: colors.subtle,
        borderRadius: clarity ? 18 : 20,
        borderWidth: clarity ? 1 : 0,
        borderColor: colors.line,
        padding: 4,
        gap: 4,
      }}
    >
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="button"
          accessibilityState={{ selected: value === option.value }}
          aria-pressed={value === option.value}
          onPress={() => {
            if (value !== option.value) play("open");
            onChange(option.value);
          }}
          style={({ pressed }) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 68,
            padding: 8,
            borderRadius: 16,
            gap: 5,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor:
              value === option.value ? colors.white : "transparent",
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Icon
            name={option.icon}
            size={clarity ? 23 : 19}
            color={value === option.value ? colors.green : colors.muted}
          />
          <Txt
            size={clarity ? 15 : 13}
            weight={value === option.value ? "700" : "500"}
            color={value === option.value ? colors.ink : colors.muted}
            style={{ textAlign: "center" }}
          >
            {option.label}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
