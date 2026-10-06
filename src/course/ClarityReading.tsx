import React, { useContext, useRef, useState } from "react";
import { View, Pressable } from "react-native";
import { ScreenAnchor } from "../components/ScreenScroll";
import { MotionActiveContext } from "../components/Motion";
import { Button, Disclosure, Icon, Txt, useUITheme } from "../components/ui";
import { CourseContent } from "./CourseContent";
import { CourseVideos } from "./CourseVideos";
import { CoursePractice } from "./CoursePractice";
import { videosForPage } from "./videos";
import { courseContent } from "./content";
import { CourseTopic, emptyProgress } from "./model";
import { useCourseProgress } from "./storage";

/** A single lesson: media and explanation stay together, exercises follow in place. */
export function ClarityReading({
  topic,
  storage,
  next,
}: {
  topic: CourseTopic;
  storage: ReturnType<typeof useCourseProgress>;
  next?: () => void;
}) {
  const { colors } = useUITheme();
  const jump = useContext(ScreenAnchor);
  const active = useContext(MotionActiveContext);
  const [playingPart, setPlayingPart] = useState<number | null>(null);
  const sections = useRef<(View | null)[]>([]);
  const exercises = useRef<View | null>(null);
  const content = courseContent[topic.id];
  const p = storage.progress[topic.id] ?? emptyProgress();
  const previousVideoIds = (index: number) =>
    content.pages
      .slice(0, index)
      .flatMap((_, page) =>
        videosForPage(topic.id, page).map((video) => video.id),
      );
  const markRead = (index: number) =>
    storage.update(topic.id, (current) => ({
      readPages: [...new Set([...current.readPages, index])],
      page: index,
    }));
  return (
    <View
      style={{ gap: 36, maxWidth: 800, width: "100%", alignSelf: "center" }}
      testID="clarity-continuous-lesson"
    >
      <View style={{ gap: 16 }}>
        <Txt accessibilityRole="header" size={32} weight="700">
          {content.pages[0].title}
        </Txt>
        <View
          style={{ flexDirection: "row", gap: 5 }}
          accessibilityLabel={`Прочитано ${p.readPages.length} из ${content.pages.length} разделов`}
        >
          {content.pages.map((_, i) => (
            <View
              key={i}
              style={{
                height: 5,
                borderRadius: 5,
                flex: 1,
                backgroundColor: p.readPages.includes(i)
                  ? colors.green
                  : colors.line,
              }}
            />
          ))}
        </View>
        <Disclosure title="В этом уроке" icon="list">
          {content.pages.map((part, index) => (
            <Button
              key={index}
              secondary
              small
              icon={p.readPages.includes(index) ? "check" : "arrow-down"}
              onPress={() => jump(sections.current[index])}
            >
              {part.title}
            </Button>
          ))}
          <Button
            small
            secondary
            icon="edit-3"
            onPress={() => jump(exercises.current)}
          >
            Задания
          </Button>
        </Disclosure>
        {(p.page > 0 || Object.values(p.quiz).some((a) => a.submitted)) && (
          <Button
            secondary
            icon="bookmark"
            onPress={() =>
              jump(
                Object.values(p.quiz).some((a) => a.submitted)
                  ? exercises.current
                  : sections.current[p.page],
              )
            }
          >
            Где остановились
          </Button>
        )}
      </View>
      {content.pages.map((part, index) => (
        <View
          key={index}
          ref={(node) => {
            sections.current[index] = node;
          }}
          collapsable={false}
          style={{
            gap: 24,
            paddingBottom: 24,
            borderBottomWidth: 1,
            borderColor: colors.line,
          }}
        >
          {index > 0 && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                gap: 14,
              }}
            >
              <Txt
                size={18}
                weight="700"
                color={colors.green}
                style={{ paddingTop: 6 }}
              >
                {String(index + 1).padStart(2, "0")}
              </Txt>
              <Txt
                accessibilityRole="header"
                size={26}
                weight="700"
                style={{ flex: 1 }}
              >
                {part.title}
              </Txt>
            </View>
          )}
          {videosForPage(topic.id, index).some(
            (video) => !previousVideoIds(index).includes(video.id),
          ) && (
            <MotionActiveContext.Provider
              value={active && playingPart === index}
            >
              <CourseVideos
                topicId={topic.id}
                page={index}
                embedded
                excludeVideoIds={previousVideoIds(index)}
                onOpen={() => setPlayingPart(index)}
              />
            </MotionActiveContext.Provider>
          )}
          <CourseContent
            blocks={part.blocks.filter(
              (block, i) =>
                !(
                  i === 0 &&
                  block.kind === "heading" &&
                  block.runs
                    .map((r) => r.text)
                    .join("")
                    .replace(/\s+/g, " ")
                    .trim() === part.title.replace(/\s+/g, " ").trim()
                ),
            )}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              p.readPages.includes(index)
                ? "Раздел прочитан"
                : "Отметить раздел прочитанным"
            }
            accessibilityState={{
              disabled: !storage.ready || p.readPages.includes(index),
            }}
            disabled={!storage.ready || p.readPages.includes(index)}
            onPress={() => markRead(index)}
            style={{
              minHeight: 48,
              flexDirection: "row",
              gap: 10,
              alignItems: "center",
              alignSelf: "flex-start",
            }}
          >
            <Icon
              name={p.readPages.includes(index) ? "check-circle" : "circle"}
              color={colors.green}
            />
            <Txt size={16} color={colors.green}>
              {p.readPages.includes(index) ? "Прочитано" : "Разобрался"}
            </Txt>
          </Pressable>
        </View>
      ))}
      <View ref={exercises} collapsable={false} style={{ gap: 24 }}>
        <Txt accessibilityRole="header" size={30} weight="700">
          Попробуем?
        </Txt>
        <CoursePractice
          topic={topic}
          storage={storage}
          embedded
          onStepChange={() => {
            setPlayingPart(null);
            jump(exercises.current);
          }}
          back={() => jump(sections.current[0])}
          next={next}
        />
      </View>
    </View>
  );
}
