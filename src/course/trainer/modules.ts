import { courseVideos } from "../videos";
import { courseContent } from "../content";
import { trainerBank } from "./bank";
import { moduleCatalog } from "./moduleCatalog";
export type TrainerModule = {
  id: string;
  title: string;
  videoId?: string;
  pages: number[];
  notes: string[];
  skills: string[];
};
const readingNotes: Record<string, string[]> = {
  "A05-01": [
    "Деление с остатком: делимое = делитель · частное + остаток. Остаток меньше делителя.",
    "35 : 8 = 4 (ост. 3). Получится 4 полные коробки. Чтобы убрать всё, нужна ещё одна — всего 5.",
  ],
  "A05-03": [
    "При движении навстречу скорости складываются.",
    "Время до встречи = расстояние ÷ сумма скоростей. Например: 60 ÷ (4 + 6) = 6 ч.",
  ],
  "G05-02": [
    "Периметр прямоугольника: P = 2(a + b). Складываем длины всех сторон.",
    "Объём куба: V = a³. В кубе со стороной 3 см — 3 слоя по 9 кубиков: 27 см³.",
  ],
  "A06-01": [
    "Число делится на 2, если последняя цифра чётная; на 5 — если это 0 или 5.",
    "На 3 и 9 проверяй сумму цифр: у 234 сумма 9, поэтому оно делится и на 3, и на 9.",
  ],
  "A06-06": [
    "При добавлении воды количество вещества не меняется. Концентрация = масса вещества ÷ масса раствора · 100%.",
    "Последовательные скидки применяй по очереди. Две скидки по 10%: 100 · 0,9 · 0,9 = 81. Общая скидка — 19%.",
  ],
  "A07-08": [
    "Обозначь две неизвестные цены через x и y. Для каждой покупки составь своё уравнение.",
    "Умножь уравнения так, чтобы коэффициенты одной неизвестной совпали, и вычти их. Найденное значение подставь в любое исходное уравнение.",
  ],
  "A10-07": [
    "Наклон касательной в точке x₀ равен f′(x₀).",
    "Касательная: y = f(x₀) + f′(x₀)(x − x₀). Найди значение функции и производной в одной и той же точке.",
  ],
  "G11-02": [
    "Площадь сферы: S = 4πr².",
    "Если радиус увеличить в k раз, площадь увеличится в k² раз. Удвоили радиус — получили в 4 раза большую площадь.",
  ],
};
const cache = new Map<string, TrainerModule[]>();
/** Curriculum matching uses the existing page/video links and topic material.
 * It does not claim that a video transcript has been checked. */
export function trainerModules(topic: string): TrainerModule[] {
  if (!cache.has(topic)) {
    const videos = courseVideos[topic];
    const rows = moduleCatalog[topic];
    if (!rows || rows.length !== videos.items.length)
      throw Error(`Module catalog mismatch: ${topic}`);
    const result: TrainerModule[] = rows.map((row, index) => {
      const [skills, ...notes] = row.split("|");
      const video = videos.items[index];
      return {
        id: video.id,
        title: video.title,
        videoId: video.id,
        notes,
        skills: skills.split(","),
        pages: videos.pageVideos.flatMap((ids, page) =>
          ids.includes(index) ? [page] : [],
        ),
      };
    });
    const used = new Set(result.flatMap((m) => m.skills));
    const uncovered = [
      ...new Set(trainerBank(topic).map((q) => q.skill!)),
    ].filter((skill) => !used.has(skill));
    // Some topics contain material absent from their supplied video playlist.
    // Keep that existing material available; never label it as video content.
    if (uncovered.length)
      result.push({
        id: `${topic}:reading`,
        title: "Конспект и практика",
        skills: uncovered,
        pages: videos.pageVideos.some((ids) => !ids.length)
          ? videos.pageVideos.flatMap((ids, page) => (ids.length ? [] : [page]))
          : courseContent[topic].pages.map((_, i) => i),
        notes: readingNotes[topic] ?? [],
      });
    cache.set(topic, result);
  }
  return cache.get(topic)!;
}
export function modulePages(topic: string, module: TrainerModule) {
  return module.pages.map((index) => courseContent[topic].pages[index]);
}
