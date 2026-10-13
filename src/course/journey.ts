import { CourseTopic, CourseProgress } from "./model";
/** A visited lesson is not completed. Both reading and submitted practice count. */
export function lessonStatus(topic: CourseTopic, progress: CourseProgress) {
  const p = progress[topic.id];
  const read = new Set(
    (p?.readPages ?? []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < topic.pages.length,
    ),
  ).size;
  const answered = Array.from(
    { length: topic.practice.count },
    (_, i) => p?.quiz?.[String(i + 1)],
  ).filter(
    (a) => a?.submitted && [0, 1, 2].includes(a.selected as number),
  ).length;
  const complete =
    read === topic.pages.length && answered >= topic.practice.count;
  return {
    read,
    answered,
    complete,
    started: !!p?.updatedAt,
    percent: Math.round(
      ((read + Math.min(answered, topic.practice.count)) /
        Math.max(1, topic.pages.length + topic.practice.count)) *
        100,
    ),
  };
}
export function nextLesson(topics: CourseTopic[], progress: CourseProgress) {
  return (
    [...topics]
      .filter(
        (t) =>
          lessonStatus(t, progress).started &&
          !lessonStatus(t, progress).complete,
      )
      .sort((a, b) =>
        (progress[b.id]?.updatedAt ?? "").localeCompare(
          progress[a.id]?.updatedAt ?? "",
        ),
      )[0] ??
    topics.find((t) => !lessonStatus(t, progress).complete) ??
    topics[0]
  );
}
