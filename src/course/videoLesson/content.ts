import lessonCatalog from "../../../content/math-course/video-lessons/lessons.v1.json";
import { courseVideos } from "../videos";
import * as original from "./content.v1";
import type { Question } from "./content.v1";
export {
  lessonId,
  lessonVideo,
  opening,
  reference,
  concepts,
} from "./content.v1";
export type { Question, Concept } from "./content.v1";
export const contentVersion = 2;
export const sources = {
  triangle: "https://uchitel.pro/прямоугольный-треугольник/",
  theory: "https://uchitel.pro/геометрия-8-погорелов-все-теоремы/",
  exercises: "https://uchitel.pro/геометрия-8-класс-самостоятельная-раб/",
};
// Source tasks are adapted, never copied as a complete exercise collection.
// All reasoning choices, hints and explanations are authored for Espada.
const own = (url: string, basis: string) =>
  `Собственная задача Espada на основе ${basis}. ${url}`;
const adapted = (place: string) =>
  `Адаптация задания: ${place}; изменены вопрос и формат ответа. ${sources.exercises}`;
export const practice: Question[] = [
  {
    id: "v2-p-hypotenuse",
    concept: "sides",
    prompt:
      "В треугольнике ABC угол B равен 90°. Какую сторону нужно возвести в квадрат в левой части теоремы Пифагора?",
    choices: ["AB", "AC", "BC"],
    correct: 1,
    hints: [
      "Найди сторону напротив прямого угла.",
      "Стороны AB и BC образуют угол B. Они — катеты.",
    ],
    solution: "Гипотенуза AC лежит напротив угла B. Поэтому AC² = AB² + BC².",
    source: own(sources.triangle, "определения гипотенузы"),
  },
  {
    id: "v2-p-diagonal-error",
    concept: "application",
    prompt:
      "У прямоугольника стороны 8 и 12 см. Ученик записал: d² = 208, значит диагональ d = 208 см. Как исправить последний шаг?",
    choices: [
      "d = 8 + 12 = 20 см",
      "d = √208 = 4√13 см",
      "d = 208 : 2 = 104 см",
    ],
    correct: 1,
    hints: [
      "208 — квадрат длины диагонали.",
      "Длина — положительный корень: √208 = √(16 · 13).",
    ],
    solution:
      "Диагональ — гипотенуза: d² = 8² + 12² = 208. Извлекаем положительный корень: d = 4√13 см.",
    source: adapted("I уровень, вариант 2, № 1; преобразовано в поиск ошибки"),
  },
  {
    id: "v2-p-leg",
    concept: "sides",
    prompt:
      "Лестница длиной 10 м упирается в вертикальную стену на высоте 8 м. Земля горизонтальна. Как найти расстояние от стены до основания лестницы?",
    choices: ["√(10² + 8²)", "10 − 8", "√(10² − 8²)"],
    correct: 2,
    hints: [
      "Лестница — гипотенуза. Расстояние по земле — катет.",
      "Запиши 10² = 8² + x² и вырази x².",
    ],
    solution:
      "x² = 100 − 64 = 36, значит x = 6 м. Для катета из квадрата гипотенузы вычитаем квадрат другого катета.",
    source: own(
      sources.theory,
      "теоремы Пифагора и перпендикуляра с наклонной",
    ),
  },
  {
    id: "v2-p-rope",
    concept: "converse",
    prompt:
      "Верёвку натянули треугольником со сторонами 3, 4 и 5 м. Почему угол напротив стороны 5 м прямой?",
    choices: [
      "Потому что 3² + 4² = 5²",
      "Потому что 3 + 4 > 5",
      "Потому что 5 — наибольшая сторона",
    ],
    correct: 0,
    hints: [
      "Длина наибольшей стороны сама по себе ещё не доказывает наличие прямого угла.",
      "Сравни 9 + 16 и 25.",
    ],
    solution:
      "9 + 16 = 25. По обратной теореме Пифагора угол напротив наибольшей стороны прямой. Неравенство 3 + 4 > 5 подтверждает лишь существование треугольника.",
    source: own(sources.theory, "примера «Египетский треугольник»"),
  },
  {
    id: "v2-p-condition",
    concept: "conditions",
    prompt:
      "У параллелограмма соседние стороны 8 и 12 см. Можно ли без других данных вычислить диагональ как √(8² + 12²)?",
    choices: [
      "Да, у любого параллелограмма",
      "Только если угол между сторонами прямой",
      "Да, если взять более длинную диагональ",
    ],
    correct: 1,
    hints: [
      "Любой ли параллелограмм является прямоугольником?",
      "Сумма квадратов даёт квадрат диагонали, если она — гипотенуза.",
    ],
    solution:
      "Нужен прямой угол между сторонами. Тогда параллелограмм — прямоугольник, а диагональ делит его на прямоугольные треугольники.",
    source: own(
      sources.triangle,
      "условия применения теоремы; контраст с задачей о прямоугольнике",
    ),
  },
  {
    id: "v2-p-zero",
    concept: "conditions",
    prompt:
      "Можно ли построить прямоугольный треугольник, у которого гипотенуза и один катет равны 6 см?",
    choices: [
      "Да, второй катет тоже 6 см",
      "Да, второй катет равен 0 см",
      "Нет, второй катет получился бы нулевым",
    ],
    correct: 2,
    hints: [
      "Вычисли квадрат второго катета.",
      "6² − 6² = 0. Может ли сторона треугольника иметь нулевую длину?",
    ],
    solution:
      "Нет: b² = 6² − 6² = 0. У треугольника стороны положительны, а гипотенуза строго длиннее каждого катета.",
    source: own(
      sources.triangle,
      "свойства «катет меньше гипотенузы»; граничный случай",
    ),
  },
];
export const check: Question[] = [
  {
    id: "v2-c-rhombus",
    concept: "application",
    prompt:
      "Диагонали ромба равны 14 и 48 см. Они перпендикулярны и делятся точкой пересечения пополам. Какова сторона ромба?",
    choices: ["50 см", "25 см", "31 см"],
    correct: 1,
    hints: ["Сторона ромба — гипотенуза треугольника с катетами 7 и 24 см."],
    solution: "Берём половины диагоналей: √(7² + 24²) = √625 = 25 см.",
    source: adapted(
      "I уровень, вариант 1, № 1; добавлены необходимые свойства диагоналей",
    ),
  },
  {
    id: "v2-c-frame",
    concept: "sides",
    prompt:
      "Прямоугольная рамка имеет диагональ 17 см и ширину 8 см. Поместится ли вдоль её высоты полоска длиной 16 см?",
    choices: [
      "Нет, высота рамки 15 см",
      "Да, высота рамки 25 см",
      "Да, высота рамки 16 см",
    ],
    correct: 0,
    hints: ["Сначала найди высоту как катет, затем сравни её с 16 см."],
    solution:
      "Высота равна √(17² − 8²) = √225 = 15 см. Полоска 16 см вдоль высоты не поместится.",
    source: own(
      sources.triangle,
      "теоремы Пифагора; новый сюжет и сравнение длин",
    ),
  },
  {
    id: "v2-c-labels",
    concept: "sides",
    prompt: "В треугольнике LMN прямой угол при M. Какое равенство верно?",
    choices: ["LN² = LM² + MN²", "LM² = LN² + MN²", "MN² = LM² + LN²"],
    correct: 0,
    hints: ["Гипотенуза соединяет вершины L и N."],
    solution:
      "LM и MN образуют прямой угол. LN — гипотенуза, поэтому LN² = LM² + MN².",
    source: own(
      sources.triangle,
      "определений катетов и гипотенузы; запись равенства",
    ),
  },
  {
    id: "v2-c-converse",
    concept: "converse",
    prompt:
      "Мастер сделал треугольный шаблон со сторонами 6, 7 и 10 см. Подходит ли он для проверки прямого угла?",
    choices: [
      "Да, ведь 6 + 7 > 10",
      "Нет, потому что 6² + 7² ≠ 10²",
      "Да, ведь все стороны разные",
    ],
    correct: 1,
    hints: ["Проверь наибольшую сторону: сравни 36 + 49 и 100."],
    solution:
      "Нет. Треугольник существует, но 36 + 49 = 85 ≠ 100, поэтому прямого угла у него нет.",
    source: own(
      sources.theory,
      "идеи египетского треугольника; проверка неподходящего шаблона",
    ),
  },
  {
    id: "v2-c-scale",
    concept: "application",
    prompt:
      "Оба катета прямоугольного треугольника увеличили вдвое. Как изменилась гипотенуза?",
    choices: ["Увеличилась в 4 раза", "Не изменилась", "Увеличилась в 2 раза"],
    correct: 2,
    hints: [
      "Квадраты катетов увеличились в 4 раза. Что произойдёт после извлечения корня?",
    ],
    solution:
      "Новый квадрат гипотенузы равен 4a² + 4b² = 4c². Положительный корень равен 2c: гипотенуза увеличилась вдвое.",
    source: own(
      sources.triangle,
      "формулы теоремы; самостоятельная задача об изменении размеров",
    ),
  },
  {
    id: "v2-c-square",
    concept: "application",
    prompt: "Диагональ квадратной плитки равна 6√2 см. Чему равна её сторона?",
    choices: ["6 см", "12 см", "3√2 см"],
    correct: 0,
    hints: [
      "У прямоугольного треугольника внутри квадрата два равных катета: 2a² = d².",
    ],
    solution:
      "2a² = (6√2)² = 72. Значит a² = 36, а положительная длина a = 6 см.",
    source: own(
      sources.triangle,
      "свойства равнобедренного прямоугольного треугольника; обратная задача",
    ),
  },
  {
    id: "v2-c-trapezoid",
    concept: "application",
    prompt:
      "В прямоугольной трапеции основания 5 и 17 см, наклонная сторона 13 см. Высота и разность оснований образуют катеты треугольника с гипотенузой 13 см. Найди высоту.",
    choices: ["12 см", "8 см", "5 см"],
    correct: 2,
    hints: ["Разность оснований равна 12 см. Найди другой катет."],
    solution: "h² = 13² − (17 − 5)² = 169 − 144 = 25. Высота h = 5 см.",
    source: adapted(
      "II уровень, вариант 1, № 1; вместо площади требуется высота, вспомогательный треугольник описан в условии",
    ),
  },
  {
    id: "v2-c-root",
    concept: "sides",
    prompt:
      "Получено c² = 81 см². Ученик написал, что длина гипотенузы может быть 9 или −9 см. Что верно?",
    choices: [
      "Обе длины подходят",
      "Подходит только 9 см",
      "Длина равна 81 см",
    ],
    correct: 1,
    hints: ["Длина стороны положительна, даже если у уравнения два корня."],
    solution:
      "Для длины подходит только c = 9 см. Отрицательный корень не имеет геометрического смысла в этой задаче.",
    source: own(
      sources.triangle,
      "теоремы и положительности длин; самостоятельный поиск ошибки",
    ),
  },
  {
    id: "v2-c-angle",
    concept: "conditions",
    prompt:
      "Две стороны треугольника имеют длины 5 и 12 см. Угол между ними не указан. Можно ли утверждать, что третья сторона равна 13 см?",
    choices: [
      "Да, потому что 5² + 12² = 13²",
      "Да, потому что 13 больше 12",
      "Нет, не хватает условия о прямом угле",
    ],
    correct: 2,
    hints: [
      "Числовое равенство не сообщает, какой угол у данного треугольника.",
    ],
    solution:
      "Нет. Третья сторона будет равна 13 см при прямом угле между сторонами 5 и 12 см. В условии такой угол не задан.",
    source: own(
      sources.theory,
      "различия прямой и обратной теорем; недостаточные данные",
    ),
  },
  {
    id: "v2-c-boundary",
    concept: "conditions",
    prompt:
      "Гипотенуза прямоугольного треугольника равна 5 см. Какое из значений может быть длиной катета?",
    choices: ["5 см", "6 см", "4 см"],
    correct: 2,
    hints: [
      "Катет строго меньше гипотенузы. Проверь, что второй катет тоже положителен.",
    ],
    solution:
      "4 см: второй катет равен √(25 − 16) = 3 см. При 5 см второй катет нулевой, а 6 см больше гипотенузы.",
    source: own(
      sources.triangle,
      "свойства «катет меньше гипотенузы»; проверка допустимости",
    ),
  },
];
export type LessonContent = {
  opening: Question;
  practice: Question[];
  check: Question[];
  reference: { id: string; title: string; text: string }[];
};
export const allLessons = lessonCatalog as Record<
  string,
  LessonContent & {
    version: number;
    title: string;
    grade: number;
    notes: string[];
    sources: string[];
  }
