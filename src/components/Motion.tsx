import { useSounds } from "../engagement/Sounds";
import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Platform,
  StyleProp,
  ViewStyle,
  View,
} from "react-native";

export const MotionActiveContext = createContext(true);

export function useReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (live) setReduced(value);
      })
      .catch(() => {});
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduced,
    );
    return () => {
      live = false;
      listener.remove();
    };
  }, []);
  return reduced;
}

export function SoftReveal({
  children,
  changeKey,
  style,
  testID,
  active = true,
}: {
  children: React.ReactNode;
  changeKey?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  active?: boolean;
}) {
  const reduced = useReducedMotion();
  const parentActive = useContext(MotionActiveContext);
  const visible = parentActive && active;
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || !visible) {
      value.setValue(1);
      return;
    }
    value.setValue(0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [changeKey, reduced, value, visible]);
  return (
    <Animated.View
      testID={testID}
      style={[
        style,
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [16, 0],
              }),
            },
          ],
        },
      ]}
    >
      <MotionActiveContext.Provider value={visible}>
        {children}
      </MotionActiveContext.Provider>
    </Animated.View>
  );
}

// Triggered by a new successful submission, never by opening a saved result.
export function Confetti({ burst }: { burst: number }) {
  const { play } = useSounds();
  useEffect(() => {
    if (burst) play("success");
  }, [burst, play]);
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!burst || reduced) {
      setVisible(false);
      return;
    }
    value.setValue(0);
    setVisible(true);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 1700,
      easing: Easing.out(Easing.quad),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start(({ finished }) => {
      if (finished) setVisible(false);
    });
    return () => animation.stop();
  }, [burst, reduced, value]);
  if (!visible) return null;
  return (
    <View
      testID="success-confetti"
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: -36,
        height: 260,
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {Array.from({ length: 34 }, (_, i) => {
        const spread = (i - 16.5) * 9;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: 55,
              width: i % 3 === 0 ? 10 : 7,
              height: i % 3 === 0 ? 10 : 14,
              borderRadius: i % 3 === 0 ? 4 : 2,
              backgroundColor: ["#86AD45", "#F2C44E", "#E89070", "#62B5AA"][
                i % 4
              ],
              opacity: value.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateX: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, spread],
                  }),
                },
                {
                  translateY: value.interpolate({
                    inputRange: [0, 0.35, 1],
                    outputRange: [0, -18 - (i % 5) * 7, 150 + (i % 4) * 20],
                  }),
                },
                {
                  rotate: value.interpolate({
                    inputRange: [0, 1],
                    outputRange: [
                      "0deg",
                      `${(i % 2 ? 1 : -1) * (180 + i * 20)}deg`,
                    ],
                  }),
                },
              ],
            }}
          />
        );
      })}
    </View>
  );
}
