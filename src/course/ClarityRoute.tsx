import { StarGlyph } from "../components/Starfield";
import React from "react";
import { Pressable, View } from "react-native";
import { CourseTopic, CourseProgress } from "./model";
import { courseContent } from "./content";
import { lessonStatus } from "./journey";
import { Icon, Txt, useUITheme } from "../components/ui";
import { useSounds } from "../engagement/Sounds";
export function ClarityRoute({
  topics,
  progress,
  videos,
  open,
}: {
  topics: CourseTopic[];
  progress: CourseProgress;
  videos: boolean;
  open: (topic: CourseTopic) => void;
}) {
  const { colors } = useUITheme();
  const { play } = useSounds();
  return (
    <View testID="clarity-topic-route" style={{ gap: 14 }}>
      {topics.map((topic) => {
        const state = lessonStatus(topic, progress);
        const title = courseContent[topic.id].pages[0].title;
        return (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            accessibilityLabel={`${videos ? "Видео" : state.complete ? "Повторить" : state.started ? "Продолжить" : "Начать"}: ${title}, ${topic.grade} класс`}
            onPress={() => {
              play("open");
              open(topic);
            }}
            style={({ pressed }) => ({
              flexDirection: "row",
              gap: 18,
              alignItems: "center",
              padding: 20,
              borderRadius: 20,
              borderWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.line,
              backgroundColor: state.started ? colors.light : colors.white,
              opacity: pressed ? 0.85 : 1,
            })}
          >
            <View
              style={{
                width: 56,
                height: 60,
                borderRadius: 16,
                backgroundColor:
                  topic.subject === "geometry" ? colors.warning : colors.light,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <StarGlyph id={topic.id} size={60} color={colors.green} />
            </View>
            <View style={{ flex: 1, gap: 10 }}>
              <Txt size={20} weight="700">
                {title}
              </Txt>
              {state.started && (
                <View
                  accessibilityRole="progressbar"
                  accessibilityLabel="Прогресс урока"
                  accessibilityValue={{ min: 0, max: 100, now: state.percent }}
                  style={{
                    height: 6,
                    backgroundColor: colors.line,
                    borderRadius: 4,
                  }}
                >
                  <View
                    style={{
                      width: `${state.percent}%`,
                      height: 6,
                      borderRadius: 4,
                      backgroundColor: colors.green,
                    }}
                  />
                </View>
              )}
            </View>
            <Icon name="chevron-right" color={colors.muted} />
          </Pressable>
        );
      })}
    </View>
  );
}
