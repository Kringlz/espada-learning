import React from "react";
import { View } from "react-native";
import Svg, {
  Circle,
  Line,
  Path,
  Polygon,
  Rect,
  Text as Label,
} from "react-native-svg";
import { useUITheme } from "../../components/ui";

const labels: Record<string, string> = {
  "triangle-area":
    "Треугольник: основание a, перпендикулярная высота hₐ к основанию.",
  pythagoras:
    "Прямоугольный треугольник: катеты a и b, гипотенуза c напротив прямого угла.",
  rectangle: "Прямоугольник со сторонами a и b.",
  "circle-area": "Окружность с центром O и радиусом r от центра до окружности.",
};
export function ReferenceDiagram({ id }: { id: string }) {
  const { colors, dark } = useUITheme();
  if (!labels[id]) return null;
  const accent = dark ? "#A8D5B8" : "#326B4B";
  const text = (x: number, y: number, s: string) => (
    <Label x={x} y={y} fill={colors.ink} fontSize={17} textAnchor="middle">
      {s}
    </Label>
  );
  return (
    <View
      accessibilityRole="image"
      accessible
      accessibilityLabel={labels[id]}
      testID={`reference-diagram-${id}`}
      style={{ width: "100%", maxWidth: 260, height: 130, marginVertical: 4 }}
    >
      <Svg width="100%" height="100%" viewBox="0 0 260 130" aria-hidden>
        {id === "triangle-area" && (
          <>
            <Polygon
              points="25,102 235,102 100,16"
              fill="none"
              stroke={accent}
              strokeWidth={2}
            />
            <Line
              x1={100}
              y1={16}
              x2={100}
              y2={102}
              stroke={accent}
              strokeDasharray="4 4"
            />
            <Path d="M100 91 H111 V102" stroke={accent} fill="none" />
            {text(130, 124, "a")}
            {text(82, 66, "hₐ")}
          </>
        )}
        {id === "pythagoras" && (
          <>
            <Polygon
              points="45,15 45,102 220,102"
              fill="none"
              stroke={accent}
              strokeWidth={2}
            />
            <Path d="M45 90 H57 V102" stroke={accent} fill="none" />
            {text(27, 64, "a")}
            {text(133, 124, "b")}
            {text(145, 48, "c")}
          </>
        )}
        {id === "rectangle" && (
          <>
            <Rect
              x={45}
              y={14}
              width={175}
              height={88}
              fill="none"
              stroke={accent}
              strokeWidth={2}
            />
            {text(133, 124, "a")}
            {text(28, 64, "b")}
          </>
        )}
        {id === "circle-area" && (
          <>
            <Circle
              cx={125}
              cy={63}
              r={49}
              fill="none"
              stroke={accent}
              strokeWidth={2}
            />
            <Circle cx={125} cy={63} r={2} fill={accent} />
            <Line
              x1={125}
              y1={63}
              x2={174}
              y2={63}
              stroke={accent}
              strokeWidth={2}
            />
            {text(116, 81, "O")}
            {text(149, 52, "r")}
          </>
        )}
      </Svg>
    </View>
  );
}
