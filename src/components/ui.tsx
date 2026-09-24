import React from "react";
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
        { fontSize: size, color, fontWeight: weight, lineHeight: size * 1.5 },
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
  return <Feather name={name} size={size} color={color} selectable={false} />;
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
          paddingVertical: small ? 10 : 13,
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
}: {
  children: React.ReactNode;
  tone?: "green" | "gold" | "neutral";
}) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 7,
        backgroundColor:
          tone === "gold"
            ? "#FBF1D9"
            : tone === "neutral"
              ? "#F0F1EC"
              : "#EAF0E7",
      }}
    >
      <Txt
        size={11}
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
}: {
  title: string;
  action?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={[
        styles.row,
        { justifyContent: "space-between", marginBottom: 16 },
      ]}
    >
      <Txt size={21} weight="600" style={{ flexShrink: 1 }}>
        {title}
      </Txt>
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
          borderRadius: 10,
          borderWidth: 1,
          borderColor: selected ? colors.green : "#9EA89F",
          backgroundColor: selected ? colors.green : "transparent",
        }}
      />
      <Txt style={{ flex: 1 }}>{label}</Txt>
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 24,
    gap: 14,
  },
  button: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 18,
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
    padding: 13,
    minHeight: 48,
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
    padding: 15,
    minHeight: 52,
    borderRadius: 10,
  },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 8 },
  grid: { flexDirection: "row", gap: 20, flexWrap: "wrap" },
  label: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    color: colors.muted,
  },
});
