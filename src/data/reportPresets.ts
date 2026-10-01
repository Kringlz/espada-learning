import { fixedId } from "../core/ids";
import { ReportTemplate } from "../core/types";

export const sixAreaTemplate: ReportTemplate = {
  id: fixedId(440),
  familyId: fixedId(440),
  version: 1,
  name: "Математика · шесть направлений",
  scale: { min: 1, max: 5, step: 1 },
  areas: [
    {
      id: "numbers",
      label: "Вычисления",
      definition: "Разрядный состав и арифметические действия",
      topicIds: ["place-value", "operations"],
    },
    {
      id: "fractions",
      label: "Дроби",
      definition: "Равные дроби и действия с дробями",
      topicIds: ["equivalent", "add-fractions"],
    },
    {
      id: "ratios",
      label: "Отношения",
      definition: "Сравнение величин и отношения",
      topicIds: ["ratios"],
    },
    {
      id: "algebra",
      label: "Уравнения",
      definition: "Решение уравнений",
      topicIds: ["equations"],
    },
    {
      id: "geometry",
      label: "Геометрия",
      definition: "Углы и периметр",
      topicIds: ["angles", "perimeter"],
    },
    {
      id: "data",
      label: "Данные и шанс",
      definition: "Среднее арифметическое и вероятность события",
      topicIds: ["averages", "probability"],
    },
  ].map((a) => ({ ...a, scope: "area", coverageConfirmed: false })),
};
