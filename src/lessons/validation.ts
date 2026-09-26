import { LessonPackage } from "./types";
export function parseLessonPackage(text: string): LessonPackage {
  let value: any;
  try {
    value = JSON.parse(text);
  } catch {
    throw Error(
      "Файл не является корректным JSON. Проверьте запятые и кавычки.",
    );
  }
  if (
    value?.schemaVersion !== 1 ||
    !Array.isArray(value.courses) ||
    !Array.isArray(value.sections) ||
    !Array.isArray(value.lessons) ||
    !value.lessons.length
  )
    throw Error(
      "Нужен пакет версии 1 с массивами courses, sections и непустым lessons.",
    );
  const ids = (rows: any[], label: string) => {
    const seen = new Set();
    for (const row of rows) {
      if (
        typeof row?.id !== "string" ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,119}$/.test(row.id) ||
        seen.has(row.id)
      )
        throw Error(`${label}: неверный или повторный id.`);
      seen.add(row.id);
    }
  };
  ids(value.courses, "Курсы");
  ids(value.sections, "Разделы");
  ids(value.lessons, "Уроки");
  for (const lesson of value.lessons) {
    if (
      typeof lesson.title !== "string" ||
      !lesson.title.trim() ||
      !Array.isArray(lesson.summary) ||
      !lesson.summary.length ||
      !Array.isArray(lesson.questions)
    )
      throw Error(
        `${lesson.id}: нужны название, краткий конспект и массив questions.`,
      );
    ids(lesson.questions, lesson.title);
    for (const q of lesson.questions) {
      if (
        !["easy", "medium", "hard"].includes(q.difficulty) ||
        !["single", "multiple"].includes(q.type) ||
        typeof q.prompt !== "string" ||
        !q.prompt.trim() ||
        typeof q.explanation !== "string" ||
        !q.explanation.trim() ||
        !Array.isArray(q.options) ||
        q.options.length < 2 ||
        q.options.length > 8 ||
        !Array.isArray(q.correctOptionIds) ||
        !q.correctOptionIds.length
      )
        throw Error(
          `${lesson.id}/${q.id}: проверьте тип, сложность, текст, варианты и объяснение.`,
        );
      ids(q.options, q.id);
      if (
        q.options.some(
          (o: any) => typeof o.text !== "string" || !o.text.trim(),
        ) ||
        new Set(q.correctOptionIds).size !== q.correctOptionIds.length ||
        q.correctOptionIds.some(
          (id: string) => !q.options.some((o: any) => o.id === id),
        ) ||
        (q.type === "single" && q.correctOptionIds.length !== 1)
      )
        throw Error(`${q.id}: проверьте правильные ответы и варианты.`);
    }
  }
  return value;
}
