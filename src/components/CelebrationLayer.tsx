import React from "react";
import { Modal, View } from "react-native";

export function CelebrationLayer({
  children,
  fullScreen = false,
}: {
  children: React.ReactNode;
  fullScreen?: boolean;
}) {
  if (fullScreen)
    return (
      <Modal
        transparent
        statusBarTranslucent
        navigationBarTranslucent
        animationType="none"
        onRequestClose={() => {}}
      >
        <View pointerEvents="none" style={{ flex: 1 }}>
          {children}
        </View>
      </Modal>
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
