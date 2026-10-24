import React from "react";
import { View } from "react-native";

export function CelebrationLayer({ children }: { children: React.ReactNode }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        height: 460,
        zIndex: 1000,
      }}
    >
      {children}
    </View>
  );
}
