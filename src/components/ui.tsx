import React, { useState } from "react";
import {
  Text,
  View,
  Pressable,
  TextInput,
  StyleSheet,
  ViewStyle,
  StyleProp,
  TextStyle,
} from "react-native";
import Feather from "@expo/vector-icons/Feather";
import { translate, formatDate } from "../i18n";
export const colors = {
  ink: "#253D33",
  muted: "#66736B",
  green: "#355B46",
  light: "#EDF2E9",
  paper: "#FAFAF6",
  white: "#FFFFFF",
  line: "#E3E7DF",
  gold: "#F0D795",
  orange: "#A7653D",
  red: "#A3413B",
};
export const dateText = formatDate;
export function Txt({
  children,
  size = 15,
  color = colors.ink,
  weight = "400",
  style,
  ...props
}: {
  children?: React.ReactNode;
  size?: number;
  color?: string;
  weight?: TextStyle["fontWeight"];
  style?: StyleProp<TextStyle>;
  [key: string]: any;
}) {
  return (
    <Text
      {...props}
      style={[
        { fontSize: size, color, fontWeight: weight, lineHeight: size * 1.4 },
        style,
      ]}
    >
      {React.Children.map(children, (child) =>
        typeof child === "string" ? translate(child) : child,
      )}
    </Text>
  );
}
export function Icon({
  name,
  size = 20,
  color = colors.ink,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) {
  return (
    <Feather
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      aria-hidden
      name={name}
      size={size}
      color={color}
      selectable={false}
    />
  );
}
export function Button({
  children,
  onPress,
  secondary = false,
  selected,
  disabled = false,
  icon,
  small = false,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  small?: boolean;
  label?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? translate(label) : undefined}
      accessibilityState={{ disabled, selected }}
      aria-pressed={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary ? "#F0F3EC" : colors.green,
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          paddingVertical: small ? 8 : 10,
        },
      ]}
    >
      {icon && (
        <Icon name={icon} size={17} color={secondary ? colors.green : "#fff"} />
      )}
      <Txt
        style={{ flexShrink: 1 }}
        size={14}
        weight="600"
        color={secondary ? colors.green : "#fff"}
      >
        {children}
      </Txt>
    </Pressable>
  );
}
export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}
export function Pill({
  children,
  tone = "green",
  icon,
}: {
  children: React.ReactNode;
  tone?: "green" | "gold" | "neutral";
  icon?: React.ComponentProps<typeof Icon>["name"];
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        maxWidth: "100%",
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 7,
        backgroundColor:
          tone === "gold"
            ? "#FBF1D9"
            : tone === "neutral"
              ? "#F0F1EC"
              : "#EAF0E7",
      }}
    >
      {icon && (
        <Icon
          name={icon}
          size={13}
          color={tone === "gold" ? "#795B24" : colors.green}
        />
      )}
      <Txt
        style={{ flexShrink: 1 }}
        size={12}
        weight="600"
        color={tone === "gold" ? "#795B24" : colors.green}
      >
        {children}
      </Txt>
    </View>
  );
}
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numeric = false,
  secure = false,
  editable = true,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  multiline?: boolean;
  numeric?: boolean;
  secure?: boolean;
  editable?: boolean;
  maxLength?: number;
}) {
  return (
    <View style={{ gap: 7 }}>
      <Txt size={13} weight="600">
        {label}
      </Txt>
      <TextInput
        accessibilityLabel={label ? translate(label) : undefined}
        editable={editable}
        maxLength={maxLength}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ? translate(placeholder) : undefined}
        placeholderTextColor="#7B857F"
        multiline={multiline}
        keyboardType={numeric ? "decimal-pad" : "default"}
        secureTextEntry={secure}
        autoCapitalize={secure ? "none" : "sentences"}
        style={[
          styles.input,
          multiline && { minHeight: 110, textAlignVertical: "top" },
        ]}
      />
    </View>
  );
}
export function SectionTitle({
  title,
  action,
  onPress,
  icon,
}: {
  title: string;
  icon?: React.ComponentProps<typeof Icon>["name"];
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.row,
        { justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap" },
      ]}
    >
      <View style={[styles.row, { flex: 1, gap: 8 }]}>
        {icon && <Icon name={icon} size={19} color={colors.green} />}
        <Txt size={18} weight="600" style={{ flexShrink: 1 }}>
          {title}
        </Txt>
      </View>
      {action && (
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Txt size={13} color={colors.green} weight="600">
            {action} →
          </Txt>
        </Pressable>
      )}
    </View>
  );
}
export function Choice({
  label,
  selected,
  onPress,
  multiple = false,
}: {
  label: string;
  selected: boolean;
  multiple?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[
        styles.choice,
        selected && {
          borderColor: colors.green,
          backgroundColor: colors.light,
        },
      ]}
    >
      <View
        style={{
          width: 19,
          height: 19,
          borderRadius: multiple ? 5 : 10,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: selected ? colors.green : "#9EA89F",
          backgroundColor: selected ? colors.green : "transparent",
        }}
      >
        {selected && <Icon name="check" size={13} color="#fff" />}
      </View>
      <Txt style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );
}
export function Disclosure({
  title,
  children,
  icon = "info",
  initiallyOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentProps<typeof Icon>["name"];
  initiallyOpen?: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 12,
        backgroundColor: colors.white,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => setOpen(!open)}
        style={{
          padding: 12,
          minHeight: 44,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name={icon} size={18} color={colors.green} />
        <Txt weight="600" size={14} style={{ flex: 1 }}>
          {title}
        </Txt>
        <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />
      </Pressable>
      <View
        style={{
          display: open ? "flex" : "none",
          padding: 14,
          paddingTop: 2,
          gap: 10,
        }}
      >
        {children}
      </View>
    </View>
  );
}

export function Notice({
  children,
  tone = "success",
}: {
  children: React.ReactNode;
  tone?: "success" | "error" | "info";
}) {
  const color = tone === "error" ? colors.red : colors.green;
  return (
    <View
      accessibilityRole={tone === "error" ? "alert" : undefined}
      accessibilityLiveRegion="polite"
      style={{
        flexDirection: "row",
        alignItems: "flex-start",
        gap: 9,
        padding: 12,
        borderRadius: 10,
        backgroundColor: tone === "error" ? "#FFF0EA" : colors.light,
      }}
    >
      <Icon
        name={
          tone === "error"
            ? "alert-circle"
            : tone === "success"
              ? "check-circle"
              : "info"
        }
        size={18}
        color={color}
      />
      <Txt size={14} color={color} style={{ flex: 1 }}>
        {children}
      </Txt>
    </View>
  );
}

export function Steps({
  labels,
  current,
}: {
  labels: string[];
  current: number;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
      {labels.map((label, i) => (
        <View
          key={label}
          accessibilityLabel={`${label}: ${i < current ? "готово" : i === current ? "текущий шаг" : "следующий шаг"}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            paddingVertical: 6,
            paddingHorizontal: 8,
            borderRadius: 8,
            backgroundColor: i === current ? colors.light : "transparent",
          }}
        >
          <Icon
            name={
              i < current
                ? "check-circle"
                : i === current
                  ? "arrow-right-circle"
                  : "circle"
            }
            size={14}
            color={i <= current ? colors.green : colors.muted}
          />
          <Txt
            size={12}
            weight={i === current ? "600" : "400"}
            color={i <= current ? colors.green : colors.muted}
          >
            {label}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    gap: 10,
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    alignSelf: "flex-start",
    maxWidth: "100%",
  },
  input: {
    borderWidth: 1,
    borderColor: "#CCD4CA",
    borderRadius: 9,
    padding: 11,
    minHeight: 44,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: "#fff",
  },
  choice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 11,
    minHeight: 44,
    borderRadius: 10,
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  grid: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.muted,
  },
});
