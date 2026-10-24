import { EdgeGlow } from "./EdgeGlow";
import { CelebrationLayer } from "./CelebrationLayer";
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Defs,
  RadialGradient,
  Stop,
} from "react-native-svg";
import { useTheme } from "../theme/Theme";
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

type SkyPoint = readonly [number, number];
type SkyShape = { points: SkyPoint[]; edges: [number, number][] };
const skyShapes: SkyShape[] = [
  {
    points: [
      [12, 30],
      [29, 66],
      [48, 24],
      [68, 61],
      [88, 34],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
    ],
  },
  {
    points: [
      [46, 13],
      [73, 38],
      [56, 65],
      [27, 43],
      [43, 82],
      [76, 87],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
      [2, 4],
      [4, 5],
    ],
  },
  {
    points: [
      [26, 17],
      [72, 21],
      [39, 47],
      [52, 50],
      [64, 53],
      [26, 82],
      [77, 79],
    ],
    edges: [
      [0, 1],
      [0, 2],
      [2, 3],
      [3, 4],
      [4, 1],
      [2, 5],
      [4, 6],
      [5, 6],
    ],
  },
  {
    points: [
      [12, 57],
      [27, 31],
      [46, 20],
      [68, 29],
      [86, 55],
      [65, 74],
      [38, 69],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 0],
      [2, 6],
    ],
  },
  {
    points: [
      [14, 36],
      [36, 22],
      [52, 48],
      [75, 19],
      [88, 49],
      [65, 76],
      [32, 81],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 2],
      [2, 6],
    ],
  },
  {
    points: [
      [17, 69],
      [21, 35],
      [47, 18],
      [76, 30],
      [84, 59],
      [61, 78],
      [43, 62],
      [50, 43],
    ],
    edges: [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
      [6, 7],
    ],
  },
];
const skyColors = ["#C4B0FF", "#A1CEFF", "#A5E2D6", "#F1D49A", "#E8B7DD"];
const dayColors = ["#8862BE", "#507FAF", "#428B7B", "#A47C38", "#A16595"];
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedGroup = Animated.createAnimatedComponent(G);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
type SkyScene = {
  shape: number;
  mode: number;
  tint: number;
  rotation: number;
  side: number;
  height: number;
  stars: { x: number; y: number; r: number; delay: number }[];
};
function newSkyScene(previousShape: number): SkyScene {
  return {
    shape:
      (previousShape + 1 + Math.floor(Math.random() * (skyShapes.length - 1))) %
      skyShapes.length,
    mode: Math.floor(Math.random() * 3),
    tint: Math.floor(Math.random() * skyColors.length),
    rotation: (Math.random() - 0.5) * 18,
    side: Math.random() < 0.5 ? -1 : 1,
    height: 0.44 + Math.random() * 0.1,
    stars: Array.from({ length: 12 }, () => ({
      x: 7 + Math.random() * 86,
      y: 6 + Math.random() * 88,
      r: 0.25 + Math.random() * 0.25,
      delay: Math.random() * 0.16,
    })),
  };
}
function SkyDrawing({
  scene,
  value,
  dark,
  width,
  height,
}: {
  scene: SkyScene;
  value: Animated.Value;
  dark: boolean;
  width: number;
  height: number;
}) {
  const unit = Math.min(4, width / 100, height / 100);
  const shape = skyShapes[scene.shape];
  const points = shape.points.map(([x, y]) => [
    (x * width) / 100,
    (y * height) / 100,
  ]);
  const palette = dark ? skyColors : dayColors;
  const color = palette[scene.tint];
  const accent = palette[(scene.tint + 1) % palette.length];
  const gradientId = React.useId().replace(/:/g, "");
  const edges =
    scene.mode === 2
      ? [...shape.edges].sort(([a, b], [c, d]) => {
          const distance = (i: number, j: number) =>
            Math.hypot(
              (shape.points[i][0] + shape.points[j][0]) / 2 - 50,
              (shape.points[i][1] + shape.points[j][1]) / 2 - 50,
            );
          return distance(a, b) - distance(c, d);
        })
      : shape.edges;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient id={gradientId}>
          <Stop offset="0" stopColor={color} stopOpacity={dark ? 0.13 : 0.08} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Ellipse
        cx={width / 2}
        cy={height / 2}
        rx={width * 0.5}
        ry={height * 0.5}
        fill={`url(#${gradientId})`}
      />
      {scene.stars.map((star, i) => (
        <AnimatedCircle
          key={`dust-${i}`}
          cx={(star.x * width) / 100}
          cy={(star.y * height) / 100}
          r={star.r * unit}
          fill={accent}
          opacity={value.interpolate({
            inputRange: [star.delay, star.delay + 0.15, 0.7, 1],
            outputRange: [0, 0.5, 0.35, 0],
            extrapolate: "clamp",
          })}
        />
      ))}
      {edges.map(([from, to], i) => {
        const a = points[from],
          b = points[to];
        const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const start = scene.mode === 1 ? 0.12 + i * 0.009 : 0.06 + i * 0.035;
        return (
          <AnimatedPath
            key={`${from}-${to}`}
            d={`M${a[0]} ${a[1]}L${b[0]} ${b[1]}`}
            stroke={color}
            strokeWidth={0.42 * unit}
            strokeLinecap="round"
            fill="none"
            strokeDasharray={[length, length]}
            strokeDashoffset={value.interpolate({
              inputRange: [start, start + 0.14],
              outputRange: [length, 0],
              extrapolate: "clamp",
            })}
            opacity={0.62}
          />
        );
      })}
      {points.map(([x, y], i) => {
        const start = scene.mode === 1 ? i * 0.012 : i * 0.026;
        const tint = i % 3 === 0 ? accent : color;
        return (
          <AnimatedGroup
            key={i}
            opacity={value.interpolate({
              inputRange: [start, start + 0.055, 0.6, 1],
              outputRange: [0, 1, 1, 0],
              extrapolate: "clamp",
            })}
          >
            <AnimatedCircle
              cx={x}
              cy={y}
              r={value.interpolate({
                inputRange: [start, start + 0.1, start + 0.3],
                outputRange: [unit, 6.5 * unit, 4 * unit],
                extrapolate: "clamp",
              })}
              fill={tint}
              opacity={0.1}
            />
            <Circle cx={x} cy={y} r={2.1 * unit} fill={tint} opacity={0.2} />
            <Path
              d={`M${x} ${y - 2.8 * unit}Q${x + 0.45 * unit} ${y - 0.45 * unit} ${x + 2.8 * unit} ${y}Q${x + 0.45 * unit} ${y + 0.45 * unit} ${x} ${y + 2.8 * unit}Q${x - 0.45 * unit} ${y + 0.45 * unit} ${x - 2.8 * unit} ${y}Q${x - 0.45 * unit} ${y - 0.45 * unit} ${x} ${y - 2.8 * unit}Z`}
              fill={tint}
            />
            <Circle
              cx={x}
              cy={y}
              r={0.8 * unit}
              fill={dark ? "#FFF9EB" : tint}
            />
            {i === shape.points.length - 1 && (
              <AnimatedCircle
                cx={x}
                cy={y}
                r={value.interpolate({
                  inputRange: [0.35, 0.7],
                  outputRange: [2 * unit, 12 * unit],
                  extrapolate: "clamp",
                })}
                stroke={accent}
                strokeWidth={0.3 * unit}
                fill="none"
                opacity={value.interpolate({
                  inputRange: [0.34, 0.4, 0.7],
                  outputRange: [0, 0.65, 0],
                  extrapolate: "clamp",
                })}
              />
            )}
          </AnimatedGroup>
        );
      })}
    </Svg>
  );
}

