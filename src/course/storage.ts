import { useLearning } from "../services/context";
import { usePracticeSharing } from "./trainer/usePracticeSharing";
import { useStreak } from "../engagement/StreakContext";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext } from "react";
import { useStoredCourseProgress } from "./useStoredCourseProgress";

const CourseProgressContext = createContext<
  | (ReturnType<typeof useStoredCourseProgress> & {
      practiceSync: ReturnType<typeof usePracticeSharing>;
    })
  | null
>(null);
export function CourseProgressProvider({
  actorId,
  children,
}: {
  actorId: string;
  children: React.ReactNode;
}) {
  const { mark } = useStreak();
  const storage = useStoredCourseProgress(actorId, AsyncStorage, mark);
  const { actor } = useLearning();
  const practiceSync = usePracticeSharing(
    actorId,
    actor.role === "student",
    storage.ready,
    storage.progress,
  );
  return React.createElement(
    CourseProgressContext.Provider,
    { value: { ...storage, practiceSync } },
    children,
  );
}
export function useCourseProgress(_actorId: string) {
  const storage = useContext(CourseProgressContext);
  if (!storage) throw new Error("CourseProgressProvider is required");
  return storage;
}
