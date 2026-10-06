import { useSounds } from "../engagement/Sounds";
import { MotionActiveContext } from "./Motion";
import React, { useContext, useState } from "react";
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
import { MathText } from "../math/MathText";
export { lightColors as colors } from "../theme/Theme";
import {
  lightColors as colors,
  darkColors,
  useTheme,
  Palette,
} from "../theme/Theme";
export function useUITheme() {
  const theme = useTheme();
  let themedStyles = themeStyleCache.get(theme.colors);
  if (!themedStyles) {
    themedStyles = createStyles(theme.colors);
    themeStyleCache.set(theme.colors, themedStyles);
  }
  return { ...theme, styles: themedStyles };
}
export const dateText = formatDate;
export function Txt({
  children,
  size: providedSize,
  color,
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
  const { colors, clarity } = useUITheme();
  const size = providedSize ?? (clarity ? 18 : 15);
  return (
    <Text
      {...props}
      style={[
        {
          fontSize: size,
          color: color ?? colors.ink,
          fontWeight: weight,
          lineHeight: size * 1.4,
        },
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
  color,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size?: number;
  color?: string;
}) {
  const { colors, styles } = useUITheme();
  return (
    <Feather
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no"
      aria-hidden
      name={name}
      size={size}
      color={color ?? colors.ink}
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
  math = false,
  fullWidth = false,
}: {
  children: React.ReactNode;
  onPress: () => void;
  secondary?: boolean;
  selected?: boolean;
  disabled?: boolean;
  icon?: React.ComponentProps<typeof Feather>["name"];
  small?: boolean;
  label?: string;
  math?: boolean;
  fullWidth?: boolean;
}) {
  const { colors, styles, clarity } = useUITheme();
  const { play } = useSounds();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ? translate(label) : undefined}
      accessibilityState={{ disabled, selected }}
      aria-pressed={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={() => {
        play("open");
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary
            ? selected
              ? colors.selected
              : colors.subtle
            : colors.primary,
          borderWidth: 1,
          borderColor: selected ? colors.green : "transparent",
          opacity: disabled ? 0.45 : pressed ? 0.8 : 1,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          minHeight: clarity ? (small ? 48 : 58) : 48,
          borderRadius: clarity ? 16 : 18,
          paddingVertical: small ? 10 : clarity ? 16 : 14,
          paddingHorizontal: small ? 12 : 18,
        },
      ]}
    >
      {icon && (
        <Icon
          name={icon}
          size={17}
          color={secondary ? colors.green : colors.onPrimary}
        />
      )}
      {math && typeof children === "string" ? (
        <View style={{ flexShrink: 1, minWidth: 0 }}>
          <MathText
            text={children}
            size={clarity ? (small ? 16 : 19) : small ? 14 : 16}
            color={secondary ? colors.green : colors.onPrimary}
          />
        </View>
      ) : (
        <Txt
          style={{ flexShrink: 1, textAlign: "center" }}
          size={clarity ? (small ? 16 : 19) : small ? 14 : 16}
          weight="600"
          color={secondary ? colors.green : colors.onPrimary}
        >
          {children}
        </Txt>
      )}
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
  const { colors, styles } = useUITheme();
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
  const { colors, styles } = useUITheme();
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
            ? colors.warning
            : tone === "neutral"
              ? colors.subtle
              : colors.light,
      }}
    >
      {icon && (
        <Icon
          name={icon}
          size={13}
          color={tone === "gold" ? colors.orange : colors.green}
        />
      )}
      <Txt
        style={{ flexShrink: 1 }}
        size={12}
        weight="600"
        color={tone === "gold" ? colors.orange : colors.green}
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
  const { colors, styles, clarity } = useUITheme();
  return (
    <View style={{ gap: 7 }}>
      {!!label && (
        <Txt size={13} weight="600">
          {label}
        </Txt>
      )}
      <TextInput
        accessibilityLabel={
          label
            ? translate(label)
            : placeholder
              ? translate(placeholder)
              : undefined
        }
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
          clarity && { minHeight: 56, fontSize: 18 },
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
  const { colors, styles } = useUITheme();
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
  const { colors, styles, clarity } = useUITheme();
  return (
    <Pressable
      accessibilityRole={multiple ? "checkbox" : "radio"}
      accessibilityState={{ checked: selected }}
      aria-checked={selected}
      onPress={onPress}
      style={[
        styles.choice,
        clarity && {
          minHeight: 72,
          padding: 18,
          borderWidth: 2,
          borderRadius: 18,
        },
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
        {selected && <Icon name="check" size={13} color={colors.onPrimary} />}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <MathText text={translate(label)} size={clarity ? 20 : 16} />
      </View>
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
  const { colors, styles, clarity } = useUITheme();
  const { play } = useSounds();
  const parentActive = useContext(MotionActiveContext);
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View
      style={{
        borderWidth: 1,
        borderColor: colors.line,
        borderRadius: 20,
        backgroundColor: colors.white,
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: open }}
        aria-expanded={open}
        onPress={() => {
          if (!open) play("open");
          setOpen(!open);
        }}
        style={{
          padding: clarity ? 20 : 16,
          minHeight: clarity ? 64 : 52,
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Icon name={icon} size={18} color={colors.green} />
        <Txt weight="600" size={clarity ? 18 : 14} style={{ flex: 1 }}>
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
        <MotionActiveContext.Provider value={parentActive && open}>
          {children}
        </MotionActiveContext.Provider>
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
  const { colors, styles } = useUITheme();
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
        backgroundColor: tone === "error" ? colors.error : colors.light,
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
  const { colors, styles } = useUITheme();
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

const createStyles = (colors: Palette) =>
  StyleSheet.create({
    row: { flexDirection: "row", alignItems: "center", gap: 12 },
    card: {
      backgroundColor: colors.white,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 20,
      gap: 14,
    },
    button: {
      minHeight: 48,
      borderRadius: 18,
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
      borderColor: colors.line,
      borderRadius: 16,
      padding: 14,
      minHeight: 44,
      fontSize: 15,
      color: colors.ink,
      backgroundColor: colors.white,
    },
    choice: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.line,
      padding: 11,
      minHeight: 48,
      borderRadius: 16,
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

export const styles = createStyles(colors);

const darkStyles = createStyles(darkColors);

const themeStyleCache = new WeakMap<Palette, ReturnType<typeof createStyles>>([
  [colors, styles],
  [darkColors, darkStyles],
]);
