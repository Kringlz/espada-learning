import React, { useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import Svg, { Line } from "react-native-svg";
import { courseContent } from "../course/content";
import {
  adjacentStar,
  constellations,
  starPosition,
} from "../course/constellation";
import {
  CourseProgress,
  CourseTopic,
  grades,
  subjectName,
} from "../course/model";
import { lessonStatus, nextLesson } from "../course/journey";
import { Icon, Txt, useUITheme } from "./ui";
import { MotionActiveContext, useReducedMotion } from "./Motion";
import { Starfield, StarGlyph } from "./Starfield";

export function GradeOrbits({
  grade,
  onChange,
}: {
  grade: number | null;
  onChange: (grade: number) => void;
}) {
  const { colors } = useUITheme();
  const narrow = useWindowDimensions().width < 480;
  return (
    <View
      style={{
        flexDirection: "row",
        gap: narrow ? 4 : 6,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      {grades.map((g) => (
        <Pressable
          key={g}
          accessibilityRole="button"
          accessibilityLabel={`${g} класс · ${constellations[g].name}`}
          accessibilityState={{ selected: grade === g }}
          onPress={() => onChange(g)}
          style={({ pressed }) => ({
            minWidth: narrow ? 36 : 43,
            height: 44,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: grade === g ? colors.green : "transparent",
            backgroundColor: grade === g ? colors.selected : "transparent",
            opacity: pressed ? 0.6 : 1,
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Txt
            size={14}
            weight={grade === g ? "700" : "400"}
            color={grade === g ? colors.ink : colors.muted}
          >
            {g}
          </Txt>
        </Pressable>
      ))}
      {!narrow && (
        <Txt size={12} color={colors.muted} style={{ marginLeft: 6 }}>
          класс
        </Txt>
      )}
    </View>
  );
}

export function ConstellationNavigator({
  topics,
  progress,
  open,
  ready = true,
  videos = false,
}: {
  topics: CourseTopic[];
  progress: CourseProgress;
  open: (topic: CourseTopic) => void;
  ready?: boolean;
  videos?: boolean;
}) {
  const { colors } = useUITheme();
  const [width, setWidth] = useState(900);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [overview, setOverview] = useState(false);
  const active = useContext(MotionActiveContext);
  const reduced = useReducedMotion();
  const initial = nextLesson(topics, progress);
  const selected = topics.find((t) => t.id === selectedId) ?? initial;
  const index = selected ? topics.indexOf(selected) : 0;
  const grade = selected?.grade ?? 5;
  const constellation = constellations[grade];
  const compact = width < 650;
  const stageHeight = compact ? 310 : 340;
  const gap = compact ? 140 : 190;
  const camera = useRef(new Animated.Value(0)).current;
  const lookX = useRef(new Animated.Value(0)).current;
  const lookY = useRef(new Animated.Value(0)).current;
  const positions = useMemo(
    () =>
      topics.map((t, i) => {
        const p = starPosition(i, t.grade);
        return { x: i * gap, y: compact ? p.y * 0.8 : p.y };
      }),
    [topics, gap, compact],
  );
  const position = positions[index] ?? { x: 0, y: 168 };
  useEffect(() => {
    if (reduced || !active) {
      camera.setValue(-position.x);
      return;
    }
    const animation = Animated.timing(camera, {
      toValue: -position.x,
      duration: 650,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: Platform.OS !== "web",
    });
    animation.start();
    return () => animation.stop();
  }, [position.x, reduced, active, camera]);
  const move = (direction: number) => {
    const next = topics[adjacentStar(index, direction, topics.length)];
    if (next) setSelectedId(next.id);
  };
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) =>
      Math.abs(g.dx) > 18 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderRelease: (_, g) => {
      if (Math.abs(g.dx) > 40) move(g.dx < 0 ? 1 : -1);
    },
  });
  // Keyboard navigation belongs to the focused map; never intercepts text fields or hidden screens.
  const keyboardProps =
    Platform.OS === "web"
      ? {
          tabIndex: 0 as const,
          onKeyDown: (event: any) => {
            if (!active) return;
            if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
              event.preventDefault();
              move(event.key === "ArrowRight" ? 1 : -1);
            }
            if (
              event.key === "Enter" &&
              event.target === event.currentTarget &&
              selected &&
              ready
            ) {
              event.preventDefault();
              open(selected);
            }
            if (event.key === "Home" && topics.length) {
              event.preventDefault();
              setSelectedId(topics[0].id);
            }
            if (event.key === "End" && topics.length) {
              event.preventDefault();
              setSelectedId(topics[topics.length - 1].id);
            }
          },
        }
      : {};
  if (!selected)
    return (
      <View style={{ padding: 28 }}>
        <Txt color={colors.muted}>
          Здесь пока нет звёзд. Попробуй другой класс или название темы.
        </Txt>
      </View>
    );
  const status = lessonStatus(selected, progress);
  const completed = topics.filter(
    (t) => lessonStatus(t, progress).complete,
  ).length;
  const worldWidth = Math.max(width, topics.length * gap);
  const mapWidth = Math.max(240, width - 90);
  const mapPosition = (i: number) => ({
    x: 45 + (i / Math.max(1, topics.length - 1)) * mapWidth,
    y: 150 + Math.sin(i * 1.72 + grade) * 50 + Math.cos(i * 0.6) * 20,
  });
  return (
    <View
      {...keyboardProps}
      testID="constellation-navigator"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{
        gap: 0,
        borderRadius: 24,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: colors.line,
        backgroundColor: "#090D18",
      }}
    >
      <View
        style={{
          paddingHorizontal: compact ? 20 : 30,
          paddingTop: 23,
          flexDirection: "row",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          zIndex: 2,
        }}
      >
        <View style={{ gap: 5 }}>
          <Txt size={10} color="#8E9BB7" style={{ letterSpacing: 2.7 }}>
            СОЗВЕЗДИЕ {String(grade).padStart(2, "0")}
          </Txt>
          <Txt size={compact ? 23 : 28} weight="500" color="#EDF0FA">
            {constellation.name}
          </Txt>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            overview ? "Вернуться к выбранной звезде" : "Показать всё созвездие"
          }
          accessibilityState={{ expanded: overview }}
          onPress={() => setOverview(!overview)}
          style={({ pressed }) => ({
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            minHeight: 44,
            paddingHorizontal: 13,
            borderWidth: 1,
            borderColor: "#2B344B",
            borderRadius: 22,
            backgroundColor: pressed ? "#26334C" : "#101725",
          })}
        >
          <Icon
            name={overview ? "crosshair" : "maximize-2"}
            size={15}
            color="#BFCBE3"
          />
          <Txt size={12} color="#C8D2E6">
            {overview ? "К звезде" : "Всё созвездие"}
          </Txt>
        </Pressable>
      </View>
      <View
        {...pan.panHandlers}
        {...(Platform.OS === "web"
          ? {
              onMouseMove: (event: any) => {
                if (reduced || !active) return;
                const rect = event.currentTarget.getBoundingClientRect();
                lookX.setValue(
                  ((event.clientX - rect.left) / rect.width - 0.5) * 18,
                );
                lookY.setValue(
                  ((event.clientY - rect.top) / rect.height - 0.5) * 12,
                );
              },
              onMouseLeave: () => {
                lookX.setValue(0);
                lookY.setValue(0);
              },
            }
          : {})}
        accessibilityLabel="Карта уроков. Стрелки влево и вправо — выбрать звезду. Enter — открыть урок."
        style={
          {
            height: stageHeight,
            overflow: "hidden",
            outlineColor: constellation.color,
          } as any
        }
      >
        <Starfield height={stageHeight} />
        <View
          pointerEvents="none"
          style={{ position: "absolute", top: 24, left: 30 }}
        >
          <Txt size={10} color="#74819B" style={{ letterSpacing: 1.5 }}>
            {overview
              ? "АТЛАС УРОКОВ"
              : `${subjectName(grade, selected.subject).toUpperCase()} / ${grade} КЛАСС`}
          </Txt>
        </View>
        {overview ? (
          <>
            <Svg
              width={width}
              height={stageHeight}
              style={{ position: "absolute" }}
            >
              {topics.slice(1).map((t, i) => {
                const a = mapPosition(i),
                  b = mapPosition(i + 1);
                return (
                  <Line
                    key={t.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={constellation.color}
                    strokeOpacity="0.35"
                    strokeWidth="1"
                  />
                );
              })}
            </Svg>
            {topics.map((t, i) => {
              const p = mapPosition(i);
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Звезда ${i + 1}: ${courseContent[t.id].pages[0].title}`}
                  accessibilityState={{ selected: i === index }}
                  onPress={() => {
                    setSelectedId(t.id);
                    setOverview(false);
                  }}
                  style={{
                    position: "absolute",
                    left: p.x - 22,
                    top: p.y - 22,
                    width: 44,
                    height: 44,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: i === index ? 13 : 7,
                      height: i === index ? 13 : 7,
                      borderRadius: 8,
                      backgroundColor: lessonStatus(t, progress).complete
                        ? "#A7E7D0"
                        : i === index
                          ? "#FFFFFF"
                          : constellation.color,
                      borderWidth: i === index ? 3 : 0,
                      borderColor: "#6D7FAA",
                    }}
                  />
                  <Txt
                    size={9}
                    color="#A3B1CB"
                    style={{ position: "absolute", top: 36 }}
                  >
                    {i + 1}
                  </Txt>
                </Pressable>
              );
            })}
          </>
        ) : (
          <Animated.View
            style={{
              position: "absolute",
              left: width / 2,
              top: 0,
              width: worldWidth,
              height: stageHeight,
              transform: [
                { translateX: camera },
                { translateX: lookX },
                { translateY: lookY },
              ],
            }}
          >
            <Svg
              width={worldWidth + 120}
              height={stageHeight}
              style={{ position: "absolute", left: -60 }}
            >
              {positions.slice(1).map((p, i) => (
                <Line
                  key={i}
                  x1={positions[i].x + 60}
                  y1={positions[i].y}
                  x2={p.x + 60}
                  y2={p.y}
                  stroke={
                    lessonStatus(topics[i], progress).complete
                      ? "#94D9C8"
                      : constellation.color
                  }
                  strokeWidth={i === index || i === index - 1 ? 1 : 0.7}
                  strokeOpacity={i === index || i === index - 1 ? 0.55 : 0.2}
                />
              ))}
            </Svg>
            {topics.map((topic, i) => {
              const p = positions[i],
                current = i === index,
                complete = lessonStatus(topic, progress).complete;
              return (
                <Pressable
                  key={topic.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Выбрать звезду ${i + 1}: ${courseContent[topic.id].pages[0].title}${complete ? ", пройдено" : ""}`}
                  accessibilityState={{ selected: current }}
                  onPress={() => setSelectedId(topic.id)}
                  style={({ pressed }) => ({
                    position: "absolute",
                    left: p.x - (current ? 90 : 70),
                    top: p.y - (current ? 90 : 70),
                    width: current ? 180 : 140,
                    alignItems: "center",
                    opacity: pressed ? 0.65 : current ? 1 : 0.65,
                  })}
                >
                  <StarGlyph
                    id={topic.id}
                    size={current ? 180 : 140}
                    selected={current}
                    color={complete ? "#A7E7D0" : constellation.color}
                  />
                  <View
                    style={{
                      alignItems: "center",
                      marginTop: -12,
                      gap: 5,
                      width: compact ? 130 : 170,
                    }}
                  >
                    <Txt
                      size={9}
                      color={current ? "#C7D3EB" : "#8593AC"}
                      style={{ letterSpacing: 2 }}
                    >
                      {complete ? "✓ " : ""}
                      {String(i + 1).padStart(2, "0")}
                      {current ? " / ТВОЯ ЗВЕЗДА" : ""}
                    </Txt>
                    {!current && !compact && (
                      <Txt
                        numberOfLines={2}
                        size={11}
                        color="#B2BED4"
                        style={{ textAlign: "center" }}
                      >
                        {courseContent[topic.id].pages[0].title}
                      </Txt>
                    )}
                  </View>
                </Pressable>
              );
            })}
          </Animated.View>
        )}
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            bottom: 12,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <Txt size={10} color="#8592AA">
            {overview
              ? "Нажми на звезду, чтобы приблизить"
              : compact
                ? "Листай звёзды свайпом или стрелками"
                : "Каждая звезда — новое открытие. Выбирай стрелками ← →"}
          </Txt>
        </View>
      </View>
      <View
        style={{
          padding: compact ? 20 : 30,
          paddingTop: 22,
          gap: 22,
          backgroundColor: "#111827",
          borderTopWidth: 1,
          borderColor: "#242D40",
        }}
      >
        <View
          style={{
            flexDirection: compact ? "column" : "row",
            alignItems: compact ? "stretch" : "center",
            gap: 24,
          }}
        >
          <View style={{ flex: 1, gap: 9 }} accessibilityLiveRegion="polite">
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: status.complete
                    ? "#A7E7D0"
                    : constellation.color,
                }}
              />
              <Txt size={10} color="#A6B4CE" style={{ letterSpacing: 1.6 }}>
                {status.complete
                  ? "ЗВЕЗДА ОТКРЫТА"
                  : status.started
                    ? "ПУТЕШЕСТВИЕ ПРОДОЛЖАЕТСЯ"
                    : "НОВОЕ ОТКРЫТИЕ"}
              </Txt>
            </View>
            <Txt
              size={compact ? 23 : 29}
              weight="500"
              color="#F0F3FA"
              style={{ letterSpacing: -0.6 }}
            >
              {courseContent[selected.id].pages[0].title}
            </Txt>
            <Txt size={12} color="#9CAAC2">
              {selected.pages.length} разделов · {selected.practice.count}{" "}
              заданий
              {status.started
                ? ` · ${status.percent}% пройдено`
                : " · В своём темпе"}
            </Txt>
          </View>
          <View
            style={{
              flexDirection: "row",
              gap: 9,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {[-1, 1].map((direction) => (
              <Pressable
                key={direction}
                accessibilityRole="button"
                accessibilityLabel={
                  direction < 0 ? "Предыдущая звезда" : "Следующая звезда"
                }
                disabled={
                  direction < 0 ? index === 0 : index === topics.length - 1
                }
                accessibilityState={{
                  disabled:
                    direction < 0 ? index === 0 : index === topics.length - 1,
                }}
                onPress={() => move(direction)}
                style={({ pressed }) => ({
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  borderWidth: 1,
                  borderColor: "#39445A",
                  alignItems: "center",
                  justifyContent: "center",
                  opacity: (
                    direction < 0 ? index === 0 : index === topics.length - 1
                  )
                    ? 0.25
                    : pressed
                      ? 0.6
                      : 1,
                })}
              >
                <Icon
                  name={direction < 0 ? "arrow-left" : "arrow-right"}
                  color="#DCE4F4"
                  size={19}
                />
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${videos ? "Смотреть видео" : status.complete ? "Повторить урок" : status.started ? "Продолжить урок" : "Открыть урок"}: ${courseContent[selected.id].pages[0].title}`}
              disabled={!ready}
              onPress={() => open(selected)}
              style={({ pressed }) => ({
                minHeight: 48,
                paddingHorizontal: 23,
                borderRadius: 24,
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                backgroundColor: "#D7E2FF",
                opacity: !ready ? 0.4 : pressed ? 0.8 : 1,
              })}
            >
              <Txt size={14} weight="600" color="#14203B">
                {!ready
                  ? "Загрузка…"
                  : videos
                    ? "Смотреть видео"
                    : status.complete
                      ? "Повторить урок"
                      : status.started
                        ? "Продолжить"
                        : "Открыть урок"}
              </Txt>
              <Icon name="arrow-up-right" size={18} color="#14203B" />
            </Pressable>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Открыто звёзд в созвездии"
            accessibilityValue={{ min: 0, max: topics.length, now: completed }}
            style={{ flex: 1, height: 2, backgroundColor: "#2A3449" }}
          >
            <View
              style={{
                width: `${(completed / topics.length) * 100}%`,
                height: 2,
                backgroundColor: "#A7E7D0",
              }}
            />
          </View>
          <Txt size={10} color="#93A2BD">
            {completed} / {topics.length} звёзд открыто
          </Txt>
        </View>
      </View>
    </View>
  );
}
