import { useStudentClassroom } from "../classroom/useStudentClassroom";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useLessonSummaries } from "../course/videoLesson/useLessonSummaries";
import React, { useContext, useMemo, useState, useEffect } from "react";
import { View } from "react-native";
import { useCourseProgress } from "../course/storage";
import { useLearning } from "../services/context";
import { MotionActiveContext, useReducedMotion } from "./Motion";
import { makeSpaceData, SpaceData } from "../cosmos/model";
import { SpaceFlight } from "../cosmos/SpaceFlight";

/** Home is a spatial world; learning records stay in the existing app providers. */
export function DuoHome({
  openCourse,
  openTopic,
  navigate,
}: {
  openCourse: (id: string) => void;
  openTopic: (id: string) => void;
  navigate: (tab: string) => void;
}) {
  const { actor, state } = useLearning();
  const storage = useCourseProgress(actor.id);
  const [selection, setSelection] = useState<SpaceData["selection"]>();
  const selectionKey = `espada.space.selection:${actor.id}`;
  useEffect(() => {
    let live = true;
    void AsyncStorage.getItem(selectionKey)
      .then((raw) => {
        if (!live || !raw) return;
        const saved = JSON.parse(raw);
        if (typeof saved.lessonId === "string") setSelection(saved);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [selectionKey]);
  const active = useContext(MotionActiveContext);
  const reduced = useReducedMotion();
  const classroom = useStudentClassroom(active);
  const videoLessons = useLessonSummaries(actor.id, active);
  const data: SpaceData = useMemo(
    () => ({
      ...makeSpaceData(storage.progress, videoLessons.summaries),
      selection,
      classroom: classroom.snapshot,
      name: actor.name.split(" ")[0],
      ready: storage.ready,
      error: storage.error || videoLessons.error,
      signals: state.assignments
        .filter((a) => a.studentId === actor.id && !a.completedAt)
        .map((a) => ({
          id: a.topicId,
          title:
            state.topics.find((t) => t.id === a.topicId)?.title ??
            "Задание учителя",
        })),
    }),
    [
      selection,
      classroom.snapshot,
      storage.progress,
      videoLessons.summaries,
      videoLessons.error,
      storage.ready,
      storage.error,
      actor.id,
      actor.name,
      state.assignments,
      state.topics,
    ],
  );
  return (
    <View
      style={{
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: "#020509",
      }}
    >
      <SpaceFlight
        data={data}
        active={active}
        reduced={reduced}
        onAction={(action) => {
          if (action.type === "classroom") classroom.action(action);
          else if (action.type === "selection") {
            const next = { lessonId: action.id };
            setSelection(next);
            void AsyncStorage.setItem(selectionKey, JSON.stringify(next)).catch(
              () => {},
            );
          } else if (action.type === "lesson") openCourse(action.id);
          else if (action.type === "interest")
            storage.update(action.id, { interested: action.enabled });
          else if (action.type === "topic") openTopic(action.id);
          else if (action.type === "retry") {
            storage.retry();
            videoLessons.refresh();
          } else navigate(action.id);
        }}
      />
    </View>
  );
}
