import React, { useContext, useEffect, useId, useRef } from "react";
import { Animated, Easing, Platform, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  Line,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { MotionActiveContext, useReducedMotion } from "./Motion";
import { starIdentity } from "../course/constellation";

export function Starfield({
  height = 440,
  quiet = false,
}: {
  height?: number;
  quiet?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  const drift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || !active || quiet) return;
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(drift, {
          toValue: 1,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(drift, {
          toValue: 0,
          duration: 14000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [reduced, active, quiet, drift]);
  return (
    <View
      pointerEvents="none"
      accessible={false}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      aria-hidden
      style={{ position: "absolute", inset: 0, overflow: "hidden" }}
    >
      <Animated.View
        style={{
          position: "absolute",
          left: -25,
          right: -25,
          top: -12,
          bottom: -12,
          opacity: drift.interpolate({
            inputRange: [0, 1],
            outputRange: [0.75, 1],
          }),
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-10, 10],
              }),
            },
          ],
        }}
      >
        <Svg
          width="100%"
          height="100%"
          viewBox={`0 0 1200 ${height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <Defs>
            <RadialGradient id={`${id}-cloud`}>
              <Stop offset="0" stopColor="#435A9F" stopOpacity="0.24" />
              <Stop offset="0.5" stopColor="#292B61" stopOpacity="0.12" />
              <Stop offset="1" stopColor="#080C16" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id={`${id}-dust`}>
              <Stop offset="0" stopColor="#8C6B9E" stopOpacity="0.16" />
              <Stop offset="1" stopColor="#080C16" stopOpacity="0" />
            </RadialGradient>
          </Defs>
          <Ellipse
            cx="650"
            cy={height * 0.48}
            rx="570"
            ry={height * 0.6}
            fill={`url(#${id}-cloud)`}
          />
          <Ellipse
            cx="850"
            cy={height * 0.4}
            rx="350"
            ry={height * 0.45}
            fill={`url(#${id}-dust)`}
          />
          {Array.from({ length: 155 }, (_, i) => {
            const x = (i * 7919 + 71) % 1200,
              y = (i * 1877 + 19) % height;
            return (
              <Circle
                key={i}
                cx={x}
                cy={y}
                r={i % 19 === 0 ? 1.5 : i % 5 === 0 ? 0.9 : 0.55}
                fill={i % 3 ? "#D0DFFF" : "#C3B5E2"}
                opacity={0.15 + (i % 7) * 0.085}
              />
            );
          })}
        </Svg>
      </Animated.View>
    </View>
  );
}

export function StarGlyph({
  id,
  size = 100,
  color = "#C9D6FF",
  selected = false,
}: {
  id: string;
  size?: number;
  color?: string;
  selected?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const identity = starIdentity(id);
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" aria-hidden={true}>
      <Defs>
        <RadialGradient id={uid}>
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <Stop offset="0.08" stopColor={color} stopOpacity="0.8" />
          <Stop offset="0.3" stopColor={color} stopOpacity="0.24" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Circle cx="60" cy="60" r={selected ? 59 : 40} fill={`url(#${uid})`} />
      {selected && (
        <G transform={`rotate(${identity.rotation} 60 60)`}>
          <Ellipse
            cx="60"
            cy="60"
            rx="43"
            ry="15"
            stroke={color}
            strokeWidth="0.5"
            opacity="0.45"
            fill="none"
          />
          <Circle cx="17" cy="60" r="1.8" fill={color} />
        </G>
      )}
      <G transform={`rotate(${identity.rotation / 3} 60 60)`}>
        {Array.from({ length: identity.rays }, (_, i) => (
          <Line
            key={i}
            x1="60"
            y1="60"
            x2="60"
            y2={60 - (i % 2 ? 18 : 33) * identity.size}
            stroke={color}
            strokeWidth={i % 2 ? 0.7 : 1}
            opacity={i % 2 ? 0.55 : 0.9}
            transform={`rotate(${(i * 360) / identity.rays} 60 60)`}
          />
        ))}
      </G>
      <Circle cx="60" cy="60" r={selected ? 4.4 : 3} fill="#FFFFFF" />
      <Circle cx="60" cy="60" r="1.5" fill="#FFFFFF" />
    </Svg>
  );
}
