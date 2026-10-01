import { useUITheme } from "./ui";
import React from "react";
import Svg, {
  Circle,
  Ellipse,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from "react-native-svg";

export type ArtKind =
  | "numbers"
  | "fractions"
  | "geometry"
  | "equations"
  | "graph"
  | "compass"
  | "decimal"
  | "percent"
  | "ratio";
export const artPalette = {
  numbers: "#E8EDD8",
  fractions: "#F3E2C7",
  geometry: "#E3E8EF",
  equations: "#EAE2ED",
  graph: "#E3EAE3",
  compass: "#EAEEDB",
  decimal: "#E0EAE5",
  percent: "#F0DFD1",
  ratio: "#E8E2EF",
};
export function topicArt(title: string, subject?: string): ArtKind {
  if (subject === "geometry") return "geometry";
  if (/десятич/i.test(title)) return "decimal";
  if (/процент|смес/i.test(title)) return "percent";
  if (/пропорц|отношен/i.test(title)) return "ratio";
  if (/дроб/i.test(title)) return "fractions";
  if (/функц|график|производн|интеграл/i.test(title)) return "graph";
  if (/уравнен|неравен|выражен|степен|корн|многочлен/i.test(title))
    return "equations";
  return "numbers";
}

/** Decorative, code-native topic illustrations. No fabricated learning data. */
export function LearningArt({
  kind,
  size = 150,
}: {
  kind: ArtKind;
  size?: number;
}) {
  const { colors, styles } = useUITheme();
  const ink = "#344E3C",
    olive = "#839650",
    cream = "#FCF9EF",
    coral = "#D99577";
  return (
    <Svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 200 160"
      accessible={false}
      aria-hidden
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Ellipse cx={101} cy={141} rx={63} ry={9} fill="#283D2C" opacity={0.07} />
      {kind === "decimal" ? (
        <G transform="rotate(-7 100 80)">
          <Rect x={28} y={35} width={146} height={90} rx={22} fill={cream} />
          <SvgText
            x={100}
            y={96}
            textAnchor="middle"
            fontSize={48}
            fontWeight="700"
            fill={ink}
          >
            0,5
          </SvgText>
          <Circle cx={154} cy={35} r={14} fill={coral} />
        </G>
      ) : kind === "percent" ? (
        <G transform="rotate(9 100 80)">
          <Rect x={47} y={20} width={110} height={120} rx={28} fill={coral} />
          <Circle
            cx={81}
            cy={59}
            r={12}
            stroke={cream}
            strokeWidth={8}
            fill="none"
          />
          <Circle
            cx={122}
            cy={101}
            r={12}
            stroke={cream}
            strokeWidth={8}
            fill="none"
          />
          <Path
            d="M79 108L124 51"
            stroke={cream}
            strokeWidth={8}
            strokeLinecap="round"
          />
        </G>
      ) : kind === "ratio" ? (
        <G>
          <Rect x={39} y={83} width={32} height={53} rx={11} fill={coral} />
          <Rect x={84} y={54} width={32} height={82} rx={11} fill={olive} />
          <Rect x={129} y={25} width={32} height={111} rx={11} fill={cream} />
          <Path
            d="M40 51L87 29"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
          />
          <Path
            d="M72 27L89 28L86 44"
            stroke={ink}
            strokeWidth={4}
            strokeLinecap="round"
            fill="none"
          />
        </G>
      ) : kind === "fractions" ? (
        <G>
          <Circle cx={95} cy={77} r={54} fill={cream} />
          <Path d="M95 77 L95 23 A54 54 0 0 1 149 77 Z" fill={olive} />
          <Path d="M95 77 L149 77 A54 54 0 0 1 95 131 Z" fill="#B6C28D" />
          <Path d="M95 77 L95 131 A54 54 0 0 1 41 77 Z" fill="#D5DCB6" />
          <Path d="M95 23V131 M41 77H149" stroke="#F3E2C7" strokeWidth={5} />
          <Circle cx={152} cy={120} r={25} fill={coral} />
          <SvgText
            x={152}
            y={127}
            textAnchor="middle"
            fill={cream}
            fontSize={22}
            fontWeight="700"
          >
            ¾
          </SvgText>
        </G>
      ) : kind === "geometry" ? (
        <G>
          <Path d="M52 63L97 38L143 64L98 91Z" fill="#C4CFA5" />
          <Path d="M52 63V116L98 143V91Z" fill={olive} />
          <Path d="M98 91L143 64V116L98 143Z" fill={ink} />
          <Path d="M115 69L146 15L178 69Z" fill={coral} />
          <Circle cx={36} cy={40} r={15} fill={cream} />
        </G>
      ) : kind === "equations" ? (
        <G transform="rotate(-8 100 80)">
          <Rect x={35} y={23} width={129} height={111} rx={22} fill={cream} />
          <Rect x={45} y={34} width={110} height={4} rx={2} fill="#DFD7E5" />
          <SvgText
            x={100}
            y={96}
            textAnchor="middle"
            fontSize={42}
            fontWeight="600"
            fill={ink}
          >
            x + y
          </SvgText>
          <Circle cx={162} cy={118} r={23} fill={coral} />
          <Path
            d="M153 118H171 M162 109V127"
            stroke={cream}
            strokeWidth={4}
            strokeLinecap="round"
          />
        </G>
      ) : kind === "graph" ? (
        <G>
          <Rect x={38} y={19} width={130} height={122} rx={21} fill={cream} />
          {[65, 90, 115].map((v) => (
            <Line key={v} x1={56} y1={v} x2={153} y2={v} stroke="#DDE4D5" />
          ))}
          <Path
            d="M59 35V121H152"
            fill="none"
            stroke={ink}
            strokeWidth={3}
            strokeLinecap="round"
          />
          <Path
            d="M60 106Q88 114 99 83T144 44"
            fill="none"
            stroke={olive}
            strokeWidth={7}
            strokeLinecap="round"
          />
          <Circle cx={144} cy={44} r={8} fill={coral} />
        </G>
      ) : kind === "compass" ? (
        <G>
          <Circle cx={100} cy={79} r={60} fill={cream} />
          <Circle cx={100} cy={79} r={48} fill="#E9EDD9" />
          <Path d="M120 40L109 88L80 118L90 69Z" fill={ink} />
          <Path d="M120 40L100 79L90 69Z" fill={coral} />
          <Circle cx={100} cy={79} r={7} fill={cream} />
        </G>
      ) : (
        <G>
          <G transform="rotate(-11 73 78)">
            <Rect x={27} y={24} width={88} height={104} rx={22} fill={olive} />
            <SvgText
              x={71}
              y={98}
              textAnchor="middle"
              fontSize={69}
              fontWeight="700"
              fill={cream}
            >
              2
            </SvgText>
          </G>
          <G transform="rotate(10 130 95)">
            <Rect x={97} y={57} width={73} height={80} rx={19} fill={cream} />
            <Path
              d="M118 97H150 M134 81V113"
              stroke={ink}
              strokeWidth={7}
              strokeLinecap="round"
            />
          </G>
          <Circle cx={157} cy={30} r={13} fill={coral} />
        </G>
      )}
      <Path
        d="M25 96L28 103L35 106L28 109L25 116L22 109L15 106L22 103Z"
        fill={coral}
        opacity={0.8}
      />
      <Circle cx={180} cy={87} r={4} fill={olive} opacity={0.5} />
    </Svg>
  );
}
