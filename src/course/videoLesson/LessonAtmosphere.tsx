import { EdgeGlow } from "../../components/EdgeGlow";
import React, { useContext, useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Platform,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";
import { Txt, useUITheme } from "../../components/ui";
import { MotionActiveContext, useReducedMotion } from "../../components/Motion";
import { CelebrationLayer } from "../../components/CelebrationLayer";

/** Vector artwork stays sharp at every lesson width. */
export function ChapterArt({
  kind = "intro",
}: {
  kind?: "intro" | "practice" | "check" | "result";
}) {
  const { colors } = useUITheme();
  const id = React.useId().replace(/:/g, "");
  const color =
    kind === "practice"
      ? colors.green
      : kind === "intro"
        ? colors.gold
        : "#C4B0FF";
  return (
    <View
      accessible={false}
      aria-hidden
      style={{ width: "100%", height: kind === "intro" ? 170 : 200 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 400 220">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity={0.24} />
            <Stop offset="1" stopColor={color} stopOpacity={0.02} />
          </LinearGradient>
        </Defs>
        <Circle cx={200} cy={110} r={86} fill={`url(#${id})`} />
        <Ellipse
          cx={200}
          cy={110}
          rx={150}
          ry={52}
          rotation={-18}
          origin="200, 110"
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeDasharray="4 9"
        />
        <Circle
          cx={200}
          cy={110}
          r={70}
          fill="none"
          stroke={color}
          strokeOpacity={0.18}
        />
        {kind === "intro" ? (
          <G>
            <Path
              d="M139 145L194 57L267 151Z"
              fill={color}
              fillOpacity={0.06}
              stroke={color}
              strokeWidth={1.5}
            />
            <Path
              d="M194 57L196 149M181 148V134H196"
              fill="none"
              stroke={color}
              strokeOpacity={0.45}
            />
            <Path
              d="M104 155Q150 179 185 172M237 58Q278 70 294 108"
              fill="none"
              stroke={color}
              strokeWidth={1.5}
            />
            <Circle cx={139} cy={145} r={5} fill={color} />
            <Circle cx={194} cy={57} r={5} fill={color} />
            <Circle cx={267} cy={151} r={5} fill={color} />
          </G>
        ) : kind === "practice" ? (
          <G>
            <Path
              d="M151 147L179 110L206 129L246 69"
              fill="none"
              stroke={color}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Path
              d="M234 71L246 69L246 82"
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
            {[
              [151, 147],
              [179, 110],
              [206, 129],
              [246, 69],
            ].map(([x, y], i) => (
              <Circle key={i} cx={x} cy={y} r={5} fill={color} />
            ))}
          </G>
        ) : (
          <G>
            <Path
              d="M200 42L220 91L273 110L220 129L200 178L180 129L127 110L180 91Z"
              fill={color}
              fillOpacity={0.09}
              stroke={color}
              strokeWidth={1.5}
            />
            <Path
              d={
                kind === "result"
                  ? "M180 109L195 124L224 94"
                  : "M200 70L210 100L240 110L210 120L200 150L190 120L160 110L190 100Z"
              }
              fill="none"
              stroke={color}
              strokeWidth={2}
            />
          </G>
        )}
        {[
          [75, 83],
          [322, 139],
          [291, 46],
          [110, 181],
        ].map(([x, y], i) => (
          <G key={i}>
            <Circle cx={x} cy={y} r={8} fill={color} opacity={0.1} />
            <Path
              d={`M${x - 4} ${y}H${x + 4}M${x} ${y - 4}V${y + 4}`}
              stroke={color}
              strokeWidth={1.4}
            />
          </G>
        ))}
      </Svg>
    </View>
  );
}

const DrawnPath = Animated.createAnimatedComponent(Path);
export function StagePrelude({
  stage,
  onDone,
}: {
  stage: "practice" | "check";
  onDone: () => void;
}) {
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  const { height } = useWindowDimensions();
  const value = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!active) return;
    value.setValue(reduced ? 1 : 0);
    const animation = Animated.timing(value, {
      toValue: 1,
      duration: 1600,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    if (!reduced) animation.start();
    const timer = setTimeout(() => done.current(), reduced ? 600 : 2100);
    return () => {
      clearTimeout(timer);
      animation.stop();
    };
  }, [active, reduced, value]);
  const color = stage === "practice" ? "#B0E3D0" : "#D5C6F1";
  return (
    <View
      testID={`stage-prelude-${stage}`}
      style={{
        minHeight: height - 95,
        alignItems: "center",
        justifyContent: "center",
        gap: 32,
      }}
    >
      <Svg accessible={false} width={180} height={180} viewBox="0 0 180 180">
        <DrawnPath
          d={
            stage === "practice"
              ? "M32 124L66 82L94 104L146 49M122 51L146 49L144 73"
              : "M90 28L109 71L152 90L109 109L90 152L71 109L28 90L71 71Z"
          }
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={[500, 500]}
          strokeDashoffset={value.interpolate({
            inputRange: [0, 1],
            outputRange: [500, 0],
          })}
        />
        {(stage === "practice"
          ? [
              [32, 124],
              [66, 82],
              [94, 104],
              [146, 49],
            ]
          : [
              [90, 28],
              [152, 90],
              [90, 152],
              [28, 90],
            ]
        ).map(([x, y], i) => (
          <Circle key={i} cx={x} cy={y} r={2.4} fill={color} opacity={0.85} />
        ))}
      </Svg>
      <Animated.View
        style={{
          opacity: value.interpolate({
            inputRange: [0, 0.4, 1],
            outputRange: [0, 0, 1],
          }),
        }}
      >
        <Txt
          accessibilityRole="header"
          accessibilityLiveRegion="polite"
          size={24}
          weight="400"
          color={color}
          style={{ letterSpacing: 1 }}
        >
          {stage === "practice" ? "Тренировка" : "Практика"}
        </Txt>
      </Animated.View>
    </View>
  );
}

export function LessonLoading() {
  const { height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  const value = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || !active) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [active, reduced, value]);
  return (
    <View
      testID="lesson-loading"
      accessibilityLabel="Загрузка урока"
      accessibilityRole="progressbar"
      style={{
        minHeight: height - 3,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0B111B",
      }}
    >
      <Animated.View
        style={{
          opacity: reduced
            ? 1
            : value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
        }}
      >
        <Svg width={100} height={100} viewBox="0 0 100 100">
          <Path
            d="M20 65L40 30L65 58L82 37"
            fill="none"
            stroke="#BCD7D9"
            strokeOpacity={0.5}
          />
          {[
            [20, 65],
            [40, 30],
            [65, 58],
            [82, 37],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={2.2} fill="#E7F3EF" />
          ))}
        </Svg>
      </Animated.View>
    </View>
  );
}

