import React from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Path } from "react-native-svg";
import { CourseTopic, CourseProgress } from "../course/model";
import { courseContent } from "../course/content";
import { lessonStatus, nextLesson } from "../course/journey";
import { Icon, Txt, useUITheme } from "./ui";
import { useSounds } from "../engagement/Sounds";

export function DuoJourney({
  topics,
  progress,
  open,
}: {
  topics: CourseTopic[];
  progress: CourseProgress;
  open: (topic: CourseTopic) => void;
}) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  const { width } = useWindowDimensions();
  const sway = Math.min(48, Math.max(0, (width - 36 - 220) / 2));
  const current = nextLesson(topics, progress)?.id;
  return (
    <View
      style={{
        width: "100%",
        maxWidth: 520,
        alignSelf: "center",
        paddingTop: 24,
        paddingBottom: 16,
      }}
    >
      {topics.map((topic, index) => {
        const state = lessonStatus(topic, progress);
        const active = current === topic.id;
        const offset = [0, -sway, 0, sway][index % 4];
        const nextOffset = [0, -sway, 0, sway][(index + 1) % 4];
        const title = courseContent[topic.id].pages[0].title;
        return (
          <View
            key={topic.id}
            style={{
              height: 170,
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            {index < topics.length - 1 && (
              <View
                pointerEvents="none"
                style={{
                  position: "absolute",
                  width: 240,
                  height: 170,
                  top: 43,
                }}
              >
                <Svg width="240" height="170" viewBox="0 0 240 170">
                  <Path
                    d={`M ${120 + offset} 0 C ${120 + offset} 85 ${120 + nextOffset} 85 ${120 + nextOffset} 170`}
                    fill="none"
                    stroke={colors.line}
                    strokeWidth={4}
                    strokeDasharray="4 10"
                    strokeLinecap="round"
                  />
                </Svg>
              </View>
            )}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${state.complete ? "Повторить" : state.started ? "Продолжить" : "Начать"}: ${title}`}
              onPress={() => {
                play("open");
                open(topic);
              }}
              style={({ pressed }) => ({
                width: 220,
                alignItems: "center",
                gap: 10,
                transform: [
                  { translateX: offset },
                  { translateY: pressed ? 4 : 0 },
                ],
              })}
            >
              <View
                style={{
                  width: 92,
                  height: 92,
                  padding: 6,
                  borderRadius: 46,
                  borderWidth: 3,
                  borderColor: active ? colors.primary : "transparent",
                  backgroundColor: colors.paper,
                }}
              >
                <View
                  style={{
                    flex: 1,
                    borderRadius: 40,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor:
                      state.complete || active ? colors.primary : colors.subtle,
                    borderWidth: 2,
                    boxShadow: `0px 5px 0px ${state.complete || active ? colors.green : colors.line}`,
                    borderColor:
                      state.complete || active ? colors.green : colors.line,
                  }}
                >
                  <Icon
                    name={
                      state.complete
                        ? "check"
                        : active
                          ? "star"
                          : topic.subject === "geometry"
                            ? "triangle"
                            : "book-open"
                    }
                    size={30}
                    color={
                      state.complete || active ? colors.onPrimary : colors.muted
                    }
                  />
                </View>
              </View>
              <View
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 3,
                  backgroundColor: colors.paper,
                  borderRadius: 10,
                  maxWidth: 220,
                }}
              >
                <Txt size={16} weight="700" style={{ textAlign: "center" }}>
                  {title}
                </Txt>
              </View>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
