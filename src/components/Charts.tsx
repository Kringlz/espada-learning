import { useUITheme } from "./ui";
import React from "react";
import { View } from "react-native";
import Svg, {
  Polygon,
  Line,
  Circle,
  Polyline,
  Text as SText,
} from "react-native-svg";
import { State, areas, Assessment, Area } from "../core/types";
import {
  assessmentScore,
  areaEstimate,
  comparableAssessments,
} from "../core/engine";
import { Txt, colors, dateText } from "./ui";
export function Radar({
  state,
  id,
  compact = false,
}: {
  state: State;
  id: string;
  compact?: boolean;
}) {
  const { colors, styles } = useUITheme();
  const series = [...new Set(state.templates.map((t) => t.series))];
  const groups = series
    .map((series) => comparableAssessments(state, id, series))
    .filter((xs) => xs.length);
  groups.sort((a, b) => {
    const coverage = (xs: Assessment[]) =>
      areas.filter(
        (area) =>
          assessmentScore(state, xs[xs.length - 1], area.id).percent !== null,
      ).length;
    return (
      coverage(b) - coverage(a) ||
      b.length - a.length ||
      b[b.length - 1].date.localeCompare(a[a.length - 1].date)
    );
  });
  const assessments = groups[0] ?? [];
  const first = assessments[0],
    last = assessments.at(-1);
  const values = (a?: Assessment) =>
    areas.map((area) =>
      a ? assessmentScore(state, a, area.id).percent : null,
    );
  const b = values(first),
    l = values(last);
  const point = (i: number, v: number) => {
    const a = ((i * 72 - 90) * Math.PI) / 180;
    return [160 + Math.cos(a) * v * 1.05, 145 + Math.sin(a) * v * 1.05];
  };
  const points = (vals: (number | null)[]) =>
    vals.map((v, i) => point(i, v ?? 0).join(",")).join(" ");
  return (
    <View style={{ gap: 12 }}>
      <View
        accessible
        accessibilityLabel="Лепестковая диаграмма навыков. Список баллов, дат и результатов доступен в разделе «Прогресс»."
        style={{ alignItems: "center" }}
      >
        <Svg width="100%" height={compact ? 245 : 300} viewBox="0 0 320 290">
          {[25, 50, 75, 100].map((v) => (
            <Polygon
              key={v}
              points={points(areas.map(() => v))}
              fill={v === 100 ? colors.paper : "none"}
              stroke="#E2E7DE"
              strokeWidth="1"
            />
          ))}
          {areas.map((a, i) => {
            const [x, y] = point(i, 100);
            const [tx, ty] = point(i, 127);
            return (
              <React.Fragment key={a.id}>
                <Line x1={160} y1={145} x2={x} y2={y} stroke="#E2E7DE" />
                <SText
                  x={tx}
                  y={ty + 4}
                  textAnchor="middle"
                  fontSize={11}
                  fill={colors.muted}
                >
                  {a.short}
                </SText>
              </React.Fragment>
            );
          })}
          {first && b.every((v) => v !== null) && (
            <Polygon
              points={points(b)}
              fill="#D7C493"
              fillOpacity={0.1}
              stroke="#B5A37A"
              strokeDasharray="5,4"
              strokeWidth={2}
            />
          )}
          {last && l.every((v) => v !== null) && (
            <Polygon
              points={points(l)}
              fill="#769878"
              fillOpacity={0.17}
              stroke={colors.green}
              strokeWidth={2.3}
            />
          )}
          {l.map(
            (v, i) =>
              v !== null && (
                <Circle
                  key={i}
                  cx={point(i, v)[0]}
                  cy={point(i, v)[1]}
                  r={4}
                  fill={colors.green}
                />
              ),
          )}
        </Svg>
      </View>
      <View style={{ flexDirection: "row", gap: 20, justifyContent: "center" }}>
        <Txt size={12} color={colors.muted}>
          ┄ Baseline
        </Txt>
        <Txt size={12} color={colors.green}>
          ━ Latest paper result
        </Txt>
      </View>
      {!last ? (
        <Txt size={13} color={colors.muted}>
          Your first paper assessment will start this chart. Missing evidence is
          not a zero.
        </Txt>
      ) : (
        <>
          <Txt size={12} color={colors.muted}>
            {state.templates.find((t) => t.id === last!.templateId)?.name} ·{" "}
            {dateText(first.date)} → {dateText(last!.date)} · same series &
            coverage
          </Txt>
          {!compact &&
            areas.map((a, i) => (
              <View
                key={a.id}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <Txt size={13}>{a.name}</Txt>
                <Txt size={13}>
                  {b[i] === null ? "No evidence" : `${b[i]}%`} →{" "}
                  {l[i] === null ? "No evidence" : `${l[i]}%`}
                </Txt>
              </View>
            ))}
        </>
      )}
    </View>
  );
}
export function Trend({
  state,
  id,
  area,
  series,
}: {
  state: State;
  id: string;
  area?: Area;
  series?: string;
}) {
  const { colors, styles } = useUITheme();
  const records = comparableAssessments(state, id, series);
  const rows = records
    .map((a) => ({
      date: a.date,
      value: assessmentScore(state, a, area).percent,
    }))
    .filter((r) => r.value !== null);
  const eventDates = [
    ...new Set([
      ...state.assessments
        .filter((a) => a.studentId === id && a.status === "published")
        .map((a) => a.date),
      ...state.attempts
        .filter((a) => a.studentId === id)
        .map((a) => a.at.slice(0, 10)),
    ]),
  ].sort();
  const estimates = area
    ? eventDates
        .map((date) => ({
          date,
          value: areaEstimate(state, id, area, new Date(date + "T23:59:59Z"))
            .value,
        }))
        .filter((r) => r.value !== null)
    : [];
  const dates = [...rows, ...estimates].map((r) => Date.parse(r.date));
  const min = Math.min(...dates),
    max = Math.max(...dates);
  const x = (d: string) =>
    max === min ? 230 : 40 + ((Date.parse(d) - min) / (max - min)) * 380;
  const y = (v: number) => 180 - v * 1.45;
  return (
    <View style={{ gap: 12 }}>
      <Svg
        width="100%"
        height={240}
        viewBox="0 0 465 230"
        accessibilityLabel="График прогресса. Ниже приведены баллы с датами."
      >
        {[0, 25, 50, 75, 100].map((v) => (
          <React.Fragment key={v}>
            <Line x1={40} y1={y(v)} x2={425} y2={y(v)} stroke="#E7EBE3" />
            <SText
              x={28}
              y={y(v) + 4}
              textAnchor="end"
              fontSize={10}
              fill={colors.muted}
            >
              {v}
            </SText>
          </React.Fragment>
        ))}
        {rows.length > 1 && (
          <Polyline
            points={rows.map((r) => `${x(r.date)},${y(r.value!)}`).join(" ")}
            fill="none"
            stroke={colors.green}
            strokeWidth={2.5}
          />
        )}
        {estimates.length > 1 && (
          <Polyline
            points={estimates
              .map((r) => `${x(r.date)},${y(r.value!)}`)
              .join(" ")}
            fill="none"
            stroke="#A67C42"
            strokeDasharray="5,4"
            strokeWidth={2}
          />
        )}
        {rows.map((r, i) => (
          <Circle
            key={i}
            cx={x(r.date)}
            cy={y(r.value!)}
            r={4}
            fill={colors.green}
          />
        ))}
        {estimates.map((r, i) => (
          <Circle
            key={`e${i}`}
            cx={x(r.date)}
            cy={y(r.value!)}
            r={3}
            fill="#A67C42"
          />
        ))}
        {[...new Set([...rows, ...estimates].map((r) => r.date))]
          .filter((_, i, arr) => i === 0 || i === arr.length - 1)
          .map((d) => (
            <SText
              key={d}
              x={x(d)}
              y={210}
              textAnchor="middle"
              fontSize={11}
              fill={colors.muted}
            >
              {dateText(d)}
            </SText>
          ))}
      </Svg>
      <Txt size={12} color={colors.muted}>
        ━ Paper assessment {area ? "   ┄ Current estimate (heuristic)" : ""}
      </Txt>
      {!rows.length && (
        <Txt color={colors.muted}>No comparable paper results yet.</Txt>
      )}
      {rows.map((r, i) => (
        <Txt key={i} size={13}>
          {dateText(r.date)} · Paper result: {r.value}%
        </Txt>
      ))}
      {estimates.map((r, i) => (
        <Txt key={`e${i}`} size={13} color={colors.orange}>
          {dateText(r.date)} · Estimated: {r.value}%
        </Txt>
      ))}
      <Txt size={12} color={colors.muted}>
        Only matching assessment coverage is connected. Estimates use evidence
        available by each date, including any later corrections to paper
        records.
      </Txt>
    </View>
  );
}
