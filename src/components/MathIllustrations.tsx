import React from "react";
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Polygon,
  Rect,
  Text as SvgText,
} from "react-native-svg";
import { View } from "react-native";
import { useUITheme } from "./ui";
export type IllustrationKind =
  | "arena"
  | "learn"
  | "percent"
  | "mean"
  | "rectangle"
  | "triangle"
  | "pythagoras"
  | "quadratic";
const violet = "#7952D5",
  teal = "#249B8B",
  coral = "#E77568",
  yellow = "#F4C85D";
/** Vector illustrations share a palette; educational diagrams are exact, scalable geometry. */
export function MathIllustration({
  kind,
  height = 150,
  decorative = false,
}: {
  kind: IllustrationKind;
  height?: number;
  decorative?: boolean;
}) {
  const { colors, dark } = useUITheme();
  const ink = colors.ink,
    muted = colors.muted;
  const pale = dark ? "#392A51" : "#EEE6FF";
  const label = {
    arena: "Кубок и карточки математической игры",
    learn: "Книга, геометрические фигуры и числа",
    percent: "Три из двадцати клеток закрашены: 15 процентов",
    mean: "Столбцы 7, 8 и 9; среднее значение 8",
    rectangle: "Прямоугольник со сторонами a и b",
    triangle: "Треугольник с основанием a и перпендикулярной высотой h",
    pythagoras:
      "Прямоугольный треугольник: катеты 3 и 4, гипотенуза 5 напротив прямого угла",
    quadratic:
      "График y равно x в квадрате минус 5x плюс 6 пересекает ось x в точках 2 и 3",
  }[kind];
  const text = (x: number, y: number, value: string, fill = ink, size = 20) => (
    <SvgText
      x={x}
      y={y}
      textAnchor="middle"
      fill={fill}
      fontSize={size}
      fontWeight="700"
    >
      {value}
    </SvgText>
  );
  return (
    <View
      accessible={!decorative}
      accessibilityRole="image"
      accessibilityLabel={decorative ? undefined : label}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? "no-hide-descendants" : "auto"}
      style={{ height, width: "100%" }}
    >
      <Svg viewBox="0 0 300 200" width="100%" height="100%" aria-hidden>
        {kind === "percent" && (
          <>
            {Array.from({ length: 20 }, (_, i) => (
              <Rect
                key={i}
                x={38 + (i % 5) * 46}
                y={14 + Math.floor(i / 5) * 38}
                width={34}
                height={27}
                rx={7}
                fill={i < 3 ? violet : pale}
              />
            ))}
            {text(150, 188, "3 / 20 = 15%", ink, 23)}
          </>
        )}
        {kind === "mean" && (
          <>
            {[7, 8, 9].map((n, i) => (
              <G key={n}>
                <Rect
                  x={53 + i * 70}
                  y={172 - n * 15}
                  width={44}
                  height={n * 15}
                  rx={10}
                  fill={[violet, teal, coral][i]}
                />
                {text(75 + i * 70, 193, String(n), ink, 18)}
              </G>
            ))}
            <Line
              x1={30}
              y1={52}
              x2={270}
              y2={52}
              stroke={ink}
              strokeWidth={2}
              strokeDasharray="5 5"
            />
            {text(150, 24, "Среднее = 8", ink, 18)}
          </>
        )}
        {kind === "rectangle" && (
          <>
            <Rect
              x={48}
              y={30}
              width={204}
              height={123}
              rx={7}
              fill={pale}
              stroke={violet}
              strokeWidth={4}
            />
            {[1, 2, 3, 4, 5].map((i) => (
              <Line
                key={i}
                x1={48 + i * 34}
                y1={30}
                x2={48 + i * 34}
                y2={153}
                stroke={violet}
                opacity={0.2}
              />
            ))}
            {[1, 2].map((i) => (
              <Line
                key={i}
                x1={48}
                y1={30 + i * 41}
                x2={252}
                y2={30 + i * 41}
                stroke={violet}
                opacity={0.2}
              />
            ))}
            {text(150, 187, "a", violet, 26)}
            {text(25, 100, "b", teal, 26)}
            {text(150, 100, "S = a · b", ink, 24)}
          </>
        )}
        {kind === "triangle" && (
          <>
            <Polygon
              points="35,152 260,152 115,25"
              fill={pale}
              stroke={violet}
              strokeWidth={4}
              strokeLinejoin="round"
            />
            <Line
              x1={115}
              y1={25}
              x2={115}
              y2={152}
              stroke={teal}
              strokeWidth={3}
              strokeDasharray="7 5"
            />
            <Path
              d="M115 134 H133 V152"
              fill="none"
              stroke={teal}
              strokeWidth={2}
            />
            {text(146, 188, "a", violet, 26)}
            {text(99, 100, "h", teal, 26)}
          </>
        )}
        {kind === "pythagoras" && (
          <>
            <Polygon points="72,30 72,150 232,150" fill={pale} />
            <Line
              x1={72}
              y1={30}
              x2={72}
              y2={150}
              stroke={teal}
              strokeWidth={5}
            />
            <Line
              x1={72}
              y1={150}
              x2={232}
              y2={150}
              stroke={violet}
              strokeWidth={5}
            />
            <Line
              x1={72}
              y1={30}
              x2={232}
              y2={150}
              stroke={coral}
              strokeWidth={6}
            />
            <Path
              d="M72 132 H90 V150"
              fill="none"
              stroke={ink}
              strokeWidth={2}
            />
            {text(40, 100, "a = 3", teal, 19)}
            {text(152, 183, "b = 4", violet, 19)}
            <G transform="translate(175 76) rotate(37)">
              {text(0, 0, "c = 5", coral, 22)}
            </G>
          </>
        )}
        {kind === "quadratic" && (
          <>
            <Line
              x1={25}
              y1={150}
              x2={282}
              y2={150}
              stroke={muted}
              strokeWidth={2}
            />
            <Line
              x1={40}
              y1={180}
              x2={40}
              y2={25}
              stroke={muted}
              strokeWidth={2}
            />
            <Path
              d="M40 54 Q155 254 270 54"
              fill="none"
              stroke={violet}
              strokeWidth={4}
            />
            <Circle cx={132} cy={150} r={6} fill={teal} />
            <Circle cx={178} cy={150} r={6} fill={coral} />
            {text(132, 183, "2", teal, 23)}
            {text(178, 183, "3", coral, 23)}
            {text(284, 137, "x", muted, 16)}
            {text(25, 27, "y", muted, 16)}
            {text(154, 27, "y = x² − 5x + 6", ink, 18)}
          </>
        )}
        {(kind === "arena" || kind === "learn") && (
          <>
            <Circle cx={155} cy={105} r={85} fill="#B998F4" opacity={0.22} />
            <G transform="rotate(-12 65 65)">
              <Rect
                x={12}
                y={24}
                width={76}
                height={84}
                rx={17}
                fill="#EEE4FF"
              />
              <Path
                d="M37 52 H65 M51 38 V66"
                stroke={violet}
                strokeWidth={6}
                strokeLinecap="round"
              />
            </G>
            <G transform="rotate(12 250 120)">
              <Rect
                x={220}
                y={90}
                width={66}
                height={80}
                rx={16}
                fill="#A7E4D9"
              />
              {text(253, 142, "π", "#155A50", 38)}
            </G>
            {kind === "arena" ? (
              <>
                <Path
                  d="M105 58 H195 V85 Q195 132 150 141 Q105 132 105 85 Z"
                  fill={yellow}
                />
                <Path
                  d="M105 65 H81 V87 Q81 110 119 115 M195 65 H219 V87 Q219 110 181 115"
                  fill="none"
                  stroke={yellow}
                  strokeWidth={12}
                />
                <Path
                  d="M150 135 V163 M123 169 H177"
                  stroke={yellow}
                  strokeWidth={12}
                  strokeLinecap="round"
                />
                <Polygon
                  points="150,69 157,85 175,87 162,99 165,117 150,108 135,117 138,99 125,87 143,85"
                  fill="#FFF5D5"
                />
              </>
            ) : (
              <>
                <Path
                  d="M92 72 Q120 57 150 75 Q180 57 208 72 V155 Q178 142 150 158 Q122 142 92 155 Z"
                  fill="#FFF5DE"
                />
                <Path d="M150 75 V158" stroke={yellow} strokeWidth={3} />
                <Path
                  d="M104 91 L136 94 M104 108 L136 111 M165 94 L194 91 M165 111 L194 108 M165 128 L187 126"
                  stroke={violet}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              </>
            )}
            <Circle cx={232} cy={39} r={12} fill={coral} />
            <Polygon points="52,144 68,172 36,172" fill={teal} />
            <Path
              d="M178 13 V27 M171 20 H185"
              stroke={yellow}
              strokeWidth={4}
              strokeLinecap="round"
            />
          </>
        )}
      </Svg>
    </View>
  );
}
