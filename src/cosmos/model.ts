import { makeSpaceProgress, SpaceProgress } from "./progress";
import { trainerPreview } from "../course/trainer/preview";
import { trainerBank } from "../course/trainer/bank";
import type { LessonSummaries } from "../course/videoLesson/completion";
import { course, CourseProgress } from "../course/model";
import { lessonStatus } from "../course/journey";
import {
  constellations,
  starIdentity,
  classStarPosition,
} from "../course/constellation";

export type SpaceLesson = {
  hook: string;
  topics: string[];
  formulaImage: string;
  searchText: string;
  id: string;
  grade: number;
  title: string;
  x: number;
  y: number;
  z: number;
  seed: number;
  color: number;
  complete: boolean;
  practicing: boolean;
  started: boolean;
  percent: number;
  parts: number;
  exercises: number;
};
export type SpaceData = {
  progress: SpaceProgress;
  lessons: SpaceLesson[];
  grades: { grade: number; name: string; x: number; y: number; z: number }[];
  initialId: string;
  ready: boolean;
  error: string | null;
  name: string;
  signals: { id: string; title: string }[];
};
export type SpaceAction =
  | {
      type: "lesson" | "topic" | "navigate" | "retry";
      id: string;
    }
  | { type: "interest"; id: string; enabled: boolean }
  | { type: "feedback"; id: "tap" | "toggle" }
  | { type: "theme"; id: "light" | "dark" };
export function makeSpaceData(
  progress: CourseProgress,
  videoLessons: LessonSummaries = {},
): Pick<SpaceData, "lessons" | "grades" | "initialId" | "progress"> {
  const grades = Object.entries(constellations).map(([g, meta], i) => ({
    grade: Number(g),
    name: `${g} класс`,
    x: i === 0 ? 0 : Math.cos(i * 1.2) * (1800 + i * 210),
    y: i === 0 ? 0 : Math.sin(i * 1.7) * 1250,
    z: i === 0 ? 0 : -1500 - i * 500,
  }));
  const lessons = grades.flatMap((center) =>
    course
      .filter((t) => t.grade === center.grade)
      .map((topic, i) => {
        const status = lessonStatus(topic, progress);
        const point = classStarPosition(
          topic.grade,
          i,
          course.filter((t) => t.grade === topic.grade).length,
        );
        return {
          ...trainerPreview(topic.id),
          searchText: `${topic.title} ${trainerPreview(topic.id).topics.join(" ")} ${topic.grade} класс`,
          id: topic.id,
          grade: topic.grade,
          title: topic.title,
          x: center.x + point.x * 1600,
          y: center.y + (0.5 - point.y) * 950,
          z: center.z,
          seed: starIdentity(topic.id).seed,
          color: (i + topic.grade) % 5,
          complete: !!progress[topic.id]?.trainer?.mastered,
          practicing:
            !!progress[topic.id]?.trainer?.totalAnswered &&
            !progress[topic.id]?.trainer?.mastered,
          started: status.started || !!videoLessons[topic.id]?.started,
          percent: progress[topic.id]?.trainer?.mastered
            ? 100
            : Math.min(
                99,
                Math.round(
                  ((progress[topic.id]?.trainer?.correct ?? 0) / 15) * 100,
                ),
              ),
          parts: topic.pages.length,
          exercises: trainerBank(topic.id).length,
        };
      }),
  );
  const updatedAt = (id: string) =>
    [progress[id]?.updatedAt ?? "", videoLessons[id]?.updatedAt ?? ""]
      .sort()
      .at(-1)!;
  const latest = lessons
    .filter((t) => updatedAt(t.id))
    .sort((a, b) => updatedAt(b.id).localeCompare(updatedAt(a.id)))[0];
  const group = lessons.filter((t) => t.grade === (latest?.grade ?? 5));
  const next =
    group
      .filter((t) => t.started && !t.complete)
      .sort((a, b) => updatedAt(b.id).localeCompare(updatedAt(a.id)))[0] ??
    group.find((t) => !t.complete) ??
    group[0];
  return {
    lessons,
    grades,
    initialId: next.id,
    progress: makeSpaceProgress(progress),
  };
}
export function validSpaceAction(
  value: unknown,
  data: SpaceData,
): value is SpaceAction {
  if (!value || typeof value !== "object") return false;
  const { type, id } = value as SpaceAction;
  if (typeof id !== "string") return false;
  if (type === "interest")
    return (
      data.ready &&
      data.lessons.some((t) => t.id === id) &&
      typeof (value as { enabled?: unknown }).enabled === "boolean"
    );
  if (type === "feedback") return id === "tap" || id === "toggle";
  if (type === "theme") return id === "light" || id === "dark";
  if (type === "lesson")
    return data.ready && data.lessons.some((t) => t.id === id);
  if (type === "topic") return data.signals.some((s) => s.id === id);
  if (type === "navigate")
    return ["Progress", "Formulas", "Profile"].includes(id);
  return type === "retry";
}