export function MistakeWash({ trigger }: { trigger: number }) {
  const value = useRef(new Animated.Value(0)).current;
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  useEffect(() => {
    if (!trigger || reduced || !active) {
      value.setValue(0);
      setVisible(false);
      return;
    }
    setVisible(true);
    const animation = Animated.sequence([
      Animated.timing(value, {
        toValue: 1,
        duration: 100,
        useNativeDriver: Platform.OS !== "web",
      }),
      Animated.timing(value, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== "web",
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished) setVisible(false);
    });
    return () => {
      animation.stop();
      value.setValue(0);
    };
  }, [trigger, reduced, active, value]);
  if (!visible || reduced || !active) return null;
  return (
    <CelebrationLayer fullScreen>
      <Animated.View
        testID="mistake-wash"
        pointerEvents="none"
        style={{
          flex: 1,
          opacity: value.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
          }),
        }}
      >
        <EdgeGlow color="#F05B70" />
      </Animated.View>
    </CelebrationLayer>
  );
}

export function AnswerShake({
  trigger,
  children,
}: {
  trigger: number;
  children: React.ReactNode;
}) {
  const value = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  useEffect(() => {
    value.setValue(0);
    if (!trigger || reduced || !active) return;
    const animation = Animated.sequence(
      [-7, 7, -5, 5, -2, 0].map((toValue) =>
        Animated.timing(value, {
          toValue,
          duration: 50,
          useNativeDriver: Platform.OS !== "web",
        }),
      ),
    );
    animation.start();
    return () => {
      animation.stop();
      value.setValue(0);
    };
  }, [trigger, reduced, active, value]);
  return (
    <Animated.View
      testID={trigger ? "shaking-answer" : undefined}
      style={{ transform: [{ translateX: value }] }}
    >
      {children}
    </Animated.View>
  );
}

export function FinishAccent({
  children,
  enabled,
}: {
  children: React.ReactNode;
  enabled: boolean;
}) {
  const value = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  useEffect(() => {
    value.setValue(0);
    if (!enabled || reduced || !active) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(value, {
          toValue: 0,
          duration: 750,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
      { iterations: 3 },
    );
    animation.start();
    return () => animation.stop();
  }, [enabled, reduced, active, value]);
  return (
    <Animated.View
      testID={enabled ? "finish-lesson-action" : undefined}
      style={{
        maxWidth: "100%",
        transform: [
          {
            scale: value.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 1.035],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}
