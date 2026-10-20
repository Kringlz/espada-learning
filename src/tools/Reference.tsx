import React, { useState } from "react";
import { Pressable, View, useWindowDimensions } from "react-native";
import { Button, Card, Txt, useUITheme } from "../components/ui";
import {
  IllustrationKind,
  MathIllustration,
} from "../components/MathIllustrations";
import { Formula } from "../math/Formula";

type Item = {
  id: IllustrationKind;
  title: string;
  formula: string;
  spoken: string;
  explanation: string;
  steps: { label: string; latex: string; spoken: string }[];
};
export const referenceItems: Item[] = [
  {
    id: "percent",
    title: "Проценты",
    formula: "\\frac{a\\cdot p}{100}",
    spoken: "a умножить на p и разделить на 100",
    explanation: "a — исходное значение, p — нужный процент.",
    steps: [
      {
        label: "15% от 240",
        latex: "\\frac{240\\cdot15}{100}=36",
        spoken: "240 умножить на 15 и разделить на 100 равно 36",
      },
    ],
  },
  {
    id: "mean",
    title: "Среднее",
    formula: "\\overline{x}=\\frac{x_1+\\cdots+x_n}{n}",
    spoken: "Среднее равно сумме всех чисел, делённой на их количество",
    explanation: "Сложи все значения и раздели на их количество.",
    steps: [
      {
        label: "Числа: 7, 8, 9",
        latex: "\\frac{7+8+9}{3}=8",
        spoken: "7 плюс 8 плюс 9, всё разделить на 3, равно 8",
      },
    ],
  },
  {
    id: "rectangle",
    title: "Прямоугольник",
    formula: "S=a\\cdot b",
    spoken: "Площадь равна a умножить на b",
    explanation:
      "a и b — длины сторон. Площадь измеряется в квадратных единицах.",
    steps: [
      {
        label: "Стороны: 8 см и 5 см",
        latex: "S=8\\cdot5=40\\;\\text{см}^2",
        spoken: "Площадь равна 40 квадратных сантиметров",
      },
    ],
  },
  {
    id: "triangle",
    title: "Треугольник",
    formula: "S=\\frac{a\\cdot h}{2}",
    spoken: "Площадь равна половине произведения основания a и высоты h",
    explanation: "Высота h перпендикулярна основанию a.",
    steps: [
      {
        label: "Основание: 6 см · высота: 4 см",
        latex: "S=\\frac{6\\cdot4}{2}=12\\;\\text{см}^2",
        spoken: "Площадь равна 12 квадратных сантиметров",
      },
    ],
  },
  {
    id: "pythagoras",
    title: "Гипотенуза",
    formula: "c=\\sqrt{a^2+b^2}",
    spoken:
      "Гипотенуза c равна квадратному корню из суммы квадратов катетов a и b",
    explanation:
      "Только для прямоугольного треугольника. a и b — катеты, c — сторона напротив прямого угла.",
    steps: [
      {
        label: "1. Возведи катеты в квадрат",
        latex: "3^2=9,\\quad4^2=16",
        spoken: "3 в квадрате равно 9, 4 в квадрате равно 16",
      },
      {
        label: "2. Сложи и извлеки корень",
        latex: "c=\\sqrt{9+16}=5",
        spoken: "Гипотенуза равна корню из 25, то есть 5",
      },
    ],
  },
  {
    id: "quadratic",
    title: "Квадратное уравнение",
    formula: "ax^2+bx+c=0",
    spoken: "a x в квадрате плюс b x плюс c равно нулю",
    explanation:
      "a ≠ 0. Сначала найди D — дискриминант. Если D > 0 — два действительных корня; D = 0 — один; D < 0 — действительных корней нет.",
    steps: [
      {
        label: "1. Дискриминант",
        latex: "D=b^2-4ac",
        spoken: "D равно b в квадрате минус 4 a c",
      },
      {
        label: "2. Первый корень · при D ≥ 0",
        latex: "x_1=\\frac{-b+\\sqrt{D}}{2a}",
        spoken: "Первый корень: минус b плюс корень из D, всё разделить на 2 a",
      },
      {
        label: "3. Второй корень · при D ≥ 0",
        latex: "x_2=\\frac{-b-\\sqrt{D}}{2a}",
        spoken:
          "Второй корень: минус b минус корень из D, всё разделить на 2 a",
      },
      {
        label: "Пример: a = 1, b = −5, c = 6",
        latex: "D=25-24=1",
        spoken: "В примере дискриминант равен 25 минус 24, то есть 1",
      },
      {
        label: "Первый корень примера",
        latex: "x_1=\\frac{5+1}{2}=3",
        spoken: "Первый корень: 5 плюс 1, разделить на 2, равно 3",
      },
      {
        label: "Второй корень примера",
        latex: "x_2=\\frac{5-1}{2}=2",
        spoken: "Второй корень: 5 минус 1, разделить на 2, равно 2",
      },
    ],
  },
];
export function Reference() {
  const { colors } = useUITheme();
  const wide = useWindowDimensions().width >= 800;
  const [selected, setSelected] = useState<Item | null>(null);
  const math = (latex: string, spoken: string, size = 24) => (
    <Formula
      latex={latex}
      source={spoken}
      size={size}
      color={colors.ink}
      display
    />
  );
  if (selected)
    return (
      <View style={{ gap: 16 }}>
        <Button
          small
          secondary
          icon="arrow-left"
          onPress={() => setSelected(null)}
        >
          Все формулы
        </Button>
        <Card style={{ gap: 14 }}>
          <Txt size={27} weight="800">
            {selected.title}
          </Txt>
          <MathIllustration kind={selected.id} height={210} />
          <View
            style={{
              backgroundColor: colors.light,
              borderRadius: 18,
              padding: 14,
              alignItems: "center",
            }}
          >
            {math(selected.formula, selected.spoken)}
          </View>
          <Txt size={16} color={colors.muted}>
            {selected.explanation}
          </Txt>
        </Card>
        {selected.steps.map((step, i) => (
          <Card key={i} style={{ gap: 8 }}>
            <Txt size={15} weight="700" color={colors.green}>
              {step.label}
            </Txt>
            {math(step.latex, step.spoken, 23)}
          </Card>
        ))}
      </View>
    );
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
      {referenceItems.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          accessibilityLabel={`Открыть формулу: ${item.title}`}
          onPress={() => setSelected(item)}
          style={({ pressed }) => ({
            width: wide ? "31%" : "46%",
            flexGrow: 1,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: colors.line,
            backgroundColor: colors.white,
            padding: 12,
            gap: 10,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <MathIllustration kind={item.id} height={120} decorative />
          <Txt size={16} weight="700" style={{ textAlign: "center" }}>
            {item.title}
          </Txt>
        </Pressable>
      ))}
    </View>
  );
}
