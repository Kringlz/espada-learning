import React from "react";
import { View } from "react-native";

export function CelebrationLayer({
  children,
  fullScreen = false,
}: {
  children: React.ReactNode;
  fullScreen?: boolean;
  contained?: boolean;
}) {
  if (fullScreen)
    return (
      <View
        pointerEvents="none"
        accessible={false}
        style={{ position: "absolute", inset: 0, zIndex: 1000 }}
      >
        {children}
      </View>
    );
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
