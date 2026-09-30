import rawCatalog from "../../content/math-course/catalog.json";

export type CourseTopic = {
  id: string;
  grade: number;
  subject: "algebra" | "geometry";
  title: string;
  startPage: number;
  endPage: number;
  pages: { number: number; label: string; section: string }[];
  practice: {
    page: number;
    count: number;
    source: string;
  };
};
export const course = rawCatalog as CourseTopic[];
export const grades = [5, 6, 7, 8, 9, 10, 11];
export function subjectName(grade: number, subject: string) {
  return subject === "geometry"
    ? grade >= 10
      ? "Стереометрия"
      : "Геометрия"
    : grade <= 6
      ? "Арифметика"
      : "Алгебра";
}
export function searchCourse(
  query: string,
  grade: number | null,
  subject: string,
) {
  const normalize = (s: string) => s.toLocaleLowerCase("ru").replace(/ё/g, "е");
  const words = normalize(query.trim()).split(/\s+/).filter(Boolean);
  return course.filter(
    (t) =>
      (!grade || t.grade === grade) &&
      (subject === "all" || t.subject === subject) &&
      words.every((word) =>
        normalize(
          `${t.id} ${t.title} ${t.grade} класс ${subjectName(t.grade, t.subject)}`,
        ).includes(word),
      ),
  );
}
export type TopicProgress = {
  page: number;
  readPages: number[];
  notes: string;
  reviewed: Record<string, "understood" | "repeat">;
  updatedAt: string;
};
export type CourseProgress = Record<string, TopicProgress>;
export const emptyProgress = (): TopicProgress => ({
  page: 0,
  readPages: [],
  notes: "",
  reviewed: {},
  updatedAt: "",
});
/** Treat saved browser/device data as untrusted; never replace unrelated app records. */
export function parseProgress(raw: string | null): CourseProgress {
  if (!raw) return {};
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw Error("Invalid course progress");
  const result: CourseProgress = {};
  for (const topic of course) {
    const p = (value as Record<string, any>)[topic.id];
    if (!p || typeof p !== "object") continue;
    result[topic.id] = {
      page: Number.isInteger(p.page)
        ? Math.max(0, Math.min(p.page, topic.pages.length - 1))
        : 0,
      readPages: Array.isArray(p.readPages)
        ? [
            ...new Set<number>(
              p.readPages.filter(
                (n: unknown) =>
                  Number.isInteger(n) &&
                  Number(n) >= 0 &&
                  Number(n) < topic.pages.length,
              ),
            ),
          ]
        : [],
      notes: typeof p.notes === "string" ? p.notes.slice(0, 12000) : "",
      reviewed: Object.fromEntries(
        Object.entries(p.reviewed ?? {}).filter(
          ([key, v]) =>
            /^\d+$/.test(key) &&
            Number(key) >= 1 &&
            Number(key) <= topic.practice.count &&
            (v === "understood" || v === "repeat"),
        ),
      ) as TopicProgress["reviewed"],
      updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : "",
    };
  }
  return result;
}
export function progressKey(actorId: string) {
  return `espada.math-course.v1:${encodeURIComponent(actorId)}`;
}

export function coursePartsLabel(count: number) {
  const last = count % 10;
  const tens = count % 100;
  const word =
    last === 1 && tens !== 11
      ? "часть"
      : last >= 2 && last <= 4 && (tens < 12 || tens > 14)
        ? "части"
        : "частей";
  return `${count} ${word}`;
}
