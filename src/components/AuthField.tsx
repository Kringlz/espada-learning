import React, { forwardRef, useId, useState } from "react";
import {
  Platform,
  Pressable,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { Icon, Txt, useUITheme } from "./ui";

type Props = TextInputProps & {
  label: string;
  error?: string;
  password?: "new" | "current";
};
export const AuthField = forwardRef<TextInput, Props>(function AuthField(
  { label, error, password, style, ...props },
  ref,
) {
  const { colors, styles } = useUITheme();
  const [visible, setVisible] = useState(false);
  const id = useId().replace(/:/g, "");
  return (
    <View style={{ gap: 6 }}>
      <Txt size={13} weight="600" nativeID={`${id}-label`}>
        {label}
      </Txt>
      <View style={{ position: "relative" }}>
        <TextInput
          {...props}
          ref={ref}
          nativeID={`${id}-input`}
          accessibilityLabel={label}
          aria-invalid={!!error}
          {...(Platform.OS === "web"
            ? { "aria-describedby": error ? `${id}-error` : undefined }
            : {})}
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete={
            password
              ? password === "new"
                ? "new-password"
                : "current-password"
              : props.autoComplete
          }
          textContentType={
            password
              ? password === "new"
                ? "newPassword"
                : "password"
              : props.textContentType
          }
          importantForAutofill="yes"
          secureTextEntry={!!password && !visible}
          style={[
            styles.input,
            {
              minHeight: 48,
              fontSize: 16,
              paddingRight: password ? 54 : 14,
              borderColor: error ? colors.red : colors.line,
            },
            style,
          ]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${visible ? "Скрыть" : "Показать"}: ${label.toLowerCase()}`}
            accessibilityState={{ checked: visible }}
            disabled={props.editable === false}
            onPress={() => setVisible((v) => !v)}
            style={{
              position: "absolute",
              right: 2,
              top: 2,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name={visible ? "eye-off" : "eye"}
              size={19}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>
      {!!error && (
        <Txt
          nativeID={`${id}-error`}
          size={13}
          color={colors.red}
          accessibilityRole="alert"
        >
          {error}
        </Txt>
      )}
    </View>
  );
});