>;
export function getLessonMeta(id = original.lessonId) {
  const entry = allLessons[id];
  if (id !== original.lessonId && !entry) throw Error("Unknown lesson");
  return {
    id,
    title: entry?.title ?? "Теорема Пифагора",
    version: entry?.version ?? contentVersion,
    videos: courseVideos[id].items,
    notes: entry?.notes ?? [
      "Катеты a и b образуют угол 90°. Сторона c напротив него — гипотенуза.",
      "c² = a² + b²",
      "Длина — положительный корень. Гипотенуза длиннее каждого катета.",
      "Обратно: если для наибольшей стороны c выполнено c² = a² + b², треугольник прямоугольный.",
    ],
  };
}
export function getLessonContent(run: {
  contentVersion?: number;
  lessonId?: string;
}): LessonContent {
  if (run.lessonId && run.lessonId !== original.lessonId) {
    const entry = allLessons[run.lessonId];
    if (!entry || run.contentVersion !== entry.version)
      throw Error("Unknown lesson content version");
    return entry;
  }
  if (run.contentVersion === undefined || run.contentVersion === 1)
    return original;
  if (run.contentVersion === 2)
    return {
      opening: original.opening,
      practice,
      check,
      reference: original.reference,
    };
  throw new Error("Unknown lesson content version");
}
