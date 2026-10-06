import { AtlasImage } from "../components/AtlasImage";
import React from "react";
import { Image, Pressable, View, useWindowDimensions } from "react-native";
import Svg, { Line } from "react-native-svg";
import { CourseTopic, CourseProgress } from "./model";
import { courseContent } from "./content";
import { topicCover } from "../components/TopicCover";
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
  const narrow = useWindowDimensions().width < 500;
  const node = narrow ? 42 : 56;
  return (
    <View testID="clarity-topic-route">
      {topics.map((topic, index) => {
        const p = progress[topic.id];
        const read = p?.readPages.length ?? 0;
        const done = read === topic.pages.length;
        const title = courseContent[topic.id].pages[0].title;
        return (
          <View
            key={topic.id}
            style={{ flexDirection: "row", gap: narrow ? 12 : 24 }}
          >
            <View style={{ width: node, alignItems: "center" }}>
              {index < topics.length - 1 && (
                <View
                  pointerEvents="none"
                  style={{
                    position: "absolute",
                    top: 48,
                    bottom: -48,
                    width: 4,
                  }}
                >
                  <Svg width="4" height="100%">
                    <Line
                      x1="2"
                      x2="2"
                      y1="0"
                      y2="100%"
                      stroke={colors.line}
                      strokeWidth={3}
                      strokeDasharray="4 9"
                      strokeLinecap="round"
                    />
                  </Svg>
                </View>
              )}
              <View
                style={{
                  marginTop: 30,
                  width: node,
                  height: node,
                  borderRadius: node / 2,
                  borderWidth: 2,
                  borderColor:
                    done || p?.updatedAt ? colors.green : colors.line,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: done ? colors.primary : colors.paper,
                }}
              >
                <Icon
                  name={done ? "check" : p?.updatedAt ? "play" : "book-open"}
                  size={narrow ? 20 : 24}
                  color={done ? colors.onPrimary : colors.green}
                />
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${videos ? "Видео" : p?.updatedAt ? "Продолжить" : "Начать"}: ${title}, ${topic.grade} класс. Прочитано ${read} из ${topic.pages.length}`}
              onPress={() => {
                play("open");
                open(topic);
              }}
              style={({ pressed }) => ({
                flex: 1,
                minWidth: 0,
                marginBottom: 24,
                padding: narrow ? 18 : 28,
                minHeight: narrow ? 126 : 158,
                borderRadius: 26,
                borderWidth: 1.5,
                borderColor: p?.updatedAt ? colors.green : colors.line,
                backgroundColor: p?.updatedAt ? colors.light : colors.white,
                opacity: pressed ? 0.8 : 1,
                flexDirection: narrow ? "column" : "row",
                alignItems: narrow ? "flex-start" : "center",
                gap: 16,
              })}
            >
              <AtlasImage
                source={topicCover(topic.title, topic.subject).image}
                accessible={false}
                resizeMode="contain"
                style={{
                  width: narrow ? "100%" : 164,
                  height: narrow ? 170 : 132,
                }}
              />
              <Txt
                size={narrow ? 22 : 28}
                weight="700"
                style={{
                  flex: narrow ? undefined : 1,
                  lineHeight: narrow ? 29 : 36,
                }}
              >
                {title}
              </Txt>
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}
