import React from "react";
import { View } from "react-native";
export function AuthForm({
  children,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
}) {
  return <View style={{ gap: 14 }}>{children}</View>;
}
