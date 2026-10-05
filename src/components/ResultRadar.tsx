import { useSounds } from "../engagement/Sounds";
import { Button } from "./ui";
import { useUITheme } from "./ui";
import React, { useContext, useEffect, useRef, useState } from "react";
import { MotionActiveContext, useReducedMotion } from "./Motion";
import { Animated, Easing, View } from "react-native";
import Svg, { Circle, Line, Polygon, Text as SvgText } from "react-native-svg";
import { ReportTemplate, TeacherReport } from "../core/types";
import { percent } from "../core/reports";
import { colors, Txt } from "./ui";

function labelLines(label: string) {
  const words = label.split(" ");
  const lines: string[] = [""];
  for (const word of words) {
    const i = lines.length - 1;
    if (lines[i] && (lines[i] + " " + word).length > 16) lines.push(word);
    else lines[i] += (lines[i] ? " " : "") + word;
  }
  return lines
    .slice(0, 2)
    .map((line, i) =>
      i === 1 && lines.length > 2
        ? line.slice(0, 13) + "…"
        : line.length > 18
          ? line.slice(0, 15) + "…"
          : line,
    );
}

export function ResultRadar({
  template,
  report,
  earlier,
}: {
  template: ReportTemplate;
  report: TeacherReport;
  earlier?: TeacherReport;
}) {
  const { colors, styles } = useUITheme();
  const { play } = useSounds();
  const [replay, setReplay] = useState(0);
  const active = useContext(MotionActiveContext);
  const reduced = useReducedMotion();
  const motion = useRef(new Animated.Value(1)).current;
  const [growth, setGrowth] = useState(1);
  useEffect(() => {
    if (reduced || !active) {
      motion.setValue(1);
      setGrowth(1);
      return;
    }
    setGrowth(0);
    motion.setValue(0);
    const listener = motion.addListener(({ value }) => setGrowth(value));
    const animation = Animated.timing(motion, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => {
      animation.stop();
      motion.removeListener(listener);
    };
  }, [
    replay,
    active,
    reduced,
    report.id,
    report.revision,
    earlier?.id,
    earlier?.revision,
    motion,
  ]);
  const n = template.areas.length;
  const point = (i: number, value: number) => {
    const angle = (i * 2 * Math.PI) / n - Math.PI / 2;
    return [
      180 + Math.cos(angle) * value * 0.92,
      155 + Math.sin(angle) * value * 0.92,
    ];
  };
  const values = template.areas.map((a) =>
    percent(report.results.find((r) => r.areaId === a.id)),
  );
  const enough = n >= 3 && values.filter((v) => v !== null).length >= 3;
  return (
    <View testID="result-radar" style={{ gap: 12, width: "100%" }}>
      {enough ? (
        <Svg
          width="100%"
          height={320}
          viewBox="0 0 360 320"
          accessible
          accessibilityLabel={`Радар последнего теста. ${template.areas.map((a, i) => `${a.label}: ${values[i] === null ? "нет данных" : values[i] + "%"}`).join(". ")}`}
        >
          {[25, 50, 75, 100]
            .map((v) => (
              <Polygon
                key={v}
                points={template.areas
                  .map((_, i) => point(i, v).join(","))
                  .join(" ")}
                stroke={colors.line}
                strokeWidth={1}
                fill={v === 100 ? colors.paper : "none"}
              />
            ))
            .reverse()}
          {template.areas.map((a, i) => {
            const [x, y] = point(i, 100);
            const [tx, ty] = point(i, n === 4 ? 150 : 133);
            const lines = n <= 6 ? labelLines(a.label) : [String(i + 1)];
            return (
              <React.Fragment key={a.id}>
                <Line x1={180} y1={155} x2={x} y2={y} stroke={colors.line} />
                {lines.map((line, j) => (
                  <SvgText
                    key={j}
                    x={tx}
                    y={ty + (j - (lines.length - 1) / 2) * 14}
                    fontSize={12}
                    fontFamily="Arial, sans-serif"
                    fontWeight="500"
                    textAnchor="middle"
                    fill={colors.ink}
                  >
                    {line}
                  </SvgText>
                ))}
                <SvgText
                  x={tx}
                  y={ty + (lines.length + 1) * 7 + 6}
                  fontSize={12}
                  fontFamily="Arial, sans-serif"
                  fontWeight="700"
                  textAnchor="middle"
                  fill={colors.green}
                >
                  {values[i] === null ? "—" : `${values[i]}%`}
                </SvgText>
              </React.Fragment>
            );
          })}
          {[...(earlier ? [earlier] : []), report].map((r) => {
            const current = r.id === report.id;
            const points = template.areas.map((a, i) => {
              const v = percent(r.results.find((x) => x.areaId === a.id));
              return v === null ? null : point(i, v * growth);
            });
            return (
              <React.Fragment key={r.id}>
                {points.every(Boolean) && (
                  <Polygon
                    points={points.map((p) => p!.join(",")).join(" ")}
                    stroke={current ? colors.green : "#A66E3D"}
                    strokeWidth={current ? 2.5 : 1.8}
                    strokeDasharray={current ? undefined : "5 4"}
                    fill={current ? "#829B4A40" : "none"}
                  />
                )}
                {points.map(
                  (p, i) =>
                    p && (
                      <Circle
                        key={i}
                        cx={p[0]}
                        cy={p[1]}
                        r={current ? 4 : 2.5}
                        fill={current ? colors.green : "#A66E3D"}
                      />
                    ),
                )}
              </React.Fragment>
            );
          })}
          <SvgText x={184} y={153} fontSize={9} fill={colors.muted}>
            0
          </SvgText>
          <SvgText x={185} y={62} fontSize={9} fill={colors.muted}>
            100%
          </SvgText>
        </Svg>
      ) : (
        <View
          style={{
            padding: 20,
            borderRadius: 18,
            backgroundColor: colors.light,
            gap: 8,
          }}
        >
          <Txt weight="600">Карта появится после проверки трёх разделов</Txt>
          <Txt size={14} color={colors.muted}>
            Доступные результаты показаны ниже. Учитель дополнит их после
            проверки.
          </Txt>
        </View>
      )}
      {enough && (
        <Button
          small
          secondary
          icon="activity"
          label="Оживить карту результатов"
          onPress={() => {
            play("radar");
            setReplay((value) => value + 1);
          }}
        >
          Оживить карту
        </Button>
      )}
      {enough && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 14,
          }}
        >
          <Txt size={12} color={colors.green}>
            ● Эта работа
          </Txt>
          {earlier && (
            <Txt size={12} color={colors.orange}>
              ┄ Предыдущая
            </Txt>
          )}
        </View>
      )}
      {(!enough || n > 6) &&
        template.areas.map((a, i) => (
          <Txt key={a.id} size={14}>
            {i + 1}. {a.label} ·{" "}
            {values[i] === null ? "нет данных" : `${values[i]}%`}
          </Txt>
        ))}
      {values.includes(null) && (
        <Txt size={12} color={colors.muted}>
          Разделы без данных не считаются нулём. Линия появится, когда будут
          заполнены все разделы.
        </Txt>
      )}
    </View>
  );
}
