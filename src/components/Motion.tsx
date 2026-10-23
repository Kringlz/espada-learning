import Svg, { Circle, Path } from "react-native-svg";
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
      duration: 2200,
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
        height: 320,
        overflow: "hidden",
        zIndex: 10,
      }}
    >
      {Array.from({ length: 16 }, (_, i) => {
        const spread = (i - 7.5) * 33;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: "50%",
              top: 55,
              width: 48,
              height: 44,
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
                      `${(i % 2 ? 1 : -1) * (35 + i * 7)}deg`,
                    ],
                  }),
                },
              ],
            }}
          >
            <Svg width="48" height="44" viewBox="0 0 48 44">
              <Path
                d={i % 2 ? "M5 29L18 9L30 24L43 12" : "M5 12L18 29L32 9L43 31"}
                stroke={["#CCB5FF", "#AFC9F8", "#C4E6D3"][i % 3]}
                strokeWidth="0.9"
                fill="none"
                opacity="0.65"
              />
              {(i % 2
                ? [
                    [5, 29],
                    [18, 9],
                    [30, 24],
                    [43, 12],
                  ]
                : [
                    [5, 12],
                    [18, 29],
                    [32, 9],
                    [43, 31],
                  ]
              ).map(([cx, cy], n) => (
                <React.Fragment key={n}>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r="4.5"
                    fill="#C6ACFF"
                    opacity="0.15"
                  />
                  <Circle
                    cx={cx}
                    cy={cy}
                    r={n === 1 ? 2 : 1.3}
                    fill="#F1E9FF"
                  />
                </React.Fragment>
              ))}
            </Svg>
          </Animated.View>
        );
      })}
    </View>
  );
}