// A brief sky drawing celebrates a new answer; saved results do not trigger it.
export function ConstellationCelebration({
  burst,
  immersive = false,
  persistent = false,
  silent = false,
  duration = 2100,
}: {
  burst: number;
  immersive?: boolean;
  persistent?: boolean;
  silent?: boolean;
  duration?: number;
}) {
  const { play } = useSounds();
  const { dark } = useTheme();
  const lastSound = useRef(false);
  useEffect(() => {
    if (burst && !silent) {
      lastSound.current = !lastSound.current;
      play(lastSound.current ? "success" : "successAlt");
    }
  }, [burst, play, silent]);
  const reduced = useReducedMotion();
  const active = useContext(MotionActiveContext);
  const value = useRef(new Animated.Value(0)).current;
  const previousShape = useRef(Math.floor(Math.random() * skyShapes.length));
  const [scene, setScene] = useState<SkyScene | null>(null);
  const [bounds, setBounds] = useState({ width: 0, height: 0 });
  const { width, height } = bounds;
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!burst || reduced || !active) {
      setVisible(false);
      return;
    }
    const next = newSkyScene(previousShape.current);
    previousShape.current = next.shape;
    setScene(next);
    value.setValue(0);
    setVisible(true);
    const draw = Animated.timing(value, {
      toValue: persistent ? 0.6 : 1,
      duration: persistent ? 1800 : duration,
      easing: Easing.linear,
      useNativeDriver: false,
    });
    const animation = persistent
      ? Animated.sequence([
          draw,
          Animated.loop(
            Animated.sequence([
              Animated.timing(value, {
                toValue: 0.64,
                duration: 2400,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: false,
              }),
              Animated.timing(value, {
                toValue: 0.6,
                duration: 2400,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: false,
              }),
            ]),
          ),
        ])
      : draw;
    animation.start(({ finished }) => {
      if (finished && !persistent) setVisible(false);
    });
    return () => animation.stop();
  }, [burst, reduced, active, value, persistent, duration]);
  if (!visible || !scene) return null;
  const size = Math.min(width >= 1100 ? 280 : 250, width * 0.68, height * 0.38);
  const drawingWidth = immersive ? width * 0.94 : size;
  const drawingHeight = immersive ? height * 0.82 : size;
  const centerX = immersive
    ? width / 2
    : width / 2 + scene.side * Math.min(56, width * 0.06);
  const centerY = immersive ? height / 2 : height * scene.height;
  return (
    <CelebrationLayer fullScreen={immersive}>
      <View
        testID="success-constellation"
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          setBounds({ width, height });
        }}
        pointerEvents="none"
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        aria-hidden
        style={{ flex: 1, overflow: "hidden" }}
      >
        {immersive && (
          <Animated.View
            testID="celebration-dimmer"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "#02040D",
              opacity: value.interpolate({
                inputRange: [0, 0.12, 0.65, 1],
                outputRange: [
                  0,
                  persistent ? 0.22 : 0.38,
                  persistent ? 0.22 : 0.38,
                  0,
                ],
              }),
            }}
          >
            <EdgeGlow />
          </Animated.View>
        )}
        {width > 0 && height > 0 && (
          <Animated.View
            testID="constellation-drawing"
            style={{
              position: "absolute",
              left: centerX - drawingWidth / 2,
              top: centerY - drawingHeight / 2,
              width: drawingWidth,
              height: drawingHeight,
              opacity: value.interpolate({
                inputRange: [0, 0.05, 0.62, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  rotate: `${immersive ? scene.rotation * 0.25 : scene.rotation}deg`,
                },
                {
                  scale: value.interpolate({
                    inputRange: [0, 0.4, 1],
                    outputRange: [0.96, 1, 1.025],
                  }),
                },
              ],
            }}
          >
            <SkyDrawing
              scene={scene}
              value={value}
              dark={immersive || dark}
              width={drawingWidth}
              height={drawingHeight}
            />
          </Animated.View>
        )}
      </View>
    </CelebrationLayer>
  );
}
